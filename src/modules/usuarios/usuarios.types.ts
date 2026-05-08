import { z } from 'zod'

export const CreateUsuarioSchema = z.object({
  username: z.string().min(3).max(40).regex(/^[a-z0-9._-]+$/, 'Apenas letras minúsculas, números, ponto, hífen e underscore'),
  nome: z.string().min(2).max(120),
  senha: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
  role: z.enum(['super_admin', 'tenant_admin', 'operator', 'viewer']),
  tenantId: z.string().min(1).nullable().optional(),
})

export const UpdateUsuarioSchema = z.object({
  nome: z.string().min(2).max(120).optional(),
  ativo: z.boolean().optional(),
  role: z.enum(['super_admin', 'tenant_admin', 'operator', 'viewer']).optional(),
})

export type CreateUsuarioInput = z.infer<typeof CreateUsuarioSchema>
export type UpdateUsuarioInput = z.infer<typeof UpdateUsuarioSchema>
