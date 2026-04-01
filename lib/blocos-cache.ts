import type { listarBlocos } from '@/modules/ambientes/ambientes.service'

const TTL = 5 * 60 * 1000 // 5 minutos

type BlocosCache = { data: Awaited<ReturnType<typeof listarBlocos>>; at: number }
export const blocosCache = new Map<string, BlocosCache>()

export const BLOCOS_TTL = TTL

export function invalidarCacheBlocos(tenantId: string): void {
  blocosCache.delete(tenantId)
}
