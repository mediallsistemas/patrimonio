import { ok, notFound, serverError } from '@/lib/api-response'
import {
  buscarLinkAmbiente,
  listarAgendamentosPorAssets,
  listarBensDoLink,
  type BemPublico,
} from '@/modules/links-publicos/links-publicos.service'

// Apenas campos exibidos no frontend público
function sanitizeBem(a: BemPublico) {
  return {
    id:               a.id,
    patrimony:        a.patrimony,
    description:      a.description,
    brand:            a.brand,
    model:            a.model,
    status:           a.status,
    assetTypeName:    a.assetTypeName,
    coverPermalink:   a.coverPermalink,
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await params

  try {
    const link = await buscarLinkAmbiente(token)
    if (!link) return notFound('Link')

    const resolucao = await listarBensDoLink(link)

    const ids = resolucao.bens.map(a => Number(a.id))
    const agendamentos = await listarAgendamentosPorAssets(ids)

    return ok({
      ambiente:        link.ambiente,
      projeto:         link.projeto,
      resolucao:       resolucao.tipo,
      ambientesAtuais: resolucao.ambientesAtuais,
      candidatos:      resolucao.candidatos,
      bens:            resolucao.bens.map(sanitizeBem),
      agendamentos,
    })
  } catch {
    return serverError('public bem GET failed')
  }
}
