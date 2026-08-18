import { ok } from '@/lib/api-response'

// Rota pública de propósito (liberada no middleware): devolve só o SHA do
// build, que o bundle do client já carrega embutido — nada sensível. O client
// compara com o dele e força reload quando há deploy novo no ar.
export const dynamic = 'force-dynamic'

export async function GET(): Promise<Response> {
  return ok({ sha: process.env.NEXT_PUBLIC_BUILD_SHA ?? 'dev' })
}
