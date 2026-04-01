'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Eye, EyeOff, LogIn, Landmark } from 'lucide-react'
import Text from '@/components/ui/Text'
import { useLogin } from '@/hooks/useLogin'

function LoginForm() {
  const searchParams = useSearchParams()
  const from = searchParams.get('from') ?? '/'

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [show, setShow]   = useState(false)

  const { isPending, error, submit } = useLogin()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await submit(email, senha, from)
  }

  return (
    <div className="form-bg min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#FF7F50] flex items-center justify-center mb-4">
            <Landmark className="w-8 h-8 text-white" />
          </div>
          <Text as="h1" variant="heading-md" className="text-dark block text-center">
            Sistema de Patrimônio
          </Text>
          <Text variant="body-sm" className="text-gray-300 block text-center mt-1">
            Entre com suas credenciais
          </Text>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-400 font-sans">
                E-mail ou usuário
              </label>
              <input
                type="text"
                autoComplete="username"
                placeholder="E-mail ou usuário"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 font-sans text-dark text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-base transition-all placeholder:text-gray-300"
              />
            </div>

            {/* Senha */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-400 font-sans">
                Senha
              </label>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  className="w-full px-4 py-3 pr-11 rounded-xl border border-gray-200 font-sans text-dark text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-base transition-all placeholder:text-gray-300"
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-400 transition-colors"
                >
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Erro */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-sm text-red-600 font-sans">{error}</p>
              </div>
            )}

            {/* Botão */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-red-base hover:bg-red-dark text-white font-sans font-semibold text-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isPending ? (
                <span>Entrando...</span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Entrar
                </>
              )}
            </button>
          </form>
        </div>

      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
