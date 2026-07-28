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
// Os dois ciclos de vida coincidem, então o mapa é 1:1.

const STATUS_POR_DESCRICAO: Record<string, StatusChamado> = {
  'aberto': 'aberto',
  'em andamento': 'em_execucao',
  'em execucao': 'em_execucao',
  'concluido': 'finalizado',
  'finalizado': 'finalizado',
  'cancelado': 'cancelado',
}

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
}

/** Status desconhecido vira 'aberto': é o estado seguro — aparece para alguém tratar. */
export function mapearStatus(descricao: string | null | undefined): StatusChamado {
  if (!descricao) return 'aberto'
  return STATUS_POR_DESCRICAO[normalizar(descricao)] ?? 'aberto'
}

// ── Prioridade ──────────────────────────────────────────────────────────────
// A escala numérica do Trílogo não está documentada no repositório; este mapa é a
// leitura mais provável (1 = mais baixa) e precisa de confirmação com o time.
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
      status: mapearStatus(ticket.currentStatus?.actionDescription),
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

export function resolverTenant(
  ticket: TicketTrilogo,
  vinculos: VinculoTenant[],
): string | null {
  const companyId = Number(ticket.companyId)
  if (!Number.isFinite(companyId)) return null

  const endereco = String(ticket.departmentFullAddress ?? '').toUpperCase()

  const candidatos = vinculos.filter((v) => {
    if (v.trilogoCompanyId !== companyId) return false
    if (!v.trilogoProjectName) return true
    return endereco.includes(v.trilogoProjectName.toUpperCase())
  })

  // Empate (dois tenants na mesma empresa sem projeto que os distinga) é ambiguidade
  // real: preferimos mandar para triagem a escolher um hospital no chute.
  if (candidatos.length !== 1) return null
  return candidatos[0].tenantId
}
