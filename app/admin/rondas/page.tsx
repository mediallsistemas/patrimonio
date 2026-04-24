'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, AlertTriangle, Activity } from 'lucide-react'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import { RondaCard } from '@/components/ui/ronda/RondaCard'
import { listarRondas } from '@/services/admin-rondas.service'
import type { Ronda } from '@/services/rondas.types'

export default function AdminRondasPage() {
  const [filtroPendente, setFiltroPendente] = useState(false)
  const [filtroTenant, setFiltroTenant] = useState<string>('todos')

  const { data: rondas = [], isLoading } = useQuery<Ronda[]>({
    queryKey: ['admin-rondas'],
    queryFn: listarRondas,
    refetchInterval: 30_000,
  })

  const tenants = Array.from(
    new Map(
      rondas.filter((r) => r.tenant).map((r) => [r.tenant!.id, r.tenant!])
    ).values()
  )

  const totalRondas = rondas.length
  const totalOcorrencias = rondas.reduce(
    (acc, r) => acc + r.ambientes.filter((a) => a.temOcorrencia).length,
    0
  )
  const rondasComOcorrencia = rondas.filter((r) =>
    r.ambientes.some((a) => a.temOcorrencia)
  ).length

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
            { label: 'Total de Rondas',     value: totalRondas,         color: 'text-dark',       icon: Activity },
            { label: 'Com Ocorrências',      value: rondasComOcorrencia, color: 'text-orange-600', icon: AlertTriangle },
            { label: 'Áreas c/ Ocorrência', value: totalOcorrencias,    color: 'text-orange-600', icon: AlertTriangle },
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
              <RondaCard
                key={ronda.id}
                ronda={ronda}
                mostrarTenant
                mostrarDono
                agruparAmbientes
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
