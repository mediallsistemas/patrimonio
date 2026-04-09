import { NextRequest } from 'next/server'
import { verifyAuth, assertSistema } from '@/modules/auth/auth.guards'
import { resolveTenantId } from '@/modules/auth/tenant-resolver'
import * as responseService from '@/modules/feedback/form-response.service'
import { buscarTenantPorSlug } from '@/modules/tenants/tenants.service'
import { ok, created, badRequest, unauthorized, serverError } from '@/lib/api-response'
import type { RespostaCampo } from '@/modules/feedback/feedback.types'

// Mapeia campos em inglês (SPA FeedbackForms) para português (schema Prisma)
function mapearCamposSPA(body: Record<string, unknown>): {
  tenantId: string | null
  tenantSlug: string | null
  dados: Parameters<typeof responseService.submeterResposta>[1]
} {
  // Mapeia answers[] para respostas[]
  let respostas: RespostaCampo[] = []
  if (Array.isArray(body.answers)) {
    respostas = (body.answers as Array<{ questionId: string; value: number; note?: string; reasons?: string[] }>).map((a) => ({
      pergunta: a.questionId,
      nota: a.value,
      comentario: a.note,
    }))
  } else if (Array.isArray(body.respostas)) {
    respostas = body.respostas as RespostaCampo[]
  }

  return {
    tenantId: (body.tenantId as string) ?? null,
    tenantSlug: (body.tenantSlug as string) ?? null,
    dados: {
      templateId:     (body.templateId as string)    ?? (body.formType as string) ?? undefined,
      nomePaciente:   (body.patientName as string)   ?? (body.nomePaciente as string) ?? undefined,
      cpf:            (body.patientCpf as string)    ?? (body.cpf as string) ?? undefined,
      idade:          (body.patientAge as number)    ?? (body.idade as number) ?? undefined,
      genero:         (body.patientGender as string) ?? (body.genero as string) ?? undefined,
      dataInternacao: (body.admissionDate as string) ?? (body.dataInternacao as string) ?? undefined,
      dataAlta:       (body.dischargeDate as string) ?? (body.dataAlta as string) ?? undefined,
      setor:          (body.evaluatedDepartment as string) ?? (body.setor as string) ?? undefined,
      respostas,
      comentarios:    (body.comments as string) ?? (body.comentarios as string) ?? undefined,
    },
  }
}

// POST — público (submit de pesquisa pelo paciente ou pela SPA)
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { tenantId: bodyTenantId, tenantSlug: bodyTenantSlug, dados } = mapearCamposSPA(body)

    if (!dados.respostas || dados.respostas.length === 0) {
      return badRequest('respostas / answers são obrigatórias')
    }

    // Resolve tenantId: direto do body, ou via slug, ou via JWT
    let tenantId = bodyTenantId
    if (!tenantId && bodyTenantSlug) {
      const tenant = await buscarTenantPorSlug(bodyTenantSlug)
      tenantId = tenant?.id ?? null
    }

    // Último recurso: JWT (admin submetendo manualmente)
    const session = await verifyAuth(req)
    if (!tenantId && session?.tenantId) tenantId = session.tenantId
    if (!tenantId) return badRequest('tenantId ou tenantSlug obrigatório')

    const resposta = await responseService.submeterResposta(tenantId, dados, session?.sub)
    return created(resposta)
  } catch (err) {
    return serverError(err)
  }
}

// GET — autenticado: lista respostas com filtros opcionais
export async function GET(req: NextRequest) {
  try {
    const session = await verifyAuth(req, ['super_admin', 'tenant_admin'])
    if (!session) return unauthorized()
    assertSistema(session, 'feedbackforms')

    const { searchParams } = req.nextUrl
    const tenantId = await resolveTenantId(session, searchParams.get('tenantSlug'))
    if (!tenantId) return badRequest('tenantSlug obrigatório para super_admin')

    const filtros = {
      setor:      searchParams.get('setor')         ?? searchParams.get('formType') ?? undefined,
      templateId: searchParams.get('templateId')    ?? undefined,
      de:         searchParams.get('de')            ?? searchParams.get('startDate') ?? undefined,
      ate:        searchParams.get('ate')           ?? searchParams.get('endDate')   ?? undefined,
    }

    const respostas = await responseService.listarRespostas(tenantId, filtros)
    return ok(respostas)
  } catch (err) {
    return serverError(err)
  }
}
