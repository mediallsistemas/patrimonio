'use client'

import { useVersaoApp } from '@/hooks/useVersaoApp'

// Montado no layout raiz: mantém o navegador sempre no build mais novo
// (detalhes e guarda anti-loop em useVersaoApp). Não renderiza nada.
export function VersaoWatcher() {
  useVersaoApp()
  return null
}
