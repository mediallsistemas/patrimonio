'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ChevronDown, ChevronUp, ArrowLeft,
  AlertTriangle, Activity,
} from 'lucide-react'
import Link from 'next/link'
import Card from '@/components/ui/Card'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface OcorrenciaDetalhe {
  id: string
  tipo: string
  descricao: string
  foto: string | null
  trilogoChamado: boolean
}

interface RegistroAmbiente {
  id: string
  ambiente: string
  temOcorrencia: boolean
  concluidoEm: string
  ocorrencias: OcorrenciaDetalhe[]
}

interface Tenant {
  id: string
  nome: string
  slug: string
}

interface Ronda {
  id: string
  tenantId: string
  iniciadoEm: string
  finalizadoEm: string | null
  ambientes: RegistroAmbiente[]
  tenant: Tenant
}

// ── Config ────────────────────────────────────────────────────────────────────

const TIPO_LABEL: Record<string, { label: string; color: string }> = {
  eletrica:   { label: 'Elétrica',   color: 'bg-yellow-100 text-yellow-700' },
  hidraulica: { label: 'Hidráulica', color: 'bg-blue-100 text-blue-700' },
  patrimonio: { label: 'Patrimônio', color: 'bg-purple-100 text-purple-700' },
}

// ── Grupo de ambientes ────────────────────────────────────────────────────────

function GrupoAmbientes({
  titulo,
  ambientes,
  variante,
  defaultAberto = false,
}: {
  titulo: string
  ambientes: RegistroAmbiente[]
  variante: 'normal' | 'ocorrencia'
  defaultAberto?: boolean
}) {
  const [aberto, setAberto] = useState(defaultAberto)

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
          {ambientes.map((amb) => (
            <div
              key={amb.id}
              className={`rounded-xl border px-3 py-2.5 ${amb.temOcorrencia ? 'border-orange-200 bg-orange-50' : 'border-gray-100 bg-white'}`}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold font-sans text-dark">{amb.ambiente}</span>
                {amb.temOcorrencia && amb.ocorrencias.length > 0 ? (
                  amb.ocorrencias.map((oc) => (
                    <span key={oc.id} className={`text-xs px-2 py-0.5 rounded-full font-semibold font-sans ${TIPO_LABEL[oc.tipo]?.color ?? 'bg-gray-100 text-gray-500'}`}>
                      {TIPO_LABEL[oc.tipo]?.label ?? oc.tipo}
                    </span>
                  ))
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold font-sans bg-green-100 text-green-700">Normal</span>
                )}
              </div>
              {amb.temOcorrencia && amb.ocorrencias.map((oc) => (
                <div key={oc.id} className="mt-1.5 space-y-1">
                  <p className="text-xs text-gray-500 font-sans line-clamp-2">{oc.descricao}</p>
                  {oc.foto && (
                    <img
                      src={oc.foto}
                      alt="Foto da ocorrência"
                      className="rounded-lg w-full max-h-48 object-cover border border-orange-100"
                    />
                  )}
                </div>
              ))}
              <span className="text-xs text-gray-300 font-sans">
                {format(new Date(amb.concluidoEm), 'HH:mm', { locale: ptBR })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Card de ronda ─────────────────────────────────────────────────────────────

function RondaCard({ ronda }: { ronda: Ronda }) {
  const [aberto, setAberto] = useState(false)
  const normais = ronda.ambientes.filter((a) => !a.temOcorrencia)
  const ocorrencias = ronda.ambientes.filter((a) => a.temOcorrencia)
  const total = ronda.ambientes.length

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-4 text-left"
        onClick={() => setAberto((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold font-sans text-dark text-sm">
              {format(new Date(ronda.iniciadoEm), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold font-sans bg-indigo-100 text-indigo-700">
              {ronda.tenant.nome}
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
            {ronda.finalizadoEm && (
              <> · {Math.round((new Date(ronda.finalizadoEm).getTime() - new Date(ronda.iniciadoEm).getTime()) / 60000)} min</>
            )}
          </span>
        </div>
        {aberto ? <ChevronUp className="w-4 h-4 text-gray-300 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-300 shrink-0" />}
      </button>

      {aberto && (
        <div className="px-4 pb-4 space-y-2 border-t border-gray-100 pt-3">
          <GrupoAmbientes titulo="Ocorrências" ambientes={ocorrencias} variante="ocorrencia" defaultAberto={ocorrencias.length > 0} />
          <GrupoAmbientes titulo="Conformidade" ambientes={normais} variante="normal" defaultAberto={ocorrencias.length === 0} />
          {total === 0 && (
            <p className="text-xs text-gray-300 font-sans text-center py-2">Nenhum ambiente registrado.</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function AdminRondasPage() {
  const [filtroPendente, setFiltroPendente] = useState(false)
  const [filtroTenant, setFiltroTenant] = useState<string>('todos')

  const { data: rondas = [], isLoading } = useQuery<Ronda[]>({
    queryKey: ['admin-rondas'],
    queryFn: () => fetch('/api/admin/rondas').then((r) => r.json()).then((j) => j.data ?? j),
    refetchInterval: 30_000,
  })

  const tenants = Array.from(
    new Map(rondas.map((r) => [r.tenant.id, r.tenant])).values()
  )

  const totalRondas = rondas.length
  const totalOcorrencias = rondas.reduce((acc, r) => acc + r.ambientes.filter((a) => a.temOcorrencia).length, 0)
  const rondasComOcorrencia = rondas.filter((r) => r.ambientes.some((a) => a.temOcorrencia)).length

  const rondasFiltradas = rondas.filter((r) => {
    if (filtroTenant !== 'todos' && r.tenantId !== filtroTenant) return false
    if (filtroPendente && !r.ambientes.some((a) => a.temOcorrencia)) return false
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
            { label: 'Total de Rondas',     value: totalRondas,        color: 'text-dark',       icon: Activity },
            { label: 'Com Ocorrências',      value: rondasComOcorrencia, color: 'text-orange-600', icon: AlertTriangle },
            { label: 'Áreas c/ Ocorrência', value: totalOcorrencias,   color: 'text-orange-600', icon: AlertTriangle },
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
        ) : rondasFiltradas.length === 0 ? (
          <p className="text-center py-10 text-gray-300 font-sans text-sm">Nenhuma ronda encontrada.</p>
        ) : (
          <div className="space-y-3">
            {rondasFiltradas.map((ronda) => (
              <RondaCard key={ronda.id} ronda={ronda} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
