import type { PrioridadeChamado, StatusChamado, TipoChamado } from './chamados.types'

// Conversão de um ticket do Trílogo para os campos de um Chamado.
// Puro: sem I/O, sem Prisma, sem fetch — toda a tradução vive aqui e é testável isolada.
//
// A sincronização é INSERT-ONLY (ver chamados-sync.service.ts): o ticket semeia o chamado
// uma vez e, a partir daí, quem manda é o ciclo de vida local. Estas funções, portanto, só
// descrevem o estado INICIAL do chamado — nunca são usadas para atualizar um já existente.

/** Campos do ticket do Trílogo que consumimos. A API devolve mais do que isto. */
export interface TicketTrilogo {
  id: number
  description?: string | null
  creationDate?: string | null
  deadline?: string | null
  assetId?: number | null
  assetName?: string | null
  patrimony?: string | null
  companyId?: number | null
  departmentName?: string | null
  departmentFullAddress?: string | null
  priority?: number | null
  currentStatus?: { actionDescription?: string | null } | null
  buildingServiceTypeDescription?: string | null
}

// ── Status ──────────────────────────────────────────────────────────────────
// O único valor de status do Trílogo confirmado neste repositório é 'Aberto' —
// as telas /admin/patrimonio e /viewer/patrimonio contam os abertos comparando
// `currentStatus.actionDescription === 'Aberto'`. Os demais valores da API
// ninguém aqui viu.
//
// Por isso não existe mapa de tradução: importamos apenas o que reconhecemos
// como aberto e mandamos o resto para triagem, registrando o texto literal do
// status. A primeira execução, portanto, revela quais valores existem de fato
// na base do cliente — em vez de a gente adivinhar e importar errado.
//
// Importar um ticket já concluído como chamado aberto seria pior do que não
// importar: cria trabalho fantasma numa fila que a equipe usa para se organizar.

const STATUS_ABERTO = 'aberto'

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
}

/** true só para o status que sabemos representar trabalho ainda por fazer. */
export function statusEhAberto(descricao: string | null | undefined): boolean {
  return normalizar(descricao ?? '') === STATUS_ABERTO
}

// ── Prioridade ──────────────────────────────────────────────────────────────
// A escala vem do PRIORITY_LABEL já usado nas telas de patrimônio
// (admin/patrimonio/page.tsx e viewer/patrimonio/page.tsx):
//   1 Baixa · 2 Média · 3 Alta · 4 Urgente
// que é exatamente a escala de prioridade dos chamados. Não é palpite: é o que
// o próprio sistema já mostra ao usuário hoje.
//
// Nota: o contador de "urgentes" daquelas telas usa `priority >= 3`, o que
// diverge do rótulo que elas mesmas exibem para o 3 ("Alta"). O rótulo é a
// leitura boa; o contador é que está largo. Não mexo nele aqui — mudaria o
// número que a tela mostra hoje.
//
// Valor fora da faixa cai em 'media' — nunca em 'urgente', para não inflar fila.

export function mapearPrioridade(priority: number | null | undefined): PrioridadeChamado {
  if (priority === null || priority === undefined || !Number.isFinite(priority)) return 'media'
  if (priority <= 1) return 'baixa'
  if (priority === 2) return 'media'
  if (priority === 3) return 'alta'
  return 'urgente'
}

// ── Tipo de serviço ─────────────────────────────────────────────────────────
// Só importamos tickets que têm bem vinculado (assetId/patrimony), então o padrão é
// 'patrimonio'; elétrica e hidráulica são detectadas pela descrição do serviço.

export function mapearTipo(descricaoServico: string | null | undefined): TipoChamado {
  const t = normalizar(descricaoServico ?? '')
  if (/eletric|eletr/.test(t)) return 'eletrica'
  if (/hidraulic|hidro|encanament/.test(t)) return 'hidraulica'
  return 'patrimonio'
}

// ── Título ──────────────────────────────────────────────────────────────────
// O Trílogo não tem título. Preferimos o nome do bem; sem ele, a descrição truncada.
// A descrição completa vai íntegra para `descricao` — nada se perde no truncamento.

const TITULO_MAX = 200

export function mapearTitulo(ticket: TicketTrilogo): string {
  const nome = (ticket.assetName ?? '').trim()
  if (nome) return nome.slice(0, TITULO_MAX)

  const desc = (ticket.description ?? '').trim()
  if (desc) return desc.length > TITULO_MAX ? `${desc.slice(0, TITULO_MAX - 1)}…` : desc

  return `Ticket Trílogo #${ticket.id}`
}

// ── Conversão completa ──────────────────────────────────────────────────────

export interface ChamadoImportado {
  trilogoTicketId: number
  titulo: string
  descricao: string
  tipo: TipoChamado
  prioridade: PrioridadeChamado
  status: StatusChamado
  prazo: Date
  criadoEm: Date
  trilogoAssetId: number | null
  patrimony: string | null
  descricaoBemSnapshot: string | null
  ambienteNomeSnapshot: string | null
}

export type ResultadoConversao =
  | { ok: true; chamado: ChamadoImportado }
  | { ok: false; motivo: string }

function dataValida(valor: string | null | undefined): Date | null {
  if (!valor) return null
  const d = new Date(valor)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * Converte o ticket. Recusa em vez de inventar dado: ticket sem descrição ou sem data
 * válida vai para a fila de triagem, com o motivo — nunca entra no banco pela metade.
 */
export function converterTicket(ticket: TicketTrilogo): ResultadoConversao {
  if (!Number.isFinite(ticket.id)) {
    return { ok: false, motivo: 'ticket sem id numérico' }
  }

  // Só entra o que reconhecemos como aberto. Qualquer outro status vai para a
  // triagem com o texto literal, que é como descobrimos os valores reais.
  const statusOrigem = (ticket.currentStatus?.actionDescription ?? '').trim()
  if (!statusEhAberto(statusOrigem)) {
    return {
      ok: false,
      motivo: statusOrigem
        ? `status "${statusOrigem}" não reconhecido como aberto`
        : 'ticket sem status na origem',
    }
  }

  const descricao = (ticket.description ?? '').trim()
  if (!descricao) {
    return { ok: false, motivo: 'ticket sem descrição' }
  }

  const criadoEm = dataValida(ticket.creationDate)
  if (!criadoEm) {
    return { ok: false, motivo: 'ticket sem data de criação válida' }
  }

  // `prazo` é obrigatório no modelo. Sem deadline preferimos recusar a inventar um prazo
  // que faria o chamado nascer atrasado (ou nunca atrasar) sem base real.
  const prazo = dataValida(ticket.deadline)
  if (!prazo) {
    return { ok: false, motivo: 'ticket sem prazo (deadline) válido' }
  }

  return {
    ok: true,
    chamado: {
      trilogoTicketId: ticket.id,
      titulo: mapearTitulo(ticket),
      descricao,
      tipo: mapearTipo(ticket.buildingServiceTypeDescription),
      prioridade: mapearPrioridade(ticket.priority),
      // Sempre 'aberto': é o único status que chega até aqui, e é o estado a
      // partir do qual o operador consegue assumir o chamado. Importar em
      // 'em_execucao' criaria um chamado sem responsável que ninguém pode
      // assumir — `assumir` exige status 'aberto'.
      status: 'aberto' as StatusChamado,
      prazo,
      criadoEm,
      trilogoAssetId: ticket.assetId ?? null,
      patrimony: (ticket.patrimony ?? '').trim() || null,
      descricaoBemSnapshot: (ticket.assetName ?? '').trim() || null,
      ambienteNomeSnapshot: (ticket.departmentName ?? '').trim() || null,
    },
  }
}

// ── Resolução da unidade ────────────────────────────────────────────────────
// Mesma heurística já usada por /api/trilogo: companyId igual e, quando o tenant tem
// projeto definido, o nome do projeto contido no endereço do departamento.

export interface VinculoTenant {
  tenantId: string
  trilogoCompanyId: number
  trilogoProjectName: string | null
}

/**
 * `projeto` — o nome do projeto do tenant aparece no endereço do departamento.
 * É a evidência forte: liga o ticket àquela unidade especificamente.
 *
 * `empresa` — casou só pelo companyId, porque o tenant não tem projeto
 * configurado. Evidência fraca: se a empresa tiver um hospital que NÃO está
 * cadastrado como tenant, os tickets dele caem no tenant cadastrado, e o
 * índice único impede reimportar corrigido depois. Por isso a origem do
 * casamento sai no resultado da sincronização, em vez de sumir.
 */
export type OrigemVinculo = 'projeto' | 'empresa'

export interface ResolucaoTenant {
  tenantId: string
  origem: OrigemVinculo
}

export function resolverTenant(
  ticket: TicketTrilogo,
  vinculos: VinculoTenant[],
): ResolucaoTenant | null {
  const companyId = Number(ticket.companyId)
  if (!Number.isFinite(companyId)) return null

  const endereco = String(ticket.departmentFullAddress ?? '').toUpperCase()
  const daEmpresa = vinculos.filter((v) => v.trilogoCompanyId === companyId)

  // Casamento por projeto tem precedência: se algum tenant da empresa bate pelo
  // nome do projeto, é ele — não importa quantos outros existam sem projeto.
  const porProjeto = daEmpresa.filter(
    (v) => v.trilogoProjectName && endereco.includes(v.trilogoProjectName.toUpperCase()),
  )
  if (porProjeto.length === 1) return { tenantId: porProjeto[0].tenantId, origem: 'projeto' }
  if (porProjeto.length > 1) return null // dois projetos no mesmo endereço: ambíguo

  // Sem casamento por projeto, sobra a empresa. Só vale se houver exatamente um
  // tenant nela — empate é ambiguidade real e vai para triagem, não para o chute.
  const semProjeto = daEmpresa.filter((v) => !v.trilogoProjectName)
  if (semProjeto.length === 1 && daEmpresa.length === 1) {
    return { tenantId: semProjeto[0].tenantId, origem: 'empresa' }
  }

  return null
}
