import { z } from 'zod'

// Id de tenant em bordas de API. NÃO usar z.string().uuid(): o Zod 4 valida
// versão/variante RFC e rejeita ids artesanais legados do banco, como o da
// hrpg (00000000-0000-0000-0000-000000000001) — formato hex 8-4-4-4-12 basta.
export const TenantIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, 'tenantId inválido')

export const CreateTenantSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  nome: z.string().min(2).max(120),
  trilogoCompanyId: z.number().int().positive().optional().nullable(),
  trilogoProjectName: z.string().min(1).max(120).optional().nullable(),
})

export const UpdateTenantSchema = z.object({
  nome: z.string().min(2).max(120).optional(),
  ativo: z.boolean().optional(),
  trilogoCompanyId: z.number().int().positive().optional().nullable(),
  trilogoProjectName: z.string().min(1).max(120).optional().nullable(),
  linensistem: z.boolean().optional(),
})

export type CreateTenantInput = z.infer<typeof CreateTenantSchema>
export type UpdateTenantInput = z.infer<typeof UpdateTenantSchema>
