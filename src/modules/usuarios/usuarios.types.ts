import { z } from 'zod'

// admin_multi: administra várias unidades — tenantId é a primária e
// tenantsExtras as demais (viram tenantIds no JWT ao logar).
// viewer segue aceito como alias legado de admin_multi.
export const CreateUsuarioSchema = z.object({
  username: z.string().min(3).max(40).regex(/^[a-z0-9._-]+$/, 'Apenas letras minúsculas, números, ponto, hífen e underscore'),
  nome: z.string().min(2).max(120),
  senha: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
  role: z.enum(['super_admin', 'tenant_admin', 'admin_multi', 'operator', 'viewer']),
  tenantId: z.string().min(1).nullable().optional(),
  tenantsExtras: z.array(z.string().min(1)).max(50).optional(),
})

export const UpdateUsuarioSchema = z.object({
  nome: z.string().min(2).max(120).optional(),
  ativo: z.boolean().optional(),
  role: z.enum(['super_admin', 'tenant_admin', 'admin_multi', 'operator', 'viewer']).optional(),
  tenantsExtras: z.array(z.string().min(1)).max(50).optional(),
})

export type CreateUsuarioInput = z.infer<typeof CreateUsuarioSchema>
export type UpdateUsuarioInput = z.infer<typeof UpdateUsuarioSchema>
