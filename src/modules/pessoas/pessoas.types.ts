import { z } from 'zod'

export const CreatePessoaSchema = z.object({
  nome: z.string().min(2).max(120),
  cpf: z
    .string()
    .regex(/^\d{11}$/, 'CPF deve conter exatamente 11 dígitos numéricos'),
  faceDescriptor: z.array(z.number()).min(128, 'Descriptor facial inválido'),
  tenantSlug: z.string().optional(),
})

export type CreatePessoaInput = z.infer<typeof CreatePessoaSchema>
