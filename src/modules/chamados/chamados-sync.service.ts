import { prisma } from '@/lib/db'
import {
  converterTicket,
  resolverTenant,
  type ChamadoImportado,
  type OrigemVinculo,
  type TicketTrilogo,
  type VinculoTenant,
} from './chamados-trilogo'

/**
 * Sincroniza tickets do Trílogo para a tabela de chamados.
 *
 * INSERT-ONLY, e isso é a decisão central deste arquivo. Uma vez importado, o chamado
 * segue o ciclo de vida local — assumir, atribuir, finalizar, campos fiscais. Se a
 * sincronização atualizasse os já existentes, ela desfaria o trabalho da equipe a cada
 * execução, porque a integração com o Trílogo é somente leitura e nada do que é feito
 * aqui volta para lá.
 *
 * A idempotência vem do índice único em `trilogoTicketId`: reexecutar é seguro.
 *
 * O que não vira chamado vai para `TicketTrilogoTriagem` — a janela de busca é móvel,
 * então um ticket recusado que ficasse só no retorno da função sumiria em poucos dias.
 */

const TRILOGO_BASE = process.env.TRILOGO_BASE_URL ?? 'https://public.api.trilogo.app/api'
const TRILOGO_TOKEN = process.env.TRILOGO_TOKEN ?? ''

// Autor dos chamados importados. Usuário de sistema, sem unidade e sem acesso —
// existe para satisfazer a FK `criadoPorId` e para a origem ficar legível na tela.
const EMAIL_SISTEMA = 'sistema.trilogo@local'
const NOME_SISTEMA = 'Trílogo (sincronização)'

// Tamanho do lote de inserção. Mantém a transação curta o bastante para não
// segurar conexão numa janela grande (o backfill manual chega a 366 dias).
const LOTE = 200

export interface TicketNaoImportado {
  trilogoTicketId: number
  motivo: string
  statusOrigem: string | null
  descricao: string | null
  endereco: string | null
  companyId: number | null
}

export interface ResultadoSync {
  buscados: number
  criados: number
  jaExistiam: number
  /** Quantos foram para a fila de triagem nesta execução. */
  emTriagem: number
  triagem: TicketNaoImportado[]
  /**
   * Criados cuja unidade saiu só do companyId, sem projeto que confirmasse.
   * Conferir quando > 0: é o caso em que o ticket pode ter ido para o hospital
   * errado, e o índice único impede reimportar corrigido.
   */
  vinculadosSoPorEmpresa: number
  janela: { inicio: string; fim: string }
}

async function usuarioSistemaId(): Promise<string> {
  const u = await prisma.usuario.upsert({
    where: { email: EMAIL_SISTEMA },
    update: {},
    create: {
      email: EMAIL_SISTEMA,
      nome: NOME_SISTEMA,
      // Sem senha utilizável: a conta nunca autentica, só assina os chamados importados.
      senhaHash: '!',
      role: 'viewer',
      sistemas: [],
      ativo: false,
      tenantId: null,
    },
    select: { id: true },
  })
  return u.id
}

async function buscarTickets(inicio: string, fim: string): Promise<TicketTrilogo[]> {
  const res = await fetch(`${TRILOGO_BASE}/ticket?startDate=${inicio}&endDate=${fim}`, {
    headers: { accept: 'application/json', token: TRILOGO_TOKEN },
  })
  if (!res.ok) throw new Error(`Trílogo respondeu ${res.status}`)

  const data = (await res.json()) as TicketTrilogo[]
  // Mesma regra da tela atual: só tickets com bem vinculado são de patrimônio.
  return data.filter((t) => t.assetId || t.patrimony)
}

async function vinculos(): Promise<VinculoTenant[]> {
  const tenants = await prisma.tenant.findMany({
    where: { trilogoCompanyId: { not: null } },
    select: { id: true, trilogoCompanyId: true, trilogoProjectName: true },
  })
  return tenants.map((t) => ({
    tenantId: t.id,
    trilogoCompanyId: t.trilogoCompanyId!,
    trilogoProjectName: t.trilogoProjectName,
  }))
}

function paraTriagem(
  ticket: TicketTrilogo,
  motivo: string,
): TicketNaoImportado {
  return {
    trilogoTicketId: Number(ticket.id),
    motivo,
    statusOrigem: (ticket.currentStatus?.actionDescription ?? '').trim() || null,
    descricao: ticket.description ?? null,
    endereco: ticket.departmentFullAddress ?? null,
    companyId: Number.isFinite(Number(ticket.companyId)) ? Number(ticket.companyId) : null,
  }
}

/**
 * Grava a fila de triagem. Upsert por ticket: a primeira recusa cria o registro,
 * as seguintes só atualizam o motivo e incrementam o contador — assim dá para ver
 * quais tickets são recusados toda noite, que é sinal de regra a ajustar.
 */
async function persistirTriagem(itens: TicketNaoImportado[]): Promise<void> {
  for (const item of itens) {
    if (!Number.isFinite(item.trilogoTicketId)) continue
    await prisma.ticketTrilogoTriagem.upsert({
      where: { trilogoTicketId: item.trilogoTicketId },
      update: {
        motivo: item.motivo,
        statusOrigem: item.statusOrigem,
        descricao: item.descricao,
        endereco: item.endereco,
        companyId: item.companyId,
        ocorrencias: { increment: 1 },
        // Reaparecer depois de resolvido reabre: o ticket voltou a ser recusado.
        resolvidoEm: null,
      },
      create: {
        trilogoTicketId: item.trilogoTicketId,
        motivo: item.motivo,
        statusOrigem: item.statusOrigem,
        descricao: item.descricao,
        endereco: item.endereco,
        companyId: item.companyId,
      },
    })
  }
}

/** Fecha na triagem os tickets que finalmente viraram chamado. */
async function marcarResolvidos(ids: number[]): Promise<void> {
  if (ids.length === 0) return
  await prisma.ticketTrilogoTriagem.updateMany({
    where: { trilogoTicketId: { in: ids }, resolvidoEm: null },
    data: { resolvidoEm: new Date() },
  })
}

interface Pendente {
  chamado: ChamadoImportado & { tenantId: string }
  origem: OrigemVinculo
  /** Guardado para montar a entrada de triagem se a gravação falhar. */
  ticket: TicketTrilogo
}

function emLotes<T>(itens: T[], tamanho: number): T[][] {
  const lotes: T[][] = []
  for (let i = 0; i < itens.length; i += tamanho) lotes.push(itens.slice(i, i + tamanho))
  return lotes
}

/**
 * @param inicio/fim  janela YYYY-MM-DD exigida pela API do Trílogo
 * @param simular     true = não escreve nada, só relata o que faria
 */
export async function sincronizarChamadosTrilogo(
  inicio: string,
  fim: string,
  simular = false,
): Promise<ResultadoSync> {
  const [tickets, listaVinculos] = await Promise.all([buscarTickets(inicio, fim), vinculos()])

  const triagem: TicketNaoImportado[] = []
  const pendentes: Pendente[] = []

  for (const ticket of tickets) {
    const conversao = converterTicket(ticket)
    if (!conversao.ok) {
      triagem.push(paraTriagem(ticket, conversao.motivo))
      continue
    }

    const resolucao = resolverTenant(ticket, listaVinculos)
    if (!resolucao) {
      triagem.push(paraTriagem(ticket, 'não foi possível determinar a unidade'))
      continue
    }

    pendentes.push({
      chamado: { ...conversao.chamado, tenantId: resolucao.tenantId },
      origem: resolucao.origem,
      ticket,
    })
  }

  // Existência resolvida em UMA consulta, não uma por ticket. Numa janela de 366
  // dias a versão anterior fazia milhares de idas ao banco em série.
  const idsCandidatos = pendentes.map((p) => p.chamado.trilogoTicketId)
  const jaNoBanco = idsCandidatos.length
    ? await prisma.chamado.findMany({
        where: { trilogoTicketId: { in: idsCandidatos } },
        select: { trilogoTicketId: true },
      })
    : []
  const existentes = new Set(jaNoBanco.map((c) => c.trilogoTicketId))

  const novos = pendentes.filter((p) => !existentes.has(p.chamado.trilogoTicketId))
  const jaExistiam = pendentes.length - novos.length

  const comum = {
    buscados: tickets.length,
    jaExistiam,
    vinculadosSoPorEmpresa: novos.filter((p) => p.origem === 'empresa').length,
    janela: { inicio, fim },
  }

  if (simular) {
    return { ...comum, criados: novos.length, emTriagem: triagem.length, triagem }
  }

  const criadoPorId = novos.length > 0 ? await usuarioSistemaId() : null
  let criados = 0
  const gravados: number[] = []

  for (const lote of emLotes(novos, LOTE)) {
    const linhas = lote.map((p) => ({ ...p.chamado, criadoPorId: criadoPorId! }))

    try {
      // skipDuplicates cobre a corrida entre duas execuções simultâneas: o índice
      // único em trilogoTicketId decide, e o lote inteiro não cai por causa disso.
      const { count } = await prisma.chamado.createMany({ data: linhas, skipDuplicates: true })
      criados += count
      gravados.push(...lote.map((p) => p.chamado.trilogoTicketId))
    } catch (error) {
      // Lote inteiro falhou (alguma linha inválida). Reprocessa um a um para
      // isolar o culpado, em vez de descartar 200 tickets bons junto com ele.
      console.error('[chamados-sync] lote falhou, reprocessando individualmente:', error)
      for (const p of lote) {
        try {
          await prisma.chamado.create({ data: { ...p.chamado, criadoPorId: criadoPorId! } })
          criados++
          gravados.push(p.chamado.trilogoTicketId)
        } catch (err) {
          if ((err as { code?: string }).code === 'P2002') {
            gravados.push(p.chamado.trilogoTicketId)
            continue
          }
          triagem.push(paraTriagem(p.ticket, `falha ao gravar: ${(err as Error).message}`))
        }
      }
    }
  }

  // Persistir depois do laço: assim as falhas de gravação entram na fila junto
  // com as recusas de conversão, numa passagem só.
  await persistirTriagem(triagem)
  await marcarResolvidos(gravados)

  return { ...comum, criados, emTriagem: triagem.length, triagem }
}

/** Janela padrão da sincronização automática: os últimos `dias` dias até hoje. */
export function janelaPadrao(dias = 7, agora: Date = new Date()): { inicio: string; fim: string } {
  const fim = new Date(agora)
  const inicio = new Date(agora)
  inicio.setDate(inicio.getDate() - dias)
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return { inicio: iso(inicio), fim: iso(fim) }
}
