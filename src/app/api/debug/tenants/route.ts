// Este endpoint foi removido por expor dados sensíveis sem autenticação.
// Não restaurar em produção.
export const runtime = 'edge'

export async function GET() {
  return new Response('Not Found', { status: 404 })
}

export async function POST() {
  return new Response('Not Found', { status: 404 })
}
