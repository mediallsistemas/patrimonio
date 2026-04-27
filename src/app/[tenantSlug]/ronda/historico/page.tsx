'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  Activity, AlertTriangle, CheckCircle2,
  ChevronDown, ChevronUp, ShieldCheck,
  AlertCircle, MapPin,
} from 'lucide-react'
import { format, differenceInMinutes, differenceInHours } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'

import * as rondasService from '@/services/rondas.service'
import { desnormalizarOcorrencias } from '@/lib/rondas-admin-utils'
import { KpiCard } from '@/components/ui/ronda/KpiCard'
import { OcorrenciaRow } from '@/components/ui/ronda/OcorrenciaRow'
import { FotoLazy } from '@/components/ui/ronda/FotoLazy'
import Header from '@/components/ui/Header'
import type { Ronda } from '@/services/rondas.types'
import type { OcorrenciaFlat } from '@/lib/rondas-admin-utils'

// ── Hook: tempo em aberto atualizado a cada minuto ────────────────────────────

function useTempoAberto(iniciadoEm: string | null): string {
  const calc = () => {
    if (!iniciadoEm) return ''
    const mins = differenceInMinutes(new Date(), new Date(iniciadoEm))
    if (mins < 60) return `${mins}min em aberto`
    const hrs = differenceInHours(new Date(), new Date(iniciadoEm))
    const rest = mins - hrs * 60
    return `${hrs}h${rest > 0 ? ` ${rest}min` : ''} em aberto`
  }

  const [tempo, setTempo] = useState(calc)

  useEffect(() => {
    if (!iniciadoEm) return
    const id = setInterval(() => setTempo(calc()), 60_000)
    return () => clearInterval(id)
  }, [iniciadoEm]) // eslint-disable-line react-hooks/exhaustive-deps

  return tempo
}

// ── RondaListItem ─────────────────────────────────────────────────────────────

function RondaListItem({
  ronda,
  selecionada,
  onClick,
}: {
  ronda: Ronda
  selecionada: boolean
  onClick: () => void
}) {
  const emAndamento = ronda.finalizadoEm === null
  const tempoAberto = useTempoAberto(emAndamento ? ronda.iniciadoEm : null)
  const horas = emAndamento
    ? differenceInHours(new Date(), new Date(ronda.iniciadoEm))
    : 0
  const vencida = horas >= 24

  const totalOcs = ronda.ambientes.filter((a) => a.temOcorrencia).length
  const duracao = !emAndamento && ronda.finalizadoEm
    ? Math.round(
        (new Date(ronda.finalizadoEm).getTime() - new Date(ronda.iniciadoEm).getTime()) / 60000,
      )
    : null

  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-white rounded-xl px-5 py-4 shadow-sm ring-1 transition-all duration-150 ${
        selecionada ? 'ring-indigo-300 shadow-indigo-50' : 'ring-gray-100 hover:ring-gray-200'
      }`}
    >
      <div className="flex items-center justify-between gap-4">

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate mb-1">
            {format(new Date(ronda.iniciadoEm), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400 tabular-nums flex-wrap">
            {duracao !== null && <span>{duracao} min</span>}
            {ronda.ambientes.length > 0 && (
              <><span className="text-gray-200">·</span><span>{ronda.ambientes.length} amb.</span></>
            )}
            {ronda.criadoPor && (
              <><span className="text-gray-200">·</span><span>{ronda.criadoPor.nome}</span></>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">

          {emAndamento && tempoAberto && (
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold ${
              vencida
                ? 'bg-red-50 text-red-600 ring-1 ring-red-200'
                : 'bg-blue-50 text-blue-600 ring-1 ring-blue-100'
            }`}>
              <span className="relative flex items-center justify-center h-4 w-4 shrink-0">
                <span
                  className="animate-ping-slow absolute h-3 w-3 rounded-full opacity-60"
                  style={{ backgroundColor: vencida ? '#ef4444' : '#3b82f6' }}
                />
                <span
                  className="relative h-2 w-2 rounded-full"
                  style={{ backgroundColor: vencida ? '#ef4444' : '#3b82f6' }}
                />
              </span>
              {tempoAberto}
            </div>
          )}

          {totalOcs > 0 && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-50 text-orange-600 ring-1 ring-orange-200">
              <AlertCircle className="w-3.5 h-3.5 fill-red-500 text-white" />
              {totalOcs} ocorrência{totalOcs > 1 ? 's' : ''}
            </div>
          )}

          {!emAndamento && totalOcs === 0 && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Conforme
            </div>
          )}
        </div>

      </div>
    </button>
  )
}

// ── OcorrenciaRow com foto lazy (operador não recebe foto no listar) ──────────

function OcorrenciaRowOperador({ oc }: { oc: OcorrenciaFlat }) {
  return (
    <div>
      <OcorrenciaRow oc={oc} />
      {/* foto é null no listar() do operador — carregar sob demanda */}
      {!oc.foto && (
        <div className="-mt-2 px-5 pb-3 bg-white rounded-b-xl ring-1 ring-t-0 ring-gray-100 shadow-sm border-l-[3px] border-l-transparent">
          <FotoLazy ocorrenciaId={oc.id} />
        </div>
      )}
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function HistoricoRondaPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>()
  const [soOcorrencias, setSoOcorrencias] = useState(false)
  const [normalAberto, setNormalAberto] = useState(false)
  const [rondaSelecionadaId, setRondaSelecionadaId] = useState<string | null>(null)
  const [verConformes, setVerConformes] = useState(false)
  const ocorrenciasRef = useRef<HTMLElement>(null)

  const { data: rondas = [], isLoading } = useQuery({
    queryKey: ['rondas-unificadas', tenantSlug],
    queryFn: () => rondasService.listar() as unknown as Promise<Ronda[]>,
    refetchInterval: 30_000,
  })

  const rondasOrdenadas = [...rondas].sort((a, b) => {
    if (a.finalizadoEm === null && b.finalizadoEm !== null) return -1
    if (a.finalizadoEm !== null && b.finalizadoEm === null) return 1
    return new Date(b.iniciadoEm).getTime() - new Date(a.iniciadoEm).getTime()
  })

  const rondasComOcorrencia = rondas.filter((r) =>
    r.ambientes.some((a) => a.temOcorrencia),
  )
  const finalizadas = rondas.filter((r) => r.finalizadoEm !== null)
  const rondasNormais = finalizadas.filter((r) => !r.ambientes.some((a) => a.temOcorrencia))
  const emAndamento = rondas.filter((r) => r.finalizadoEm === null)

  const rondaSelecionada = rondaSelecionadaId
    ? rondas.find((r) => r.id === rondaSelecionadaId) ?? null
    : null

  const ocorrencias = desnormalizarOcorrencias(
    rondaSelecionada ? [rondaSelecionada] : rondas,
  )

  const totalRondas        = rondas.length
  const totalComOcorrencia = rondas.filter((r) => r.ambientes.some((a) => a.temOcorrencia)).length
  const exibirNormais      = !soOcorrencias

  function selecionarRonda(id: string) {
    setVerConformes(false)
    setRondaSelecionadaId((prev) => {
      const nova = prev === id ? null : id
      if (nova !== null) {
        setTimeout(() => {
          ocorrenciasRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 50)
      }
      return nova
    })
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb] font-sans">

      <Header title="Histórico de Rondas" backHref={`/${tenantSlug}/ronda`} />

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

        {/* ── Ação rápida ────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <Link
            href={`/${tenantSlug}/ronda`}
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
          >
            <MapPin className="w-4 h-4" />
            Nova ronda
          </Link>
          {emAndamento.length > 0 && (
            <div className="flex items-center gap-2 text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full ring-1 ring-blue-100">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              {emAndamento.length} ronda{emAndamento.length > 1 ? 's' : ''} ao vivo
            </div>
          )}
        </div>

        {/* ── KPI Cards ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          <KpiCard
            label="Total de rondas"
            value={totalRondas}
            icon={Activity}
            iconBg="bg-indigo-50"
            iconColor="text-indigo-500"
            valueColor="text-gray-900"
          />
          <KpiCard
            label="Com ocorrências"
            value={totalComOcorrencia}
            icon={AlertTriangle}
            iconBg={totalComOcorrencia > 0 ? 'bg-orange-50' : 'bg-gray-50'}
            iconColor={totalComOcorrencia > 0 ? 'text-orange-500' : 'text-gray-400'}
            valueColor={totalComOcorrencia > 0 ? 'text-orange-600' : 'text-gray-900'}
            highlight={totalComOcorrencia > 0}
          />
        </div>

        {/* ── Filtros ──────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setSoOcorrencias((v) => !v)
              setRondaSelecionadaId(null)
            }}
            className={`inline-flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg ring-1 transition-all ${
              soOcorrencias
                ? 'bg-orange-50 ring-orange-200 text-orange-700'
                : 'bg-white ring-gray-200 text-gray-500 hover:ring-orange-200 hover:text-orange-600'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Só com ocorrências
            {rondasComOcorrencia.length > 0 && (
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                soOcorrencias ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {rondasComOcorrencia.length}
              </span>
            )}
          </button>
        </div>

        {isLoading ? (
          <PageSkeleton />
        ) : (
          <div className="space-y-10">

            {/* ── Seção 1: Rondas ──────────────────────────────────────────── */}
            {rondasOrdenadas.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <SectionHeader icon={<Activity className="w-3.5 h-3.5 text-indigo-400" />}>
                    Rondas
                  </SectionHeader>
                  {rondaSelecionada && (
                    <button
                      onClick={() => setRondaSelecionadaId(null)}
                      className="text-[11px] font-medium text-indigo-500 hover:text-indigo-700 underline underline-offset-2 transition-colors"
                    >
                      ver todas
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {rondasOrdenadas
                    .filter((r) => !soOcorrencias || r.ambientes.some((a) => a.temOcorrencia))
                    .filter((r) => !rondaSelecionadaId || r.id === rondaSelecionadaId)
                    .map((r) => (
                      <RondaListItem
                        key={r.id}
                        ronda={r}
                        selecionada={r.id === rondaSelecionadaId}
                        onClick={() => selecionarRonda(r.id)}
                      />
                    ))}
                </div>
              </section>
            )}

            {/* ── Seção 2: Ocorrências ─────────────────────────────────────── */}
            <section ref={ocorrenciasRef} className="space-y-3 scroll-mt-6">
              <div className="flex items-center justify-between gap-3">
                <SectionHeader
                  icon={<AlertTriangle className="w-3.5 h-3.5 text-orange-500" />}
                  badge={ocorrencias.length > 0 ? String(ocorrencias.length) : undefined}
                  badgeColor="bg-orange-100 text-orange-700"
                >
                  Ocorrências{rondaSelecionada ? ' da ronda selecionada' : ' registradas'}
                </SectionHeader>

                {rondaSelecionada && (() => {
                  const conformes = rondaSelecionada.ambientes.filter((a) => !a.temOcorrencia)
                  if (conformes.length === 0) return null
                  return (
                    <button
                      onClick={() => setVerConformes((v) => !v)}
                      className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg ring-1 transition-all ${
                        verConformes
                          ? 'bg-emerald-50 ring-emerald-200 text-emerald-700'
                          : 'bg-white ring-gray-200 text-gray-500 hover:ring-emerald-200 hover:text-emerald-600'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {verConformes ? 'Ver ocorrências' : 'Ver conformes'}
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                        verConformes ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {conformes.length}
                      </span>
                    </button>
                  )
                })()}
              </div>

              {verConformes && rondaSelecionada ? (() => {
                const conformes = rondaSelecionada.ambientes.filter((a) => !a.temOcorrencia)
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {conformes.map((a) => (
                      <div
                        key={a.id}
                        className="bg-white rounded-xl ring-1 ring-gray-100 px-4 py-3 flex items-center gap-3"
                      >
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 ring-1 ring-emerald-100 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-700 truncate">{a.ambiente}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5 tabular-nums">
                            {format(new Date(a.concluidoEm), 'HH:mm', { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })() : ocorrencias.length > 0 ? (
                <div className="space-y-2.5">
                  {ocorrencias.map((oc) => (
                    <OcorrenciaRowOperador
                      key={`${oc.rondaId}-${oc.ambienteId}-${oc.id}`}
                      oc={oc}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-12 gap-3 text-center bg-white rounded-xl ring-1 ring-gray-100">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 ring-1 ring-emerald-100 flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">
                      {rondaSelecionada ? 'Ronda sem ocorrências' : 'Nenhuma ocorrência registrada'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {rondaSelecionada
                        ? 'Esta ronda foi concluída em total conformidade.'
                        : 'Todas as rondas foram concluídas em conformidade.'}
                    </p>
                  </div>
                </div>
              )}
            </section>

            {/* ── Seção 3: Conformidade (colapsável) ───────────────────────── */}
            {exibirNormais && rondasNormais.length > 0 && (
              <section className="space-y-3">
                <button
                  onClick={() => setNormalAberto((v) => !v)}
                  className="flex items-center gap-2 group"
                >
                  <SectionHeader
                    icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                    badge={String(rondasNormais.length)}
                    badgeColor="bg-emerald-50 text-emerald-700"
                    asLabel
                  >
                    Rondas em conformidade
                  </SectionHeader>
                  <span className="text-gray-300 group-hover:text-gray-500 transition-colors ml-1">
                    {normalAberto ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </span>
                </button>

                {normalAberto && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {rondasNormais.map((r) => (
                      <div
                        key={r.id}
                        className="bg-white rounded-xl ring-1 ring-gray-100 shadow-sm px-4 py-3 flex items-center justify-between gap-3 hover:ring-emerald-200 transition-all"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-700 truncate">
                            {format(new Date(r.iniciadoEm), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                          <p className="text-[11px] text-gray-400 mt-0.5 tabular-nums">
                            {r.ambientes.length} amb.
                            {r.finalizadoEm && (
                              <> · {Math.round((new Date(r.finalizadoEm).getTime() - new Date(r.iniciadoEm).getTime()) / 60000)} min</>
                            )}
                          </p>
                          {r.criadoPor && (
                            <p className="text-[11px] text-gray-400 truncate">{r.criadoPor.nome}</p>
                          )}
                        </div>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {rondas.length === 0 && (
              <div className="flex flex-col items-center py-16 gap-3 text-center bg-white rounded-xl ring-1 ring-gray-100">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 ring-1 ring-gray-100 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-gray-300" />
                </div>
                <p className="text-sm font-semibold text-gray-500">Nenhuma ronda registrada</p>
                <Link
                  href={`/${tenantSlug}/ronda`}
                  className="text-xs text-indigo-500 hover:text-indigo-700 transition-colors"
                >
                  Iniciar primeira ronda
                </Link>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  )
}

// ── Componentes locais ────────────────────────────────────────────────────────

interface SectionHeaderProps {
  children: React.ReactNode
  icon?: React.ReactNode
  badge?: string
  badgeColor?: string
  asLabel?: boolean
}

function SectionHeader({ children, icon, badge, badgeColor, asLabel }: SectionHeaderProps) {
  return (
    <div className={`flex items-center gap-2 ${asLabel ? '' : 'pb-1'}`}>
      {icon}
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
        {children}
      </span>
      {badge && (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeColor}`}>
          {badge}
        </span>
      )}
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-xl p-5 ring-1 ring-gray-100 animate-pulse">
            <div className="w-8 h-8 rounded-lg bg-gray-100 mb-3" />
            <div className="h-7 w-14 bg-gray-100 rounded mb-2" />
            <div className="h-3 w-24 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
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
    </div>
  )
}
