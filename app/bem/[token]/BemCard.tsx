'use client'

import { useState } from 'react'
import { Package, ChevronDown, ChevronUp, AlertCircle, CalendarPlus, CheckCircle2 } from 'lucide-react'

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
  price: number | null
  purchaseDate: string | null
  status: number
  assetTypeName: string
  coverPermalink: string | null
}

interface Props {
  bem: Asset
  agendamentos: Agendamento[]
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

function HistoricoAnual({ agendamentos }: { agendamentos: Agendamento[] }) {
  const anoAtual = new Date().getFullYear()
  const mesAtual = new Date().getMonth()

  const realizados = agendamentos.filter(ag => ag.status === 'realizado')
  const porMes = new Map<string, Agendamento[]>()
  realizados.forEach(ag => {
    const d = new Date((ag.dataRealizada ?? ag.dataAgendada) as string)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!porMes.has(key)) porMes.set(key, [])
    porMes.get(key)!.push(ag)
  })

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1">
        <CheckCircle2 size={12} className="text-emerald-500" />
        Histórico {anoAtual}
        {realizados.length > 0 && (
          <span className="text-gray-400 font-normal normal-case">
            · {realizados.length} realizado{realizados.length !== 1 ? 's' : ''}
          </span>
        )}
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {Array.from({ length: 12 }, (_, i) => {
          const key = `${anoAtual}-${String(i + 1).padStart(2, '0')}`
          const ags = porMes.get(key) ?? []
          const temDados = ags.length > 0
          const eAtual = i === mesAtual
          return (
            <div key={key} className={`shrink-0 w-24 rounded-xl p-2 border ${
              temDados ? 'border-emerald-300 bg-emerald-50'
              : eAtual ? 'border-purple-200 bg-purple-50'
              :          'border-gray-100 bg-gray-50'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <p className={`text-xs font-bold ${temDados ? 'text-emerald-700' : eAtual ? 'text-purple-600' : 'text-gray-400'}`}>
                  {MESES[i]}
                </p>
                {temDados && (
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-200 rounded-full w-4 h-4 flex items-center justify-center leading-none">
                    {ags.length}
                  </span>
                )}
                {eAtual && !temDados && <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />}
              </div>
              {temDados ? (
                <div className="space-y-1">
                  {ags.map(ag => (
                    <div key={ag.id} className="bg-white rounded-lg px-1.5 py-1 border border-emerald-100">
                      <p className="text-xs font-medium text-gray-700 leading-tight line-clamp-2">{ag.titulo}</p>
                      <p className="text-xs text-emerald-600 mt-0.5">{formatDate(ag.dataRealizada ?? ag.dataAgendada)}</p>
                    </div>
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
  )
}

export default function BemCard({ bem, agendamentos }: Props) {
  const [expandido, setExpandido] = useState(false)

  const st = STATUS_LABEL[bem.status] ?? { label: String(bem.status), color: 'bg-gray-100 text-gray-500' }
  const hojeStr = new Date().toISOString().slice(0, 10)
  const pendentes = agendamentos.filter(ag => ag.status === 'pendente')
  const atrasado = pendentes.some(ag =>
    new Date(ag.dataAgendada as string).toISOString().slice(0, 10) < hojeStr,
  )
  const temAgendamento = pendentes.length > 0

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
                {atrasado
                  ? <AlertCircle size={10} />
                  : <CalendarPlus size={10} />}
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
              { label: 'Valor',       value: bem.price != null ? `R$ ${bem.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : null },
              { label: 'Data compra', value: bem.purchaseDate ? formatDate(bem.purchaseDate) : null },
            ].map(({ label, value }) =>
              value ? (
                <div key={label}>
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="text-sm text-gray-700 font-medium">{value}</p>
                </div>
              ) : null,
            )}
          </div>

          {/* Agendamentos pendentes */}
          {pendentes.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Agendamentos pendentes</p>
              {pendentes.map(ag => {
                const atr = new Date(ag.dataAgendada as string).toISOString().slice(0, 10) < hojeStr
                return (
                  <div key={ag.id} className={`rounded-xl border px-3 py-2.5 space-y-1 ${atr ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-800">{ag.titulo}</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${atr ? 'bg-red-100 text-red-700' : 'bg-purple-100 text-purple-700'}`}>
                        {atr ? 'Atrasado' : 'Agendado'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {atr ? <AlertCircle size={11} className="text-red-400" /> : <CalendarPlus size={11} className="text-purple-400" />}
                      <p className="text-xs text-gray-500">{formatDate(ag.dataAgendada)}</p>
                    </div>
                    {ag.observacao && <p className="text-xs text-gray-400">{ag.observacao}</p>}
                  </div>
                )
              })}
            </div>
          )}

          {/* Histórico anual */}
          {agendamentos.length > 0 && (
            <HistoricoAnual agendamentos={agendamentos} />
          )}
        </div>
      )}
    </div>
  )
}
