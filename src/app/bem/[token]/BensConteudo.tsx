'use client'

import { useState, useRef, useCallback } from 'react'
import { Search, X, LogOut, Loader2, Package } from 'lucide-react'
import BemCard from './BemCard'
import ModalLoginBem from './ModalLoginBem'
import * as manutencoesService from '@/services/manutencoes.service'
import type { ManutencaoRealizadaResumo } from '@/services/manutencoes.service'
import ModalManutencaoRealizadaDetalhe from '@/app/admin/bens/components/ModalManutencaoRealizadaDetalhe'

interface Asset {
  id: number
  patrimony: string
  description: string
  brand: string | null
  model: string | null
  serialNumber: string | null
  departmentFullAddress?: string
  status: number
  assetTypeName: string
  coverPermalink: string | null
}

interface Agendamento {
  id: string
  trilogoAssetId: number
  titulo: string
  dataAgendada: string
  dataRealizada: string | null
  observacao: string | null
  status: string
  ambiente: string
}

interface Props {
  bens: Asset[]
  companyId: number
  companyName: string
  projeto: string
}

type BuscaState =
  | { status: 'idle' }
  | { status: 'loading' }
  | {
      status: 'success'
      bens: Asset[]
      agendamentos: Map<number, Agendamento[]>
      realizadas: Map<number, ManutencaoRealizadaResumo[]>
      query: string
    }
  | { status: 'error'; message: string }

async function fetchAgendamentos(ids: number[]): Promise<Map<number, Agendamento[]>> {
  const map = new Map<number, Agendamento[]>()
  if (ids.length === 0) return map
  try {
    const res = await fetch(`/api/bens/agendamentos-publicos?assetIds=${ids.join(',')}`, {
      credentials: 'include',
    })
    if (!res.ok) return map
    const json = await res.json() as { data: Agendamento[] }
    ;(json.data ?? []).forEach(ag => {
      if (!map.has(ag.trilogoAssetId)) map.set(ag.trilogoAssetId, [])
      map.get(ag.trilogoAssetId)!.push(ag)
    })
  } catch { /* não crítico */ }
  return map
}

async function fetchRealizadas(ids: number[]): Promise<Map<number, ManutencaoRealizadaResumo[]>> {
  const map = new Map<number, ManutencaoRealizadaResumo[]>()
  if (ids.length === 0) return map
  try {
    const lista = await manutencoesService.listarRealizadasPorAssets(ids)
    lista.forEach((m) => {
      if (!map.has(m.trilogoAssetId)) map.set(m.trilogoAssetId, [])
      map.get(m.trilogoAssetId)!.push(m)
    })
  } catch { /* não crítico */ }
  return map
}

export default function BensConteudo({ bens, companyId, companyName, projeto }: Props) {
  const [logado, setLogado] = useState(false)
  const [nomeUsuario, setNomeUsuario] = useState('')
  const [abrirModal, setAbrirModal] = useState(false)

  // agendamentos dos bens do ambiente (carregados ao fazer login)
  const [agAmbiente, setAgAmbiente] = useState<Map<number, Agendamento[]>>(new Map())
  // manutenções realizadas pelo operador (com fotos antes/depois)
  const [realizadasAmbiente, setRealizadasAmbiente] = useState<Map<number, ManutencaoRealizadaResumo[]>>(new Map())
  const [detalheManutencaoId, setDetalheManutencaoId] = useState<string | null>(null)

  // busca por patrimônio
  const [inputValor, setInputValor] = useState('')
  const [busca, setBusca] = useState<BuscaState>({ status: 'idle' })
  const inputRef = useRef<HTMLInputElement>(null)

  const modoAtivo = busca.status === 'success' || busca.status === 'loading' || busca.status === 'error'

  const handleLoginSucesso = useCallback(async () => {
    setAbrirModal(false)
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' })
      if (res.ok) {
        const json = await res.json() as { data?: { nome?: string } }
        setNomeUsuario(json.data?.nome ?? '')
      }
    } catch { /* não crítico */ }
    setLogado(true)
    // carrega agendamentos e manutenções realizadas dos bens do ambiente
    const ids = bens.map(b => b.id)
    const [agMap, realizadasMap] = await Promise.all([
      fetchAgendamentos(ids),
      fetchRealizadas(ids),
    ])
    setAgAmbiente(agMap)
    setRealizadasAmbiente(realizadasMap)
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [bens])

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } catch { /* silencioso */ }
    setLogado(false)
    setNomeUsuario('')
    setInputValor('')
    setBusca({ status: 'idle' })
    setAgAmbiente(new Map())
    setRealizadasAmbiente(new Map())
  }

  async function buscarPorPatrimonio(patrimony: string) {
    const q = patrimony.trim()
    if (!q) return
    setBusca({ status: 'loading' })
    try {
      const resBens = await fetch(
        `/api/bens/buscar-por-patrimonio?patrimony=${encodeURIComponent(q)}&companyId=${companyId}&projeto=${encodeURIComponent(projeto)}`,
        { credentials: 'include' },
      )
      if (!resBens.ok) {
        setBusca({ status: 'error', message: 'Erro ao buscar bens.' })
        return
      }
      const jsonBens = await resBens.json() as { data: Asset[] }
      const encontrados = jsonBens.data ?? []
      const ids = encontrados.map(b => b.id)
      const [agMap, realizadasMap] = await Promise.all([
        fetchAgendamentos(ids),
        fetchRealizadas(ids),
      ])
      setBusca({ status: 'success', bens: encontrados, agendamentos: agMap, realizadas: realizadasMap, query: q })
    } catch {
      setBusca({ status: 'error', message: 'Erro ao buscar bens.' })
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    buscarPorPatrimonio(inputValor)
  }

  function handleLimparBusca() {
    setInputValor('')
    setBusca({ status: 'idle' })
    inputRef.current?.focus()
  }

  return (
    <div className="space-y-4">
      {/* Controles de login / busca */}
      {!logado ? (
        <button
          onClick={() => setAbrirModal(true)}
          className="w-full flex items-center justify-center gap-2 border border-purple-200 text-purple-600 text-sm font-semibold py-2.5 rounded-xl hover:bg-purple-50 transition-colors bg-white"
        >
          <Search size={15} />
          Entrar para ver agendamentos e pesquisar bens
        </button>
      ) : (
        <div className="space-y-2">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Buscar por número do patrimônio..."
                value={inputValor}
                onChange={e => setInputValor(e.target.value)}
                className="w-full pl-8 pr-8 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
              />
              {inputValor && (
                <button
                  type="button"
                  onClick={handleLimparBusca}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={busca.status === 'loading' || !inputValor.trim()}
              className="flex items-center gap-1.5 bg-purple-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 shrink-0"
            >
              {busca.status === 'loading'
                ? <Loader2 size={14} className="animate-spin" />
                : <Search size={14} />}
              Buscar
            </button>

            <button
              type="button"
              onClick={handleLogout}
              title={`Sair (${nomeUsuario})`}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-xl px-3 py-2.5 bg-white transition-colors shrink-0"
            >
              <LogOut size={13} />
              Sair
            </button>
          </form>

          {!modoAtivo && (
            <p className="text-xs text-gray-400 text-center">
              Pesquise bens do projeto <span className="font-medium">{projeto}</span>
            </p>
          )}
        </div>
      )}

      {/* Resultado da busca por patrimônio */}
      {busca.status === 'loading' && (
        <div className="flex items-center justify-center py-10 text-gray-400 text-sm bg-white rounded-2xl border border-gray-100 gap-2">
          <Loader2 size={18} className="animate-spin" />
          Buscando...
        </div>
      )}

      {busca.status === 'error' && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {busca.message}
        </p>
      )}

      {busca.status === 'success' && (
        <div className="space-y-3">
          <p className="text-xs text-gray-400 text-center">
            {busca.bens.length === 0
              ? `Nenhum bem encontrado para "${busca.query}"`
              : `${busca.bens.length} bem${busca.bens.length !== 1 ? 'ns' : ''} encontrado${busca.bens.length !== 1 ? 's' : ''} para "${busca.query}"`}
          </p>
          {busca.bens.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm bg-white rounded-2xl border border-gray-100">
              <Package size={36} className="mx-auto mb-3 opacity-30" />
              Nenhum bem encontrado.
            </div>
          ) : (
            busca.bens.map(bem => (
              <BemCard
                key={bem.id}
                bem={bem}
                agendamentos={busca.agendamentos.get(bem.id) ?? []}
                realizadas={busca.realizadas.get(bem.id) ?? []}
                logado={logado}
                onPedirLogin={() => setAbrirModal(true)}
                onAbrirRealizada={setDetalheManutencaoId}
              />
            ))
          )}
        </div>
      )}

      {/* Bens do ambiente — visível sempre que não estiver em modo de busca */}
      {!modoAtivo && (
        <div className="space-y-3">
          {bens.map(bem => (
            <BemCard
              key={bem.id}
              bem={bem}
              agendamentos={agAmbiente.get(bem.id) ?? []}
              realizadas={realizadasAmbiente.get(bem.id) ?? []}
              logado={logado}
              onPedirLogin={() => setAbrirModal(true)}
              onAbrirRealizada={setDetalheManutencaoId}
            />
          ))}
        </div>
      )}

      {abrirModal && (
        <ModalLoginBem
          onSuccess={handleLoginSucesso}
          onClose={() => setAbrirModal(false)}
        />
      )}

      {detalheManutencaoId && (
        <ModalManutencaoRealizadaDetalhe
          id={detalheManutencaoId}
          onClose={() => setDetalheManutencaoId(null)}
        />
      )}
    </div>
  )
}
