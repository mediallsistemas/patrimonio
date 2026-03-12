'use client'

import React, { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, ChevronRight, Upload, X, History, Building2, Factory } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import Card from '@/components/card'
import Button from '@/components/button'
import Input from '@/components/input'
import Text from '@/components/text'
import Header from '@/components/header'

type Ambiente = 'HRPG' | 'UEI'

const AMBIENTE_CONFIG: Record<Ambiente, { icon: React.ElementType; color: string; bg: string }> = {
  HRPG: { icon: Building2, color: 'text-white', bg: 'bg-blue-600 border-blue-600 hover:bg-blue-700' },
  UEI:  { icon: Factory,   color: 'text-white', bg: 'bg-violet-600 border-violet-600 hover:bg-violet-700' },
}
type TipoAlteracao = 'eletrica' | 'hidraulica' | 'patrimonio'
type Etapa = 'ambiente' | 'medicoes' | 'alteracao_pergunta' | 'alteracao_detalhe' | 'trilogo' | 'sucesso'

interface Medicoes {
  purezaO2: string
  pressaoO2: string
  pressaoAr: string
  backupLigado: boolean | null
}

interface DetalheAlteracao {
  tipo: TipoAlteracao | null
  descricao: string
  foto: string | null
  trilogoChamado: boolean | null
}

const AMBIENTES: Ambiente[] = ['HRPG', 'UEI']

const TIPOS_ALTERACAO: { value: TipoAlteracao; label: string; color: string }[] = [
  { value: 'eletrica', label: 'Elétrica', color: 'border-yellow-400 bg-yellow-50 text-yellow-700' },
  { value: 'hidraulica', label: 'Hidráulica', color: 'border-blue-400 bg-blue-50 text-blue-700' },
  { value: 'patrimonio', label: 'Patrimônio', color: 'border-purple-400 bg-purple-50 text-purple-700' },
]

export default function InspecaoPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [etapa, setEtapa] = useState<Etapa>('ambiente')
  const [ambiente, setAmbiente] = useState<Ambiente | null>(null)
  const [medicoes, setMedicoes] = useState<Medicoes>({
  purezaO2: '', pressaoO2: '', pressaoAr: '', backupLigado: null,
  })
  const [detalhe, setDetalhe] = useState<DetalheAlteracao>({
    tipo: null, descricao: '', foto: null, trilogoChamado: null,
  })
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // ── Etapa 1: ambiente ───────────────────────────────────────────────────────
  function handleAmbiente(a: Ambiente) {
    setAmbiente(a)
    setEtapa('medicoes')
  }

  // ── Etapa 2: medições ───────────────────────────────────────────────────────
  function validarMedicoes() {
    const e: Record<string, string> = {}
    if (!medicoes.purezaO2 || isNaN(Number(medicoes.purezaO2))) e.purezaO2 = 'Informe o valor'
    if (!medicoes.pressaoO2 || isNaN(Number(medicoes.pressaoO2))) e.pressaoO2 = 'Informe o valor'
    if (!medicoes.pressaoAr || isNaN(Number(medicoes.pressaoAr))) e.pressaoAr = 'Informe o valor'
    if (medicoes.backupLigado === null) e.backup = 'Selecione uma opção'
    return e
  }

  function handleMedicoesNext() {
    const e = validarMedicoes()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    setErrors({})
    setEtapa('alteracao_pergunta')
  }

  // ── Etapa 3: teve alteração? ────────────────────────────────────────────────
  async function handleSemAlteracao() {
    setSubmitting(true)
    try {
      await salvar(false)
      setEtapa('sucesso')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar inspeção')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Etapa 4: detalhe alteração ──────────────────────────────────────────────
  function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setDetalhe((d) => ({ ...d, foto: reader.result as string }))
    reader.readAsDataURL(file)
  }

  function validarDetalhe() {
    const e: Record<string, string> = {}
    if (!detalhe.tipo) e.tipo = 'Selecione o tipo'
    if (!detalhe.descricao.trim()) e.descricao = 'Descreva o problema'
    return e
  }

  function handleDetalheNext() {
    const e = validarDetalhe()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    setErrors({})
    setEtapa('trilogo')
  }

  // ── Etapa 5: trilogo ────────────────────────────────────────────────────────
  async function handleTrilogo(trilogoChamado: boolean) {
    setDetalhe((d) => ({ ...d, trilogoChamado }))
    setSubmitting(true)
    try {
      await salvar(true, { ...detalhe, trilogoChamado })
      setEtapa('sucesso')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar inspeção')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Salvar ──────────────────────────────────────────────────────────────────
  async function salvar(temAlteracao: boolean, det?: DetalheAlteracao) {
    const res = await fetch('/api/inspecoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ambiente,
        purezaO2: medicoes.purezaO2,
        pressaoO2: medicoes.pressaoO2,
        pressaoAr: medicoes.pressaoAr,
        backupLigado: medicoes.backupLigado,
        temAlteracao,
        alteracao: temAlteracao && det ? {
          tipo: det.tipo,
          descricao: det.descricao,
          foto: det.foto,
          trilogoChamado: det.trilogoChamado,
        } : undefined,
      }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error ?? `Erro ${res.status}`)
    }
  }

  // ── Progresso ───────────────────────────────────────────────────────────────
  const progressMap: Record<Etapa, number> = {
    ambiente: 1, medicoes: 2, alteracao_pergunta: 3,
    alteracao_detalhe: 4, trilogo: 5, sucesso: 5,
  }
  const totalSteps = 5
  const currentStep = progressMap[etapa]

  return (
    <div className="form-bg min-h-screen flex flex-col">
      <Header title="Inspeção de Gases Medicinais" />

      <main className="flex-1 flex items-start justify-center px-4 py-6">
        <div className="w-full max-w-lg space-y-4">

          {/* Progress bar */}
          {etapa !== 'sucesso' && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-sans text-gray-300">
                <span>Etapa {currentStep} de {totalSteps}</span>
                {ambiente && <span className="font-semibold text-dark">{ambiente}</span>}
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-base rounded-full transition-all duration-500"
                  style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* ── ETAPA: AMBIENTE ─────────────────────────────────────────── */}
          {etapa === 'ambiente' && (
            <Card shadow="md">
              <Text as="h2" variant="heading-sm" className="text-dark mb-1 block">
                Selecione o ambiente
              </Text>
              <Text variant="body-sm" className="text-gray-300 mb-5 block">
                Escolha a usina que será inspecionada
              </Text>
              <div className="grid grid-cols-2 gap-4">
                {AMBIENTES.map((a) => {
                  const { icon: Icon, color, bg } = AMBIENTE_CONFIG[a]
                  return (
                    <button
                      key={a}
                      onClick={() => handleAmbiente(a)}
                      className={`flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 transition-all duration-200 font-sans font-bold text-lg active:scale-95 ${bg}`}
                    >
                      <Icon className={`w-8 h-8 ${color}`} />
                      <span className={color}>{a}</span>
                    </button>
                  )
                })}
              </div>
              <div className="mt-5 pt-4 border-t border-gray-100">
                <Link href="/inspecao/historico" className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-red-base font-sans transition-colors">
                  <History className="w-4 h-4" />
                  Ver histórico de inspeções
                </Link>
              </div>
            </Card>
          )}

          {/* ── ETAPA: MEDIÇÕES ─────────────────────────────────────────── */}
          {etapa === 'medicoes' && (
            <Card shadow="md">
              <Text as="h2" variant="heading-sm" className="text-dark mb-1 block">
                Medições — {ambiente}
              </Text>
              <Text variant="body-sm" className="text-gray-300 mb-5 block">
                Registre os valores aferidos na usina
              </Text>
              <div className="space-y-4">
                <Input
                  label="% Pureza O₂"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="Ex: 93.5"
                  value={medicoes.purezaO2}
                  onChange={(e) => { setMedicoes((m) => ({ ...m, purezaO2: e.target.value })); setErrors((e2) => ({ ...e2, purezaO2: '' })) }}
                  error={errors.purezaO2}
                />
                <Input
                  label="Pressão O₂ na rede (bar)"
                  type="number"
                  step="0.1"
                  placeholder="Ex: 4.5"
                  value={medicoes.pressaoO2}
                  onChange={(e) => { setMedicoes((m) => ({ ...m, pressaoO2: e.target.value })); setErrors((e2) => ({ ...e2, pressaoO2: '' })) }}
                  error={errors.pressaoO2}
                />
                <Input
                  label="Pressão Ar Medicinal na rede (bar)"
                  type="number"
                  step="0.1"
                  placeholder="Ex: 5.0"
                  value={medicoes.pressaoAr}
                  onChange={(e) => { setMedicoes((m) => ({ ...m, pressaoAr: e.target.value })); setErrors((e2) => ({ ...e2, pressaoAr: '' })) }}
                  error={errors.pressaoAr}
                />

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-400 font-sans">
                    Sistema de backup está ligado?
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[{ v: true, label: 'Sim', color: 'border-green-400 bg-green-50 text-green-700' }, { v: false, label: 'Não', color: 'border-red-400 bg-red-50 text-red-700' }].map(({ v, label, color }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => { setMedicoes((m) => ({ ...m, backupLigado: v })); setErrors((e2) => ({ ...e2, backup: '' })) }}
                        className={`py-3 rounded-xl border-2 font-sans font-semibold text-sm transition-all active:scale-95 ${medicoes.backupLigado === v ? color : 'border-gray-200 text-gray-300 bg-white hover:border-gray-300'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {errors.backup && <span className="text-xs text-red-base font-sans">{errors.backup}</span>}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={() => setEtapa('ambiente')} className="flex-1">Voltar</Button>
                <Button onClick={handleMedicoesNext} className="flex-1">
                  Continuar <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          )}

          {/* ── ETAPA: TEVE ALTERAÇÃO? ───────────────────────────────────── */}
          {etapa === 'alteracao_pergunta' && (
            <Card shadow="md">
              <Text as="h2" variant="heading-sm" className="text-dark mb-1 block">
                Teve alguma alteração?
              </Text>
              <Text variant="body-sm" className="text-gray-300 mb-6 block">
                Alguma ocorrência identificada durante a inspeção de {ambiente}?
              </Text>

              {/* Resumo medições */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-2">
                <Text variant="caption" className="text-gray-300 uppercase tracking-wide block font-semibold">Medições registradas</Text>
                <div className="grid grid-cols-2 gap-2 text-sm font-sans">
                  <span className="text-gray-400">Pureza O₂:</span><span className="font-semibold text-dark">{medicoes.purezaO2}%</span>
                  <span className="text-gray-400">Pressão O₂:</span><span className="font-semibold text-dark">{medicoes.pressaoO2} bar</span>
                  <span className="text-gray-400">Pressão Ar:</span><span className="font-semibold text-dark">{medicoes.pressaoAr} bar</span>
                  <span className="text-gray-400">Backup:</span>
                  <span className={`font-semibold ${medicoes.backupLigado ? 'text-green-600' : 'text-red-600'}`}>
                    {medicoes.backupLigado ? 'Ligado' : 'Desligado'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={handleSemAlteracao}
                  disabled={submitting}
                  className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-green-300 bg-green-50 hover:bg-green-100 text-green-700 font-sans font-bold transition-all active:scale-95 disabled:opacity-50"
                >
                  <CheckCircle className="w-8 h-8" />
                  Não
                </button>
                <button
                  onClick={() => setEtapa('alteracao_detalhe')}
                  className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-700 font-sans font-bold transition-all active:scale-95"
                >
                  <span className="text-3xl">⚠️</span>
                  Sim
                </button>
              </div>
              <Button variant="outline" onClick={() => setEtapa('medicoes')} className="w-full mt-4">Voltar</Button>
            </Card>
          )}

          {/* ── ETAPA: DETALHE ALTERAÇÃO ─────────────────────────────────── */}
          {etapa === 'alteracao_detalhe' && (
            <Card shadow="md">
              <Text as="h2" variant="heading-sm" className="text-dark mb-1 block">
                Detalhar alteração
              </Text>
              <Text variant="body-sm" className="text-gray-300 mb-5 block">
                Informe o tipo, descrição e foto da ocorrência
              </Text>

              <div className="space-y-5">
                {/* Tipo */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-400 font-sans">Tipo de alteração</label>
                  <div className="grid grid-cols-3 gap-2">
                    {TIPOS_ALTERACAO.map(({ value, label, color }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => { setDetalhe((d) => ({ ...d, tipo: value })); setErrors((e) => ({ ...e, tipo: '' })) }}
                        className={`py-2.5 px-2 rounded-xl border-2 font-sans font-semibold text-xs transition-all active:scale-95 ${detalhe.tipo === value ? color : 'border-gray-200 text-gray-300 bg-white hover:border-gray-300'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {errors.tipo && <span className="text-xs text-red-base font-sans">{errors.tipo}</span>}
                </div>

                {/* Descrição */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-400 font-sans">Descrição do problema</label>
                  <textarea
                    rows={4}
                    placeholder="Descreva detalhadamente o problema identificado..."
                    value={detalhe.descricao}
                    onChange={(e) => { setDetalhe((d) => ({ ...d, descricao: e.target.value })); setErrors((er) => ({ ...er, descricao: '' })) }}
                    className={`w-full px-4 py-3 rounded-xl border font-sans text-dark text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-base focus:ring-offset-0 transition-all placeholder:text-gray-300 resize-none ${errors.descricao ? 'border-red-base' : 'border-gray-200'}`}
                  />
                  {errors.descricao && <span className="text-xs text-red-base font-sans">{errors.descricao}</span>}
                </div>

                {/* Foto */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-400 font-sans">Foto da ocorrência (opcional)</label>
                  {detalhe.foto ? (
                    <div className="relative rounded-xl overflow-hidden border border-gray-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={detalhe.foto} alt="Ocorrência" className="w-full h-48 object-cover" />
                      <button
                        type="button"
                        onClick={() => setDetalhe((d) => ({ ...d, foto: null }))}
                        className="absolute top-2 right-2 bg-dark/70 text-white rounded-full p-1 hover:bg-dark transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-8 rounded-xl border-2 border-dashed border-gray-200 hover:border-red-base hover:bg-red-light transition-all flex flex-col items-center gap-2 text-gray-300 hover:text-red-base"
                    >
                      <Upload className="w-6 h-6" />
                      <span className="text-sm font-sans">Toque para adicionar foto</span>
                    </button>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFoto} className="hidden" />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={() => setEtapa('alteracao_pergunta')} className="flex-1">Voltar</Button>
                <Button onClick={handleDetalheNext} className="flex-1">
                  Continuar <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          )}

          {/* ── ETAPA: TRILOGO ───────────────────────────────────────────── */}
          {etapa === 'trilogo' && (
            <Card shadow="md">
              <Text as="h2" variant="heading-sm" className="text-dark mb-1 block">
                Chamado no Trilogo
              </Text>
              <Text variant="body-sm" className="text-gray-300 mb-6 block">
                Foi aberto chamado no sistema Trilogo para esta ocorrência?
              </Text>

              <div className="grid grid-cols-2 gap-4">
                {[{ v: true, label: 'Sim', color: 'border-green-400 bg-green-50 text-green-700', emoji: '✅' },
                  { v: false, label: 'Não', color: 'border-red-400 bg-red-50 text-red-700', emoji: '❌' }].map(({ v, label, color, emoji }) => (
                  <button
                    key={label}
                    onClick={() => handleTrilogo(v)}
                    disabled={submitting}
                    className={`flex flex-col items-center gap-2 p-5 rounded-xl border-2 ${color} font-sans font-bold transition-all active:scale-95 disabled:opacity-50`}
                  >
                    <span className="text-3xl">{emoji}</span>
                    {label}
                  </button>
                ))}
              </div>
              <Button variant="outline" onClick={() => setEtapa('alteracao_detalhe')} className="w-full mt-4">Voltar</Button>
            </Card>
          )}

          {/* ── ETAPA: SUCESSO ───────────────────────────────────────────── */}
          {etapa === 'sucesso' && (
            <Card shadow="md" className="text-center">
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="w-16 h-16 rounded-full bg-green-light flex items-center justify-center">
                  <CheckCircle className="w-9 h-9 text-green-base" />
                </div>
                <div>
                  <Text as="h2" variant="heading-sm" className="text-dark block mb-1">
                    Inspeção registrada!
                  </Text>
                  <Text variant="body-sm" className="text-gray-300 block">
                    Ambiente <strong>{ambiente}</strong> inspecionado com sucesso.
                  </Text>
                </div>
              </div>

              <div className="space-y-3 mt-4">
                <Button
                  onClick={() => {
                    setEtapa('ambiente')
                    setAmbiente(null)
                    setMedicoes({ purezaO2: '', pressaoO2: '', pressaoAr: '', backupLigado: null })
                    setDetalhe({ tipo: null, descricao: '', foto: null, trilogoChamado: null })
                  }}
                  className="w-full"
                >
                  Nova inspeção
                </Button>
                <Button variant="outline" onClick={() => router.push('/inspecao/historico')} className="w-full">
                  <History className="w-4 h-4" />
                  Ver histórico
                </Button>
                <Button variant="ghost" onClick={() => router.push('/')} className="w-full">
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
