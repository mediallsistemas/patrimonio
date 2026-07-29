'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Activity, ArrowLeft, CheckCircle2, Zap, Droplet,
  Clock, MapPin, Building2, User, Camera, ChevronDown, ChevronUp, Package,
} from 'lucide-react'
import { format, differenceInMinutes, differenceInHours } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'
import { listarManutencoesAdmin, type ManutencaoAdmin, type TipoManutencaoAdmin } from '@/services/admin-manutencoes.service'
import { listarTenants } from '@/services/admin-tenants.service'
import { KpiCard } from '@/components/ui/ronda/KpiCard'
import FotoLightbox, { type FotoAmpliavel } from '@/components/ui/FotoLightbox'
import ExportarPdfButton from '@/components/ui/ExportarPdfButton'
import { exportarTabelaPdf, COLUNAS_MANUTENCOES_ADMIN_PDF, linhaManutencaoPdf } from '@/utils/pdf-export'
import type { Tenant } from '@/services/admin-tenants.service'

// ── Config visual por tipo ───────────────────────────────────────────────────

const TIPO_CONFIG: Record<TipoManutencaoAdmin, {
  label: string
  Icon: typeof Zap
  iconColor: string
  badge: string
  dot: string
  border: string
  filterBg: string
  filterText: string
  filterRing: string
}> = {
  eletrica: {
    label: 'Elétrica',
    Icon: Zap,
    iconColor: 'text-amber-400',
    badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    dot: 'bg-amber-400',
    border: 'border-l-amber-400',
    filterBg: 'bg-amber-50',
    filterText: 'text-amber-700',
    filterRing: 'ring-amber-200',
  },
  hidraulica: {
    label: 'Hidráulica',
    Icon: Droplet,
    iconColor: 'text-sky-400',
    badge: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
    dot: 'bg-sky-400',
    border: 'border-l-sky-400',
    filterBg: 'bg-sky-50',
    filterText: 'text-sky-700',
    filterRing: 'ring-sky-200',
  },
  patrimonio: {
    label: 'Patrimônio',
    Icon: Package,
    iconColor: 'text-purple-400',
    badge: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
    dot: 'bg-purple-400',
    border: 'border-l-purple-400',
    filterBg: 'bg-purple-50',
    filterText: 'text-purple-700',
    filterRing: 'ring-purple-200',
  },
  predial: {
    label: 'Predial',
    Icon: Building2,
    iconColor: 'text-emerald-400',
    badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    dot: 'bg-emerald-400',
    border: 'border-l-emerald-400',
    filterBg: 'bg-emerald-50',
    filterText: 'text-emerald-700',
    filterRing: 'ring-emerald-200',
  },
}

// ── Hook: tempo em aberto atualizado a cada minuto ───────────────────────────

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

// ── ManutencaoListItem ───────────────────────────────────────────────────────

function ManutencaoListItem({ m }: { m: ManutencaoAdmin }) {
  const emAndamento = m.finalizadaEm === null
  const tempoAberto = useTempoAberto(emAndamento ? m.iniciadaEm : null)
  const horas = emAndamento ? differenceInHours(new Date(), new Date(m.iniciadaEm)) : 0
  const vencida = horas >= 24
  const cfg = TIPO_CONFIG[m.tipo]
  const [fotosAbertas, setFotosAbertas] = useState(false)
  const [lightbox, setLightbox] = useState<number | null>(null)

  const fotos: FotoAmpliavel[] = [
    { src: m.fotoAntes, legenda: 'Antes' },
    ...(m.fotoDepois ? [{ src: m.fotoDepois, legenda: 'Depois' }] : []),
  ]

  const duracao = !emAndamento && m.finalizadaEm
    ? Math.round((new Date(m.finalizadaEm).getTime() - new Date(m.iniciadaEm).getTime()) / 60000)
    : null

  return (
    <>
      <FotoLightbox
        fotos={fotos}
        indice={lightbox}
        onFechar={() => setLightbox(null)}
        onNavegar={setLightbox}
      />

      <div className={`border-l-[3px] ${cfg.border} bg-white rounded-r-xl px-5 py-4 shadow-sm ring-1 ring-gray-100`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">

          {/* Esquerda */}
          <div className="flex-1 min-w-0 space-y-1.5">

            {/* Tipo + ambiente */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.badge}`}>
                <cfg.Icon className={`w-3.5 h-3.5 ${cfg.iconColor}`} />
                {cfg.label}
              </span>
              {m.ambienteNomeSnapshot && (
                <div className="flex items-center gap-1.5 min-w-0">
                  <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="text-sm font-semibold text-gray-800 truncate">
                    {m.ambienteNomeSnapshot}
                  </span>
                  {m.blocoNomeSnapshot && (
                    <span className="text-xs text-gray-400 truncate">· {m.blocoNomeSnapshot}</span>
                  )}
                </div>
              )}
            </div>

            {/* Descrição */}
            {m.descricao && (
              <p className="text-sm text-gray-600 leading-relaxed">{m.descricao}</p>
            )}

            {/* Meta: tenant · operador · data · duração */}
            <div className="flex items-center gap-1.5 text-[11px] text-gray-400 flex-wrap">
              <Building2 className="w-3 h-3 shrink-0" />
              <span>{m.tenant.nome}</span>
              <span className="text-gray-200">·</span>
              <User className="w-3 h-3 shrink-0" />
              <span>{m.criadoPor.nome}</span>
              <span className="text-gray-200">·</span>
              <span className="tabular-nums">
                {format(new Date(m.iniciadaEm), "dd/MM 'às' HH:mm", { locale: ptBR })}
              </span>
              {duracao !== null && (
                <>
                  <span className="text-gray-200">·</span>
                  <span className="tabular-nums">{duracao} min</span>
                </>
              )}
            </div>

            {/* Observação final */}
            {m.observacaoFinal && (
              <p className="text-xs text-gray-500 italic">{m.observacaoFinal}</p>
            )}

            {/* Botão fotos */}
            <button
              onClick={() => setFotosAbertas((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <Camera className="w-3.5 h-3.5" />
              {fotosAbertas ? 'Ocultar fotos' : 'Ver fotos'}
              {fotosAbertas ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {/* Fotos expandidas */}
            {fotosAbertas && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Antes</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.fotoAntes}
                    alt="Foto antes"
                    onClick={() => setLightbox(0)}
                    className="w-full max-h-48 object-cover rounded-lg ring-1 ring-gray-200 cursor-zoom-in"
                  />
                </div>
                {m.fotoDepois ? (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Depois</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={m.fotoDepois}
                      alt="Foto depois"
                      onClick={() => setLightbox(fotos.length - 1)}
                      className="w-full max-h-48 object-cover rounded-lg ring-1 ring-gray-200 cursor-zoom-in"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center rounded-lg ring-1 ring-dashed ring-gray-200 bg-gray-50 max-h-48 min-h-24">
                    <p className="text-xs text-gray-400">Sem foto depois</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Direita: status */}
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

            {!emAndamento && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Concluída
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  )
}

// ── SectionHeader ────────────────────────────────────────────────────────────

function SectionHeader({ children, icon, badge, badgeColor }: {
  children: React.ReactNode
  icon?: React.ReactNode
  badge?: string
  badgeColor?: string
}) {
  return (
    <div className="flex items-center gap-2 pb-1">
      {icon}
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{children}</span>
      {badge && (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeColor}`}>{badge}</span>
      )}
    </div>
  )
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
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
              <div className="h-4 w-24 bg-gray-100 rounded-full" />
              <div className="h-4 w-36 bg-gray-100 rounded" />
            </div>
            <div className="h-3 w-48 bg-gray-100 rounded mb-1.5" />
            <div className="h-3 w-32 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────────────────────

export default function AdminManutencoesPage() {
  const [filtroTenant, setFiltroTenant] = useState<string>('todos')
  const [filtroTipo, setFiltroTipo] = useState<TipoManutencaoAdmin | 'todos'>('todos')

  const { data: manutencoes = [], isLoading } = useQuery({
    queryKey: ['admin-manutencoes'],
    queryFn: listarManutencoesAdmin,
    refetchInterval: 30_000,
  })

  const { data: tenants = [] } = useQuery<Tenant[]>({
    queryKey: ['admin-tenants'],
    queryFn: listarTenants,
    staleTime: 5 * 60_000,
  })

  const filtradosPorTenant = filtroTenant === 'todos'
    ? manutencoes
    : manutencoes.filter((m) => m.tenant.id === filtroTenant)

  const filtradas = filtroTipo === 'todos'
    ? filtradosPorTenant
    : filtradosPorTenant.filter((m) => m.tipo === filtroTipo)

  const ordenadas = [...filtradas].sort((a, b) => {
    if (a.finalizadaEm === null && b.finalizadaEm !== null) return -1
    if (a.finalizadaEm !== null && b.finalizadaEm === null) return 1
    return new Date(b.iniciadaEm).getTime() - new Date(a.iniciadaEm).getTime()
  })

  const emAndamento = filtradosPorTenant.filter((m) => m.finalizadaEm === null)
  const totalEletrica = filtradosPorTenant.filter((m) => m.tipo === 'eletrica').length
  const totalHidraulica = filtradosPorTenant.filter((m) => m.tipo === 'hidraulica').length
  const totalPredial = filtradosPorTenant.filter((m) => m.tipo === 'predial').length
  const totalPatrimonio = filtradosPorTenant.filter((m) => m.tipo === 'patrimonio').length

  function exportarPdf() {
    const tenantNome = filtroTenant === 'todos'
      ? null
      : tenants.find((t) => t.id === filtroTenant)?.nome ?? filtroTenant
    const selecoes = [
      tenantNome,
      filtroTipo !== 'todos' ? TIPO_CONFIG[filtroTipo].label : null,
    ].filter(Boolean).join(' — ')

    exportarTabelaPdf({
      titulo: `Manutenções Elétrica, Hidráulica e Predial${selecoes ? ` — ${selecoes}` : ''} · Total: ${ordenadas.length}`,
      subtitulo: `Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
      colunas: COLUNAS_MANUTENCOES_ADMIN_PDF,
      linhas: ordenadas.map(linhaManutencaoPdf),
      nomeArquivo: 'manutencoes-admin.pdf',
    })
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb] font-sans">

      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/m/patrimonio"
              className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Patrimônio
            </Link>
            <span className="text-gray-200">/</span>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center shadow-sm">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-gray-900 leading-none">
                  Manutenções Elétrica, Hidráulica e Predial
                </h1>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Atualizado automaticamente a cada 30s
                </p>
              </div>
            </div>
          </div>

          {emAndamento.length > 0 && (
            <div className="flex items-center gap-2 text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full ring-1 ring-blue-100">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              {emAndamento.length} em andamento{filtroTenant !== 'todos' ? ' nessa unidade' : ''}
            </div>
          )}
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <KpiCard
            label="Total registradas"
            value={manutencoes.length}
            icon={Activity}
            iconBg="bg-gray-50"
            iconColor="text-gray-400"
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
          <KpiCard
            label="Elétricas"
            value={totalEletrica}
            icon={Zap}
            iconBg="bg-amber-50"
            iconColor="text-amber-500"
            valueColor="text-gray-900"
          />
          <KpiCard
            label="Hidráulicas"
            value={totalHidraulica}
            icon={Droplet}
            iconBg="bg-sky-50"
            iconColor="text-sky-500"
            valueColor="text-gray-900"
          />
          <KpiCard
            label="Prediais"
            value={totalPredial}
            icon={Building2}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-500"
            valueColor="text-gray-900"
          />
          <KpiCard
            label="Patrimônio"
            value={totalPatrimonio}
            icon={Package}
            iconBg="bg-purple-50"
            iconColor="text-purple-500"
            valueColor="text-gray-900"
          />
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filtroTenant}
              onChange={(e) => setFiltroTenant(e.target.value)}
              className="text-sm border-0 bg-white ring-1 ring-gray-200 rounded-lg px-3 py-2 text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-300 transition"
            >
              <option value="todos">Todas as unidades</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>

            {(['todos', 'eletrica', 'hidraulica', 'predial', 'patrimonio'] as const).map((tipo) => {
              const ativo = filtroTipo === tipo
              const cfg = tipo !== 'todos' ? TIPO_CONFIG[tipo] : null
              const count = tipo === 'todos'
                ? filtradosPorTenant.length
                : filtradosPorTenant.filter((m) => m.tipo === tipo).length

              return (
                <button
                  key={tipo}
                  onClick={() => setFiltroTipo(tipo)}
                  className={`inline-flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg ring-1 transition-all ${
                    ativo && cfg
                      ? `${cfg.filterBg} ${cfg.filterRing} ${cfg.filterText}`
                      : ativo
                        ? 'bg-gray-100 ring-gray-300 text-gray-700'
                        : 'bg-white ring-gray-200 text-gray-500 hover:ring-gray-300'
                  }`}
                >
                  {cfg ? <cfg.Icon className={`w-3.5 h-3.5 ${cfg.iconColor}`} /> : <Activity className="w-3.5 h-3.5" />}
                  {tipo === 'todos' ? 'Todos' : cfg!.label}
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                    ativo && cfg ? `${cfg.filterBg} ${cfg.filterText}` : 'bg-gray-100 text-gray-600'
                  }`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
          <ExportarPdfButton onClick={exportarPdf} disabled={ordenadas.length === 0} />
        </div>

        {isLoading ? (
          <PageSkeleton />
        ) : (
          <div className="space-y-10">

            {/* Em andamento */}
            {(() => {
              const list = ordenadas.filter((m) => m.finalizadaEm === null)
              if (list.length === 0) return null
              return (
                <section className="space-y-3">
                  <SectionHeader
                    icon={<Clock className="w-3.5 h-3.5 text-blue-400" />}
                    badge={String(list.length)}
                    badgeColor="bg-blue-50 text-blue-700"
                  >
                    Em andamento
                  </SectionHeader>
                  <div className="space-y-2">
                    {list.map((m) => <ManutencaoListItem key={m.id} m={m} />)}
                  </div>
                </section>
              )
            })()}

            {/* Concluídas */}
            {(() => {
              const list = ordenadas.filter((m) => m.finalizadaEm !== null)
              return (
                <section className="space-y-3">
                  <SectionHeader
                    icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                    badge={String(list.length)}
                    badgeColor="bg-emerald-50 text-emerald-700"
                  >
                    Concluídas
                  </SectionHeader>

                  {list.length === 0 ? (
                    <div className="flex flex-col items-center py-12 gap-3 text-center bg-white rounded-xl ring-1 ring-gray-100">
                      <div className="w-12 h-12 rounded-2xl bg-gray-50 ring-1 ring-gray-100 flex items-center justify-center">
                        <Zap className="w-6 h-6 text-gray-300" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-700">Nenhuma manutenção registrada</p>
                        <p className="text-xs text-gray-400 mt-1">As manutenções concluídas aparecerão aqui.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {list.map((m) => <ManutencaoListItem key={m.id} m={m} />)}
                    </div>
                  )}
                </section>
              )
            })()}

          </div>
        )}
      </div>
    </div>
  )
}
