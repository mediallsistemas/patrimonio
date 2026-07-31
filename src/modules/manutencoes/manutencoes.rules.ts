import type { JWTPayload } from '@/modules/auth/auth.types'

// Regras puras do domínio de manutenções — sem I/O, sem Prisma, sem req/res.
// Decisões de permissão vivem aqui (testáveis isoladas) e são consumidas pela UI,
// pelo guard de rota e pela API, para não divergirem entre si.

type Role = JWTPayload['role']

// Relatório de Manutenções: visão de gestão sobre o que foi executado na unidade.
// NÃO inclui 'operator': ele realiza manutenções e vê as próprias rondas, mas não
// consulta o relatório consolidado.
export const ROLES_RELATORIO_MANUTENCOES: Role[] = [
  'super_admin',
  'tenant_admin',
  'admin_multi',
  'operator_patrimonio',
  'viewer',
]

// Aceita `string` porque SessionPayload.role (lib/auth) não é tipado com a união —
// a lista acima continua tipada como Role[], então um papel inexistente ali não compila.
export function podeVerRelatorio(role: string): boolean {
  return (ROLES_RELATORIO_MANUTENCOES as readonly string[]).includes(role)
}
