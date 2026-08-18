'use client'

import { useEffect } from 'react'
import { buscarVersaoServidor } from '@/services/versao.service'

// SHA embutido no bundle em build time (next.config.ts) — 'dev' fora da Vercel
const SHA_LOCAL = process.env.NEXT_PUBLIC_BUILD_SHA ?? 'dev'
const CHAVE_RELOAD = 'versao-app-recarregada'
// Ao voltar para a aba, só confere se ela ficou oculta por pelo menos isto —
// evita recarregar no meio de uma ronda por uma troca rápida de aba
const MIN_OCULTO_MS = 5 * 60 * 1000

/**
 * Garante que o navegador rode o build mais novo: confere a versão do servidor
 * ao entrar no site e ao voltar para uma aba esquecida aberta; se o deploy
 * mudou, recarrega a página uma única vez por versão (guarda em sessionStorage
 * para nunca entrar em loop de reload).
 */
export function useVersaoApp(): void {
  useEffect(() => {
    let ocultoDesde: number | null = null

    async function conferir(): Promise<void> {
      const shaServidor = await buscarVersaoServidor()
      if (!shaServidor || shaServidor === 'dev' || shaServidor === SHA_LOCAL) return
      if (sessionStorage.getItem(CHAVE_RELOAD) === shaServidor) return
      sessionStorage.setItem(CHAVE_RELOAD, shaServidor)
      window.location.reload()
    }

    function onVisibility(): void {
      if (document.hidden) {
        ocultoDesde = Date.now()
        return
      }
      if (ocultoDesde !== null && Date.now() - ocultoDesde >= MIN_OCULTO_MS) {
        void conferir()
      }
      ocultoDesde = null
    }

    void conferir()
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])
}
