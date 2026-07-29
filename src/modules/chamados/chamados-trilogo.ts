import type { PrioridadeChamado, StatusChamado, TipoChamado } from './chamados.types'
import {
  casaPorNome,
  casaPorProjeto,
  tokensDe,
  type VinculoTrilogo,
} from '@/modules/trilogo/escopo'

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
// Os valores abaixo vieram da API de produção — 868 tickets de uma janela de
// 120 dias, conferidos em 28/07/2026:
//
//   697  'Executado'      → finalizado
//   101  'Em Execução'    → em_execucao (entra como 'aberto', ver converterTicket)
//    66  'Aberto'         → aberto
//     3  'Arquivado'      → cancelado
//     1  'Cancelado'      → cancelado
//
// Vale registrar por que este comentário existe: o mapa anterior era suposição
// e usava 'Concluído'/'Em andamento', que a API não devolve. Como 'Executado'
// não casava com nada, os 697 tickets já resolvidos cairiam no padrão 'aberto'
// — 80% da importação viraria trabalho fantasma numa fila que a equipe usa para
// se organizar.
//
// 'Arquivado' → cancelado é interpretação: arquivado parece ser fechado sem
// execução. São 3 tickets, e `trilogoStatusOrigem` guarda o texto cru, então
// mudar de ideia é um UPDATE.
//
// Status novo do lado do Trílogo cai em 'aberto' de propósito: aparece na fila
// para alguém tratar. O inverso — sumir como finalizado — esconderia trabalho.

const STATUS_POR_DESCRICAO: Record<string, StatusChamado> = {
  'aberto': 'aberto',
  'em execucao': 'em_execucao',
  'em andamento': 'em_execucao',
  'executado': 'finalizado',
  'concluido': 'finalizado',
  'finalizado': 'finalizado',
  'arquivado': 'cancelado',
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
// A escala veio do PRIORITY_LABEL das telas de patrimônio, que existiam quando
// isto foi escrito: 1 Baixa · 2 Média · 3 Alta · 4 Urgente. Elas foram removidas
// depois (viraram redundantes com o painel de chamados), mas a escala continua
// valendo — era o que o próprio sistema mostrava ao usuário.
//
// Na prática a API devolve `priority: 2` em todos os tickets: 868 de 868 na
// amostra de produção. O mapa existe para o dia em que isso mudar.
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
// Elétrica e hidráulica saem da descrição do serviço; o resto cai em
// 'patrimonio'. Vale notar o que isso significa depois que passamos a importar
// também os tickets sem bem vinculado: os 688 do tipo 'Solicitações' viram
// chamado de patrimônio sem patrimônio — patrimônio genérico. É deliberado. Os
// tipos disponíveis são só elétrica, hidráulica e patrimônio, e deixar esses
// tickets de fora era pior: são 80% do volume e trabalho de manutenção real.

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
  prazo: Date | null
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

  // Sem deadline o chamado entra sem prazo, e não atrasado. Recusar escondia
  // trabalho vivo (73 tickets abertos na amostra de produção) e inventar um
  // prazo produziria atraso falso — a coluna passou a aceitar nulo.
  const prazo = dataValida(ticket.deadline)

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
// As regras de casamento vivem em modules/trilogo/escopo — as mesmas decidem o
// que cada usuário pode ver nas rotas do Trílogo. Divergir aqui significaria
// importar um ticket para uma unidade que não pode nem enxergá-lo.

export interface VinculoTenant extends VinculoTrilogo {
  tenantId: string
  slug: string
  nome: string
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
  const porProjeto = daEmpresa.filter((v) => casaPorProjeto(v, endereco))
  if (porProjeto.length === 1) return { tenantId: porProjeto[0].tenantId, origem: 'projeto' }
  if (porProjeto.length > 1) return null // dois projetos no mesmo endereço: ambíguo

  // 2. Nome do próprio tenant no endereço — só para quem NÃO tem projeto
  //    configurado. Para quem tem, o projeto já foi consultado acima e a
  //    resposta foi não; insistir pelo nome alargaria o casamento em vez de
  //    restringi-lo (ver a nota sobre a Sede em modules/trilogo/escopo).
  const palavras = new Set(tokensDe(endereco))
  const porNome = daEmpresa.filter((v) => !v.trilogoProjectName && casaPorNome(v, palavras))
  if (porNome.length === 1) return { tenantId: porNome[0].tenantId, origem: 'nome' }
  if (porNome.length > 1) return null

  // 3. Só a empresa. Vale apenas se houver exatamente um tenant nela — empate é
  //    ambiguidade real e vai para triagem, não para o chute.
  if (daEmpresa.length === 1 && !daEmpresa[0].trilogoProjectName) {
    return { tenantId: daEmpresa[0].tenantId, origem: 'empresa' }
  }

  return null
}
