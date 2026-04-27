'use client'

import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { estadoInicial, type OcorrenciaRondaState } from '@/app/ocorrencias/types'
import * as rondasService from '@/services/rondas.service'
import { useRondaBase } from './useRondaBase'

export type { OcorrenciaRondaState }

export function useOcorrenciaRonda(): OcorrenciaRondaState {
  const router = useRouter()

  const base = useRondaBase({
    onIniciar: async () => {
      const nova = await rondasService.criar()
      return { rondaId: nova.id, estado: estadoInicial() }
    },
    onAbandonar: (estado, salvarDraft) => {
      salvarDraft(estado)
      toast('Ronda pausada. Você pode continuar depois.', { icon: '⏸️' })
      router.push('/')
    },
  })

  return base
}
