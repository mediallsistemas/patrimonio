'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import Header from '@/components/ui/Header'
import { RodadaCard } from '@/components/ui/inspecao/RodadaCard'
import { listar } from '@/services/rodadas.service'
import type { RodadaInspecao } from '@/services/inspecao.types'

export default function HistoricoPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>()
  const { data: rodadas = [], isLoading } = useQuery<RodadaInspecao[]>({
    queryKey: ['rodadas'],
    queryFn: listar,
    refetchInterval: 30_000,
  })

  const totalRodadas    = rodadas.length
  const totalOcorrencias = rodadas.reduce((acc, r) => acc + r.ambientes.filter((a) => a.temAlteracao).length, 0)
  const totalNormais    = rodadas.reduce((acc, r) => acc + r.ambientes.filter((a) => !a.temAlteracao).length, 0)

  return (
    <div className="form-bg min-h-screen flex flex-col">
      <Header title="Histórico de Inspeções" backHref={`/${tenantSlug}/inspecao`} />

      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">

        <div className="flex items-center justify-between mb-5">
          <Link href={`/${tenantSlug}/inspecao`} className="inline-flex items-center gap-1.5 text-sm text-gray-300 hover:text-red-base font-sans transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>
          <Link href={`/${tenantSlug}/inspecao`} className="text-sm font-semibold text-red-base font-sans hover:text-red-dark transition-colors">
            + Nova inspeção
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Rodadas',        value: totalRodadas,     color: 'text-dark' },
            { label: 'Com ocorrência', value: totalOcorrencias, color: 'text-orange-600' },
            { label: 'Normal',         value: totalNormais,     color: 'text-green-600' },
          ].map(({ label, value, color }) => (
            <Card key={label} shadow="sm" padding="sm" className="text-center">
              <p className={`text-xl font-bold font-sans ${color}`}>{value}</p>
              <p className="text-xs text-gray-300 font-sans">{label}</p>
            </Card>
          ))}
        </div>

        {isLoading ? (
          <p className="text-center py-10 text-gray-300 font-sans text-sm">Carregando...</p>
        ) : rodadas.length === 0 ? (
          <p className="text-center py-10 text-gray-300 font-sans text-sm">Nenhuma inspeção registrada.</p>
        ) : (
          <div className="space-y-3">
            {rodadas.map((rodada) => (
              <RodadaCard key={rodada.id} rodada={rodada} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
