'use client'

import { useState } from 'react'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { X, CheckCircle2, XCircle } from 'lucide-react'
import type { Asset, Agendamento } from '../bens.types'
import { parseEndereco, getSugestoes } from '../bens.types'

interface Props {
  asset: Asset
  agendamentos: Agendamento[]
  onClose: () => void
}

export default function ModalAgendamento({ asset, agendamentos, onClose }: Props) {
  const qc = useQueryClient()
  const end = parseEndereco(asset.departmentFullAddress)
  const sugestoes = getSugestoes(asset.assetTypeName)

  const [titulo, setTitulo] = useState('')
  const [custom, setCustom] = useState('')
  const [data,   setData]   = useState('')
  const [obs,    setObs]    = useState('')
  const [verHistorico, setVerHistorico] = useState(false)

  const tituloFinal = titulo === '__outro__' ? custom : titulo
  const podeSalvar  = tituloFinal.trim() && data

  const pendentes  = agendamentos.filter(ag => ag.status === 'pendente')
  const realizados = agendamentos.filter(ag => ag.status === 'realizado')

  const { mutate: criar, isPending: criando, isError: erroCriar } = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/agendamentos', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          trilogoAssetId: asset.id, patrimony: asset.patrimony,
          descricaoBem: asset.description, companyId: asset.companyId,
          companyName: asset.companyName, ambiente: end.ambiente,
          dataAgendada: data, titulo: tituloFinal, observacao: obs,
        }),
      })
      if (!res.ok) throw new Error()
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agendamentos'] })
      setTitulo(''); setCustom(''); setData(''); setObs('')
    },
  })

  const { mutate: atualizarStatus } = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/agendamentos/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error()
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agendamentos'] }),
  })

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="font-semibold text-gray-800">Manutenções</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          <div className="bg-gray-50 rounded-xl p-3 space-y-0.5">
            <p className="text-sm font-medium text-gray-800">{asset.description}</p>
            <p className="text-xs text-purple-600 font-mono">{asset.patrimony}</p>
            <p className="text-xs text-gray-500">{end.ambiente} · {end.unidade}</p>
          </div>

          {pendentes.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Agendamentos pendentes</p>
              {pendentes.map(ag => (
                <div key={ag.id} className="border border-gray-200 rounded-lg px-3 py-2.5 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-gray-800">{ag.titulo}</p>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Pendente</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {new Date(ag.dataAgendada).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                  {ag.observacao && <p className="text-xs text-gray-400">{ag.observacao}</p>}
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => atualizarStatus({ id: ag.id, status: 'realizado' })}
                      className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                      <CheckCircle2 size={13} /> Marcar como realizado
                    </button>
                    <span className="text-gray-300">·</span>
                    <button onClick={() => atualizarStatus({ id: ag.id, status: 'cancelado' })}
                      className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium">
                      <XCircle size={13} /> Cancelar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {realizados.length > 0 && (
            <div className="space-y-2">
              <button onClick={() => setVerHistorico(v => !v)}
                className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide hover:text-gray-600 transition-colors">
                <CheckCircle2 size={13} className="text-emerald-500" />
                Histórico ({realizados.length})
                <span className="text-gray-300">{verHistorico ? '▲' : '▼'}</span>
              </button>
              {verHistorico && realizados.map(ag => (
                <div key={ag.id} className="border border-gray-100 rounded-lg px-3 py-2.5 space-y-1 bg-gray-50">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-gray-600">{ag.titulo}</p>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Realizado</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {new Date(ag.dataAgendada).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                  {ag.observacao && <p className="text-xs text-gray-400">{ag.observacao}</p>}
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3 border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Novo agendamento</p>

            <div className="space-y-2">
              <label className="block text-xs text-gray-500 mb-1">Tipo de manutenção *</label>
              <select value={titulo} onChange={e => { setTitulo(e.target.value); setCustom('') }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white">
                <option value="">Selecione o tipo...</option>
                {sugestoes.map(s => <option key={s} value={s}>{s}</option>)}
                <option value="__outro__">Outro (digitar)</option>
              </select>
              {titulo === '__outro__' && (
                <input type="text" value={custom} onChange={e => setCustom(e.target.value)}
                  placeholder="Descreva o tipo de manutenção..." autoFocus
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
              )}
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Data *</label>
              <input type="date" value={data} onChange={e => setData(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Observação</label>
              <textarea value={obs} onChange={e => setObs(e.target.value)} rows={2}
                placeholder="Detalhes adicionais..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none" />
            </div>

            {erroCriar && <p className="text-xs text-red-500">Erro ao salvar. Tente novamente.</p>}
          </div>
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-gray-100 shrink-0">
          <button onClick={onClose}
            className="flex-1 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            Fechar
          </button>
          <button onClick={() => criar()} disabled={!podeSalvar || criando}
            className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg transition-colors"
            style={{ backgroundColor: podeSalvar && !criando ? '#7c3aed' : '#a78bfa' }}>
            {criando ? 'Salvando...' : 'Agendar'}
          </button>
        </div>
      </div>
    </div>
  )
}
