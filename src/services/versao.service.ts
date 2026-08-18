// Consulta a versão (SHA do build) que o servidor está rodando.
// fetch cru (fora do wrapper `api`): rota pública, sem auth, e o `no-store`
// garante que a resposta nunca vem do cache do navegador.
export async function buscarVersaoServidor(): Promise<string | null> {
  try {
    const res = await fetch('/api/versao', { cache: 'no-store' })
    if (!res.ok) return null
    const json = (await res.json()) as { data?: { sha?: string } }
    return json.data?.sha ?? null
  } catch {
    return null
  }
}
