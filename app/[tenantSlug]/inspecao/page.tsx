'use client'

import React, { useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  CheckCircle, ChevronRight, Upload, X, History,
  FlaskConical, Package,
  BatteryFull, BatteryLow,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import Card from '@/components/card'
import Button from '@/components/button'
import Input from '@/components/input'
import Text from '@/components/text'
import Header from '@/components/header'

// ── Tipos ────────────────────────────────────────────────────────────────────

type TipoAlteracao = 'eletrica' | 'hidraulica' | 'patrimonio'
type TamanhoCilindro = 'P7' | 'P10' | 'P45' | 'P50'
type Etapa =
  | 'inicio'
  | 'medicoes'
  | 'backup'
  | 'abastecimento_pergunta'
  | 'abastecimento_detalhe'
  | 'alteracao_pergunta'
  | 'alteracao_detalhe'
  | 'trilogo'
  | 'resumo'

interface Medicoes {
  purezaO2: string
  pressaoO2: string
  pressaoAr: string
}

interface DadosAbastecimento {
  quantidade: string
  tamanho: TamanhoCilindro | null
}

interface DetalheAlteracao {
  tipo: TipoAlteracao | null
  descricao: string
  foto: string | null
  trilogoChamado: boolean | null
}

// ── Config ───────────────────────────────────────────────────────────────────

const TIPOS_ALTERACAO: { value: TipoAlteracao; label: string; color: string }[] = [
  { value: 'eletrica',   label: 'Elétrica',   color: 'border-yellow-400 bg-yellow-50 text-yellow-700' },
  { value: 'hidraulica', label: 'Hidráulica', color: 'border-blue-400 bg-blue-50 text-blue-700' },
  { value: 'patrimonio', label: 'Patrimônio', color: 'border-purple-400 bg-purple-50 text-purple-700' },
]

const TAMANHOS_CILINDRO: TamanhoCilindro[] = ['P7', 'P10', 'P45', 'P50']

const ETAPA_NUM: Record<Etapa, number> = {
  inicio: 0,
  medicoes: 1,
  backup: 2,
  abastecimento_pergunta: 3,
  abastecimento_detalhe: 3.5,
  alteracao_pergunta: 4,
  alteracao_detalhe: 5,
  trilogo: 6,
  resumo: 7,
}
const TOTAL_ETAPAS = 6

// ── Componente ───────────────────────────────────────────────────────────────

export default function InspecaoPage() {
  const router = useRouter()
  const { tenantSlug } = useParams<{ tenantSlug: string }>()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // O ambiente inspecionado é sempre o próprio tenant (em maiúsculas)
  const ambiente = tenantSlug.toUpperCase()

  const [rodadaId, setRodadaId] = useState<string | null>(null)
  const [etapa, setEtapa] = useState<Etapa>('inicio')

  const [medicoes, setMedicoes] = useState<Medicoes>({
    purezaO2: '', pressaoO2: '', pressaoAr: '',
  })
  const [backupLigado, setBackupLigado] = useState<boolean | null>(null)
  const [abastecimento, setAbastecimento] = useState<DadosAbastecimento>({
    quantidade: '', tamanho: null,
  })
  const [detalhe, setDetalhe] = useState<DetalheAlteracao>({
    tipo: null, descricao: '', foto: null, trilogoChamado: null,
  })
  const [resumo, setResumo] = useState<{
    temAbastecimento: boolean
    qtdCilindros?: number
    tamCilindros?: string
    temAlteracao: boolean
    tipo?: TipoAlteracao
  } | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const progressoTotal = (ETAPA_NUM[etapa] / TOTAL_ETAPAS) * 100

  // ── Iniciar rodada ────────────────────────────────────────────────────────
  async function handleIniciar() {
    setSubmitting(true)
    try {
      const res = await fetch('/api/rodadas', { method: 'POST' })
      if (!res.ok) throw new Error('Falha ao iniciar rodada')
      const rodada = await res.json()
      setRodadaId(rodada.id)
      setEtapa('medicoes')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao iniciar inspeção')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Medições ──────────────────────────────────────────────────────────────
  function validarMedicoes() {
    const e: Record<string, string> = {}
    if (!medicoes.purezaO2 || isNaN(Number(medicoes.purezaO2))) e.purezaO2 = 'Informe o valor'
    if (!medicoes.pressaoO2 || isNaN(Number(medicoes.pressaoO2))) e.pressaoO2 = 'Informe o valor'
    if (!medicoes.pressaoAr || isNaN(Number(medicoes.pressaoAr))) e.pressaoAr = 'Informe o valor'
    return e
  }

  function handleMedicoesNext() {
    const e = validarMedicoes()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    setErrors({})
    setEtapa('backup')
  }

  // ── Backup ────────────────────────────────────────────────────────────────
  function handleBackup(ligado: boolean) {
    setBackupLigado(ligado)
    setEtapa('abastecimento_pergunta')
  }

  // ── Abastecimento ─────────────────────────────────────────────────────────
  function validarAbastecimento() {
    const e: Record<string, string> = {}
    if (!abastecimento.quantidade || isNaN(Number(abastecimento.quantidade)) || Number(abastecimento.quantidade) < 1)
      e.quantidade = 'Informe a quantidade'
    if (!abastecimento.tamanho) e.tamanho = 'Selecione o tamanho'
    return e
  }

  function handleAbastecimentoNext() {
    const e = validarAbastecimento()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    setErrors({})
    setEtapa('alteracao_pergunta')
  }

  // ── Sem alteração → salva e finaliza ──────────────────────────────────────
  async function handleSemAlteracao() {
    setSubmitting(true)
    try {
      await salvarAmbiente(false)
      await finalizarRodada(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Foto ──────────────────────────────────────────────────────────────────
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

  // ── Trilogo → salva e finaliza ────────────────────────────────────────────
  async function handleTrilogo(trilogoChamado: boolean) {
    const det = { ...detalhe, trilogoChamado }
    setDetalhe(det)
    setSubmitting(true)
    try {
      await salvarAmbiente(true, det)
      await finalizarRodada(true, det.tipo ?? undefined)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Salvar ambiente na API ────────────────────────────────────────────────
  async function salvarAmbiente(temAlteracao: boolean, det?: DetalheAlteracao) {
    const temAbast = Boolean(abastecimento.quantidade && abastecimento.tamanho)
    const res = await fetch(`/api/rodadas/${rodadaId}/ambientes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ambiente,
        purezaO2:         medicoes.purezaO2,
        pressaoO2:        medicoes.pressaoO2,
        pressaoAr:        medicoes.pressaoAr,
        backupLigado,
        temAbastecimento: temAbast,
        abastecimento: temAbast ? {
          quantidade: abastecimento.quantidade,
          tamanho:    abastecimento.tamanho,
        } : undefined,
        temAlteracao,
        alteracao: temAlteracao && det ? {
          tipo:           det.tipo,
          descricao:      det.descricao,
          foto:           det.foto,
          trilogoChamado: det.trilogoChamado,
        } : undefined,
      }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error ?? `Erro ${res.status}`)
    }
  }

  // ── Finalizar rodada ──────────────────────────────────────────────────────
  async function finalizarRodada(temAlteracao: boolean, tipo?: TipoAlteracao) {
    try {
      await fetch(`/api/rodadas/${rodadaId}`, { method: 'PATCH' })
    } catch {
      // não crítico
    }
    const temAbast = Boolean(abastecimento.quantidade && abastecimento.tamanho)
    setResumo({
      temAbastecimento: temAbast,
      qtdCilindros:     temAbast ? Number(abastecimento.quantidade) : undefined,
      tamCilindros:     temAbast ? abastecimento.tamanho ?? undefined : undefined,
      temAlteracao,
      tipo,
    })
    setEtapa('resumo')
  }

  function resetForm() {
    setRodadaId(null)
    setEtapa('inicio')
    setMedicoes({ purezaO2: '', pressaoO2: '', pressaoAr: '' })
    setBackupLigado(null)
    setAbastecimento({ quantidade: '', tamanho: null })
    setDetalhe({ tipo: null, descricao: '', foto: null, trilogoChamado: null })
    setResumo(null)
    setErrors({})
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="form-bg min-h-screen flex flex-col">
      <Header title="Inspeção de Gases Medicinais" backHref={`/${tenantSlug}`} />

      <main className="flex-1 flex items-start justify-center px-4 py-6">
        <div className="w-full max-w-lg space-y-4">

          {/* Barra de progresso */}
          {etapa !== 'inicio' && etapa !== 'resumo' && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-sans text-gray-300">
                <span className="font-semibold text-dark">{ambiente}</span>
                <span>{Math.round(progressoTotal)}% concluído</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-base rounded-full transition-all duration-500"
                  style={{ width: `${progressoTotal}%` }}
                />
              </div>
            </div>
          )}

          {/* ── INÍCIO ───────────────────────────────────────────────── */}
          {etapa === 'inicio' && (
            <Card shadow="md">
              <div className="flex flex-col items-center gap-4 py-2 mb-5">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#7c3aed' }}>
                  <FlaskConical className="w-7 h-7 text-white" />
                </div>
                <div className="text-center">
                  <Text as="h2" variant="heading-sm" className="text-dark mb-1 block">
                    Inspeção da Usina de Gases
                  </Text>
                  <Text variant="body-sm" className="text-gray-300 block">
                    Inspeção do ambiente <strong>{ambiente}</strong>
                  </Text>
                </div>
              </div>

              <Button onClick={handleIniciar} disabled={submitting} className="w-full">
                {submitting ? 'Iniciando...' : 'Iniciar Inspeção'}
                <ChevronRight className="w-4 h-4" />
              </Button>

              <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                <Link href={`/${tenantSlug}/inspecao/historico`} className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-red-base font-sans transition-colors">
                  <History className="w-4 h-4" />
                  Ver histórico de inspeções
                </Link>
              </div>
            </Card>
          )}

          {/* ── MEDIÇÕES ─────────────────────────────────────────────── */}
          {etapa === 'medicoes' && (
            <Card shadow="md">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#7c3aed' }}>
                  <FlaskConical className="w-5 h-5 text-white" />
                </div>
                <div>
                  <Text as="h2" variant="heading-sm" className="text-dark block">
                    Medições — {ambiente}
                  </Text>
                  <Text variant="body-sm" className="text-gray-300 block">
                    Registre os valores aferidos na usina
                  </Text>
                </div>
              </div>

              <div className="space-y-4">
                <Input
                  label="% Pureza O₂"
                  type="number" step="0.1" min="0" max="100"
                  placeholder="Ex: 93.5"
                  value={medicoes.purezaO2}
                  onChange={(e) => { setMedicoes((m) => ({ ...m, purezaO2: e.target.value })); setErrors((er) => ({ ...er, purezaO2: '' })) }}
                  error={errors.purezaO2}
                />
                <Input
                  label="Pressão O₂ na rede (bar)"
                  type="number" step="0.1"
                  placeholder="Ex: 4.5"
                  value={medicoes.pressaoO2}
                  onChange={(e) => { setMedicoes((m) => ({ ...m, pressaoO2: e.target.value })); setErrors((er) => ({ ...er, pressaoO2: '' })) }}
                  error={errors.pressaoO2}
                />
                <Input
                  label="Pressão Ar Medicinal na rede (bar)"
                  type="number" step="0.1"
                  placeholder="Ex: 5.0"
                  value={medicoes.pressaoAr}
                  onChange={(e) => { setMedicoes((m) => ({ ...m, pressaoAr: e.target.value })); setErrors((er) => ({ ...er, pressaoAr: '' })) }}
                  error={errors.pressaoAr}
                />
              </div>

              <Button onClick={handleMedicoesNext} className="w-full mt-6">
                Continuar <ChevronRight className="w-4 h-4" />
              </Button>
            </Card>
          )}

          {/* ── BACKUP ───────────────────────────────────────────────── */}
          {etapa === 'backup' && (
            <Card shadow="md">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-amber-100">
                  <BatteryFull className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <Text as="h2" variant="heading-sm" className="text-dark block">
                    Sistema de Backup
                  </Text>
                  <Text variant="body-sm" className="text-gray-300 block">
                    O backup da usina {ambiente} está ligado?
                  </Text>
                </div>
              </div>

              {/* Resumo medições */}
              <div className="bg-gray-50 rounded-xl p-4 mb-5">
                <Text variant="caption" className="text-gray-300 uppercase tracking-wide font-semibold block mb-2">
                  Medições registradas
                </Text>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm font-sans">
                  <span className="text-gray-400">Pureza O₂:</span>
                  <span className="font-semibold text-dark">{medicoes.purezaO2}%</span>
                  <span className="text-gray-400">Pressão O₂:</span>
                  <span className="font-semibold text-dark">{medicoes.pressaoO2} bar</span>
                  <span className="text-gray-400">Pressão Ar:</span>
                  <span className="font-semibold text-dark">{medicoes.pressaoAr} bar</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <button
                  onClick={() => handleBackup(true)}
                  className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-green-300 bg-green-50 hover:bg-green-100 text-green-700 font-sans font-bold transition-all active:scale-95"
                >
                  <BatteryFull className="w-8 h-8" />
                  Sim
                </button>
                <button
                  onClick={() => handleBackup(false)}
                  className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-red-300 bg-red-50 hover:bg-red-100 text-red-700 font-sans font-bold transition-all active:scale-95"
                >
                  <BatteryLow className="w-8 h-8" />
                  Não
                </button>
              </div>

              <Button variant="outline" onClick={() => setEtapa('medicoes')} className="w-full">
                Voltar às medições
              </Button>
            </Card>
          )}

          {/* ── ABASTECIMENTO? ───────────────────────────────────────── */}
          {etapa === 'abastecimento_pergunta' && (
            <Card shadow="md">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-sky-100">
                  <Package className="w-5 h-5 text-sky-600" />
                </div>
                <div>
                  <Text as="h2" variant="heading-sm" className="text-dark block">
                    Abastecimento de Cilindros
                  </Text>
                  <Text variant="body-sm" className="text-gray-300 block">
                    Houve abastecimento de cilindros em {ambiente}?
                  </Text>
                </div>
              </div>

              {/* Status backup */}
              {backupLigado !== null && (
                <div className={`flex items-center gap-2 rounded-xl px-3 py-2 mb-4 ${backupLigado ? 'bg-green-50' : 'bg-red-50'}`}>
                  {backupLigado
                    ? <BatteryFull className="w-4 h-4 text-green-600 shrink-0" />
                    : <BatteryLow className="w-4 h-4 text-red-600 shrink-0" />}
                  <span className={`text-sm font-sans font-semibold ${backupLigado ? 'text-green-700' : 'text-red-700'}`}>
                    Backup: {backupLigado ? 'Ligado' : 'Desligado'}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-4">
                <button
                  onClick={() => setEtapa('abastecimento_detalhe')}
                  className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-700 font-sans font-bold transition-all active:scale-95"
                >
                  <Package className="w-8 h-8" />
                  Sim
                </button>
                <button
                  onClick={() => { setAbastecimento({ quantidade: '', tamanho: null }); setEtapa('alteracao_pergunta') }}
                  className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-600 font-sans font-bold transition-all active:scale-95"
                >
                  <X className="w-8 h-8" />
                  Não
                </button>
              </div>

              <Button variant="outline" onClick={() => setEtapa('backup')} className="w-full">
                Voltar
              </Button>
            </Card>
          )}

          {/* ── DETALHE ABASTECIMENTO ────────────────────────────────── */}
          {etapa === 'abastecimento_detalhe' && (
            <Card shadow="md">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-sky-100">
                  <Package className="w-5 h-5 text-sky-600" />
                </div>
                <div>
                  <Text as="h2" variant="heading-sm" className="text-dark block">
                    Dados do Abastecimento
                  </Text>
                  <Text variant="body-sm" className="text-gray-300 block">
                    Informe os cilindros abastecidos em {ambiente}
                  </Text>
                </div>
              </div>

              <div className="space-y-5">
                <Input
                  label="Quantidade de cilindros"
                  type="number" min="1" step="1"
                  placeholder="Ex: 4"
                  value={abastecimento.quantidade}
                  onChange={(e) => { setAbastecimento((a) => ({ ...a, quantidade: e.target.value })); setErrors((er) => ({ ...er, quantidade: '' })) }}
                  error={errors.quantidade}
                />

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-400 font-sans">Tamanho dos cilindros</label>
                  <div className="grid grid-cols-4 gap-2">
                    {TAMANHOS_CILINDRO.map((tam) => (
                      <button
                        key={tam}
                        type="button"
                        onClick={() => { setAbastecimento((a) => ({ ...a, tamanho: tam })); setErrors((er) => ({ ...er, tamanho: '' })) }}
                        className={`py-3 rounded-xl border-2 font-sans font-bold text-sm transition-all active:scale-95 ${abastecimento.tamanho === tam ? 'border-sky-400 bg-sky-50 text-sky-700' : 'border-gray-200 text-gray-300 bg-white hover:border-gray-300'}`}
                      >
                        {tam}
                      </button>
                    ))}
                  </div>
                  {errors.tamanho && <span className="text-xs text-red-base font-sans">{errors.tamanho}</span>}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={() => setEtapa('abastecimento_pergunta')} className="flex-1">
                  Voltar
                </Button>
                <Button onClick={handleAbastecimentoNext} className="flex-1">
                  Continuar <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          )}

          {/* ── TEVE ALTERAÇÃO? ──────────────────────────────────────── */}
          {etapa === 'alteracao_pergunta' && (
            <Card shadow="md">
              <Text as="h2" variant="heading-sm" className="text-dark mb-1 block">
                Teve alguma alteração?
              </Text>
              <Text variant="body-sm" className="text-gray-300 mb-4 block">
                Alguma ocorrência identificada na usina {ambiente}?
              </Text>

              {/* Resumo medições + backup */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2">
                <Text variant="caption" className="text-gray-300 uppercase tracking-wide block font-semibold">
                  Resumo do ambiente
                </Text>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm font-sans">
                  <span className="text-gray-400">Pureza O₂:</span>
                  <span className="font-semibold text-dark">{medicoes.purezaO2}%</span>
                  <span className="text-gray-400">Pressão O₂:</span>
                  <span className="font-semibold text-dark">{medicoes.pressaoO2} bar</span>
                  <span className="text-gray-400">Pressão Ar:</span>
                  <span className="font-semibold text-dark">{medicoes.pressaoAr} bar</span>
                  <span className="text-gray-400">Backup:</span>
                  <span className={`font-semibold ${backupLigado ? 'text-green-600' : 'text-red-600'}`}>
                    {backupLigado ? 'Ligado' : 'Desligado'}
                  </span>
                </div>
              </div>

              {/* Resumo abastecimento */}
              {abastecimento.quantidade && abastecimento.tamanho && (
                <div className="bg-sky-50 rounded-xl p-3 mb-4 flex items-center gap-2">
                  <Package className="w-4 h-4 text-sky-600 shrink-0" />
                  <span className="text-sm font-sans text-sky-700">
                    Abastecimento: <strong>{abastecimento.quantidade} cilindros {abastecimento.tamanho}</strong>
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-4">
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

              <Button variant="outline" onClick={() => setEtapa('abastecimento_pergunta')} className="w-full">
                Voltar
              </Button>
            </Card>
          )}

          {/* ── DETALHE ALTERAÇÃO ────────────────────────────────────── */}
          {etapa === 'alteracao_detalhe' && (
            <Card shadow="md">
              <Text as="h2" variant="heading-sm" className="text-dark mb-1 block">
                Detalhar alteração
              </Text>
              <Text variant="body-sm" className="text-gray-300 mb-5 block">
                Informe o tipo e descreva a ocorrência em {ambiente}
              </Text>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-400 font-sans">Tipo de alteração</label>
                  <div className="grid grid-cols-3 gap-2">
                    {TIPOS_ALTERACAO.map(({ value, label, color }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => { setDetalhe((d) => ({ ...d, tipo: value })); setErrors((er) => ({ ...er, tipo: '' })) }}
                        className={`py-2.5 px-2 rounded-xl border-2 font-sans font-semibold text-xs transition-all active:scale-95 ${detalhe.tipo === value ? color : 'border-gray-200 text-gray-300 bg-white hover:border-gray-300'}`}
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
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFoto}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={() => setEtapa('alteracao_pergunta')} className="flex-1">
                  Voltar
                </Button>
                <Button onClick={handleDetalheNext} className="flex-1">
                  Continuar <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          )}

          {/* ── TRILOGO ──────────────────────────────────────────────── */}
          {etapa === 'trilogo' && (
            <Card shadow="md">
              <Text as="h2" variant="heading-sm" className="text-dark mb-1 block">
                Chamado no Trilogo
              </Text>
              <Text variant="body-sm" className="text-gray-300 mb-6 block">
                Foi aberto chamado no sistema Trilogo para esta ocorrência em {ambiente}?
              </Text>

              <div className="grid grid-cols-2 gap-4 mb-4">
                {[
                  { v: true,  label: 'Sim', color: 'border-green-400 bg-green-50 text-green-700', icon: '✅' },
                  { v: false, label: 'Não', color: 'border-red-400 bg-red-50 text-red-700',   icon: '❌' },
                ].map(({ v, label, color, icon }) => (
                  <button
                    key={label}
                    onClick={() => handleTrilogo(v)}
                    disabled={submitting}
                    className={`flex flex-col items-center gap-2 p-5 rounded-xl border-2 ${color} font-sans font-bold transition-all active:scale-95 disabled:opacity-50`}
                  >
                    <span className="text-3xl">{icon}</span>
                    {label}
                  </button>
                ))}
              </div>

              <Button variant="outline" onClick={() => setEtapa('alteracao_detalhe')} className="w-full">
                Voltar
              </Button>
            </Card>
          )}

          {/* ── RESUMO FINAL ─────────────────────────────────────────── */}
          {etapa === 'resumo' && resumo && (
            <Card shadow="md">
              <div className="flex flex-col items-center gap-3 py-2 mb-5">
                <div className="w-14 h-14 rounded-full bg-green-light flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-base" />
                </div>
                <div className="text-center">
                  <Text as="h2" variant="heading-sm" className="text-dark block mb-1">
                    Inspeção concluída!
                  </Text>
                  <Text variant="body-sm" className="text-gray-300 block">
                    Ambiente {ambiente} inspecionado com sucesso
                  </Text>
                </div>
              </div>

              <div className={`flex items-center gap-3 p-3 rounded-xl border mb-6 ${resumo.temAlteracao ? 'border-orange-200 bg-orange-50' : 'border-green-200 bg-green-50'}`}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#7c3aed' }}>
                  <FlaskConical className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold font-sans text-dark">{ambiente}</span>
                  {resumo.temAbastecimento && (
                    <span className="text-xs text-sky-600 font-sans ml-2">
                      · {resumo.qtdCilindros} cil. {resumo.tamCilindros}
                    </span>
                  )}
                  {resumo.temAlteracao && resumo.tipo && (
                    <span className="text-xs text-orange-600 font-sans ml-2">
                      · {TIPOS_ALTERACAO.find((t) => t.value === resumo.tipo)?.label}
                    </span>
                  )}
                </div>
                <span className={`text-xs font-semibold font-sans px-2 py-0.5 rounded-full ${resumo.temAlteracao ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                  {resumo.temAlteracao ? 'Ocorrência' : 'Normal'}
                </span>
              </div>

              <div className="space-y-3">
                <Button onClick={resetForm} className="w-full">
                  Nova inspeção
                </Button>
                <Button variant="outline" onClick={() => router.push(`/${tenantSlug}/inspecao/historico`)} className="w-full">
                  <History className="w-4 h-4" />
                  Ver histórico
                </Button>
                <Button variant="ghost" onClick={() => router.push(`/${tenantSlug}`)} className="w-full">
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
