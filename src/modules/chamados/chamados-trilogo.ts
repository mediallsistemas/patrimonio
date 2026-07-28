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
// Todo ticket é importado, concluído inclusive — a fila mostra os terminais por
// último (ver `listar` em chamados-query.service).
//
// ATENÇÃO ao mexer neste mapa. O único valor confirmado no repositório é
// 'Aberto': as telas /admin/patrimonio e /viewer/patrimonio contam os abertos
// comparando `currentStatus.actionDescription === 'Aberto'`. Os outros três são
// a leitura mais provável e ainda não foram vistos vindo da API.
//
// O que torna isso seguro é `trilogoStatusOrigem`: o texto cru vai junto para o
// banco em toda importação. Se um destes estiver errado, a correção é um UPDATE
// sobre os chamados afetados — não informação perdida. E o valor real aparece
// no filtro de status de /admin/patrimonio, que é montado a partir dos dados.
//
// Status desconhecido cai em 'aberto' de propósito: aparece na fila para alguém
// tratar. O inverso — sumir como finalizado — esconderia trabalho de verdade.

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

export function mapearStatus(descricao: string | null | undefined): StatusChamado {
  if (!descricao) return 'aberto'
  return STATUS_POR_DESCRICAO[normalizar(descricao)] ?? 'aberto'
}

/** Status em que o chamado ainda pede trabalho. Usado para ordenar a fila. */
export function ehTerminal(status: StatusChamado): boolean {
  return status === 'finalizado' || status === 'cancelado'
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
  /** Texto cru do status na origem — o que permite corrigir o mapa depois. */
  trilogoStatusOrigem: string | null
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

  const statusOrigem = (ticket.currentStatus?.actionDescription ?? '').trim() || null
  const status = mapearStatus(statusOrigem)

  return {
    ok: true,
    chamado: {
      trilogoTicketId: ticket.id,
      trilogoStatusOrigem: statusOrigem,
      titulo: mapearTitulo(ticket),
      descricao,
      tipo: mapearTipo(ticket.buildingServiceTypeDescription),
      prioridade: mapearPrioridade(ticket.priority),
      // 'em_execucao' importado vira 'aberto': o responsável do Trílogo não é
      // usuário daqui, e `assumir` exige status 'aberto'. Um chamado em execução
      // sem responsável ninguém consegue pegar. Os terminais entram como estão —
      // a fila os mostra por último.
      status: status === 'em_execucao' ? 'aberto' : status,
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
  /** Identificadores do próprio tenant, usados quando não há projeto configurado. */
  slug: string
  nome: string
}

/** Palavras do texto com 3+ caracteres. Corta "de", "do", "da" sem lista de stopwords. */
function tokensDe(texto: string): string[] {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter((t) => t.length >= 3)
}

/**
 * Casa o tenant pelo próprio nome ou slug contra o endereço do departamento.
 *
 * Exige que TODAS as palavras do candidato apareçam como palavra inteira no
 * endereço. Palavra inteira, e não trecho, porque "PG" dentro de "HRPG" casaria
 * o hospital errado; e todas as palavras porque "Hospital Regional" sozinho
 * casaria com qualquer hospital regional da mesma empresa.
 */
function casaPorNome(vinculo: VinculoTenant, palavrasEndereco: Set<string>): boolean {
  for (const candidato of [vinculo.slug, vinculo.nome]) {
    const palavras = tokensDe(candidato ?? '')
    if (palavras.length > 0 && palavras.every((p) => palavrasEndereco.has(p))) return true
  }
  return false
}

/**
 * Como a unidade foi decidida, da evidência mais forte para a mais fraca.
 *
 * `projeto` — o `trilogoProjectName` do tenant aparece no endereço. É o vínculo
 * configurado à mão e continua tendo precedência sobre tudo.
 *
 * `nome` — o nome ou o slug do próprio tenant aparece no endereço. O endereço do
 * Trílogo traz o nome do hospital, então na maioria dos casos ele identifica a
 * unidade sozinho, sem precisar de configuração.
 *
 * `empresa` — casou só pelo companyId. Evidência fraca: se a empresa tiver um
 * hospital que NÃO está cadastrado como tenant, os tickets dele caem no tenant
 * cadastrado, e o índice único impede reimportar corrigido depois. Por isso a
 * origem sai no resultado da sincronização, em vez de sumir.
 */
export type OrigemVinculo = 'projeto' | 'nome' | 'empresa'

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

  // 1. Projeto configurado. Continua com precedência e com a mesma comparação por
  //    trecho usada em /api/trilogo e na sincronização de ambientes — mudar isso
  //    aqui divergiria das outras três telas que já filtram assim.
  const porProjeto = daEmpresa.filter(
    (v) => v.trilogoProjectName && endereco.includes(v.trilogoProjectName.toUpperCase()),
  )
  if (porProjeto.length === 1) return { tenantId: porProjeto[0].tenantId, origem: 'projeto' }
  if (porProjeto.length > 1) return null // dois projetos no mesmo endereço: ambíguo

  // 2. Nome do próprio tenant no endereço. O Trílogo traz o nome do hospital ali,
  //    então normalmente ele identifica a unidade sem configuração nenhuma.
  const palavras = new Set(tokensDe(endereco))
  const porNome = daEmpresa.filter((v) => casaPorNome(v, palavras))
  if (porNome.length === 1) return { tenantId: porNome[0].tenantId, origem: 'nome' }
  if (porNome.length > 1) return null

  // 3. Só a empresa. Vale apenas se houver exatamente um tenant nela — empate é
  //    ambiguidade real e vai para triagem, não para o chute.
  if (daEmpresa.length === 1 && !daEmpresa[0].trilogoProjectName) {
    return { tenantId: daEmpresa[0].tenantId, origem: 'empresa' }
  }

  return null
}
