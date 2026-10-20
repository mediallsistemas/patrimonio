import { verifyAuthDetailed } from '@/modules/auth/auth.guards'
import { escopoLeitura } from '@/modules/auth/tenant-filter'
import { ok, unauthorized, forbidden, badRequest, notFound, serverError } from '@/lib/api-response'
import { MedicaoGasSchema } from '@/modules/rondas/rondas.types'
import { buscarFotoMedicao } from '@/modules/rondas/rondas.service'

// Foto do relógio de uma medição de gases, carregada sob demanda pelo histórico.
// Escopo de leitura: super_admin vê todas as unidades; os demais, as suas.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ registroId: string; medicao: string }> },
): Promise<Response> {
  const auth = await verifyAuthDetailed(req, ['super_admin', 'tenant_admin', 'admin_multi', 'viewer', 'operator'])
  if (!auth.ok) return auth.reason === 'unauthenticated' ? unauthorized() : forbidden()

  const { registroId, medicao } = await params
  const parsed = MedicaoGasSchema.safeParse(medicao)
  if (!parsed.success) return badRequest('Medição inválida')

  try {
    const foto = await buscarFotoMedicao(registroId, parsed.data, escopoLeitura(auth.session))
    if (!foto) return notFound('Foto')
    return ok({ foto })
  } catch {
    return serverError('buscarFotoMedicao failed')
  }
}
