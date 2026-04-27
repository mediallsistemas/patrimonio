'use client'

import { useEffect, useState } from 'react'
import { ShieldAlert, X } from 'lucide-react'
import Link from 'next/link'

export default function MudarSenhaBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const hasCookie = document.cookie.split(';').some((c) => c.trim().startsWith('ls_pwd_warning=1'))
    setVisible(hasCookie)
  }, [])

  function dismiss() {
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="w-full bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center gap-3">
      <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
      <p className="flex-1 text-sm font-sans text-amber-800">
        Sua senha ainda é a padrão.{' '}
        <Link href="/mudar-senha" className="font-semibold underline underline-offset-2 hover:text-amber-900">
          Altere agora
        </Link>{' '}
        para proteger sua conta.
      </p>
      <button
        onClick={dismiss}
        aria-label="Fechar aviso"
        className="text-amber-500 hover:text-amber-700 transition-colors shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
