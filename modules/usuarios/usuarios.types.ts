import { z } from 'zod'

export const CreateUsuarioSchema = z.object({
  email: z.string().email('E-mail inválido').max(255),
  nome: z.string().min(2).max(120),
  senha: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
  role: z.enum(['super_admin', 'tenant_admin', 'operator']),
  tenantId: z.string().uuid('tenantId inválido').nullable().optional(),
})

export const UpdateUsuarioSchema = z.object({
  nome: z.string().min(2).max(120).optional(),
  ativo: z.boolean().optional(),
  role: z.enum(['super_admin', 'tenant_admin', 'operator']).optional(),
})

export type CreateUsuarioInput = z.infer<typeof CreateUsuarioSchema>
export type UpdateUsuarioInput = z.infer<typeof UpdateUsuarioSchema>
