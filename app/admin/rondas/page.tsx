'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ChevronDown, ChevronUp, ArrowLeft, Building2, Factory,
  AlertTriangle, CheckCircle2, Activity,
} from 'lucide-react'
import Link from 'next/link'
import Card from '@/components/card'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Alteracao {
  id: string
  tipo: string
  descricao: string
  trilogoChamado: boolean
}

interface AmbienteInspecionado {
  id: string
  ambiente: string
  purezaO2: number
  pressaoO2: number
  pressaoAr: number
  backupLigado: boolean
  temAbastecimento: boolean
  temAlteracao: boolean
  concluidoEm: string
  alteracao: Alteracao | null
}

interface Tenant {
  id: string
  nome: string
  slug: string
}

interface Rodada {
  id: string
  tenantId: string
  iniciadoEm: string
  finalizadoEm: string | null
  ambientes: AmbienteInspecionado[]
  tenant: Tenant
}

// ── Config ────────────────────────────────────────────────────────────────────

const TIPO_LABEL: Record<string, { label: string; color: string }> = {
  eletrica:   { label: 'Elétrica',   color: 'bg-yellow-100 text-yellow-700' },
  hidraulica: { label: 'Hidráulica', color: 'bg-blue-100 text-blue-700' },
  patrimonio: { label: 'Patrimônio', color: 'bg-purple-100 text-purple-700' },
}

const AMBIENTE_ICON: Record<string, { icon: React.ElementType; bgColor: string }> = {
  HRPG: { icon: Building2, bgColor: '#2563eb' },
  UEI:  { icon: Factory,   bgColor: '#7c3aed' },
}

// ── Grupo de ambientes ────────────────────────────────────────────────────────

function GrupoAmbientes({
  titulo,
  ambientes,
  variante,
}: {
  titulo: string
  ambientes: AmbienteInspecionado[]
  variante: 'normal' | 'ocorrencia'
}) {
  const [aberto, setAberto] = useState(false)

  const estilos =
    variante === 'normal'
      ? {
          border: 'border-emerald-300',
          header: 'bg-emerald-600 text-white',
          badge: 'bg-emerald-500 text-white',
          chevron: 'text-white',
        }
      : {
          border: 'border-amber-300',
          header: 'bg-amber-500 text-white',
          badge: 'bg-amber-400 text-white',
          chevron: 'text-white',
        }

  if (ambientes.length === 0) return null

  return (
    <div className={`rounded-xl border ${estilos.border} overflow-hidden`}>
      <button
        className={`w-full flex items-center justify-between px-3 py-2.5 text-left ${estilos.header}`}
        onClick={() => setAberto((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold font-sans">{titulo}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold font-sans ${estilos.badge}`}>
            {ambientes.length}
          </span>
        </div>
        {aberto
          ? <ChevronUp className={`w-4 h-4 shrink-0 ${estilos.chevron}`} />
          : <ChevronDown className={`w-4 h-4 shrink-0 ${estilos.chevron}`} />}
      </button>

      {aberto && (
        <div className="px-3 pb-3 pt-2 space-y-2">
          {ambientes.map((amb) => {
            const cfg = AMBIENTE_ICON[amb.ambiente]
            const Icon = cfg?.icon ?? Building2
            const bgColor = cfg?.bgColor ?? '#6b7280'
            return (
              <div
                key={amb.id}
                className={`rounded-xl border px-3 py-2.5 flex items-start gap-3 ${amb.temAlteracao ? 'border-orange-200 bg-orange-50' : 'border-gray-100 bg-white'}`}
              >
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                  style={{ backgroundColor: bgColor }}
                >
                  <Icon className="w-3 h-3 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold font-sans text-dark">{amb.ambiente}</span>
                    {amb.temAlteracao && amb.alteracao ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold font-sans ${TIPO_LABEL[amb.alteracao.tipo]?.color ?? 'bg-gray-100 text-gray-500'}`}>
                        {TIPO_LABEL[amb.alteracao.tipo]?.label ?? amb.alteracao.tipo}
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold font-sans bg-green-100 text-green-700">Normal</span>
                    )}
                  </div>
                  {amb.temAlteracao && amb.alteracao && (
                    <p className="text-xs text-gray-500 font-sans mt-0.5 line-clamp-2">{amb.alteracao.descricao}</p>
                  )}
                  <span className="text-xs text-gray-300 font-sans">
                    {format(new Date(amb.concluidoEm), 'HH:mm', { locale: ptBR })}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Card de rodada ────────────────────────────────────────────────────────────

function RodadaCard({ rodada }: { rodada: Rodada }) {
  const [aberto, setAberto] = useState(false)
  const normais = rodada.ambientes.filter((a) => !a.temAlteracao)
  const ocorrencias = rodada.ambientes.filter((a) => a.temAlteracao)
  const total = rodada.ambientes.length

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-4 text-left"
        onClick={() => setAberto((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold font-sans text-dark text-sm">
              {format(new Date(rodada.iniciadoEm), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold font-sans bg-indigo-100 text-indigo-700">
              {rodada.tenant.nome}
            </span>
            {ocorrencias.length > 0 ? (
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold font-sans bg-orange-100 text-orange-700">
                {ocorrencias.length} ocorrência{ocorrencias.length > 1 ? 's' : ''}
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold font-sans bg-green-100 text-green-700">
                Tudo normal
              </span>
            )}
          </div>
          <span className="text-xs text-gray-300 font-sans">
            {total} ambiente{total !== 1 ? 's' : ''} inspecionado{total !== 1 ? 's' : ''}
            {rodada.finalizadoEm && (
              <> · {Math.round((new Date(rodada.finalizadoEm).getTime() - new Date(rodada.iniciadoEm).getTime()) / 60000)} min</>
            )}
          </span>
        </div>
        {aberto ? <ChevronUp className="w-4 h-4 text-gray-300 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-300 shrink-0" />}
      </button>

      {aberto && (
        <div className="px-4 pb-4 space-y-2 border-t border-gray-100 pt-3">
          <GrupoAmbientes titulo="Conformidade" ambientes={normais} variante="normal" />
          <GrupoAmbientes titulo="Ocorrências" ambientes={ocorrencias} variante="ocorrencia" />
        </div>
      )}
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function AdminRondasPage() {
  const [filtroPendente, setFiltroPendente] = useState(false)
  const [filtroTenant, setFiltroTenant] = useState<string>('todos')

  const { data: rodadas = [], isLoading } = useQuery<Rodada[]>({
    queryKey: ['admin-rodadas'],
    queryFn: () => fetch('/api/admin/rondas').then((r) => r.json()),
    refetchInterval: 30_000,
  })

  const tenants = Array.from(
    new Map(rodadas.map((r) => [r.tenant.id, r.tenant])).values()
  )

  const totalRodadas = rodadas.length
  const totalOcorrencias = rodadas.reduce((acc, r) => acc + r.ambientes.filter((a) => a.temAlteracao).length, 0)
  const totalNormais = rodadas.reduce((acc, r) => acc + r.ambientes.filter((a) => !a.temAlteracao).length, 0)
  const rondasComOcorrencia = rodadas.filter((r) => r.ambientes.some((a) => a.temAlteracao)).length

  const rodadasFiltradas = rodadas.filter((r) => {
    if (filtroTenant !== 'todos' && r.tenantId !== filtroTenant) return false
    if (filtroPendente && !r.ambientes.some((a) => a.temAlteracao)) return false
    return true
  })

  return (
    <div className="form-bg min-h-screen flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm text-gray-300 hover:text-dark font-sans transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Admin
        </Link>
        <span className="text-gray-200">/</span>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#6366f1] flex items-center justify-center">
            <Activity className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold font-sans text-dark">Monitoramento de Rondas</span>
        </div>
      </div>

      <main className="flex-1 px-4 py-6 max-w-3xl mx-auto w-full">

        {/* Resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Total de Rondas',     value: totalRodadas,       color: 'text-dark',        icon: Activity },
            { label: 'Com Ocorrências',      value: rondasComOcorrencia, color: 'text-orange-600',  icon: AlertTriangle },
            { label: 'Áreas c/ Ocorrência', value: totalOcorrencias,   color: 'text-orange-600',  icon: AlertTriangle },
            { label: 'Áreas Normais',        value: totalNormais,       color: 'text-green-600',   icon: CheckCircle2 },
          ].map(({ label, value, color, icon: Icon }) => (
            <Card key={label} shadow="sm" padding="sm" className="text-center">
              <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
              <p className={`text-xl font-bold font-sans ${color}`}>{value}</p>
              <p className="text-xs text-gray-300 font-sans leading-tight">{label}</p>
            </Card>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 mb-4">
          <select
            value={filtroTenant}
            onChange={(e) => setFiltroTenant(e.target.value)}
            className="text-sm font-sans border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-dark focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="todos">Todas as unidades</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>{t.nome}</option>
            ))}
          </select>

          <button
            onClick={() => setFiltroPendente((v) => !v)}
            className={`text-sm font-sans font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
              filtroPendente
                ? 'bg-orange-100 border-orange-300 text-orange-700'
                : 'bg-white border-gray-200 text-gray-400 hover:border-orange-200 hover:text-orange-600'
            }`}
          >
            Só com ocorrências
          </button>
        </div>

        {/* Lista */}
        {isLoading ? (
          <p className="text-center py-10 text-gray-300 font-sans text-sm">Carregando...</p>
        ) : rodadasFiltradas.length === 0 ? (
          <p className="text-center py-10 text-gray-300 font-sans text-sm">Nenhuma ronda encontrada.</p>
        ) : (
          <div className="space-y-3">
            {rodadasFiltradas.map((rodada) => (
              <RodadaCard key={rodada.id} rodada={rodada} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
