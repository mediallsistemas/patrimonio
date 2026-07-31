// "Unidade ativa" do cliente — qual tenant as chamadas /me/* devem operar.
//
// Para admin_multi (admin multi-unidade) a unidade ativa é derivada do slug da
// URL (ver ActiveTenantSync, montado em [tenantSlug]/layout). O valor é enviado
// como header `x-tenant-id` em todas as chamadas via services/api.ts; o servidor
// só o aceita se a sessão tiver acesso ao tenant (ver resolveActiveTenantId em
// modules/auth/tenant-filter.ts).
//
// Para usuários de uma unidade só, o header é ignorado pelo servidor — então
// definir aqui não tem efeito colateral de segurança.

let activeTenantId: string | null = null

const STORAGE_KEY = 'ls_active_tenant'

// Reidrata de sessionStorage no primeiro acesso (sobrevive a navegações SPA e
// reloads dentro da mesma aba). SSR-safe: só acessa window no browser.
function hydrate(): void {
  if (activeTenantId !== null) return
  if (typeof window === 'undefined') return
  activeTenantId = window.sessionStorage.getItem(STORAGE_KEY)
}

export function setActiveTenantId(id: string | null): void {
  activeTenantId = id
  if (typeof window === 'undefined') return
  if (id) window.sessionStorage.setItem(STORAGE_KEY, id)
  else window.sessionStorage.removeItem(STORAGE_KEY)
}

export function getActiveTenantId(): string | null {
  hydrate()
  return activeTenantId
}
