'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Search, X, Package, ChevronDown, MapPin } from 'lucide-react'

interface Bem {
  id: number
  patrimony: string
  description: string
  departmentFullAddress: string
  assetTypeName: string
}

interface PatrimonioBemSelectorProps {
  ambienteNome: string
  blocoNome: string
  onSelecionar: (bem: { id: number; patrimony: string; descricao: string } | null) => void
  onFechar: () => void
}

export default function PatrimonioBemSelector({
  ambienteNome,
  blocoNome,
  onSelecionar,
  onFechar,
}: PatrimonioBemSelectorProps) {
  const [bens, setBens] = useState<Bem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [verOutros, setVerOutros] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => searchRef.current?.focus(), 150)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    setLoading(true)
    setBens([])
    const params = new URLSearchParams()
    if (!verOutros && ambienteNome) params.set('ambiente', ambienteNome)
    if (!verOutros && blocoNome) params.set('bloco', blocoNome)
    fetch(`/api/rondas/bens-tenant?${params}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (j?.data) setBens(j.data as Bem[]) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [ambienteNome, blocoNome, verOutros])

  const filtrados = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return bens
    return bens.filter(
      (b) =>
        b.patrimony.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q),
    )
  }, [bens, search])

  function localReduzido(addr: string) {
    const partes = addr.split('>').map((p) => p.trim())
    return partes.slice(-2).join(' › ')
  }

  const modal = (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onFechar() }}
    >
      <div className="bg-white rounded-t-2xl w-full max-w-lg mx-auto flex flex-col"
        style={{ height: '88vh' }}>

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-3 shrink-0">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-300 font-sans mb-0.5">
              Patrimônio
            </p>
            <h2 className="text-base font-bold text-dark font-sans leading-tight">
              Selecione o bem
            </h2>
          </div>
          <button
            onClick={onFechar}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 transition-colors shrink-0 mt-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Ambiente atual */}
        {!verOutros && (
          <div className="mx-5 mb-3 px-3 py-2 rounded-xl bg-purple-50 border border-purple-200 flex items-center gap-2 shrink-0">
            <MapPin className="w-3.5 h-3.5 text-purple-500 shrink-0" />
            <p className="text-xs font-sans text-purple-700 flex-1 truncate">
              Mostrando bens de <strong>{ambienteNome}</strong>
            </p>
            <button
              onClick={() => setVerOutros(true)}
              className="text-xs font-semibold text-purple-600 hover:text-purple-800 font-sans shrink-0 flex items-center gap-1"
            >
              Outro setor <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        )}

        {verOutros && (
          <div className="mx-5 mb-3 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2 shrink-0">
            <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <p className="text-xs font-sans text-amber-700 flex-1">Mostrando todos os setores</p>
            <button
              onClick={() => { setVerOutros(false); setSearch('') }}
              className="text-xs font-semibold text-amber-700 hover:text-amber-900 font-sans shrink-0"
            >
              Voltar ao setor
            </button>
          </div>
        )}

        {/* Search */}
        <div className="relative mx-5 mb-3 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Buscar patrimônio ou descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 text-sm font-sans text-dark bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 placeholder:text-gray-300"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Lista */}
        <div className="overflow-y-auto flex-1 px-5 pb-2">
          {loading ? (
            <p className="text-center py-10 text-gray-300 font-sans text-sm">Carregando bens...</p>
          ) : filtrados.length === 0 ? (
            <p className="text-center py-10 text-gray-300 font-sans text-sm">
              {bens.length === 0
                ? verOutros
                  ? 'Nenhum bem cadastrado para esta unidade.'
                  : 'Nenhum bem neste ambiente. Tente "Outro setor".'
                : 'Nenhum resultado para a busca.'}
            </p>
          ) : (
            <div className="space-y-2">
              {filtrados.map((bem) => (
                <button
                  key={bem.id}
                  type="button"
                  onClick={() => onSelecionar({ id: bem.id, patrimony: bem.patrimony, descricao: bem.description })}
                  className="w-full flex items-start gap-3 px-3 py-3 rounded-xl border border-gray-200 hover:border-purple-400 hover:bg-purple-50 text-left transition-all active:scale-[0.98]"
                >
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Package className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono font-semibold text-purple-700 truncate">{bem.patrimony}</p>
                    <p className="text-sm font-sans text-dark truncate">{bem.description}</p>
                    <p className="text-xs text-gray-300 font-sans truncate">{localReduzido(bem.departmentFullAddress)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 shrink-0">
          <button
            onClick={() => onSelecionar(null)}
            className="w-full py-3 rounded-xl border-2 border-gray-200 text-gray-400 font-sans font-semibold text-sm hover:border-gray-300 hover:text-gray-500 transition-all"
          >
            Continuar sem selecionar bem
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
