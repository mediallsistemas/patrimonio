'use client'

import React, { useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  CheckCircle, ChevronRight, ChevronLeft, Upload, X,
  History, AlertTriangle, ClipboardList,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import Card from '@/components/card'
import Button from '@/components/button'
import Text from '@/components/text'
import Header from '@/components/header'

// ── Tipos ─────────────────────────────────────────────────────────────────────

type TipoOcorrencia = 'eletrica' | 'hidraulica' | 'patrimonio'
type Etapa =
  | 'inicio'
  | 'bloco_intro'        // apresenta o bloco atual antes de começar
  | 'ocorrencia_pergunta'
  | 'ocorrencia_detalhe'
  | 'trilogo'
  | 'bloco_resumo'       // resumo do bloco concluído
  | 'resumo_final'

interface DetalheOcorrencia {
  tipo: TipoOcorrencia | null
  descricao: string
  foto: string | null
  trilogoChamado: boolean | null
}

interface AmbienteConcluido {
  blocoIdx: number
  ambiente: string
  temOcorrencia: boolean
  tipo?: TipoOcorrencia
}

// ── Config ─────────────────────────────────────────────────────────────────────

interface BlocoAmbiente {
  bloco: string
  ambientes: string[]
}

const BLOCOS_AMBIENTES: BlocoAmbiente[] = [
  {
    bloco: 'Bloco Conforto',
    ambientes: ['47 - Repouso 01', '48 - Repouso 02', '49 - Repouso 03', '50 - Repouso 04'],
  },
  {
    bloco: 'Bloco Cirúrgico',
    ambientes: [
      '40 - Expurgo CME', '78 - Esterilização', '79 - Lavagem de Material Contaminado',
      '80 - Material Autoclavado', '81 - Sala da Autoclave', '82 - Sala de Guarda de Equipamento',
      '83 - DML', '84 - Expurgo', '85 - Arsenal da Farmácia', '86 - Copa Centro Cirúrgico',
      '87 - Sala da Neonatologia', '88 - Sala de Cirurgia 01', '89 - Sala de Cirurgia 02',
      '90 - Sala de Cirurgia 03', '91 - RPA',
    ],
  },
  {
    bloco: 'Bloco Atendimento Médico',
    ambientes: [
      '04 - Espera Consultórios', '05 - Consultório 5', '06 - Consultório 6', '07 - Ouvidoria',
      '08 - Utilidades', '09 - DML', '10 - Consultório 7', '11 - Sala de Ultrassonografia',
      '12 - Consultório 4', '13 - Consultório 3', '14 - Sala de Gesso / Sutura e Curativo',
      '15 - Posto de Coleta de Exame', '16 - Sala Disjuntores', '17 - Consultório 02',
      '18 - Internação Masculina', '19 - Posto de Enfermagem Observação', '20 - Internação Feminina',
      '22 - Sala de Limpeza / Expurgo', '23 - DML', '24 - Sala de Medicação 01',
      '25 - Sala de Medicação 02', '26 - Consultório 1', '27 - Raio X',
    ],
  },
  {
    bloco: 'Bloco Emergência',
    ambientes: ['21 - Sala Vermelha', '28 - Recepção Sala Vermelha', '29 - Psicossocial', '30 - Necrotério'],
  },
  {
    bloco: 'Bloco Interno do Hospital',
    ambientes: [
      '31 - Farmácia Satélite', '32 - Sala Transfusional', '37 - Sala de Limpeza',
      '38 - Sala de Disjuntores', '39 - Sala de Utilidades', '46 - Farmácia Central',
    ],
  },
  {
    bloco: 'Bloco Tercerizados / Colaboradores',
    ambientes: [
      'Usina de O2', '51 - Sala dos Soros', '52 - Preparo Mamadeiras', '53 - Cozinha',
      '54 - Laboratório', '55 - CAF 1', '56 - CAF 2', '57 - Refeitório',
      '58 - Sala Nutricionista', '59 - DML Nutrimax', '60 - Depósito Patrimônio',
      '61 - Vestiário Nutrimax', '62 - Rouparia / Roupa Limpa', '63 - Sala da Limpeza',
      '64 - Repouso Motorista', '65 - Sala Patrimônio e Manutenção', '66 - IML',
    ],
  },
  {
    bloco: 'Bloco da Recepção',
    ambientes: ['01 - Recepção Geral', '02 - SAME/NIR', '03 - Triagem'],
  },
  {
    bloco: 'Bloco Administrativo',
    ambientes: [
      '67 - Sala do Gerente Hospitalar', '68 - Diretoria Médica', '69 - Diretoria Fundação',
      '70 - Sala RH/DP', '71 - Recepção Administrativa', '72 - Sala de Utilidades',
      '73 - Sala de Reunião', '74 - Sala dos Coordenadores', '75 - Diretor de Enfermagem',
      '76 - Produção e Faturamento', '77 - Sala do T.I.', '71.2 - Depósito Faturamento',
    ],
  },
  {
    bloco: 'Bloco Enfermarias',
    ambientes: [
      '33 - Enfermaria 01', '34 - Enfermaria 02', '35 - Posto de Enfermagem 01 e 02',
      '36 - DML 01 e 02', '41 - Enfermaria 03', '42 - Enfermaria 04',
      '45 - Posto de Enfermagem 03 e 04',
    ],
  },
]

const TIPOS_OCORRENCIA: { value: TipoOcorrencia; label: string; active: string; inactive: string }[] = [
  { value: 'eletrica',   label: 'Elétrica',   active: 'border-yellow-400 bg-yellow-50 text-yellow-700', inactive: 'border-gray-200 text-gray-300 bg-white' },
  { value: 'hidraulica', label: 'Hidráulica', active: 'border-blue-400 bg-blue-50 text-blue-700',       inactive: 'border-gray-200 text-gray-300 bg-white' },
  { value: 'patrimonio', label: 'Patrimônio', active: 'border-purple-400 bg-purple-50 text-purple-700', inactive: 'border-gray-200 text-gray-300 bg-white' },
]

// ── Componente ─────────────────────────────────────────────────────────────────

export default function OcorrenciasPage() {
  const router = useRouter()
  const { tenantSlug } = useParams<{ tenantSlug: string }>()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [rondaId, setRondaId]       = useState<string | null>(null)
  const [blocoIdx, setBlocoIdx]     = useState(0)
  const [ambienteIdx, setAmbienteIdx] = useState(0)  // índice dentro do bloco atual
  const [concluidos, setConcluidos] = useState<AmbienteConcluido[]>([])
  const [etapa, setEtapa]           = useState<Etapa>('inicio')

  const [detalhe, setDetalhe] = useState<DetalheOcorrencia>({ tipo: null, descricao: '', foto: null, trilogoChamado: null })
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors]         = useState<Record<string, string>>({})

  const blocoAtual       = BLOCOS_AMBIENTES[blocoIdx]
  const ambienteAtual    = blocoAtual.ambientes[ambienteIdx]
  const isUltimoAmbiente = ambienteIdx === blocoAtual.ambientes.length - 1
  const isUltimoBloco    = blocoIdx === BLOCOS_AMBIENTES.length - 1

  const totalBlocos    = BLOCOS_AMBIENTES.length
  const blocosFeitos   = etapa === 'bloco_resumo' || etapa === 'resumo_final' ? blocoIdx + 1 : blocoIdx
  const progressoPct   = Math.round((blocosFeitos / totalBlocos) * 100)

  // Contagem de ocorrências do bloco atual
  const concluidosBloco = concluidos.filter((c) => c.blocoIdx === blocoIdx)

  // ── Iniciar ronda ──────────────────────────────────────────────────────────
  async function handleIniciar() {
    setSubmitting(true)
    try {
      const res = await fetch('/api/rondas', { method: 'POST' })
      if (!res.ok) throw new Error('Falha ao iniciar ronda')
      const ronda = await res.json()
      setRondaId(ronda.id)
      setBlocoIdx(0)
      setAmbienteIdx(0)
      setEtapa('bloco_intro')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao iniciar')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Sem ocorrência → salva e avança ───────────────────────────────────────
  async function handleSemOcorrencia() {
    setSubmitting(true)
    try {
      await salvarAmbiente(false)
      avancarAmbiente(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Foto ───────────────────────────────────────────────────────────────────
  function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setDetalhe((d) => ({ ...d, foto: reader.result as string }))
    reader.readAsDataURL(file)
  }

  function handleDetalheNext() {
    const e: Record<string, string> = {}
    if (!detalhe.tipo) e.tipo = 'Selecione o tipo'
    if (!detalhe.descricao.trim()) e.descricao = 'Descreva o problema'
    if (Object.keys(e).length > 0) { setErrors(e); return }
    setErrors({})
    setEtapa('trilogo')
  }

  async function handleTrilogo(trilogoChamado: boolean) {
    const det = { ...detalhe, trilogoChamado }
    setDetalhe(det)
    setSubmitting(true)
    try {
      await salvarAmbiente(true, det)
      avancarAmbiente(true, det.tipo ?? undefined)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSubmitting(false)
    }
  }

  async function salvarAmbiente(temOcorrencia: boolean, det?: DetalheOcorrencia) {
    const res = await fetch(`/api/rondas/${rondaId}/ambientes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ambiente: ambienteAtual,
        temOcorrencia,
        ocorrencia: temOcorrencia && det
          ? { tipo: det.tipo, descricao: det.descricao, foto: det.foto, trilogoChamado: det.trilogoChamado }
          : undefined,
      }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error ?? `Erro ${res.status}`)
    }
  }

  function avancarAmbiente(temOcorrencia: boolean, tipo?: TipoOcorrencia) {
    setConcluidos((prev) => [...prev, { blocoIdx, ambiente: ambienteAtual, temOcorrencia, tipo }])
    resetDetalhe()

    if (!isUltimoAmbiente) {
      setAmbienteIdx((i) => i + 1)
      setEtapa('ocorrencia_pergunta')
    } else {
      // Último ambiente do bloco → mostra resumo do bloco
      setEtapa('bloco_resumo')
    }
  }

  function resetDetalhe() {
    setDetalhe({ tipo: null, descricao: '', foto: null, trilogoChamado: null })
    setErrors({})
  }

  // Próximo bloco a partir do resumo do bloco
  function handleProximoBloco() {
    if (!isUltimoBloco) {
      setBlocoIdx((i) => i + 1)
      setAmbienteIdx(0)
      resetDetalhe()
      setEtapa('bloco_intro')
    } else {
      finalizarRonda()
    }
  }

  // Voltar ao bloco anterior a partir do resumo
  function handleVoltarBloco() {
    if (blocoIdx === 0) return
    // Remove concluídos do bloco anterior para refazer
    const blocoAnterior = blocoIdx - 1
    setConcluidos((prev) => prev.filter((c) => c.blocoIdx < blocoAnterior))
    setBlocoIdx(blocoAnterior)
    setAmbienteIdx(BLOCOS_AMBIENTES[blocoAnterior].ambientes.length - 1)
    resetDetalhe()
    setEtapa('bloco_resumo')
  }

  async function finalizarRonda() {
    try { await fetch(`/api/rondas/${rondaId}`, { method: 'PATCH' }) } catch { /* não crítico */ }
    setEtapa('resumo_final')
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="form-bg min-h-screen flex flex-col">
      <Header title="Registro de Ocorrências" />
      <main className="flex-1 flex items-start justify-center px-4 py-6">
        <div className="w-full max-w-lg space-y-4">

          {/* Barra de progresso de blocos */}
          {etapa !== 'inicio' && etapa !== 'resumo_final' && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-sans text-gray-300">
                <span>
                  Bloco {blocoIdx + 1} de {totalBlocos}
                  {' · '}
                  <span className="font-semibold text-dark">{blocoAtual.bloco}</span>
                </span>
                <span>{progressoPct}%</span>
              </div>
              <div className="flex gap-1">
                {BLOCOS_AMBIENTES.map((b, i) => {
                  const feito   = i < blocoIdx || (i === blocoIdx && etapa === 'bloco_resumo')
                  const atual   = i === blocoIdx && etapa !== 'bloco_resumo'
                  const comOcor = concluidos.some((c) => c.blocoIdx === i && c.temOcorrencia)
                  return (
                    <div
                      key={b.bloco}
                      title={b.bloco}
                      className={`flex-1 h-2 rounded-full transition-all ${
                        feito  ? comOcor ? 'bg-orange-400' : 'bg-green-500'
                        : atual ? 'bg-teal-600'
                        :         'bg-gray-200'
                      }`}
                    />
                  )
                })}
              </div>
            </div>
          )}

          {/* ── INÍCIO ──────────────────────────────────────────────────── */}
          {etapa === 'inicio' && (
            <Card shadow="md">
              <div className="flex flex-col items-center gap-4 py-2 mb-5">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#0f766e' }}>
                  <ClipboardList className="w-7 h-7 text-white" />
                </div>
                <div className="text-center">
                  <Text as="h2" variant="heading-sm" className="text-dark mb-1 block">
                    Registro de Ocorrências
                  </Text>
                  <Text variant="body-sm" className="text-gray-300 block">
                    {BLOCOS_AMBIENTES.length} blocos · {BLOCOS_AMBIENTES.reduce((acc, b) => acc + b.ambientes.length, 0)} ambientes
                  </Text>
                </div>
              </div>

              {/* Lista de blocos (apenas nomes) */}
              <div className="grid grid-cols-2 gap-2 mb-6">
                {BLOCOS_AMBIENTES.map((b, i) => (
                  <div key={b.bloco} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold font-sans text-white" style={{ backgroundColor: '#0f766e' }}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold font-sans text-dark leading-tight">{b.bloco}</p>
                      <p className="text-xs text-gray-300 font-sans">{b.ambientes.length} amb.</p>
                    </div>
                  </div>
                ))}
              </div>

              <Button onClick={handleIniciar} disabled={submitting} className="w-full">
                {submitting ? 'Iniciando...' : 'Iniciar Ronda'} <ChevronRight className="w-4 h-4" />
              </Button>

              <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                <Link href={`/${tenantSlug}/manutencao/ocorrencias/historico`} className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-red-base font-sans transition-colors">
                  <History className="w-4 h-4" /> Ver histórico de rondas
                </Link>
              </div>
            </Card>
          )}

          {/* ── INTRO DO BLOCO ───────────────────────────────────────────── */}
          {etapa === 'bloco_intro' && (
            <Card shadow="md">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#0f766e' }}>
                  <ClipboardList className="w-5 h-5 text-white" />
                </div>
                <div>
                  <Text as="h2" variant="heading-sm" className="text-dark block">{blocoAtual.bloco}</Text>
                  <Text variant="body-sm" className="text-gray-300 block">
                    {blocoAtual.ambientes.length} ambiente{blocoAtual.ambientes.length !== 1 ? 's' : ''} neste bloco
                  </Text>
                </div>
              </div>

              <div className="space-y-1.5 mb-6 max-h-60 overflow-y-auto pr-1">
                {blocoAtual.ambientes.map((a, i) => (
                  <div key={a} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-50 border border-gray-100">
                    <span className="text-xs text-gray-300 font-sans w-5 shrink-0 text-right">{i + 1}</span>
                    <span className="text-sm font-sans text-dark">{a}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                {blocoIdx > 0 && (
                  <Button variant="outline" onClick={() => { setBlocoIdx((i) => i - 1); setEtapa('bloco_resumo') }} className="flex-1">
                    <ChevronLeft className="w-4 h-4" /> Bloco anterior
                  </Button>
                )}
                <Button onClick={() => setEtapa('ocorrencia_pergunta')} className="flex-1">
                  Começar bloco <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          )}

          {/* ── TEVE OCORRÊNCIA? ─────────────────────────────────────────── */}
          {etapa === 'ocorrencia_pergunta' && (
            <Card shadow="md">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#0f766e' }}>
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <Text variant="caption" className="text-gray-300 uppercase tracking-wide font-semibold block">
                    {blocoAtual.bloco} · {ambienteIdx + 1}/{blocoAtual.ambientes.length}
                  </Text>
                  <Text as="h2" variant="heading-sm" className="text-dark block">{ambienteAtual}</Text>
                </div>
              </div>

              <Text variant="body-sm" className="text-gray-300 mb-5 block">
                Teve algum tipo de alteração neste ambiente?
              </Text>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <button
                  onClick={handleSemOcorrencia}
                  disabled={submitting}
                  className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-green-300 bg-green-50 hover:bg-green-100 text-green-700 font-sans font-bold transition-all active:scale-95 disabled:opacity-50"
                >
                  <CheckCircle className="w-8 h-8" />
                  Não
                </button>
                <button
                  onClick={() => setEtapa('ocorrencia_detalhe')}
                  className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-700 font-sans font-bold transition-all active:scale-95"
                >
                  <AlertTriangle className="w-8 h-8" />
                  Sim
                </button>
              </div>

              {/* Ambientes já concluídos neste bloco */}
              {concluidosBloco.length > 0 && (
                <div className="pt-3 border-t border-gray-100 space-y-1">
                  <Text variant="caption" className="text-gray-300 uppercase tracking-wide font-semibold block mb-1.5">
                    Concluídos neste bloco
                  </Text>
                  {concluidosBloco.map(({ ambiente, temOcorrencia }) => (
                    <div key={ambiente} className="flex items-center gap-2 text-xs font-sans">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${temOcorrencia ? 'bg-orange-400' : 'bg-green-500'}`} />
                      <span className="text-gray-400 flex-1 truncate">{ambiente}</span>
                      <span className={`font-semibold shrink-0 ${temOcorrencia ? 'text-orange-600' : 'text-green-600'}`}>
                        {temOcorrencia ? 'Ocorrência' : 'Normal'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* ── DETALHE DA OCORRÊNCIA ────────────────────────────────────── */}
          {etapa === 'ocorrencia_detalhe' && (
            <Card shadow="md">
              <Text variant="caption" className="text-gray-300 uppercase tracking-wide font-semibold block mb-1">
                {blocoAtual.bloco}
              </Text>
              <Text as="h2" variant="heading-sm" className="text-dark mb-1 block">Detalhar ocorrência</Text>
              <Text variant="body-sm" className="text-gray-300 mb-5 block">
                Classifique e descreva o problema em <strong>{ambienteAtual}</strong>
              </Text>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-400 font-sans">Tipo de alteração</label>
                  <div className="grid grid-cols-3 gap-2">
                    {TIPOS_OCORRENCIA.map(({ value, label, active, inactive }) => (
                      <button key={value} type="button"
                        onClick={() => { setDetalhe((d) => ({ ...d, tipo: value })); setErrors((e) => ({ ...e, tipo: '' })) }}
                        className={`py-3 px-2 rounded-xl border-2 font-sans font-semibold text-xs transition-all active:scale-95 ${detalhe.tipo === value ? active : inactive}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {errors.tipo && <span className="text-xs text-red-base font-sans">{errors.tipo}</span>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-400 font-sans">Observação</label>
                  <textarea
                    rows={4}
                    placeholder="Descreva detalhadamente o problema identificado..."
                    value={detalhe.descricao}
                    onChange={(e) => { setDetalhe((d) => ({ ...d, descricao: e.target.value })); setErrors((er) => ({ ...er, descricao: '' })) }}
                    className={`w-full px-4 py-3 rounded-xl border font-sans text-dark text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-base transition-all placeholder:text-gray-300 resize-none ${errors.descricao ? 'border-red-base' : 'border-gray-200'}`}
                  />
                  {errors.descricao && <span className="text-xs text-red-base font-sans">{errors.descricao}</span>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-400 font-sans">Foto (opcional)</label>
                  {detalhe.foto ? (
                    <div className="relative rounded-xl overflow-hidden border border-gray-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={detalhe.foto} alt="Ocorrência" className="w-full h-48 object-cover" />
                      <button type="button" onClick={() => setDetalhe((d) => ({ ...d, foto: null }))} className="absolute top-2 right-2 bg-dark/70 text-white rounded-full p-1 hover:bg-dark transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full py-8 rounded-xl border-2 border-dashed border-gray-200 hover:border-red-base hover:bg-red-light transition-all flex flex-col items-center gap-2 text-gray-300 hover:text-red-base">
                      <Upload className="w-6 h-6" />
                      <span className="text-sm font-sans">Toque para adicionar foto</span>
                    </button>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFoto} className="hidden" />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={() => setEtapa('ocorrencia_pergunta')} className="flex-1">
                  <ChevronLeft className="w-4 h-4" /> Voltar
                </Button>
                <Button onClick={handleDetalheNext} className="flex-1">
                  Continuar <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          )}

          {/* ── TRILOGO ─────────────────────────────────────────────────── */}
          {etapa === 'trilogo' && (
            <Card shadow="md">
              <Text variant="caption" className="text-gray-300 uppercase tracking-wide font-semibold block mb-1">
                {blocoAtual.bloco}
              </Text>
              <Text as="h2" variant="heading-sm" className="text-dark mb-1 block">Chamado no Trilogo</Text>
              <Text variant="body-sm" className="text-gray-300 mb-6 block">
                Foi aberto chamado para a ocorrência em <strong>{ambienteAtual}</strong>?
              </Text>
              <div className="grid grid-cols-2 gap-4 mb-4">
                {[
                  { v: true,  label: 'Sim', color: 'border-green-400 bg-green-50 text-green-700', icon: '✅' },
                  { v: false, label: 'Não', color: 'border-red-400 bg-red-50 text-red-700',       icon: '❌' },
                ].map(({ v, label, color, icon }) => (
                  <button key={label} onClick={() => handleTrilogo(v)} disabled={submitting}
                    className={`flex flex-col items-center gap-2 p-5 rounded-xl border-2 ${color} font-sans font-bold transition-all active:scale-95 disabled:opacity-50`}
                  >
                    <span className="text-3xl">{icon}</span>
                    {label}
                  </button>
                ))}
              </div>
              <Button variant="outline" onClick={() => setEtapa('ocorrencia_detalhe')} className="w-full">
                <ChevronLeft className="w-4 h-4" /> Voltar
              </Button>
            </Card>
          )}

          {/* ── RESUMO DO BLOCO ──────────────────────────────────────────── */}
          {etapa === 'bloco_resumo' && (
            <Card shadow="md">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-green-100">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <Text as="h2" variant="heading-sm" className="text-dark block">
                    {blocoAtual.bloco} concluído
                  </Text>
                  <Text variant="body-sm" className="text-gray-300 block">
                    {concluidosBloco.length} ambiente{concluidosBloco.length !== 1 ? 's' : ''} verificado{concluidosBloco.length !== 1 ? 's' : ''}
                  </Text>
                </div>
              </div>

              {/* Ambientes do bloco */}
              <div className="space-y-1.5 mb-6">
                {concluidosBloco.map(({ ambiente, temOcorrencia, tipo }) => (
                  <div key={ambiente} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${temOcorrencia ? 'border-orange-200 bg-orange-50' : 'border-green-200 bg-green-50'}`}>
                    <div className={`w-2 h-2 rounded-full shrink-0 ${temOcorrencia ? 'bg-orange-400' : 'bg-green-500'}`} />
                    <span className="flex-1 text-sm font-sans text-dark truncate">{ambiente}</span>
                    {temOcorrencia && tipo ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold font-sans shrink-0 ${TIPOS_OCORRENCIA.find((t) => t.value === tipo)?.active ?? ''}`}>
                        {TIPOS_OCORRENCIA.find((t) => t.value === tipo)?.label}
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold font-sans bg-green-100 text-green-700 shrink-0">Normal</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Próxima ação */}
              {!isUltimoBloco ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 h-px bg-gray-100" />
                    <span className="text-xs text-gray-300 font-sans">próximo</span>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>
                  <div className="px-3 py-2.5 rounded-xl bg-teal-50 border border-teal-200 mb-3 text-sm font-sans text-teal-700">
                    <strong>{BLOCOS_AMBIENTES[blocoIdx + 1].bloco}</strong>
                    {' · '}{BLOCOS_AMBIENTES[blocoIdx + 1].ambientes.length} ambientes
                  </div>
                  <div className="flex gap-3">
                    {blocoIdx > 0 && (
                      <Button variant="outline" onClick={handleVoltarBloco} className="flex-1">
                        <ChevronLeft className="w-4 h-4" /> Bloco anterior
                      </Button>
                    )}
                    <Button onClick={handleProximoBloco} className="flex-1">
                      Próximo bloco <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {blocoIdx > 0 && (
                    <Button variant="outline" onClick={handleVoltarBloco} className="w-full">
                      <ChevronLeft className="w-4 h-4" /> Revisar bloco anterior
                    </Button>
                  )}
                  <Button onClick={handleProximoBloco} className="w-full">
                    <CheckCircle className="w-4 h-4" /> Finalizar ronda
                  </Button>
                </div>
              )}
            </Card>
          )}

          {/* ── RESUMO FINAL ─────────────────────────────────────────────── */}
          {etapa === 'resumo_final' && (
            <Card shadow="md">
              <div className="flex flex-col items-center gap-3 py-2 mb-5">
                <div className="w-14 h-14 rounded-full bg-green-light flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-base" />
                </div>
                <div className="text-center">
                  <Text as="h2" variant="heading-sm" className="text-dark block mb-1">Ronda concluída!</Text>
                  <Text variant="body-sm" className="text-gray-300 block">
                    {BLOCOS_AMBIENTES.length} blocos · {concluidos.length} ambientes verificados
                  </Text>
                </div>
              </div>

              {/* Resumo por bloco */}
              <div className="space-y-2 mb-6">
                {BLOCOS_AMBIENTES.map((b, i) => {
                  const ambsBloco  = concluidos.filter((c) => c.blocoIdx === i)
                  const comOcor    = ambsBloco.filter((c) => c.temOcorrencia).length
                  return (
                    <div key={b.bloco} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${comOcor > 0 ? 'border-orange-200 bg-orange-50' : 'border-green-200 bg-green-50'}`}>
                      <div className={`w-2 h-2 rounded-full shrink-0 ${comOcor > 0 ? 'bg-orange-400' : 'bg-green-500'}`} />
                      <span className="flex-1 text-sm font-semibold font-sans text-dark">{b.bloco}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold font-sans shrink-0 ${comOcor > 0 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                        {comOcor > 0 ? `${comOcor} ocorrência${comOcor > 1 ? 's' : ''}` : 'Normal'}
                      </span>
                    </div>
                  )
                })}
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => {
                    setRondaId(null); setBlocoIdx(0); setAmbienteIdx(0)
                    setConcluidos([]); resetDetalhe(); setEtapa('inicio')
                  }}
                  className="w-full"
                >
                  Nova ronda
                </Button>
                <Button variant="outline" onClick={() => router.push(`/${tenantSlug}/manutencao/ocorrencias/historico`)} className="w-full">
                  <History className="w-4 h-4" /> Ver histórico
                </Button>
                <Button variant="ghost" onClick={() => router.push(`/${tenantSlug}/manutencao`)} className="w-full">
                  Voltar ao início
                </Button>
              </div>
            </Card>
          )}

        </div>
      </main>
    </div>
  )
}
