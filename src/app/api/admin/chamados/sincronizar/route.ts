import { verifyAuthDetailed } from '@/modules/auth/auth.guards'
import { ok, unauthorized, forbidden, badRequest, serverError } from '@/lib/api-response'
import { sincronizarChamadosTrilogo, janelaPadrao } from '@/modules/chamados/chamados-sync.service'

/**
 * Sincronização sob demanda dos tickets do Trílogo.
 *
 * O cron diário já faz isso sozinho; esta rota existe para (a) importar histórico de uma
 * janela maior que a do cron e (b) não depender do agendamento quando alguém precisa do
 * chamado agora. No plano Hobby da Vercel o cron roda uma vez por dia.
 *
 * `?simular=true` não escreve nada — devolve o que faria, incluindo a fila de triagem.
 * Somente super_admin: a operação cria chamados em várias unidades de uma vez.
 */

const JANELA_MAX_DIAS = 366

function valida(data: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(data) && !Number.isNaN(new Date(data).getTime())
}

export async function POST(req: Request): Promise<Response> {
  const auth = await verifyAuthDetailed(req, ['super_admin'])
  if (!auth.ok) return auth.reason === 'unauthenticated' ? unauthorized() : forbidden()

  const url = new URL(req.url)
  const simular = url.searchParams.get('simular') === 'true'
  const padrao = janelaPadrao(7)
  const inicio = url.searchParams.get('inicio') ?? padrao.inicio
  const fim = url.searchParams.get('fim') ?? padrao.fim

  if (!valida(inicio) || !valida(fim)) {
    return badRequest('Datas devem estar no formato YYYY-MM-DD')
  }
  if (new Date(inicio) > new Date(fim)) {
    return badRequest('Início não pode ser depois do fim')
  }
  const dias = (new Date(fim).getTime() - new Date(inicio).getTime()) / 86_400_000
  if (dias > JANELA_MAX_DIAS) {
    return badRequest(`Janela máxima de ${JANELA_MAX_DIAS} dias por execução`)
  }

  try {
    const resultado = await sincronizarChamadosTrilogo(inicio, fim, simular)
    return ok({ ...resultado, simulacao: simular })
  } catch (err) {
    console.error('[admin/chamados/sincronizar]', err)
    return serverError('Falha ao sincronizar com o Trílogo')
  }
}
