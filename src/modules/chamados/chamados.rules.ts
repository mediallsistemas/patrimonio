import type { JWTPayload } from '@/modules/auth/auth.types'
import type { StatusChamado } from './chamados.types'

// Regras puras do domínio de chamados — sem I/O, sem Prisma, sem req/res.
// Toda decisão de permissão e transição de status vive aqui (testável isolada).

type Role = JWTPayload['role']

export const ROLES_LEITURA_CHAMADOS: Role[] = [
  'super_admin',
  'tenant_admin',
  'operator',
  'operator_patrimonio',
  'viewer',
]

export const ROLES_ESCRITA_CHAMADOS: Role[] = [
  'super_admin',
  'tenant_admin',
  'operator',
  'operator_patrimonio',
]

export const ROLES_ADMIN_CHAMADOS: Role[] = ['super_admin', 'tenant_admin']

export function ehAdmin(role: Role): boolean {
  return ROLES_ADMIN_CHAMADOS.includes(role)
}

export function podeEscrever(role: Role): boolean {
  return ROLES_ESCRITA_CHAMADOS.includes(role)
}

// Atribuir a outro usuário, cancelar e editar campos fiscais: só admin
export function podeAtribuir(role: Role): boolean {
  return ehAdmin(role)
}

export function podeCancelar(role: Role): boolean {
  return ehAdmin(role)
}

export function podeEditarFiscal(role: Role): boolean {
  return ehAdmin(role)
}

// ── Transições de status ────────────────────────────────────────────────────
// aberto → em_execucao (assumir/atribuir) | finalizado (finalização direta) | cancelado
// em_execucao → finalizado | cancelado
// finalizado / cancelado → terminais

const TRANSICOES: Record<StatusChamado, readonly StatusChamado[]> = {
  aberto: ['em_execucao', 'finalizado', 'cancelado'],
  em_execucao: ['finalizado', 'cancelado'],
  finalizado: [],
  cancelado: [],
}

export function transicaoValida(de: StatusChamado, para: StatusChamado): boolean {
  return TRANSICOES[de]?.includes(para) ?? false
}

// Status a partir dos quais o chamado ainda está "vivo"
export const STATUS_ABERTOS: readonly StatusChamado[] = ['aberto', 'em_execucao']

// ── Atraso (derivado — nunca persistido) ────────────────────────────────────

export function estaAtrasado(
  chamado: { status: string; prazo: Date },
  agora: Date = new Date(),
): boolean {
  return STATUS_ABERTOS.includes(chamado.status as StatusChamado) && chamado.prazo < agora
}

// ── Sanitização de campos fiscais ───────────────────────────────────────────
// fornecedor / nº ordem de compra / valor gasto: visíveis SOMENTE para admin.

export const CAMPOS_FISCAIS = ['fornecedor', 'numeroOrdemCompra', 'valorGastoCentavos'] as const
export type CampoFiscal = (typeof CAMPOS_FISCAIS)[number]

export function sanitizarParaRole<T extends Partial<Record<CampoFiscal, unknown>>>(
  chamado: T,
  role: Role,
): T | Omit<T, CampoFiscal> {
  if (ehAdmin(role)) return chamado
  const { fornecedor: _f, numeroOrdemCompra: _n, valorGastoCentavos: _v, ...resto } = chamado
  return resto
}
