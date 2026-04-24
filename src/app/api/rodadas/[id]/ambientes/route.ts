import { created, badRequest, serverError } from '@/lib/api-response'
import { registrarAmbienteRodada } from '@/modules/rodadas/rodadas.service'
import { z } from 'zod'

const RegistrarAmbienteSchema = z.object({
  ambiente: z.string().min(1),
  purezaO2: z.number(),
  pressaoO2: z.number(),
  pressaoAr: z.number(),
  backupLigado: z.boolean(),
  temAbastecimento: z.boolean(),
  temAlteracao: z.boolean(),
  abastecimento: z
    .object({ quantidade: z.number(), tamanho: z.string() })
    .optional()
    .nullable(),
  alteracao: z
    .object({
      tipo: z.string(),
      descricao: z.string(),
      foto: z.string().optional().nullable(),
      trilogoChamado: z.boolean(),
    })
    .optional()
    .nullable(),
})

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id: rodadaId } = await params
    const parsed = RegistrarAmbienteSchema.safeParse(await req.json())
    if (!parsed.success) return badRequest(JSON.stringify(parsed.error.flatten().fieldErrors))

    const ambiente = await registrarAmbienteRodada(rodadaId, parsed.data)
    return created(ambiente)
  } catch (err) {
    console.error('[rodadas/ambientes] POST:', err)
    return serverError('registrarAmbiente failed')
  }
}
