import { verifyAuthDetailed } from '@/modules/auth/auth.guards'
import { ok, unauthorized, forbidden, serverError } from '@/lib/api-response'
import { prisma } from '@/lib/db'

/**
 * Fila de tickets do Trílogo que a sincronização não conseguiu importar.
 *
 * NÃO tem tela. É proposital: com a sincronização automática de janela anual, o
 * ticket recusado é reprocessado toda noite sozinho, então não havia o que
 * alguém fizesse numa tela além de olhar. Manter uma tela para um caso que
 * costuma ser vazio é peso morto no menu.
 *
 * A rota fica porque é a única forma de ler a fila sem abrir o banco. Quando há
 * recusa, o cron emite um console.warn com a contagem por motivo e aponta para
 * cá — é assim que se descobre que existe algo a olhar.
 *
 * Somente super_admin: a lista atravessa unidades.
 * `?resolvidos=true` inclui os que já viraram chamado, para conferência.
 */

const LIMITE = 500

export async function GET(req: Request): Promise<Response> {
  const auth = await verifyAuthDetailed(req, ['super_admin'])
  if (!auth.ok) return auth.reason === 'unauthenticated' ? unauthorized() : forbidden()

  const incluirResolvidos = new URL(req.url).searchParams.get('resolvidos') === 'true'

  try {
    const itens = await prisma.ticketTrilogoTriagem.findMany({
      where: incluirResolvidos ? {} : { resolvidoEm: null },
      orderBy: [{ ocorrencias: 'desc' }, { ultimaVezEm: 'desc' }],
      take: LIMITE,
    })

    // Agrupado por motivo: é assim que se enxerga se o problema é uma regra
    // (dezenas de tickets com o mesmo status desconhecido) ou casos isolados.
    const porMotivo = itens.reduce<Record<string, number>>((acc, i) => {
      acc[i.motivo] = (acc[i.motivo] ?? 0) + 1
      return acc
    }, {})

    return ok({ total: itens.length, limite: LIMITE, porMotivo, itens })
  } catch (err) {
    console.error('[admin/chamados/triagem]', err)
    return serverError('Falha ao ler a fila de triagem')
  }
}
