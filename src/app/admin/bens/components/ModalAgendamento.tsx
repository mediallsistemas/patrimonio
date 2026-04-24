'use client'

import { useState, useRef, useEffect } from 'react'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { X, CheckCircle2, XCircle, CalendarCheck } from 'lucide-react'
import type { Asset, Agendamento } from '../bens.types'
import { parseEndereco, getSugestoes } from '../bens.types'

interface Props {
  asset: Asset
  agendamentos: Agendamento[]
  onClose: () => void
}

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function isoToInputDate(iso: string) {
  return new Date(iso).toISOString().slice(0, 10)
}

// Retorna mapa chave "YYYY-MM" -> Agendamento[] para os realizados
function mapearPorMes(realizados: Agendamento[]): Map<string, Agendamento[]> {
  const map = new Map<string, Agendamento[]>()
  realizados.forEach(ag => {
    const d = new Date(ag.dataRealizada ?? ag.dataAgendada)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(ag)
  })
  return map
}

function DetalheCard({ ag }: { ag: Agendamento }) {
  const [hover, setHover] = useState(false)

  return (
    <div
      key={ag.id}
      className="relative bg-white rounded-lg px-2 py-1.5 border border-emerald-100 cursor-default"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <p className="text-xs font-medium text-gray-700 leading-tight line-clamp-2">{ag.titulo}</p>
      <p className="text-xs text-emerald-600 mt-0.5">{formatDate(ag.dataRealizada ?? ag.dataAgendada)}</p>

      {hover && (
        <div
          className="fixed z-9999 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 space-y-3 pointer-events-none overflow-hidden"
        >
          <p className="text-sm font-semibold text-gray-800 wrap-break-word">{ag.titulo}</p>
          {ag.observacao && (
            <p className="text-sm text-gray-500 leading-relaxed wrap-break-word">{ag.observacao}</p>
          )}
          <div className="border-t border-gray-100 pt-3 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Agendado</span>
              <span className="text-gray-700 font-medium">{formatDate(ag.dataAgendada)}</span>
            </div>
            {ag.dataRealizada && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Realizado</span>
                <span className="text-emerald-600 font-medium">{formatDate(ag.dataRealizada)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ModalAgendamento({ asset, agendamentos, onClose }: Props) {
  const qc  = useQueryClient()
  const end = parseEndereco(asset.departmentFullAddress)
  const sugestoes = getSugestoes(asset.assetTypeName)

  const [titulo, setTitulo] = useState('')
  const [custom, setCustom] = useState('')
  const [data,   setData]   = useState('')
  const [obs,    setObs]    = useState('')

  const tituloFinal = titulo === '__outro__' ? custom : titulo
  const podeSalvar  = tituloFinal.trim() && data

  const [confirmandoId, setConfirmandoId]           = useState<string | null>(null)
  const [dataRealizadaInput, setDataRealizadaInput] = useState('')

  const scrollRef    = useRef<HTMLDivElement>(null)
  const isDragging   = useRef(false)
  const dragStartX   = useRef(0)
  const dragScrollL  = useRef(0)

  const anoAtual  = new Date().getFullYear()
  const mesAtual  = new Date().getMonth() // 0-based

  // Gera os 12 meses do ano corrente
  const mesesDoAno: string[] = Array.from({ length: 12 }, (_, i) =>
    `${anoAtual}-${String(i + 1).padStart(2, '0')}`,
  )

  const pendentes  = agendamentos.filter(ag => ag.status === 'pendente')
  const realizados = agendamentos.filter(ag => ag.status === 'realizado')
  const porMes     = mapearPorMes(realizados)

  const hojeStr = new Date().toISOString().slice(0, 10)
  function isAtrasado(ag: Agendamento) {
    return ag.dataAgendada.slice(0, 10) < hojeStr
  }

  // Scroll automático até o mês atual ao abrir
  useEffect(() => {
    if (!scrollRef.current) return
    const mesIdx = mesAtual
    const cardW  = 112 + 8 // w-28 + gap-2
    scrollRef.current.scrollLeft = Math.max(0, mesIdx * cardW - 16)
  }, [mesAtual])

  // Drag-to-scroll
  function onMouseDown(e: React.MouseEvent) {
    isDragging.current  = true
    dragStartX.current  = e.pageX
    dragScrollL.current = scrollRef.current?.scrollLeft ?? 0
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!isDragging.current || !scrollRef.current) return
    scrollRef.current.scrollLeft = dragScrollL.current - (e.pageX - dragStartX.current)
  }
  function onMouseUp() { isDragging.current = false }

  const { mutate: criar, isPending: criando, isError: erroCriar } = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/agendamentos', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          trilogoAssetId: asset.id, patrimony: asset.patrimony,
          descricaoBem: asset.description, companyId: asset.companyId,
          companyName: asset.companyName, ambiente: end.ambiente,
          dataAgendada: new Date(data).toISOString(), titulo: tituloFinal, observacao: obs,
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

  const { mutate: atualizarStatus, isPending: atualizando } = useMutation({
    mutationFn: async ({ id, status, dataRealizada }: { id: string; status: string; dataRealizada?: string }) => {
      const res = await fetch(`/api/agendamentos/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          status,
          ...(dataRealizada ? { dataRealizada: new Date(dataRealizada).toISOString() } : {}),
        }),
      })
      if (!res.ok) throw new Error()
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agendamentos'] })
      setConfirmandoId(null)
      setDataRealizadaInput('')
    },
  })

  function iniciarConfirmacao(id: string, dataAg: string) {
    setConfirmandoId(id)
    setDataRealizadaInput(isoToInputDate(dataAg))
  }

  function confirmarRealizado() {
    if (!confirmandoId) return
    atualizarStatus({ id: confirmandoId, status: 'realizado', dataRealizada: dataRealizadaInput })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="font-semibold text-gray-800">Manutenções</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

          {/* Bem */}
          <div className="bg-gray-50 rounded-xl p-3 space-y-0.5">
            <p className="text-sm font-medium text-gray-800">{asset.description}</p>
            <p className="text-xs text-purple-600 font-mono">{asset.patrimony}</p>
            <p className="text-xs text-gray-500">{end.ambiente} · {end.unidade}</p>
          </div>

          {/* Calendário anual horizontal */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
              <CheckCircle2 size={12} className="text-emerald-500" />
              Histórico {anoAtual}
              {realizados.length > 0 && <span className="text-gray-400 font-normal normal-case">· {realizados.length} realizado{realizados.length !== 1 ? 's' : ''}</span>}
            </p>
            <div
              ref={scrollRef}
              className="flex gap-2 overflow-x-auto pb-1 select-none"
              style={{ scrollbarWidth: 'none', cursor: isDragging.current ? 'grabbing' : 'grab' }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
            >
              {mesesDoAno.map((chave, idx) => {
                const ags       = porMes.get(chave) ?? []
                const temDados  = ags.length > 0
                const eAtual    = idx === mesAtual
                return (
                  <div
                    key={chave}
                    className={`shrink-0 w-28 rounded-xl p-2.5 border transition-colors ${
                      temDados
                        ? 'border-emerald-300 bg-emerald-50'
                        : eAtual
                        ? 'border-purple-200 bg-purple-50'
                        : 'border-gray-100 bg-gray-50'
                    }`}
                  >
                    {/* Cabeçalho do mês */}
                    <div className="flex items-center justify-between mb-1.5">
                      <p className={`text-xs font-bold ${temDados ? 'text-emerald-700' : eAtual ? 'text-purple-600' : 'text-gray-400'}`}>
                        {MESES[idx]}
                      </p>
                      {temDados && (
                        <span className="text-xs font-semibold text-emerald-600 bg-emerald-200 rounded-full w-4 h-4 flex items-center justify-center leading-none">
                          {ags.length}
                        </span>
                      )}
                      {eAtual && !temDados && (
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                      )}
                    </div>

                    {/* Registros do mês */}
                    {temDados ? (
                      <div className="space-y-1">
                        {ags.map(ag => (
                          <DetalheCard key={ag.id} ag={ag} />
                        ))}
                      </div>
                    ) : (
                      <p className={`text-xs ${eAtual ? 'text-purple-400' : 'text-gray-300'}`}>—</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Pendentes */}
          {pendentes.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Agendamentos pendentes</p>
              {pendentes.map(ag => {
                const atrasado   = isAtrasado(ag)
                const confirmando = confirmandoId === ag.id
                return (
                  <div key={ag.id} className={`border rounded-lg px-3 py-2.5 space-y-1.5 ${atrasado ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-gray-800">{ag.titulo}</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${atrasado ? 'bg-red-100 text-red-700' : 'bg-purple-100 text-purple-700'}`}>
                        {atrasado ? 'Atrasado' : 'Agendado'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{formatDate(ag.dataAgendada)}</p>
                    {ag.observacao && <p className="text-xs text-gray-400">{ag.observacao}</p>}

                    {confirmando ? (
                      <div className="pt-1 space-y-2">
                        <p className="text-xs font-semibold text-gray-600">Data de realização</p>
                        <input
                          type="date"
                          value={dataRealizadaInput}
                          onChange={e => setDataRealizadaInput(e.target.value)}
                          max={new Date().toISOString().slice(0, 10)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={confirmarRealizado}
                            disabled={atualizando}
                            style={{
                              backgroundColor: '#10b981',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '12px',
                              fontWeight: 600,
                              padding: '6px 12px',
                              borderRadius: '8px',
                              border: 'none',
                              cursor: atualizando ? 'not-allowed' : 'pointer',
                              opacity: atualizando ? 0.6 : 1,
                            }}
                          >
                            <CalendarCheck size={12} /> {atualizando ? 'Salvando...' : 'Confirmar'}
                          </button>
                          <button onClick={() => setConfirmandoId(null)} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5">
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-3 pt-1">
                        <button onClick={() => iniciarConfirmacao(ag.id, ag.dataAgendada)}
                          className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                          <CheckCircle2 size={13} /> Marcar como realizado
                        </button>
                        <span className="text-gray-300">·</span>
                        <button onClick={() => atualizarStatus({ id: ag.id, status: 'cancelado' })}
                          className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium">
                          <XCircle size={13} /> Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Novo agendamento */}
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

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-gray-100 shrink-0">
          <button onClick={onClose} className="flex-1 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
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
