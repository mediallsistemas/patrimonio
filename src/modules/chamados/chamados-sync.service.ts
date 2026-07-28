import { prisma } from '@/lib/db'
import {
  converterTicket,
  resolverTenant,
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
 */

const TRILOGO_BASE = process.env.TRILOGO_BASE_URL ?? 'https://public.api.trilogo.app/api'
const TRILOGO_TOKEN = process.env.TRILOGO_TOKEN ?? ''

// Autor dos chamados importados. Usuário de sistema, sem unidade e sem acesso —
// existe para satisfazer a FK `criadoPorId` e para a origem ficar legível na tela.
const EMAIL_SISTEMA = 'sistema.trilogo@local'
const NOME_SISTEMA = 'Trílogo (sincronização)'

export interface TicketNaoImportado {
  trilogoTicketId: number
  motivo: string
  descricao: string | null
  endereco: string | null
}

export interface ResultadoSync {
  buscados: number
  criados: number
  jaExistiam: number
  triagem: TicketNaoImportado[]
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
  let criados = 0
  let jaExistiam = 0

  const criadoPorId = simular ? null : await usuarioSistemaId()

  for (const ticket of tickets) {
    const conversao = converterTicket(ticket)
    if (!conversao.ok) {
      triagem.push({
        trilogoTicketId: Number(ticket.id),
        motivo: conversao.motivo,
        descricao: ticket.description ?? null,
        endereco: ticket.departmentFullAddress ?? null,
      })
      continue
    }

    const tenantId = resolverTenant(ticket, listaVinculos)
    if (!tenantId) {
      triagem.push({
        trilogoTicketId: conversao.chamado.trilogoTicketId,
        motivo: 'não foi possível determinar a unidade',
        descricao: ticket.description ?? null,
        endereco: ticket.departmentFullAddress ?? null,
      })
      continue
    }

    const existente = await prisma.chamado.findUnique({
      where: { trilogoTicketId: conversao.chamado.trilogoTicketId },
      select: { id: true },
    })
    if (existente) {
      jaExistiam++
      continue
    }

    if (simular) {
      criados++
      continue
    }

    try {
      await prisma.chamado.create({
        data: { ...conversao.chamado, tenantId, criadoPorId: criadoPorId! },
      })
      criados++
    } catch (error) {
      // Corrida entre duas execuções simultâneas cai aqui pelo índice único —
      // é o comportamento desejado, e não deve derrubar a sincronização inteira.
      const codigo = (error as { code?: string }).code
      if (codigo === 'P2002') {
        jaExistiam++
        continue
      }
      triagem.push({
        trilogoTicketId: conversao.chamado.trilogoTicketId,
        motivo: `falha ao gravar: ${(error as Error).message}`,
        descricao: ticket.description ?? null,
        endereco: ticket.departmentFullAddress ?? null,
      })
    }
  }

  return {
    buscados: tickets.length,
    criados,
    jaExistiam,
    triagem,
    janela: { inicio, fim },
  }
}

/** Janela padrão da sincronização automática: os últimos `dias` dias até hoje. */
export function janelaPadrao(dias = 7, agora: Date = new Date()): { inicio: string; fim: string } {
  const fim = new Date(agora)
  const inicio = new Date(agora)
  inicio.setDate(inicio.getDate() - dias)
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return { inicio: iso(inicio), fim: iso(fim) }
}
