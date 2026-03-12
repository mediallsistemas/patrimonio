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

interface Alteracao {
  id: string
  tipo: string
  descricao: string
  trilogoChamado: boolean
}

interface Inspecao {
  id: string
  ambiente: string
  purezaO2: number
  pressaoO2: number
  pressaoAr: number
  backupLigado: boolean
  temAlteracao: boolean
  criadoEm: string
  alteracao: Alteracao | null
}

const TIPO_LABEL: Record<string, { label: string; color: string }> = {
  eletrica:   { label: 'Elétrica',   color: 'bg-yellow-100 text-yellow-700' },
  hidraulica: { label: 'Hidráulica', color: 'bg-blue-100 text-blue-700' },
  patrimonio: { label: 'Patrimônio', color: 'bg-purple-100 text-purple-700' },
}

function FotoLazy({ inspecaoId }: { inspecaoId: string }) {
  const [mostrar, setMostrar] = useState(false)
  const { data, isLoading } = useQuery({
    queryKey: ['foto', inspecaoId],
    queryFn: () => fetch(`/api/inspecoes/${inspecaoId}/foto`).then((r) => r.json()),
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
  if (isLoading) return <span className="text-xs text-gray-300 font-sans">Carregando foto...</span>
  if (!data?.foto) return <span className="text-xs text-gray-300 font-sans">Sem foto</span>
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={data.foto} alt="Ocorrência" className="mt-2 rounded-xl w-full max-h-64 object-cover border border-gray-200" />
}

function InspecaoCard({ insp }: { insp: Inspecao }) {
  const [aberto, setAberto] = useState(false)

  return (
    <div className={`rounded-xl border transition-all ${insp.temAlteracao ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-white'}`}>
      {/* Header do card */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        onClick={() => setAberto((v) => !v)}
      >
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${insp.temAlteracao ? 'bg-orange-400' : 'bg-green-500'}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold font-sans text-dark text-sm">{insp.ambiente}</span>
            {insp.temAlteracao && insp.alteracao && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold font-sans ${TIPO_LABEL[insp.alteracao.tipo]?.color ?? 'bg-gray-100 text-gray-500'}`}>
                {TIPO_LABEL[insp.alteracao.tipo]?.label ?? insp.alteracao.tipo}
              </span>
            )}
            {!insp.temAlteracao && (
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold font-sans bg-green-100 text-green-700">Normal</span>
            )}
          </div>
          <span className="text-xs text-gray-300 font-sans">
            {format(new Date(insp.criadoEm), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </span>
        </div>
        {aberto ? <ChevronUp className="w-4 h-4 text-gray-300 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-300 shrink-0" />}
      </button>

      {/* Detalhes expandidos */}
      {aberto && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-100 pt-3">
          {/* Medições */}
          <div>
            <Text variant="caption" className="text-gray-300 uppercase tracking-wide font-semibold block mb-2">Medições</Text>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm font-sans">
              <span className="text-gray-400">Pureza O₂</span>
              <span className="font-semibold text-dark">{insp.purezaO2}%</span>
              <span className="text-gray-400">Pressão O₂</span>
              <span className="font-semibold text-dark">{insp.pressaoO2} bar</span>
              <span className="text-gray-400">Pressão Ar</span>
              <span className="font-semibold text-dark">{insp.pressaoAr} bar</span>
              <span className="text-gray-400">Backup</span>
              <span className={`font-semibold ${insp.backupLigado ? 'text-green-600' : 'text-red-600'}`}>
                {insp.backupLigado ? 'Ligado' : 'Desligado'}
              </span>
            </div>
          </div>

          {/* Alteração */}
          {insp.temAlteracao && insp.alteracao && (
            <div>
              <Text variant="caption" className="text-gray-300 uppercase tracking-wide font-semibold block mb-2">Ocorrência</Text>
              <div className="space-y-2 text-sm font-sans">
                <p className="text-gray-700">{insp.alteracao.descricao}</p>
                <div className="flex items-center gap-4">
                  <span className="text-gray-400">Trilogo:</span>
                  <span className={`font-semibold ${insp.alteracao.trilogoChamado ? 'text-green-600' : 'text-red-600'}`}>
                    {insp.alteracao.trilogoChamado ? 'Chamado aberto' : 'Não aberto'}
                  </span>
                </div>
                <FotoLazy inspecaoId={insp.id} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function HistoricoPage() {
  const [filtroAmbiente, setFiltroAmbiente] = useState<string>('todos')

  const { data: inspecoes = [], isLoading } = useQuery<Inspecao[]>({
    queryKey: ['inspecoes'],
    queryFn: () => fetch('/api/inspecoes').then((r) => r.json()),
    refetchInterval: 30_000,
  })

  const filtradas = filtroAmbiente === 'todos'
    ? inspecoes
    : inspecoes.filter((i) => i.ambiente === filtroAmbiente)

  const comAlteracao = filtradas.filter((i) => i.temAlteracao).length
  const semAlteracao = filtradas.filter((i) => !i.temAlteracao).length

  return (
    <div className="form-bg min-h-screen flex flex-col">
      <Header title="Histórico de Inspeções" />

      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">

        {/* Voltar + nova inspeção */}
        <div className="flex items-center justify-between mb-5">
          <Link href="/inspecao" className="inline-flex items-center gap-1.5 text-sm text-gray-300 hover:text-red-base font-sans transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>
          <Link href="/inspecao" className="text-sm font-semibold text-red-base font-sans hover:text-red-dark transition-colors">
            + Nova inspeção
          </Link>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Total', value: filtradas.length, color: 'text-dark' },
            { label: 'Com ocorrência', value: comAlteracao, color: 'text-orange-600' },
            { label: 'Normal', value: semAlteracao, color: 'text-green-600' },
          ].map(({ label, value, color }) => (
            <Card key={label} shadow="sm" padding="sm" className="text-center">
              <p className={`text-xl font-bold font-sans ${color}`}>{value}</p>
              <p className="text-xs text-gray-300 font-sans">{label}</p>
            </Card>
          ))}
        </div>

        {/* Filtro por ambiente */}
        <div className="flex gap-2 mb-5">
          {['todos', 'HRPG', 'UEI'].map((a) => (
            <button
              key={a}
              onClick={() => setFiltroAmbiente(a)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold font-sans border transition-all ${filtroAmbiente === a ? 'bg-red-base text-white border-red-base' : 'border-gray-200 text-gray-300 bg-white hover:border-red-base hover:text-red-base'}`}
            >
              {a === 'todos' ? 'Todos' : a}
            </button>
          ))}
        </div>

        {/* Lista */}
        {isLoading ? (
          <p className="text-center py-10 text-gray-300 font-sans text-sm">Carregando...</p>
        ) : filtradas.length === 0 ? (
          <p className="text-center py-10 text-gray-300 font-sans text-sm">Nenhuma inspeção registrada.</p>
        ) : (
          <div className="space-y-3">
            {filtradas.map((insp) => (
              <InspecaoCard key={insp.id} insp={insp} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
