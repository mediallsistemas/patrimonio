'use client'

import { useState } from 'react'
import { Package, ChevronDown, ChevronUp, AlertCircle, CalendarPlus, CheckCircle2, Lock, ChevronLeft, ChevronRight } from 'lucide-react'

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
  brand: string | null
  model: string | null
  serialNumber: string | null
  status: number
  assetTypeName: string
  coverPermalink: string | null
}

interface Props {
  bem: Asset
  agendamentos: Agendamento[]
  logado: boolean
  onPedirLogin: () => void
}

const STATUS_LABEL: Record<number, { label: string; color: string }> = {
  1: { label: 'Ativo',      color: 'bg-emerald-100 text-emerald-700' },
  2: { label: 'Inativo',    color: 'bg-gray-100 text-gray-500' },
  4: { label: 'Manutenção', color: 'bg-amber-100 text-amber-700' },
}

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function isoParaChaveMes(iso: string): string {
  return iso.slice(0, 7)
}

function mapearPorMes(lista: Agendamento[]): Map<string, Agendamento[]> {
  const map = new Map<string, Agendamento[]>()
  lista.forEach(ag => {
    const iso = ag.status === 'realizado'
      ? ((ag.dataRealizada ?? ag.dataAgendada) as string)
      : (ag.dataAgendada as string)
    const key = isoParaChaveMes(iso)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(ag)
  })
  return map
}

function HistoricoAnual({ agendamentos }: { agendamentos: Agendamento[] }) {
  const anoAtual = new Date().getFullYear()
  const realizados = agendamentos.filter(ag => ag.status === 'realizado')

  const anoMinimo = realizados.reduce((min, ag) => {
    const ano = parseInt((String(ag.dataRealizada ?? ag.dataAgendada)).slice(0, 4), 10)
    return Math.min(min, ano)
  }, anoAtual)

  const anoMaximo = agendamentos.reduce((max, ag) => {
    const ano = parseInt((ag.dataAgendada as string).slice(0, 4), 10)
    return Math.max(max, ano)
  }, anoAtual)

  const [anoSelecionado, setAnoSelecionado] = useState(anoAtual)

  const noAno = agendamentos.filter(ag => {
    const iso = ag.status === 'realizado'
      ? ((ag.dataRealizada ?? ag.dataAgendada) as string)
      : (ag.dataAgendada as string)
    return parseInt(iso.slice(0, 4), 10) === anoSelecionado
  })
  const realizadosNoAno = noAno.filter(ag => ag.status === 'realizado')
  const porMes = mapearPorMes(noAno)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1">
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
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {Array.from({ length: 12 }, (_, i) => {
          const chave = `${anoSelecionado}-${String(i + 1).padStart(2, '0')}`
          const ags = porMes.get(chave) ?? []
          const temRealizados = ags.some(ag => ag.status === 'realizado')
          const temPendentes  = ags.some(ag => ag.status === 'pendente')
          const labelColor = temRealizados ? 'text-emerald-600' : temPendentes ? 'text-purple-600' : 'text-gray-400'
          return (
            <div key={chave} className="shrink-0 w-24 rounded-xl p-2 border border-gray-100 bg-white">
              <div className="flex items-center justify-between mb-1">
                <p className={`text-xs font-bold ${labelColor}`}>{MESES[i]}</p>
                {temRealizados && (
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 rounded-full w-4 h-4 flex items-center justify-center leading-none">
                    {ags.filter(ag => ag.status === 'realizado').length}
                  </span>
                )}
              </div>
              {ags.length > 0 ? (
                <div className="space-y-1">
                  {ags.map(ag => {
                    const realizado = ag.status === 'realizado'
                    return (
                      <div key={ag.id} className={`rounded-lg px-1.5 py-1 border ${realizado ? 'bg-white border-emerald-200' : 'bg-purple-50 border-purple-200'}`}>
                        <p className={`text-xs font-medium leading-tight line-clamp-2 ${realizado ? 'text-gray-700' : 'text-purple-800'}`}>{ag.titulo}</p>
                        <p className={`text-xs mt-0.5 ${realizado ? 'text-emerald-600' : 'text-purple-500'}`}>{formatDate(ag.dataRealizada ?? ag.dataAgendada)}</p>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-300">—</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function BemCard({ bem, agendamentos, logado, onPedirLogin }: Props) {
  const [expandido, setExpandido] = useState(false)

  const st = STATUS_LABEL[bem.status] ?? { label: String(bem.status), color: 'bg-gray-100 text-gray-500' }
  const hojeStr = new Date().toISOString().slice(0, 10)
  const pendentes = agendamentos.filter(ag => ag.status === 'pendente')
  const atrasado = pendentes.some(ag =>
    new Date(ag.dataAgendada as string).toISOString().slice(0, 10) < hojeStr,
  )
  const temAgendamento = logado && pendentes.length > 0

  const borderColor = atrasado
    ? 'border-red-200'
    : temAgendamento
    ? 'border-purple-200'
    : 'border-gray-100'

  return (
    <div className={`bg-white rounded-2xl border ${borderColor} shadow-sm overflow-hidden`}>
      {/* Topo — sempre visível, clicável */}
      <button
        onClick={() => setExpandido(v => !v)}
        className="w-full text-left flex items-center gap-3 p-4 active:bg-gray-50 transition-colors"
      >
        {/* Imagem */}
        <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center shrink-0">
          {bem.coverPermalink
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={bem.coverPermalink} alt={bem.description} className="w-full h-full object-cover" />
            : <Package size={24} className="text-gray-300" />}
        </div>

        {/* Info principal */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 leading-tight line-clamp-2">{bem.description}</p>
          <p className="text-xs font-mono text-purple-600 mt-0.5">{bem.patrimony}</p>
          {bem.serialNumber && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">S/N: {bem.serialNumber}</p>
          )}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
            {temAgendamento && (
              <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                atrasado ? 'bg-red-100 text-red-700' : 'bg-purple-100 text-purple-700'
              }`}>
                {atrasado ? <AlertCircle size={10} /> : <CalendarPlus size={10} />}
                {atrasado ? 'Atrasado' : 'Agendado'}
              </span>
            )}
          </div>
        </div>

        {/* Chevron */}
        <div className="text-gray-300 shrink-0">
          {expandido ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {/* Expansão */}
      {expandido && (
        <div className="border-t border-gray-100 px-4 py-4 space-y-4 bg-gray-50">

          {/* Detalhes do bem */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {[
              { label: 'Tipo',        value: bem.assetTypeName },
              { label: 'Marca',       value: bem.brand },
              { label: 'Modelo',      value: bem.model },
              { label: 'Nº de série', value: bem.serialNumber },
            ].map(({ label, value }) =>
              value ? (
                <div key={label}>
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="text-sm text-gray-700 font-medium">{value}</p>
                </div>
              ) : null,
            )}
          </div>

          {/* Agendamentos — só com login */}
          {!logado ? (
            <button
              onClick={onPedirLogin}
              className="w-full flex items-center justify-center gap-2 border border-purple-200 text-purple-600 text-xs font-semibold py-2.5 rounded-xl hover:bg-purple-50 transition-colors"
            >
              <Lock size={13} />
              Entrar para ver agendamentos
            </button>
          ) : (
            <>
              {agendamentos.length > 0 && (
                <HistoricoAnual agendamentos={agendamentos} />
              )}

              {pendentes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Agendamentos pendentes</p>
                  {pendentes.map(ag => {
                    const atr = (ag.dataAgendada as string).slice(0, 10) < hojeStr
                    return (
                      <div key={ag.id} className={`border rounded-lg px-3 py-2.5 space-y-1.5 ${atr ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-gray-800">{ag.titulo}</p>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${atr ? 'bg-red-100 text-red-700' : 'bg-purple-100 text-purple-700'}`}>
                            {atr ? 'Atrasado' : 'Agendado'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">{formatDate(ag.dataAgendada)}</p>
                        {ag.observacao && <p className="text-xs text-gray-400">{ag.observacao}</p>}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
