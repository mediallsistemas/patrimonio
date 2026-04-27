'use client'

import { useState, useCallback } from 'react'
import { Lock, CalendarPlus, AlertCircle, CheckCircle2, LogOut } from 'lucide-react'
import ModalLoginBem from './ModalLoginBem'

interface Agendamento {
  id: string
  trilogoAssetId: number
  titulo: string
  dataAgendada: Date | string
  dataRealizada: Date | string | null
  observacao: string | null
  status: string
  ambiente: string
}

interface Asset {
  id: number
  patrimony: string
  description: string
}

interface Props {
  assets: Asset[]
  filtroPatrimonio: string
}

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function AgendamentosSection({ assets, filtroPatrimonio }: Props) {
  const [logado, setLogado] = useState(false)
  const [nomeUsuario, setNomeUsuario] = useState('')
  const [abrirModal, setAbrirModal] = useState(false)
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  const buscarAgendamentos = useCallback(async (ids: number[]) => {
    if (ids.length === 0) return
    setCarregando(true)
    setErro('')
    try {
      const res = await fetch(
        `/api/bens/agendamentos-publicos?assetIds=${ids.join(',')}`,
        { credentials: 'include' },
      )
      if (!res.ok) {
        setErro('Não foi possível carregar os agendamentos.')
        return
      }
      const json = await res.json() as { data: Agendamento[] }
      setAgendamentos(json.data ?? [])
    } catch {
      setErro('Erro ao carregar agendamentos.')
    } finally {
      setCarregando(false)
    }
  }, [])

  async function handleLoginSucesso() {
    setAbrirModal(false)

    // Lê o nome do usuário do cookie via endpoint de perfil
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' })
      if (res.ok) {
        const json = await res.json() as { data?: { nome?: string } }
        setNomeUsuario(json.data?.nome ?? '')
      }
    } catch {
      // não crítico
    }

    setLogado(true)
    await buscarAgendamentos(assets.map(a => a.id))
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } catch {
      // silencioso
    }
    setLogado(false)
    setAgendamentos([])
    setNomeUsuario('')
  }

  const assetsFiltrados = filtroPatrimonio
    ? assets.filter(a => a.patrimony.toLowerCase().includes(filtroPatrimonio.toLowerCase()))
    : assets

  const idsVisiveis = new Set(assetsFiltrados.map(a => a.id))
  const agsFiltrados = agendamentos.filter(ag => idsVisiveis.has(ag.trilogoAssetId))

  const hojeStr = new Date().toISOString().slice(0, 10)
  const pendentes = agsFiltrados.filter(ag => ag.status === 'pendente')
  const realizados = agsFiltrados.filter(ag => ag.status === 'realizado')

  if (!logado) {
    return (
      <>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center gap-4 text-center">
          <div className="p-3 bg-purple-50 rounded-2xl">
            <Lock size={24} className="text-purple-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700">Agendamentos de manutenção</p>
            <p className="text-xs text-gray-400 mt-1">Faça login para visualizar os agendamentos deste ambiente</p>
          </div>
          <button
            onClick={() => setAbrirModal(true)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            <Lock size={14} />
            Entrar para ver
          </button>
        </div>

        {abrirModal && (
          <ModalLoginBem
            onSuccess={handleLoginSucesso}
            onClose={() => setAbrirModal(false)}
          />
        )}
      </>
    )
  }

  return (
    <div className="space-y-3">
      {/* Cabeçalho logado */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Agendamentos de manutenção
          {nomeUsuario && <span className="normal-case font-normal text-gray-400"> · {nomeUsuario}</span>}
        </p>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          <LogOut size={12} />
          Sair
        </button>
      </div>

      {carregando && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex items-center justify-center">
          <span className="w-5 h-5 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
        </div>
      )}

      {erro && !carregando && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-600 text-center">
          {erro}
        </div>
      )}

      {!carregando && !erro && pendentes.length === 0 && realizados.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center text-sm text-gray-400">
          <CalendarPlus size={28} className="mx-auto mb-2 opacity-30" />
          Nenhum agendamento para este ambiente.
        </div>
      )}

      {/* Pendentes */}
      {pendentes.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1">
            <CalendarPlus size={12} className="text-purple-500" />
            Pendentes ({pendentes.length})
          </p>
          {pendentes.map(ag => {
            const atrasado = new Date(ag.dataAgendada as string).toISOString().slice(0, 10) < hojeStr
            const asset = assets.find(a => a.id === ag.trilogoAssetId)
            return (
              <div
                key={ag.id}
                className={`bg-white rounded-2xl border shadow-sm px-4 py-3 space-y-1 ${
                  atrasado ? 'border-red-200' : 'border-purple-100'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{ag.titulo}</p>
                    {asset && (
                      <p className="text-xs text-gray-400 truncate">{asset.description} · <span className="font-mono text-purple-500">{asset.patrimony}</span></p>
                    )}
                  </div>
                  <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${
                    atrasado ? 'bg-red-100 text-red-700' : 'bg-purple-100 text-purple-700'
                  }`}>
                    {atrasado ? 'Atrasado' : 'Agendado'}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  {atrasado
                    ? <AlertCircle size={11} className="text-red-400" />
                    : <CalendarPlus size={11} className="text-purple-400" />}
                  {formatDate(ag.dataAgendada)}
                </div>
                {ag.observacao && (
                  <p className="text-xs text-gray-400">{ag.observacao}</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Realizados */}
      {realizados.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1">
            <CheckCircle2 size={12} className="text-emerald-500" />
            Realizados ({realizados.length})
          </p>
          {realizados.map(ag => {
            const asset = assets.find(a => a.id === ag.trilogoAssetId)
            return (
              <div key={ag.id} className="bg-white rounded-2xl border border-emerald-100 shadow-sm px-4 py-3 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{ag.titulo}</p>
                    {asset && (
                      <p className="text-xs text-gray-400 truncate">{asset.description} · <span className="font-mono text-purple-500">{asset.patrimony}</span></p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                    Realizado
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <CheckCircle2 size={11} className="text-emerald-400" />
                  {formatDate(ag.dataRealizada ?? ag.dataAgendada)}
                </div>
                {ag.observacao && (
                  <p className="text-xs text-gray-400">{ag.observacao}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
