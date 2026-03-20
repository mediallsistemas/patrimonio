import { z } from 'zod'

export const CreateTenantSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  nome: z.string().min(2).max(120),
})

export const UpdateTenantSchema = z.object({
  nome: z.string().min(2).max(120).optional(),
  ativo: z.boolean().optional(),
})

export type CreateTenantInput = z.infer<typeof CreateTenantSchema>
export type UpdateTenantInput = z.infer<typeof UpdateTenantSchema>
