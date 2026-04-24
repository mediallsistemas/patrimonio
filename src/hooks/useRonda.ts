'use client'

import { useRouter, useParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { estadoInicial, type RondaState } from '@/app/[tenantSlug]/ronda/ronda.types'
import { useRondaBase } from './useRondaBase'

export type { RondaState }

export function useRonda(): RondaState {
  const router = useRouter()
  const { tenantSlug } = useParams<{ tenantSlug: string }>()

  const base = useRondaBase({
    onIniciar: async () => {
      const novo = estadoInicial()
      return { rondaId: null, estado: novo }
    },
    onAbandonar: (estado, salvarDraft) => {
      salvarDraft(estado)
      toast('Ronda pausada. Você pode continuar depois.', { icon: '⏸️' })
      router.push(`/${tenantSlug}/manutencao`)
    },
  })

  return { tenantSlug, ...base }
}
