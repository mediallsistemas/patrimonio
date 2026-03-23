import { useEffect, useRef } from 'react'

export interface RondaDraftEstado {
  rondaId: string
  blocoIdx: number
  ambienteIdx: number
  concluidos: {
    blocoIdx: number
    ambiente: string
    temOcorrencia: boolean
    tipo?: string
  }[]
  salvoEm: string // ISO date
}

const DRAFT_URL = '/api/rondas/draft'
const DEBOUNCE_MS = 1500

export function useRondaDraft(
  estado: RondaDraftEstado | null,
  ativo: boolean,
) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestEstado = useRef(estado)
  latestEstado.current = estado

  // Auto-save when user leaves the page (visibility change or beforeunload)
  useEffect(() => {
    if (!ativo) return

    function saveNow() {
      if (!latestEstado.current) return
      const body = JSON.stringify(latestEstado.current)
      navigator.sendBeacon(DRAFT_URL, new Blob([body], { type: 'application/json' }))
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') saveNow()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('beforeunload', saveNow)

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('beforeunload', saveNow)
    }
  }, [ativo])

  // Debounced save on state change while active
  useEffect(() => {
    if (!ativo || !estado) return

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(() => {
      fetch(DRAFT_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(estado),
      }).catch(() => {/* silent — best effort */})
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [ativo, estado])
}

export async function carregarDraft(): Promise<RondaDraftEstado | null> {
  try {
    const res = await fetch(DRAFT_URL)
    if (!res.ok) return null
    const json = await res.json()
    return (json.data?.estado as RondaDraftEstado) ?? null
  } catch {
    return null
  }
}

export async function descartarDraft(): Promise<void> {
  await fetch(DRAFT_URL, { method: 'DELETE' }).catch(() => {/* silent */})
}
