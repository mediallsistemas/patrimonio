'use client'

import { LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export default function LogoutButton() {
  const { logout } = useAuth()

  async function handleLogout() {
    await logout()
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
