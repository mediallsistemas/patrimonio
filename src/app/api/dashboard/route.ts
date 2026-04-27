import { ok, serverError } from '@/lib/api-response'
import { getDashboardData } from '@/modules/dashboard/dashboard.service'

// Rota pública — sem autenticação necessária
export async function GET(): Promise<Response> {
  try {
    const data = await getDashboardData(null)
    return ok(data)
  } catch {
    return serverError('getDashboardData failed')
  }
}
