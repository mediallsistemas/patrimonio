'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  Wrench, Zap, Droplet, Package, Clock, CheckCircle2,
  ChevronDown, ChevronUp, ShieldCheck, User,
} from 'lucide-react'
import { format, differenceInMinutes, differenceInHours } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'

import * as manutencoesService from '@/services/manutencoes.service'
import type { ManutencaoHistoricoItem, TipoManutencao } from '@/services/manutencoes.service'
import { KpiCard } from '@/components/ui/ronda/KpiCard'
import Header from '@/components/ui/Header'
import ExportarPdfButton from '@/components/ui/ExportarPdfButton'
import { exportarTabelaPdf, COLUNAS_MANUTENCOES_PDF, linhaManutencaoPdf } from '@/utils/pdf-export'

// ── Config ────────────────────────────────────────────────────────────────────

const TIPO_CONFIG: Record<TipoManutencao, { label: string; icon: typeof Zap; badge: string }> = {
  eletrica:   { label: 'Elétrica',   icon: Zap,     badge: 'bg-yellow-100 text-yellow-700' },
  hidraulica: { label: 'Hidráulica', icon: Droplet, badge: 'bg-blue-100 text-blue-700' },
  patrimonio: { label: 'Patrimônio', icon: Package, badge: 'bg-purple-100 text-purple-700' },
}

function titulo(m: ManutencaoHistoricoItem): string {
  if (m.tipo === 'patrimonio') return m.descricaoBemSnapshot ?? m.patrimony ?? 'Bem'
  return m.ambienteNomeSnapshot ?? 'Ambiente'
}

function subtitulo(m: ManutencaoHistoricoItem): string | null {
  if (m.tipo === 'patrimonio') return m.patrimony ? `Patrimônio ${m.patrimony}` : null
  return m.blocoNomeSnapshot
}

// ── Tempo em aberto (mesma lógica usada no histórico de rondas) ───────────────

function useTempoAberto(iniciadaEm: string | null): string {
  const calc = () => {
    if (!iniciadaEm) return ''
    const mins = differenceInMinutes(new Date(), new Date(iniciadaEm))
    if (mins < 60) return `${mins}min em aberto`
    const hrs = differenceInHours(new Date(), new Date(iniciadaEm))
    const rest = mins - hrs * 60
    return `${hrs}h${rest > 0 ? ` ${rest}min` : ''} em aberto`
  }
  const [tempo, setTempo] = useState(calc)
  useEffect(() => {
    if (!iniciadaEm) return
    const id = setInterval(() => setTempo(calc()), 60_000)
    return () => clearInterval(id)
  }, [iniciadaEm]) // eslint-disable-line react-hooks/exhaustive-deps
  return tempo
}

// ── Foto lazy (antes/depois) ────────────────────────────────────────────────

function FotosLazy({ id }: { id: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['manutencao-detalhe', id],
    queryFn: () => manutencoesService.buscarRealizadaDetalhe(id),
  })

  if (isLoading) return <p className="text-xs text-gray-300">Carregando fotos...</p>
  if (!data) return <p className="text-xs text-gray-300">Não foi possível carregar.</p>

  return (
    <div className="space-y-3">
      {data.observacaoFinal && (
        <div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Observação final</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{data.observacaoFinal}</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wide">Antes</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.fotoAntes} alt="Antes" className="w-full rounded-lg border border-amber-100 object-cover" />
        </div>
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wide">Depois</p>
          {data.fotoDepois ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.fotoDepois} alt="Depois" className="w-full rounded-lg border border-emerald-100 object-cover" />
          ) : (
            <div className="w-full aspect-square rounded-lg border border-dashed border-gray-200 flex items-center justify-center text-xs text-gray-300">
              Em andamento
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Row expansível ──────────────────────────────────────────────────────────

function ManutencaoListItem({ m }: { m: ManutencaoHistoricoItem }) {
  const [aberto, setAberto] = useState(false)
  const emAndamento = m.status === 'em_andamento'
  const tempoAberto = useTempoAberto(emAndamento ? m.iniciadaEm : null)
  const horas = emAndamento ? differenceInHours(new Date(), new Date(m.iniciadaEm)) : 0
  const vencida = horas >= 24
  const { label, icon: Icon, badge } = TIPO_CONFIG[m.tipo]
  const sub = subtitulo(m)

  const duracao = !emAndamento && m.finalizadaEm
    ? Math.round((new Date(m.finalizadaEm).getTime() - new Date(m.iniciadaEm).getTime()) / 60000)
    : null

  return (
    <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
      <button
        onClick={() => setAberto((v) => !v)}
        className="w-full text-left px-5 py-4 flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${badge}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-gray-800 truncate">{titulo(m)}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${badge}`}>{label}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-gray-400 tabular-nums flex-wrap mt-0.5">
              <span>{format(new Date(m.iniciadaEm), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
              {sub && <><span className="text-gray-200">·</span><span className="truncate">{sub}</span></>}
              {duracao !== null && <><span className="text-gray-200">·</span><span>{duracao} min</span></>}
              <span className="text-gray-200">·</span>
              <span className="inline-flex items-center gap-1"><User className="w-3 h-3" />{m.criadoPor.nome}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {emAndamento ? (
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold ${
              vencida ? 'bg-red-50 text-red-600 ring-1 ring-red-200' : 'bg-blue-50 text-blue-600 ring-1 ring-blue-100'
            }`}>
              <span className="relative flex items-center justify-center h-4 w-4 shrink-0">
                <span className="animate-ping-slow absolute h-3 w-3 rounded-full opacity-60" style={{ backgroundColor: vencida ? '#ef4444' : '#3b82f6' }} />
                <span className="relative h-2 w-2 rounded-full" style={{ backgroundColor: vencida ? '#ef4444' : '#3b82f6' }} />
              </span>
              {tempoAberto}
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Concluída
            </div>
          )}
          {aberto ? <ChevronUp className="w-4 h-4 text-gray-300" /> : <ChevronDown className="w-4 h-4 text-gray-300" />}
        </div>
      </button>

      {aberto && (
        <div className="px-5 pb-4 pt-1 border-t border-gray-100 space-y-3">
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">O que foi feito</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{m.descricao}</p>
          </div>
          <FotosLazy id={m.id} />
        </div>
      )}
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────

const TIPO_FILTROS: { value: TipoManutencao | null; label: string }[] = [
  { value: null, label: 'Todas' },
  { value: 'eletrica', label: 'Elétrica' },
  { value: 'hidraulica', label: 'Hidráulica' },
  { value: 'patrimonio', label: 'Patrimônio' },
]

export default function HistoricoManutencaoPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>()
  const [tipoFiltro, setTipoFiltro] = useState<TipoManutencao | null>(null)
  const [soEmAndamento, setSoEmAndamento] = useState(false)

  const { data: manutencoes = [], isLoading } = useQuery({
    queryKey: ['manutencoes-historico', tenantSlug],
    queryFn: () => manutencoesService.listarHistorico(),
    refetchInterval: 30_000,
  })

  const emAndamento = manutencoes.filter((m) => m.status === 'em_andamento')
  const concluidas = manutencoes.filter((m) => m.status === 'concluida')

  const filtradas = manutencoes
    .filter((m) => !tipoFiltro || m.tipo === tipoFiltro)
    .filter((m) => !soEmAndamento || m.status === 'em_andamento')

  function exportarPdf() {
    exportarTabelaPdf({
      titulo: 'Histórico de Manutenções',
      subtitulo: `Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}${tipoFiltro ? ` · ${tipoFiltro}` : ''}${soEmAndamento ? ' · somente em andamento' : ''}`,
      colunas: COLUNAS_MANUTENCOES_PDF,
      linhas: filtradas.map(linhaManutencaoPdf),
      nomeArquivo: `manutencoes-historico-${tenantSlug}.pdf`,
    })
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb] font-sans">
      <Header title="Histórico de Manutenções" backHref={`/${tenantSlug}/manutencao`} />

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

        {/* Ação rápida */}
        <div className="flex items-center justify-between">
          <Link
            href={`/${tenantSlug}/manutencao/realizar`}
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
          >
            <Wrench className="w-4 h-4" />
            Nova manutenção
          </Link>
          {emAndamento.length > 0 && (
            <div className="flex items-center gap-2 text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full ring-1 ring-blue-100">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              {emAndamento.length} em andamento
            </div>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4">
          <KpiCard
            label="Total de manutenções"
            value={manutencoes.length}
            icon={Wrench}
            iconBg="bg-indigo-50"
            iconColor="text-indigo-500"
            valueColor="text-gray-900"
          />
          <KpiCard
            label="Em andamento"
            value={emAndamento.length}
            icon={Clock}
            iconBg={emAndamento.length > 0 ? 'bg-blue-50' : 'bg-gray-50'}
            iconColor={emAndamento.length > 0 ? 'text-blue-500' : 'text-gray-400'}
            valueColor={emAndamento.length > 0 ? 'text-blue-600' : 'text-gray-900'}
            highlight={emAndamento.length > 0}
          />
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {TIPO_FILTROS.map(({ value, label }) => (
              <button
                key={label}
                onClick={() => setTipoFiltro(value)}
                className={`text-sm font-medium px-3 py-2 rounded-lg ring-1 transition-all ${
                  tipoFiltro === value
                    ? 'bg-indigo-50 ring-indigo-200 text-indigo-700'
                    : 'bg-white ring-gray-200 text-gray-500 hover:ring-indigo-200 hover:text-indigo-600'
                }`}
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => setSoEmAndamento((v) => !v)}
              className={`inline-flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg ring-1 transition-all ${
                soEmAndamento
                  ? 'bg-blue-50 ring-blue-200 text-blue-700'
                  : 'bg-white ring-gray-200 text-gray-500 hover:ring-blue-200 hover:text-blue-600'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Só em andamento
            </button>
          </div>
          <ExportarPdfButton onClick={exportarPdf} disabled={filtradas.length === 0} />
        </div>

        {isLoading ? (
          <PageSkeleton />
        ) : filtradas.length > 0 ? (
          <div className="space-y-2.5">
            {filtradas.map((m) => (
              <ManutencaoListItem key={m.id} m={m} />
            ))}
          </div>
        ) : manutencoes.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3 text-center bg-white rounded-xl ring-1 ring-gray-100">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 ring-1 ring-gray-100 flex items-center justify-center">
              <Wrench className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-500">Nenhuma manutenção registrada</p>
            <Link
              href={`/${tenantSlug}/manutencao/realizar`}
              className="text-xs text-indigo-500 hover:text-indigo-700 transition-colors"
            >
              Realizar primeira manutenção
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center py-12 gap-3 text-center bg-white rounded-xl ring-1 ring-gray-100">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 ring-1 ring-emerald-100 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-emerald-500" />
            </div>
            <p className="text-sm font-semibold text-gray-700">Nenhum resultado para esse filtro</p>
          </div>
        )}

        {concluidas.length > 0 && (
          <p className="text-center text-xs text-gray-300">
            {concluidas.length} manutençõe{concluidas.length !== 1 ? 's' : ''} concluída{concluidas.length !== 1 ? 's' : ''} no total
          </p>
        )}
      </div>
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="space-y-2.5">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-xl ring-1 ring-gray-100 p-4 animate-pulse">
          <div className="flex gap-2 mb-2">
            <div className="h-4 w-36 bg-gray-100 rounded" />
            <div className="h-4 w-14 bg-gray-100 rounded-full" />
          </div>
          <div className="h-3 w-48 bg-gray-100 rounded mb-1.5" />
          <div className="h-3 w-24 bg-gray-100 rounded" />
        </div>
      ))}
    </div>
  )
}
