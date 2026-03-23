'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

export default function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'DELETE', credentials: 'include' })
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-red-base font-sans transition-colors"
    >
      <LogOut className="w-4 h-4" />
      <span className="hidden sm:block">Sair</span>
    </button>
  )
}
