import { verifyAuth } from '@/modules/auth/auth.guards'
import { prisma } from '@/lib/db'
import { created, forbidden, badRequest, serverError } from '@/lib/api-response'
import { z } from 'zod'

const OcorrenciaSchema = z.object({
  tipo: z.string().min(1).max(100),
  descricao: z.string().min(1).max(1000),
  foto: z.string().optional().nullable(),
  trilogoChamado: z.boolean(),
  bemPatrimony: z.string().max(120).optional().nullable(),
  bemDescricao: z.string().max(255).optional().nullable(),
})

const RegistroAmbienteSchema = z.discriminatedUnion('tipoRegistro', [
  z.object({
    tipoRegistro: z.literal('ocorrencia'),
    ambiente: z.string().min(1).max(120),
    temOcorrencia: z.boolean(),
    ocorrencia: OcorrenciaSchema.optional(),
  }),
  z.object({
    tipoRegistro: z.literal('gases'),
    ambiente: z.string().min(1).max(120),
    purezaO2: z.number(),
    pressaoO2: z.number(),
    pressaoAr: z.number(),
    backupLigado: z.boolean(),
    temAbastecimento: z.boolean(),
    qtdCilindros: z.number().int().min(1).optional().nullable(),
    tamCilindro: z.string().optional().nullable(),
    temOcorrencia: z.boolean(),
    ocorrencia: OcorrenciaSchema.optional(),
  }),
])

// POST /api/rondas/[id]/ambientes — registra um ambiente dentro de uma ronda
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await verifyAuth(req, ['super_admin', 'tenant_admin'])
  if (!session) return forbidden()

  const { id: rondaId } = await params

  try {
    const parsed = RegistroAmbienteSchema.safeParse(await req.json())
    if (!parsed.success) return badRequest(parsed.error.flatten().fieldErrors)

    const body = parsed.data

    const gasesData =
      body.tipoRegistro === 'gases'
        ? {
            purezaO2: body.purezaO2,
            pressaoO2: body.pressaoO2,
            pressaoAr: body.pressaoAr,
            backupLigado: body.backupLigado,
            temAbastecimento: body.temAbastecimento,
            qtdCilindros: body.qtdCilindros ?? null,
            tamCilindro: body.tamCilindro ?? null,
          }
        : {}

    const registro = await prisma.registroAmbiente.create({
      data: {
        rondaId,
        ambiente: body.ambiente,
        tipoRegistro: body.tipoRegistro,
        temOcorrencia: body.temOcorrencia,
        ...gasesData,
        ...(body.temOcorrencia && body.ocorrencia
          ? {
              ocorrencia: {
                create: {
                  tipo: body.ocorrencia.tipo,
                  descricao: body.ocorrencia.descricao,
                  foto: body.ocorrencia.foto ?? null,
                  trilogoChamado: body.ocorrencia.trilogoChamado,
                  bemPatrimony: body.ocorrencia.bemPatrimony ?? null,
                  bemDescricao: body.ocorrencia.bemDescricao ?? null,
                },
              },
            }
          : {}),
      },
      include: {
        ocorrencia: {
          select: { id: true, tipo: true, descricao: true, trilogoChamado: true },
        },
      },
    })

    return created(registro)
  } catch (err) {
    console.error('[rondas/ambientes] POST:', err)
    return serverError('registrarAmbiente failed')
  }
}
