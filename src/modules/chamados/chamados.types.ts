import { z } from 'zod'

// ── Constantes de domínio ───────────────────────────────────────────────────

// Tipos de serviço — mesmos três da ronda/manutenção predial (TipoManutencao
// em useManutencao), para manter as duas telas consistentes.
export const TIPOS_CHAMADO = [
  'eletrica',
  'hidraulica',
  'patrimonio',
] as const
export type TipoChamado = (typeof TIPOS_CHAMADO)[number]

export const TIPO_CHAMADO_LABEL: Record<TipoChamado, string> = {
  eletrica: 'Elétrica',
  hidraulica: 'Hidráulica',
  patrimonio: 'Patrimônio',
}

export const PRIORIDADES_CHAMADO = ['baixa', 'media', 'alta', 'urgente'] as const
export type PrioridadeChamado = (typeof PRIORIDADES_CHAMADO)[number]

export const PRIORIDADE_CHAMADO_LABEL: Record<PrioridadeChamado, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  urgente: 'Urgente',
}

export const STATUS_CHAMADO = ['aberto', 'em_execucao', 'finalizado', 'cancelado'] as const
export type StatusChamado = (typeof STATUS_CHAMADO)[number]

export const STATUS_CHAMADO_LABEL: Record<StatusChamado, string> = {
  aberto: 'Aberto',
  em_execucao: 'Em execução',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
}

// ── Schemas Zod (validação em toda fronteira de API) ────────────────────────

// foto base64 (data URL) — mesmo teto ~1.5MB dos demais fluxos do projeto
const fotoBase64 = z
  .string()
  .min(20, 'Foto inválida')
  .max(2_000_000, 'Foto excede o tamanho máximo')

export const CriarChamadoSchema = z
  .object({
    titulo: z.string().trim().min(3, 'Informe o título').max(200),
    descricao: z.string().trim().min(3, 'Descreva o problema').max(2000),
    tipo: z.enum(TIPOS_CHAMADO),
    prioridade: z.enum(PRIORIDADES_CHAMADO).default('media'),
    prazo: z.coerce.date({ error: 'Informe o prazo' }),
    ambienteId: z.string().uuid('Selecione o ambiente'),
    // Bem do Trilogo (opcional) — os três campos andam juntos
    trilogoAssetId: z.number().int().positive().optional(),
    patrimony: z.string().trim().min(1).max(120).optional(),
    descricaoBem: z.string().trim().min(1).max(500).optional(),
    fotoAbertura: fotoBase64.optional().nullable(),
    // Atribuição direta na criação — a rota só repassa quando o role é admin
    responsavelId: z.string().uuid().optional(),
  })
  .refine(
    (d) =>
      (d.trilogoAssetId === undefined && d.patrimony === undefined) ||
      (d.trilogoAssetId !== undefined && d.patrimony !== undefined),
    { message: 'Bem incompleto: informe patrimônio e asset juntos', path: ['patrimony'] },
  )
export type CriarChamadoInput = z.infer<typeof CriarChamadoSchema>

export const AssumirChamadoSchema = z.object({
  prioridade: z.enum(PRIORIDADES_CHAMADO).optional(),
})
export type AssumirChamadoInput = z.infer<typeof AssumirChamadoSchema>

export const AtribuirChamadoSchema = z.object({
  responsavelId: z.string().uuid('Selecione o responsável'),
  prioridade: z.enum(PRIORIDADES_CHAMADO).optional(),
})
export type AtribuirChamadoInput = z.infer<typeof AtribuirChamadoSchema>

export const FinalizarChamadoSchema = z.object({
  descricaoExecucao: z.string().trim().min(3, 'Descreva o que foi feito').max(2000),
  fotoExecucao: fotoBase64.optional().nullable(),
})
export type FinalizarChamadoInput = z.infer<typeof FinalizarChamadoSchema>

export const CancelarChamadoSchema = z.object({
  motivo: z.string().trim().max(2000).optional(),
})
export type CancelarChamadoInput = z.infer<typeof CancelarChamadoSchema>

// Campos fiscais — somente admin (a rota valida o role antes do parse)
export const EditarFiscalSchema = z.object({
  fornecedor: z.string().trim().max(200).optional().nullable(),
  numeroOrdemCompra: z.string().trim().max(100).optional().nullable(),
  valorGastoCentavos: z.number().int().min(0).max(100_000_000_000).optional().nullable(),
})
export type EditarFiscalInput = z.infer<typeof EditarFiscalSchema>

export const FiltrosChamadosSchema = z.object({
  status: z.enum(STATUS_CHAMADO).optional(),
  prioridade: z.enum(PRIORIDADES_CHAMADO).optional(),
  tipo: z.enum(TIPOS_CHAMADO).optional(),
  responsavelId: z.string().uuid().optional(),
  // Vem da query string — 'true' é o único valor que liga o filtro.
  // (z.coerce.boolean() faria Boolean('false') === true — nunca usar aqui.)
  atrasados: z
    .preprocess((v) => (v === undefined ? undefined : v === true || v === 'true'), z.boolean())
    .optional(),
})
export type FiltrosChamados = z.infer<typeof FiltrosChamadosSchema>

// ── Shapes de retorno dos services (server) ─────────────────────────────────
// Datas como Date no server; o client recebe strings via JSON.
// Campos fiscais opcionais: presentes só para admin (sanitizarParaRole).

export interface ChamadoOperado {
  id: string
  numero: number
  status: string
  prioridade: string
  criadoEm: Date
  responsavelId?: string | null
  assumidoEm?: Date | null
  finalizadoEm?: Date | null
  fornecedor?: string | null
  numeroOrdemCompra?: string | null
  valorGastoCentavos?: number | null
}

export interface ChamadoListaItem {
  id: string
  numero: number
  titulo: string
  descricao: string
  tipo: string
  prioridade: string
  status: string
  prazo: Date
  atrasado: boolean
  ambienteNomeSnapshot: string | null
  blocoNomeSnapshot: string | null
  patrimony: string | null
  descricaoBemSnapshot: string | null
  assumidoEm: Date | null
  finalizadoEm: Date | null
  criadoEm: Date
  descricaoExecucao: string | null
  motivoCancelamento: string | null
  criadoPor: { id: string; nome: string }
  responsavel: { id: string; nome: string } | null
  tenant: { id: string; nome: string; slug: string }
  fornecedor?: string | null
  numeroOrdemCompra?: string | null
  valorGastoCentavos?: number | null
}

// Shape do dashboard gerencial — compartilhado entre o service (server)
// e o client service (client-safe: este arquivo não importa Prisma).
export interface DashboardChamados {
  total: number
  finalizados: number
  emExecucao: number
  abertos: number
  atrasados: number
  valorGastoCentavos: number
  porStatus: { status: string; qtde: number }[]
  porPrioridade: { prioridade: string; qtde: number }[]
  porTipo: { tipo: string; qtde: number }[]
  porResponsavel: { responsavelId: string | null; nome: string; qtde: number }[]
}
