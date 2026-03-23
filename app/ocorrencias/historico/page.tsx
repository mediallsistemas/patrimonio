'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import Card from '@/components/card'
import Text from '@/components/text'
import Header from '@/components/header'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface OcorrenciaDetalhe {
  id: string
  tipo: string
  descricao: string
  trilogoChamado: boolean
}

interface RegistroAmbiente {
  id: string
  ambiente: string
  temOcorrencia: boolean
  concluidoEm: string
  ocorrencia: OcorrenciaDetalhe | null
}

interface Ronda {
  id: string
  iniciadoEm: string
  finalizadoEm: string | null
  ambientes: RegistroAmbiente[]
}

// ── Config ────────────────────────────────────────────────────────────────────

const TIPO_LABEL: Record<string, { label: string; color: string }> = {
  eletrica:   { label: 'Elétrica',   color: 'bg-yellow-100 text-yellow-700' },
  hidraulica: { label: 'Hidráulica', color: 'bg-blue-100 text-blue-700' },
  patrimonio: { label: 'Patrimônio', color: 'bg-purple-100 text-purple-700' },
}

// ── Foto lazy ─────────────────────────────────────────────────────────────────

function FotoLazy({ ocorrenciaId }: { ocorrenciaId: string }) {
  const [mostrar, setMostrar] = useState(false)
  const { data, isLoading } = useQuery({
    queryKey: ['foto-ocorrencia', ocorrenciaId],
    queryFn: () => fetch(`/api/ocorrencias/${ocorrenciaId}/foto`).then((r) => r.json()),
    enabled: mostrar,
  })

  if (!mostrar) {
    return (
      <button
        onClick={() => setMostrar(true)}
        className="text-xs text-red-base font-sans underline hover:text-red-dark"
      >
        Ver foto
      </button>
    )
  }
  if (isLoading) return <span className="text-xs text-gray-300 font-sans">Carregando...</span>
  if (!data?.foto) return <span className="text-xs text-gray-300 font-sans">Sem foto</span>
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={data.foto} alt="Ocorrência" className="mt-2 rounded-xl w-full max-h-64 object-cover border border-gray-200" />
}

// ── Card de ambiente ──────────────────────────────────────────────────────────

function AmbienteCard({ reg }: { reg: RegistroAmbiente }) {
  const [aberto, setAberto] = useState(false)

  return (
    <div className={`rounded-xl border transition-all ${reg.temOcorrencia ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-white'}`}>
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        onClick={() => setAberto((v) => !v)}
      >
        <div className={`w-2 h-2 rounded-full shrink-0 ${reg.temOcorrencia ? 'bg-orange-400' : 'bg-green-500'}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold font-sans text-dark text-sm">{reg.ambiente}</span>
            {reg.temOcorrencia && reg.ocorrencia ? (
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold font-sans ${TIPO_LABEL[reg.ocorrencia.tipo]?.color ?? 'bg-gray-100 text-gray-500'}`}>
                {TIPO_LABEL[reg.ocorrencia.tipo]?.label ?? reg.ocorrencia.tipo}
              </span>
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

      {aberto && reg.temOcorrencia && reg.ocorrencia && (
        <div className="px-4 pb-4 space-y-3 border-t border-orange-100 pt-3">
          <div>
            <Text variant="caption" className="text-gray-300 uppercase tracking-wide font-semibold block mb-1">Ocorrência</Text>
            <p className="text-sm font-sans text-gray-700">{reg.ocorrencia.descricao}</p>
          </div>
          <div className="flex items-center gap-3 text-sm font-sans">
            <span className="text-gray-400">Trilogo:</span>
            <span className={`font-semibold ${reg.ocorrencia.trilogoChamado ? 'text-green-600' : 'text-red-600'}`}>
              {reg.ocorrencia.trilogoChamado ? 'Chamado aberto' : 'Não aberto'}
            </span>
          </div>
          <FotoLazy ocorrenciaId={reg.ocorrencia.id} />
        </div>
      )}
    </div>
  )
}

// ── Card de ronda ─────────────────────────────────────────────────────────────

function RondaCard({ ronda }: { ronda: Ronda }) {
  const [aberto, setAberto] = useState(false)
  const comOcorrencia = ronda.ambientes.filter((a) => a.temOcorrencia).length
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
            {comOcorrencia > 0 ? (
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold font-sans bg-orange-100 text-orange-700">
                {comOcorrencia} ocorrência{comOcorrencia > 1 ? 's' : ''}
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold font-sans bg-green-100 text-green-700">
                Tudo normal
              </span>
            )}
          </div>
          <span className="text-xs text-gray-300 font-sans">
            {total} ambiente{total !== 1 ? 's' : ''} verificado{total !== 1 ? 's' : ''}
            {ronda.finalizadoEm && (
              <> · {Math.round((new Date(ronda.finalizadoEm).getTime() - new Date(ronda.iniciadoEm).getTime()) / 60000)} min</>
            )}
          </span>
        </div>
        {aberto ? <ChevronUp className="w-4 h-4 text-gray-300 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-300 shrink-0" />}
      </button>

      {aberto && (
        <div className="px-4 pb-4 space-y-2 border-t border-gray-100 pt-3">
          {ronda.ambientes.map((reg) => (
            <AmbienteCard key={reg.id} reg={reg} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function HistoricoOcorrenciasPage() {
  const { data: rondas = [], isLoading } = useQuery<Ronda[]>({
    queryKey: ['rondas'],
    queryFn: () => fetch('/api/rondas').then((r) => r.json()).then((j) => j.data ?? j),
    refetchInterval: 30_000,
  })

  const totalRondas      = rondas.length
  const totalOcorrencias = rondas.reduce((acc, r) => acc + r.ambientes.filter((a) => a.temOcorrencia).length, 0)
  const totalNormais     = rondas.reduce((acc, r) => acc + r.ambientes.filter((a) => !a.temOcorrencia).length, 0)

  return (
    <div className="form-bg min-h-screen flex flex-col">
      <Header title="Histórico de Ocorrências" />

      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">

        <div className="flex items-center justify-between mb-5">
          <Link href="/ocorrencias" className="inline-flex items-center gap-1.5 text-sm text-gray-300 hover:text-red-base font-sans transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>
          <Link href="/ocorrencias" className="text-sm font-semibold text-red-base font-sans hover:text-red-dark transition-colors">
            + Nova ronda
          </Link>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Rondas',        value: totalRondas,      color: 'text-dark' },
            { label: 'Ocorrências',   value: totalOcorrencias, color: 'text-orange-600' },
            { label: 'Normal',        value: totalNormais,     color: 'text-green-600' },
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
            {rondas.map((ronda) => (
              <RondaCard key={ronda.id} ronda={ronda} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
