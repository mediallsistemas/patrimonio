'use client'

import { useState } from 'react'
import { Eye, EyeOff, KeyRound, Landmark, X } from 'lucide-react'
import Text from '@/components/ui/Text'
import { api } from '@/services/api'

export default function MudarSenhaPage() {
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [showAtual, setShowAtual] = useState(false)
  const [showNova, setShowNova] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (novaSenha !== confirmar) {
      setError('As senhas não coincidem')
      return
    }
    if (novaSenha.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres')
      return
    }

    setIsPending(true)
    try {
      await api.post('me/password', { senhaAtual, novaSenha })
      // Clear the "must change password" reminder cookie
      document.cookie = 'ls_pwd_warning=; path=/; max-age=0'
      setSuccess(true)
      setTimeout(() => { window.location.href = '/' }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao alterar senha')
    } finally {
      setIsPending(false)
    }
  }

  function handleIgnorar() {
    // Set a cookie so the banner stays visible across pages (expires in 30 days)
    document.cookie = 'ls_pwd_warning=1; path=/; max-age=2592000'
    window.location.href = '/'
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
            Alterar Senha
          </Text>
          <Text variant="body-sm" className="text-gray-300 block text-center mt-1">
            Por segurança, defina uma nova senha
          </Text>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          {success ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                <KeyRound className="w-6 h-6 text-green-600" />
              </div>
              <Text variant="body-md-bold" className="text-dark block">Senha alterada!</Text>
              <Text variant="body-sm" className="text-gray-300 block mt-1">Redirecionando...</Text>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Senha atual */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-400 font-sans">Senha atual</label>
                <div className="relative">
                  <input
                    type={showAtual ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={senhaAtual}
                    onChange={(e) => setSenhaAtual(e.target.value)}
                    required
                    className="w-full px-4 py-3 pr-11 rounded-xl border border-gray-200 font-sans text-dark text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-base transition-all placeholder:text-gray-300"
                  />
                  <button type="button" onClick={() => setShowAtual(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-400 transition-colors">
                    {showAtual ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Nova senha */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-400 font-sans">Nova senha</label>
                <div className="relative">
                  <input
                    type={showNova ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    required
                    className="w-full px-4 py-3 pr-11 rounded-xl border border-gray-200 font-sans text-dark text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-base transition-all placeholder:text-gray-300"
                  />
                  <button type="button" onClick={() => setShowNova(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-400 transition-colors">
                    {showNova ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirmar */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-400 font-sans">Confirmar nova senha</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 font-sans text-dark text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-base transition-all placeholder:text-gray-300"
                />
              </div>

              {/* Erro */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <p className="text-sm text-red-600 font-sans">{error}</p>
                </div>
              )}

              {/* Alterar */}
              <button
                type="submit"
                disabled={isPending}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-red-base hover:bg-red-dark text-white font-sans font-semibold text-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {isPending ? 'Alterando...' : 'Alterar senha'}
              </button>

              {/* Ignorar */}
              <button
                type="button"
                onClick={handleIgnorar}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-gray-300 hover:text-gray-400 font-sans text-sm transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Ignorar por agora
              </button>

            </form>
          )}
        </div>

      </div>
    </div>
  )
}
