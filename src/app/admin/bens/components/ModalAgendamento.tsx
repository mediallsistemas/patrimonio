'use client'

import { useState, useRef, useEffect } from 'react'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { X, CheckCircle2, XCircle, CalendarCheck, ChevronLeft, ChevronRight, Repeat2 } from 'lucide-react'
import type { Asset, Agendamento } from '../bens.types'
import { parseEndereco, getSugestoes } from '../bens.types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  asset: Asset
  agendamentos: Agendamento[]
  onClose: () => void
}

type Recorrencia = 'nenhuma' | 'semanal' | 'quinzenal' | 'mensal' | 'bimestral' | 'trimestral' | 'semestral' | 'anual'

interface OpcaoRecorrencia {
  valor: Recorrencia
  label: string
  descricao: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const OPCOES_RECORRENCIA: OpcaoRecorrencia[] = [
  { valor: 'nenhuma',    label: 'Sem repetição',  descricao: 'Agendamento único' },
  { valor: 'semanal',    label: 'Semanal',         descricao: 'A cada 7 dias' },
  { valor: 'quinzenal',  label: 'Quinzenal',       descricao: 'A cada 15 dias' },
  { valor: 'mensal',     label: 'Mensal',          descricao: 'Mesmo dia todo mês' },
  { valor: 'bimestral',  label: 'Bimestral',       descricao: 'A cada 2 meses' },
  { valor: 'trimestral', label: 'Trimestral',      descricao: 'A cada 3 meses' },
  { valor: 'semestral',  label: 'Semestral',       descricao: 'A cada 6 meses' },
  { valor: 'anual',      label: 'Anual',           descricao: 'Mesmo dia todo ano' },
]

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  // Força parse como local time adicionando T12:00 para evitar shift de timezone
  const s = iso.length === 10 ? `${iso}T12:00:00` : iso
  return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function isoToInputDate(iso: string) {
  return new Date(iso).toISOString().slice(0, 10)
}

function isoParaChaveMes(iso: string): string {
  return iso.slice(0, 7)
}

function mapearPorMes(lista: Agendamento[]): Map<string, Agendamento[]> {
  const map = new Map<string, Agendamento[]>()
  lista.forEach(ag => {
    const iso = ag.status === 'realizado' ? (ag.dataRealizada ?? ag.dataAgendada) : ag.dataAgendada
    const key = isoParaChaveMes(iso)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(ag)
  })
  return map
}

// Gera todas as datas da recorrência a partir de dataInicio até o fim do mês "ateAnoMes"
function gerarDatasRecorrencia(dataInicio: string, recorrencia: Recorrencia, ateAnoMes: string): string[] {
  if (recorrencia === 'nenhuma' || !ateAnoMes) return [dataInicio]

  const datas: string[] = []
  const [ateAno, ateMes] = ateAnoMes.split('-').map(Number)
  // último dia do mês limite
  const limite = new Date(ateAno, ateMes, 0) // dia 0 do próximo mês = último do atual

  const [ano, mes, dia] = dataInicio.split('-').map(Number)
  let atual = new Date(ano, mes - 1, dia)

  const avancar: Record<Exclude<Recorrencia, 'nenhuma'>, (d: Date) => Date> = {
    semanal:    d => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7),
    quinzenal:  d => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 15),
    mensal:     d => new Date(d.getFullYear(), d.getMonth() + 1, d.getDate()),
    bimestral:  d => new Date(d.getFullYear(), d.getMonth() + 2, d.getDate()),
    trimestral: d => new Date(d.getFullYear(), d.getMonth() + 3, d.getDate()),
    semestral:  d => new Date(d.getFullYear(), d.getMonth() + 6, d.getDate()),
    anual:      d => new Date(d.getFullYear() + 1, d.getMonth(), d.getDate()),
  }

  while (atual <= limite) {
    const y = atual.getFullYear()
    const m = String(atual.getMonth() + 1).padStart(2, '0')
    const d = String(atual.getDate()).padStart(2, '0')
    datas.push(`${y}-${m}-${d}`)
    atual = avancar[recorrencia as Exclude<Recorrencia, 'nenhuma'>](atual)
  }

  return datas
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DetalheCard({ ag }: { ag: Agendamento }) {
  const [hover, setHover] = useState(false)
  const realizado = ag.status === 'realizado'

  return (
    <div
      className={`relative rounded-lg px-2 py-1.5 border cursor-default ${
        realizado ? 'bg-white border-emerald-200' : 'bg-purple-50 border-purple-200'
      }`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <p className={`text-xs font-medium leading-tight line-clamp-2 ${realizado ? 'text-gray-700' : 'text-purple-800'}`}>
        {ag.titulo}
      </p>
      <p className={`text-xs mt-0.5 ${realizado ? 'text-emerald-600' : 'text-purple-500'}`}>
        {formatDate(ag.dataRealizada ?? ag.dataAgendada)}
      </p>

      {hover && (
        <div className="fixed z-9999 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 space-y-3 pointer-events-none overflow-hidden">
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

// ─── Main component ───────────────────────────────────────────────────────────

export default function ModalAgendamento({ asset, agendamentos, onClose }: Props) {
  const qc      = useQueryClient()
  const end     = parseEndereco(asset.departmentFullAddress)
  const sugestoes = getSugestoes(asset.assetTypeName)

  // — Formulário novo agendamento —
  const [titulo,      setTitulo]      = useState('')
  const [custom,      setCustom]      = useState('')
  const [data,        setData]        = useState('')
  const [obs,         setObs]         = useState('')
  const [recorrencia, setRecorrencia] = useState<Recorrencia>('nenhuma')
  const [ateAnoMes,   setAteAnoMes]   = useState('')

  const tituloFinal  = titulo === '__outro__' ? custom : titulo
  const datasGeradas = data && recorrencia !== 'nenhuma' && ateAnoMes
    ? gerarDatasRecorrencia(data, recorrencia, ateAnoMes)
    : data ? [data] : []
  const podeSalvar   = tituloFinal.trim() && datasGeradas.length > 0

  // ateAnoMes mínimo = mês da data inicial
  const ateAnoMesMin = data ? data.slice(0, 7) : ''

  // — Confirmação de realizado —
  const [confirmandoId,       setConfirmandoId]       = useState<string | null>(null)
  const [dataRealizadaInput,  setDataRealizadaInput]  = useState('')

  // — Calendário —
  const scrollRef   = useRef<HTMLDivElement>(null)
  const isDragging  = useRef(false)
  const dragStartX  = useRef(0)
  const dragScrollL = useRef(0)

  const hoje     = new Date()
  const anoAtual = hoje.getFullYear()
  const mesAtual = hoje.getMonth()

  const [anoSelecionado, setAnoSelecionado] = useState(anoAtual)

  const pendentes  = agendamentos.filter(ag => ag.status === 'pendente')
  const realizados = agendamentos.filter(ag => ag.status === 'realizado')

  const anoMinimo = realizados.reduce((min, ag) => {
    return Math.min(min, parseInt((ag.dataRealizada ?? ag.dataAgendada).slice(0, 4), 10))
  }, anoAtual)

  const anoMaximo = agendamentos.reduce((max, ag) => {
    return Math.max(max, parseInt(ag.dataAgendada.slice(0, 4), 10))
  }, anoAtual)

  const noAno = agendamentos.filter(ag => {
    const iso = ag.status === 'realizado' ? (ag.dataRealizada ?? ag.dataAgendada) : ag.dataAgendada
    return parseInt(iso.slice(0, 4), 10) === anoSelecionado
  })
  const realizadosNoAno = noAno.filter(ag => ag.status === 'realizado')
  const porMes          = mapearPorMes(noAno)
  const mesesDoAno      = Array.from({ length: 12 }, (_, i) =>
    `${anoSelecionado}-${String(i + 1).padStart(2, '0')}`,
  )

  const hojeStr = hoje.toISOString().slice(0, 10)
  function isAtrasado(ag: Agendamento) {
    return ag.dataAgendada.slice(0, 10) < hojeStr
  }

  useEffect(() => {
    if (!scrollRef.current) return
    const mesIdx = anoSelecionado === anoAtual ? mesAtual : 0
    const cardW  = 112 + 8
    scrollRef.current.scrollLeft = Math.max(0, mesIdx * cardW - 16)
  }, [anoSelecionado, anoAtual, mesAtual])

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

  // — Mutations —

  const { mutate: criar, isPending: criando, isError: erroCriar } = useMutation({
    mutationFn: async () => {
      // Envia uma request por data gerada (sequencial, em série)
      for (const dataAgendada of datasGeradas) {
        // Força noon UTC para evitar que a conversão de timezone mude o dia
        const res = await fetch('/api/agendamentos', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            trilogoAssetId: asset.id,
            patrimony:      asset.patrimony,
            descricaoBem:   asset.description,
            companyId:      asset.companyId,
            companyName:    asset.companyName,
            ambiente:       end.ambiente,
            dataAgendada:   `${dataAgendada}T12:00:00.000Z`,
            titulo:         tituloFinal,
            observacao:     obs,
          }),
        })
        if (!res.ok) throw new Error()
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agendamentos'] })
      setTitulo(''); setCustom(''); setData(''); setObs('')
      setRecorrencia('nenhuma'); setAteAnoMes('')
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
    if (!confirmandoId || !dataRealizadaInput) return
    atualizarStatus({ id: confirmandoId, status: 'realizado', dataRealizada: dataRealizadaInput })
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

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
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                <CheckCircle2 size={12} className="text-emerald-500" />
                Histórico {anoSelecionado}
                {realizadosNoAno.length > 0 && (
                  <span className="text-gray-400 font-normal normal-case">
                    · {realizadosNoAno.length} realizado{realizadosNoAno.length !== 1 ? 's' : ''}
                  </span>
                )}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setAnoSelecionado(a => a - 1)}
                  disabled={anoSelecionado <= anoMinimo}
                  className="p-0.5 rounded text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs font-bold text-gray-700 w-10 text-center tabular-nums">
                  {anoSelecionado}
                </span>
                <button
                  onClick={() => setAnoSelecionado(a => a + 1)}
                  disabled={anoSelecionado >= anoMaximo}
                  className="p-0.5 rounded text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
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
                const ags           = porMes.get(chave) ?? []
                const temRealizados = ags.some(ag => ag.status === 'realizado')
                const temPendentes  = ags.some(ag => ag.status === 'pendente')
                const labelColor    = temRealizados ? 'text-emerald-600' : temPendentes ? 'text-purple-600' : 'text-gray-400'
                return (
                  <div key={chave} className="shrink-0 w-28 rounded-xl p-2.5 border border-gray-100 bg-white">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className={`text-xs font-bold ${labelColor}`}>{MESES[idx]}</p>
                      {temRealizados && (
                        <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 rounded-full w-4 h-4 flex items-center justify-center leading-none">
                          {ags.filter(ag => ag.status === 'realizado').length}
                        </span>
                      )}
                    </div>
                    {ags.length > 0 ? (
                      <div className="space-y-1">
                        {ags.map(ag => <DetalheCard key={ag.id} ag={ag} />)}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-300">—</p>
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
                          max={hojeStr}
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={confirmarRealizado}
                            disabled={atualizando || !dataRealizadaInput}
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
                              cursor: atualizando || !dataRealizadaInput ? 'not-allowed' : 'pointer',
                              opacity: atualizando || !dataRealizadaInput ? 0.6 : 1,
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

            {/* Tipo */}
            <div className="space-y-2">
              <label className="block text-xs text-gray-500">Tipo de manutenção *</label>
              <select
                value={titulo}
                onChange={e => { setTitulo(e.target.value); setCustom('') }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
              >
                <option value="">Selecione o tipo...</option>
                {sugestoes.map(s => <option key={s} value={s}>{s}</option>)}
                <option value="__outro__">Outro (digitar)</option>
              </select>
              {titulo === '__outro__' && (
                <input
                  type="text"
                  value={custom}
                  onChange={e => setCustom(e.target.value)}
                  placeholder="Descreva o tipo de manutenção..."
                  autoFocus
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              )}
            </div>

            {/* Data inicial */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                {recorrencia === 'nenhuma' ? 'Data *' : 'Data inicial *'}
              </label>
              <input
                type="date"
                value={data}
                onChange={e => { setData(e.target.value); setAteAnoMes('') }}
                min={hojeStr}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>

            {/* Recorrência */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Recorrência</label>
              <select
                value={recorrencia}
                onChange={e => { setRecorrencia(e.target.value as Recorrencia); setAteAnoMes('') }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
              >
                {OPCOES_RECORRENCIA.map(op => (
                  <option key={op.valor} value={op.valor}>
                    {op.label} — {op.descricao}
                  </option>
                ))}
              </select>
            </div>

            {/* Repetir até — só aparece quando há recorrência e data inicial preenchida */}
            {recorrencia !== 'nenhuma' && data && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Repetir até *</label>
                <input
                  type="month"
                  value={ateAnoMes}
                  onChange={e => setAteAnoMes(e.target.value)}
                  min={ateAnoMesMin}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
                {datasGeradas.length > 1 && (
                  <div className="mt-2 flex items-center gap-1.5 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
                    <Repeat2 size={13} className="text-purple-400 shrink-0" />
                    <p className="text-xs text-purple-700">
                      <span className="font-semibold">{datasGeradas.length} agendamentos</span>
                      {' '}serão criados —{' '}
                      {formatDate(datasGeradas[0])} até {formatDate(datasGeradas[datasGeradas.length - 1])}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Observação */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Observação</label>
              <textarea
                value={obs}
                onChange={e => setObs(e.target.value)}
                rows={2}
                placeholder="Detalhes adicionais..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none"
              />
            </div>

            {erroCriar && <p className="text-xs text-red-500">Erro ao salvar. Tente novamente.</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-gray-100 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Fechar
          </button>
          <button
            onClick={() => criar()}
            disabled={!podeSalvar || criando}
            className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg transition-colors"
            style={{ backgroundColor: podeSalvar && !criando ? '#7c3aed' : '#a78bfa' }}
          >
            {criando
              ? 'Salvando...'
              : datasGeradas.length > 1
              ? `Agendar ${datasGeradas.length}x`
              : 'Agendar'}
          </button>
        </div>
      </div>
    </div>
  )
}
