'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronDown, ChevronUp, FlaskConical, MapPin } from 'lucide-react'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import Text from '@/components/ui/Text'
import Header from '@/components/ui/Header'
import { TIPO_OCORRENCIA } from '@/lib/ronda-tipos'
import { RondaCard } from '@/components/ui/ronda/RondaCard'
import { FotoLazy } from '@/components/ui/ronda/FotoLazy'
import * as rondasService from '@/services/rondas.service'
import type { Ronda, RegistroAmbiente } from '@/services/rondas.types'

// ── Card de ambiente (operador — inclui dados de gases) ────────────────────────

function AmbienteCard({ reg }: { reg: RegistroAmbiente }) {
  const [aberto, setAberto] = useState(false)
  const isGases = reg.tipoRegistro === 'gases'

  return (
    <div className={`rounded-xl border transition-all ${reg.temOcorrencia ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-white'}`}>
      <button className="w-full flex items-center gap-3 px-4 py-3 text-left" onClick={() => setAberto((v) => !v)}>
        <div className={`w-2 h-2 rounded-full shrink-0 ${reg.temOcorrencia ? 'bg-orange-400' : 'bg-green-500'}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold font-sans text-dark text-sm">{reg.ambiente}</span>
            {isGases && <FlaskConical className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
            {reg.temOcorrencia && reg.ocorrencias.length > 0 ? (
              <>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold font-sans ${TIPO_OCORRENCIA[reg.ocorrencias[0].tipo]?.color ?? 'bg-gray-100 text-gray-500'}`}>
                  {TIPO_OCORRENCIA[reg.ocorrencias[0].tipo]?.label ?? reg.ocorrencias[0].tipo}
                </span>
                {reg.ocorrencias.length > 1 && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold font-sans bg-orange-100 text-orange-700">
                    +{reg.ocorrencias.length - 1}
                  </span>
                )}
              </>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold font-sans bg-green-100 text-green-700">Normal</span>
            )}
          </div>
          <span className="text-xs text-gray-300 font-sans">
            {format(new Date(reg.concluidoEm), 'HH:mm', { locale: ptBR })}
          </span>
        </div>
        {aberto ? <ChevronUp className="w-4 h-4 text-gray-300 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-300 shrink-0" />}
      </button>

      {aberto && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
          {/* Dados de gases */}
          {isGases && reg.purezaO2 !== null && (
            <div>
              <Text variant="caption" className="text-gray-300 uppercase tracking-wide font-semibold block mb-2">
                Medições de Gases
              </Text>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm font-sans">
                <span className="text-gray-400">Pureza O₂:</span>
                <span className="font-semibold text-dark">{reg.purezaO2}%</span>
                <span className="text-gray-400">Pressão O₂:</span>
                <span className="font-semibold text-dark">{reg.pressaoO2} bar</span>
                <span className="text-gray-400">Pressão Ar:</span>
                <span className="font-semibold text-dark">{reg.pressaoAr} bar</span>
                <span className="text-gray-400">Backup:</span>
                <span className={`font-semibold ${reg.backupLigado ? 'text-green-600' : 'text-red-600'}`}>
                  {reg.backupLigado ? 'Ligado' : 'Desligado'}
                </span>
                {reg.temAbastecimento && reg.qtdCilindros && (
                  <>
                    <span className="text-gray-400">Abastecimento:</span>
                    <span className="font-semibold text-sky-700">{reg.qtdCilindros} cil. {reg.tamCilindro}</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Ocorrências */}
          {reg.temOcorrencia && reg.ocorrencias.length > 0 && (
            <div className="space-y-3">
              {reg.ocorrencias.map((oc, i) => (
                <div key={oc.id}>
                  {reg.ocorrencias.length > 1 && (
                    <Text variant="caption" className="text-gray-400 uppercase tracking-wide font-semibold block mb-1">
                      Ocorrência {i + 1}
                    </Text>
                  )}
                  <p className="text-sm font-sans text-gray-700">{oc.descricao}</p>
                  <div className="flex items-center gap-3 text-sm font-sans mt-1">
                    <span className="text-gray-400">Trilogo:</span>
                    <span className={`font-semibold ${oc.trilogoChamado ? 'text-green-600' : 'text-red-600'}`}>
                      {oc.trilogoChamado ? 'Chamado aberto' : 'Não aberto'}
                    </span>
                  </div>
                  <FotoLazy ocorrenciaId={oc.id} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function HistoricoRondaPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>()
  const { data: rondas = [], isLoading } = useQuery({
    queryKey: ['rondas-unificadas'],
    queryFn: () => rondasService.listar() as unknown as Promise<Ronda[]>,
    refetchInterval: 30_000,
  })

  const totalRondas      = rondas.length
  const totalOcorrencias = rondas.reduce((acc, r) => acc + r.ambientes.filter((a) => a.temOcorrencia).length, 0)
  const totalNormais     = rondas.reduce((acc, r) => acc + r.ambientes.filter((a) => !a.temOcorrencia).length, 0)

  return (
    <div className="form-bg min-h-screen flex flex-col">
      <Header title="Histórico de Rondas" backHref={`/${tenantSlug}/ronda`} />

      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-5">
          <Link
            href={`/${tenantSlug}/ronda`}
            className="inline-flex items-center gap-1.5 text-sm text-gray-300 hover:text-red-base font-sans transition-colors"
          >
            <MapPin className="w-4 h-4" /> Nova ronda
          </Link>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Rondas',      value: totalRondas,      color: 'text-dark' },
            { label: 'Ocorrências', value: totalOcorrencias, color: 'text-orange-600' },
            { label: 'Normal',      value: totalNormais,     color: 'text-green-600' },
          ].map(({ label, value, color }) => (
            <Card key={label} shadow="sm" padding="sm" className="text-center">
              <p className={`text-xl font-bold font-sans ${color}`}>{value}</p>
              <p className="text-xs text-gray-300 font-sans">{label}</p>
            </Card>
          ))}
        </div>

        {/* Lista */}
        {isLoading ? (
          <p className="text-center py-10 text-gray-300 font-sans text-sm">Carregando...</p>
        ) : rondas.length === 0 ? (
          <p className="text-center py-10 text-gray-300 font-sans text-sm">Nenhuma ronda registrada.</p>
        ) : (
          <div className="space-y-3">
            {rondas.map((ronda) => {
              const ambienteMap = Object.fromEntries(ronda.ambientes.map((a) => [a.id, a]))
              return (
                <RondaCard
                  key={ronda.id}
                  ronda={ronda}
                  renderAmbiente={(id) => {
                    const reg = ambienteMap[id]
                    return reg ? <AmbienteCard key={id} reg={reg} /> : null
                  }}
                />
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
