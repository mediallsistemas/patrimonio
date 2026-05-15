'use client'

import { useState } from 'react'
import { Package, ChevronDown, ChevronUp, AlertCircle, CalendarPlus, CheckCircle2, Lock, ChevronLeft, ChevronRight } from 'lucide-react'
import type { ManutencaoRealizadaResumo } from '@/services/manutencoes.service'

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

// Item unificado para o calendário mensal (mesma ideia do ModalAgendamento admin):
// pode ser um agendamento ou uma manutenção realizada pelo operador.
type ItemMes =
  | { kind: 'agendamento'; ag: Agendamento }
  | { kind: 'realizada'; m: ManutencaoRealizadaResumo }

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
  realizadas: ManutencaoRealizadaResumo[]
  logado: boolean
  onPedirLogin: () => void
  onAbrirRealizada: (id: string) => void
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

function isoDoItem(item: ItemMes): string {
  if (item.kind === 'agendamento') {
    return item.ag.status === 'realizado'
      ? (item.ag.dataRealizada ?? item.ag.dataAgendada) as string
      : item.ag.dataAgendada as string
  }
  return item.m.finalizadaEm ?? item.m.iniciadaEm
}

function ehRealizado(item: ItemMes): boolean {
  return item.kind === 'realizada' || item.ag.status === 'realizado'
}

function mapearPorMes(itens: ItemMes[]): Map<string, ItemMes[]> {
  const map = new Map<string, ItemMes[]>()
  itens.forEach(it => {
    const key = isoParaChaveMes(isoDoItem(it))
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(it)
  })
  return map
}

function HistoricoAnual({
  itens,
  onAbrirRealizada,
}: {
  itens: ItemMes[]
  onAbrirRealizada: (id: string) => void
}) {
  const anoAtual = new Date().getFullYear()

  const anoMinimo = itens.reduce((min, it) => {
    if (!ehRealizado(it)) return min
    return Math.min(min, parseInt(isoDoItem(it).slice(0, 4), 10))
  }, anoAtual)

  const anoMaximo = itens.reduce((max, it) => {
    const iso = it.kind === 'agendamento' ? (it.ag.dataAgendada as string) : isoDoItem(it)
    return Math.max(max, parseInt(iso.slice(0, 4), 10))
  }, anoAtual)

  const [anoSelecionado, setAnoSelecionado] = useState(anoAtual)

  const noAno = itens.filter(it => parseInt(isoDoItem(it).slice(0, 4), 10) === anoSelecionado)
  const realizadosNoAno = noAno.filter(ehRealizado)
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
          const itensMes = porMes.get(chave) ?? []
          const temRealizados = itensMes.some(ehRealizado)
          const temPendentes  = itensMes.some(it => it.kind === 'agendamento' && it.ag.status === 'pendente')
          const labelColor = temRealizados ? 'text-emerald-600' : temPendentes ? 'text-purple-600' : 'text-gray-400'
          const qtdRealizados = itensMes.filter(ehRealizado).length
          return (
            <div key={chave} className="shrink-0 w-24 rounded-xl p-2 border border-gray-100 bg-white">
              <div className="flex items-center justify-between mb-1">
                <p className={`text-xs font-bold ${labelColor}`}>{MESES[i]}</p>
                {temRealizados && (
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 rounded-full w-4 h-4 flex items-center justify-center leading-none">
                    {qtdRealizados}
                  </span>
                )}
              </div>
              {itensMes.length > 0 ? (
                <div className="space-y-1">
                  {itensMes.map((it) => {
                    if (it.kind === 'realizada') {
                      const m = it.m
                      const titulo = m.subtipoPatrimonio ?? 'Manutenção'
                      const dataIso = m.finalizadaEm ?? m.iniciadaEm
                      return (
                        <button
                          key={`m-${m.id}`}
                          type="button"
                          onClick={() => onAbrirRealizada(m.id)}
                          className="w-full text-left rounded-lg px-1.5 py-1 border bg-emerald-50 border-emerald-200 hover:bg-emerald-100 transition-colors"
                        >
                          <p className="text-xs font-medium leading-tight line-clamp-2 text-emerald-800">{titulo}</p>
                          <p className="text-xs mt-0.5 text-emerald-600">{formatDate(dataIso)}</p>
                        </button>
                      )
                    }
                    const ag = it.ag
                    const realizado = ag.status === 'realizado'
                    return (
                      <div key={`a-${ag.id}`} className={`rounded-lg px-1.5 py-1 border ${realizado ? 'bg-white border-emerald-200' : 'bg-purple-50 border-purple-200'}`}>
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

export default function BemCard({ bem, agendamentos, realizadas, logado, onPedirLogin, onAbrirRealizada }: Props) {
  const [expandido, setExpandido] = useState(false)

  const st = STATUS_LABEL[bem.status] ?? { label: String(bem.status), color: 'bg-gray-100 text-gray-500' }
  const hojeStr = new Date().toISOString().slice(0, 10)
  const pendentes = agendamentos.filter(ag => ag.status === 'pendente')
  const atrasado = pendentes.some(ag =>
    new Date(ag.dataAgendada as string).toISOString().slice(0, 10) < hojeStr,
  )
  const temAgendamento = logado && pendentes.length > 0
  const temHistorico = logado && (agendamentos.length > 0 || realizadas.length > 0)

  const itensCalendario: ItemMes[] = [
    ...agendamentos.map((ag) => ({ kind: 'agendamento' as const, ag })),
    ...realizadas.map((m) => ({ kind: 'realizada' as const, m })),
  ]

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
              {temHistorico && (
                <HistoricoAnual itens={itensCalendario} onAbrirRealizada={onAbrirRealizada} />
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
