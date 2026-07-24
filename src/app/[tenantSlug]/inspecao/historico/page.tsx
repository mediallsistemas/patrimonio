'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronDown, ChevronUp, ArrowLeft, Building2, Package } from 'lucide-react'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import Text from '@/components/ui/Text'
import Header from '@/components/ui/Header'
import ExportarPdfButton from '@/components/ui/ExportarPdfButton'
import { exportarTabelaPdf, COLUNAS_INSPECOES_PDF, linhaRodadaPdf } from '@/utils/pdf-export'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Alteracao {
  id: string
  tipo: string
  descricao: string
  trilogoChamado: boolean
}

interface Abastecimento {
  quantidade: number
  tamanho: string
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
  abastecimento: Abastecimento | null
  alteracao: Alteracao | null
}

interface Rodada {
  id: string
  iniciadoEm: string
  finalizadoEm: string | null
  ambientes: AmbienteInspecionado[]
}

// ── Config ────────────────────────────────────────────────────────────────────

const TIPO_LABEL: Record<string, { label: string; color: string }> = {
  eletrica:   { label: 'Elétrica',   color: 'bg-yellow-100 text-yellow-700' },
  hidraulica: { label: 'Hidráulica', color: 'bg-blue-100 text-blue-700' },
  patrimonio: { label: 'Patrimônio', color: 'bg-purple-100 text-purple-700' },
}

// Ícone genérico para qualquer tenant
const AMBIENTE_ICON_DEFAULT = { icon: Building2, bgColor: '#2563eb' }

// ── Foto lazy ─────────────────────────────────────────────────────────────────

function FotoLazy({ ambienteId }: { ambienteId: string }) {
  const [mostrar, setMostrar] = useState(false)
  const { data, isLoading } = useQuery({
    queryKey: ['foto-ambiente', ambienteId],
    queryFn: () => fetch(`/api/ambientes/${ambienteId}/foto`).then((r) => r.json()),
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

// ── Card de ambiente ──────────────────────────────────────────────────────────

function AmbienteCard({ amb }: { amb: AmbienteInspecionado }) {
  const [aberto, setAberto] = useState(false)
  const { icon: Icon, bgColor } = AMBIENTE_ICON_DEFAULT

  return (
    <div className={`rounded-xl border transition-all ${amb.temAlteracao ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-white'}`}>
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        onClick={() => setAberto((v) => !v)}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: bgColor }}
        >
          <Icon className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold font-sans text-dark text-sm">{amb.ambiente}</span>
            {amb.temAlteracao && amb.alteracao ? (
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold font-sans ${TIPO_LABEL[amb.alteracao.tipo]?.color ?? 'bg-gray-100 text-gray-500'}`}>
                {TIPO_LABEL[amb.alteracao.tipo]?.label ?? amb.alteracao.tipo}
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold font-sans bg-green-100 text-green-700">Normal</span>
            )}
          </div>
          <span className="text-xs text-gray-300 font-sans">
            {format(new Date(amb.concluidoEm), 'HH:mm', { locale: ptBR })}
          </span>
        </div>
        {aberto ? <ChevronUp className="w-4 h-4 text-gray-300 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-300 shrink-0" />}
      </button>

      {aberto && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-100 pt-3">
          <div>
            <Text variant="caption" className="text-gray-300 uppercase tracking-wide font-semibold block mb-2">Medições</Text>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm font-sans">
              <span className="text-gray-400">Pureza O₂</span>
              <span className="font-semibold text-dark">{amb.purezaO2}%</span>
              <span className="text-gray-400">Pressão O₂</span>
              <span className="font-semibold text-dark">{amb.pressaoO2} bar</span>
              <span className="text-gray-400">Pressão Ar</span>
              <span className="font-semibold text-dark">{amb.pressaoAr} bar</span>
              <span className="text-gray-400">Backup</span>
              <span className={`font-semibold ${amb.backupLigado ? 'text-green-600' : 'text-red-600'}`}>
                {amb.backupLigado ? 'Ligado' : 'Desligado'}
              </span>
            </div>
          </div>

          {amb.temAbastecimento && amb.abastecimento && (
            <div>
              <Text variant="caption" className="text-gray-300 uppercase tracking-wide font-semibold block mb-2">Abastecimento</Text>
              <div className="flex items-center gap-2 bg-sky-50 rounded-xl px-3 py-2">
                <Package className="w-4 h-4 text-sky-600 shrink-0" />
                <span className="text-sm font-sans text-sky-700">
                  <strong>{amb.abastecimento.quantidade}</strong> cilindro{amb.abastecimento.quantidade !== 1 ? 's' : ''} — tamanho <strong>{amb.abastecimento.tamanho}</strong>
                </span>
              </div>
            </div>
          )}

          {amb.temAlteracao && amb.alteracao && (
            <div>
              <Text variant="caption" className="text-gray-300 uppercase tracking-wide font-semibold block mb-2">Ocorrência</Text>
              <div className="space-y-2 text-sm font-sans">
                <p className="text-gray-700">{amb.alteracao.descricao}</p>
                <div className="flex items-center gap-4">
                  <span className="text-gray-400">Trilogo:</span>
                  <span className={`font-semibold ${amb.alteracao.trilogoChamado ? 'text-green-600' : 'text-red-600'}`}>
                    {amb.alteracao.trilogoChamado ? 'Chamado aberto' : 'Não aberto'}
                  </span>
                </div>
                <FotoLazy ambienteId={amb.id} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Grupo de ambientes (conformidade / ocorrências) ───────────────────────────

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
      ? { header: 'bg-green-50 border-green-200 text-green-800', badge: 'bg-green-100 text-green-700' }
      : { header: 'bg-orange-50 border-orange-200 text-orange-800', badge: 'bg-orange-100 text-orange-700' }

  if (ambientes.length === 0) return null

  return (
    <div className={`rounded-xl border ${estilos.header.split(' ').filter(c => c.startsWith('border')).join(' ')} overflow-hidden`}>
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
        {aberto ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
      </button>

      {aberto && (
        <div className="px-3 pb-3 pt-2 space-y-2">
          {ambientes.map((amb) => (
            <AmbienteCard key={amb.id} amb={amb} />
          ))}
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

export default function HistoricoPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>()
  const { data: rodadas = [], isLoading } = useQuery<Rodada[]>({
    queryKey: ['rodadas'],
    queryFn: () => fetch('/api/rodadas').then((r) => r.json()).then((j) => j.data ?? j),
    refetchInterval: 30_000,
  })

  const totalRodadas = rodadas.length
  const totalOcorrencias = rodadas.reduce(
    (acc, r) => acc + r.ambientes.filter((a) => a.temAlteracao).length, 0
  )
  const totalNormais = rodadas.reduce(
    (acc, r) => acc + r.ambientes.filter((a) => !a.temAlteracao).length, 0
  )

  function exportarPdf() {
    exportarTabelaPdf({
      titulo: 'Histórico de Inspeções de Gases',
      subtitulo: `Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
      colunas: COLUNAS_INSPECOES_PDF,
      linhas: rodadas.map(linhaRodadaPdf),
      nomeArquivo: `inspecoes-historico-${tenantSlug}.pdf`,
    })
  }

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

        {/* Resumo */}
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

        <div className="flex justify-end mb-5">
          <ExportarPdfButton onClick={exportarPdf} disabled={rodadas.length === 0} />
        </div>

        {/* Lista */}
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
