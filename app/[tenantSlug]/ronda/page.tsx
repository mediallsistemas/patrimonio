'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  Search, ChevronRight, CheckCircle, X, AlertTriangle,
  Upload, History, FlaskConical, MapPin, Play, SkipForward,
  BatteryFull, BatteryLow, Package, LogOut,
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
type TipoRegistro = 'ocorrencia' | 'gases'

interface AmbienteTenant {
  id: string
  nome: string
  ordem: number
  tipo: TipoRegistro
}

// Estado de um ambiente já registrado nesta ronda
interface RegistroFeito {
  ambienteId: string
  nome: string
  tipo: TipoRegistro
  temOcorrencia: boolean
  // gases
  purezaO2?: number
  pressaoO2?: number
  pressaoAr?: number
  backupLigado?: boolean
  temAbastecimento?: boolean
  qtdCilindros?: number | null
  tamCilindro?: string | null
  // ocorrência
  ocorrencia?: {
    tipo: TipoAlteracao
    descricao: string
    foto: string | null
    trilogoChamado: boolean | null
  }
}

// Etapas do fluxo de registro de 1 ambiente
type EtapaAmbiente =
  | 'selecao'               // lista de ambientes
  | 'gases_medicoes'        // gases: medições
  | 'gases_backup'          // gases: backup ligado?
  | 'gases_abastecimento'   // gases: houve abastecimento?
  | 'gases_abastecimento_detalhe' // gases: qtd + tamanho
  | 'ocorrencia_pergunta'   // ocorrência: teve alguma?
  | 'ocorrencia_detalhe'    // ocorrência: detalhe
  | 'trilogo'               // trilogo chamado?
  | 'confirmar_abandono'    // modal de abandono

// Estado persistido no draft
interface DraftEstado {
  rondaId: string | null
  registros: RegistroFeito[]
  etapa: EtapaAmbiente
  ambienteSelecionado: AmbienteTenant | null
  // campos em andamento
  medicoes: { purezaO2: string; pressaoO2: string; pressaoAr: string }
  backupLigado: boolean | null
  abastecimento: { quantidade: string; tamanho: TamanhoCilindro | null }
  ocorrencia: { tipo: TipoAlteracao | null; descricao: string; foto: string | null; trilogoChamado: boolean | null }
  iniciadoEm: string
}

// ── Constantes ────────────────────────────────────────────────────────────────

const TIPOS_ALTERACAO: { value: TipoAlteracao; label: string; color: string }[] = [
  { value: 'eletrica',   label: 'Elétrica',   color: 'border-yellow-400 bg-yellow-50 text-yellow-700' },
  { value: 'hidraulica', label: 'Hidráulica', color: 'border-blue-400 bg-blue-50 text-blue-700' },
  { value: 'patrimonio', label: 'Patrimônio', color: 'border-purple-400 bg-purple-50 text-purple-700' },
]

const TAMANHOS_CILINDRO: TamanhoCilindro[] = ['P7', 'P10', 'P45', 'P50']

const DRAFT_SAVE_DEBOUNCE_MS = 1500

function estadoInicial(): DraftEstado {
  return {
    rondaId: null,
    registros: [],
    etapa: 'selecao',
    ambienteSelecionado: null,
    medicoes: { purezaO2: '', pressaoO2: '', pressaoAr: '' },
    backupLigado: null,
    abastecimento: { quantidade: '', tamanho: null },
    ocorrencia: { tipo: null, descricao: '', foto: null, trilogoChamado: null },
    iniciadoEm: new Date().toISOString(),
  }
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function RondaPage() {
  const router = useRouter()
  const { tenantSlug } = useParams<{ tenantSlug: string }>()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Lista de ambientes configurados para este tenant
  const [ambientes, setAmbientes] = useState<AmbienteTenant[]>([])
  const [loadingAmbientes, setLoadingAmbientes] = useState(true)

  // Search/scroll na lista de ambientes
  const [search, setSearch] = useState('')

  // Estado principal da ronda
  const [estado, setEstado] = useState<DraftEstado>(estadoInicial)
  const [rondaIniciada, setRondaIniciada] = useState(false)

  // Draft do servidor — se existe, oferecer retomada
  const [draftServidor, setDraftServidor] = useState<DraftEstado | null>(null)
  const [mostrandoBannerDraft, setMostrandoBannerDraft] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // ── Carregar ambientes + draft do servidor ──────────────────────────────────
  useEffect(() => {
    async function init() {
      const [ambRes, draftRes] = await Promise.all([
        fetch(`/api/tenants/${tenantSlug}/ambientes`),
        fetch('/api/rondas/draft'),
      ])

      if (ambRes.ok) {
        const j = await ambRes.json()
        setAmbientes(j.data ?? j)
      }
      setLoadingAmbientes(false)

      if (draftRes.ok) {
        const j = await draftRes.json()
        const draft = j.data ?? j
        if (draft && draft.estado && draft.estado.rondaId) {
          setDraftServidor(draft.estado as DraftEstado)
          setMostrandoBannerDraft(true)
        }
      }
    }
    init()
  }, [tenantSlug])

  // ── Persistir draft no servidor (debounced) ─────────────────────────────────
  const salvarDraft = useCallback((est: DraftEstado) => {
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    draftTimerRef.current = setTimeout(() => {
      fetch('/api/rondas/draft', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(est),
      }).catch(() => {/* silencioso */})
    }, DRAFT_SAVE_DEBOUNCE_MS)
  }, [])

  // ── Atualizar estado + enfileirar save de draft ─────────────────────────────
  function atualizarEstado(parcial: Partial<DraftEstado>) {
    setEstado((prev) => {
      const next = { ...prev, ...parcial }
      if (rondaIniciada) salvarDraft(next)
      return next
    })
    setErrors({})
  }

  // ── Retomar ronda do draft ──────────────────────────────────────────────────
  function retomar() {
    if (!draftServidor) return
    setEstado(draftServidor)
    setRondaIniciada(true)
    setMostrandoBannerDraft(false)
    setDraftServidor(null)
  }

  function descartarDraft() {
    fetch('/api/rondas/draft', { method: 'DELETE' }).catch(() => {/**/})
    setMostrandoBannerDraft(false)
    setDraftServidor(null)
  }

  // ── Iniciar ronda nova ──────────────────────────────────────────────────────
  function iniciarRonda() {
    const novo = estadoInicial()
    setEstado(novo)
    setRondaIniciada(true)
    setMostrandoBannerDraft(false)
    // Salva draft imediatamente ao iniciar (sem rondaId ainda, mas marca como em andamento)
    salvarDraft(novo)
  }

  // ── Selecionar ambiente ─────────────────────────────────────────────────────
  function selecionarAmbiente(amb: AmbienteTenant) {
    if (jaRegistrado(amb.id)) return
    const proxEtapa: EtapaAmbiente = amb.tipo === 'gases' ? 'gases_medicoes' : 'ocorrencia_pergunta'
    atualizarEstado({
      ambienteSelecionado: amb,
      etapa: proxEtapa,
      medicoes: { purezaO2: '', pressaoO2: '', pressaoAr: '' },
      backupLigado: null,
      abastecimento: { quantidade: '', tamanho: null },
      ocorrencia: { tipo: null, descricao: '', foto: null, trilogoChamado: null },
    })
  }

  function jaRegistrado(id: string) {
    return estado.registros.some((r) => r.ambienteId === id)
  }

  // ── Validações ───────────────────────────────────────────────────────────────
  function validarMedicoes() {
    const e: Record<string, string> = {}
    if (!estado.medicoes.purezaO2 || isNaN(Number(estado.medicoes.purezaO2))) e.purezaO2 = 'Informe o valor'
    if (!estado.medicoes.pressaoO2 || isNaN(Number(estado.medicoes.pressaoO2))) e.pressaoO2 = 'Informe o valor'
    if (!estado.medicoes.pressaoAr || isNaN(Number(estado.medicoes.pressaoAr))) e.pressaoAr = 'Informe o valor'
    return e
  }

  function validarAbastecimento() {
    const e: Record<string, string> = {}
    if (!estado.abastecimento.quantidade || isNaN(Number(estado.abastecimento.quantidade)) || Number(estado.abastecimento.quantidade) < 1)
      e.quantidade = 'Informe a quantidade'
    if (!estado.abastecimento.tamanho) e.tamanho = 'Selecione o tamanho'
    return e
  }

  function validarDetalheOcorrencia() {
    const e: Record<string, string> = {}
    if (!estado.ocorrencia.tipo) e.tipo = 'Selecione o tipo'
    if (!estado.ocorrencia.descricao.trim()) e.descricao = 'Descreva o problema'
    return e
  }

  // ── Salvar ambiente na API e adicionar ao estado ────────────────────────────
  async function salvarAmbienteAtual(temOcorrencia: boolean, trilogoChamado?: boolean) {
    if (!estado.ambienteSelecionado) return
    const amb = estado.ambienteSelecionado

    setSubmitting(true)
    try {
      // Cria a ronda se ainda não existe
      let rondaId = estado.rondaId
      if (!rondaId) {
        const res = await fetch('/api/rondas', { method: 'POST' })
        if (!res.ok) throw new Error('Falha ao criar ronda')
        const j = await res.json()
        rondaId = (j.data ?? j).id as string
      }

      const isGases = amb.tipo === 'gases'
      const temAbast = isGases && Boolean(estado.abastecimento.quantidade && estado.abastecimento.tamanho)

      const body = isGases
        ? {
            tipoRegistro: 'gases' as const,
            ambiente: amb.nome,
            purezaO2: Number(estado.medicoes.purezaO2),
            pressaoO2: Number(estado.medicoes.pressaoO2),
            pressaoAr: Number(estado.medicoes.pressaoAr),
            backupLigado: estado.backupLigado ?? false,
            temAbastecimento: temAbast,
            qtdCilindros: temAbast ? Number(estado.abastecimento.quantidade) : null,
            tamCilindro: temAbast ? estado.abastecimento.tamanho : null,
            temOcorrencia,
            ...(temOcorrencia && estado.ocorrencia.tipo
              ? {
                  ocorrencia: {
                    tipo: estado.ocorrencia.tipo,
                    descricao: estado.ocorrencia.descricao,
                    foto: estado.ocorrencia.foto ?? null,
                    trilogoChamado: trilogoChamado ?? false,
                  },
                }
              : {}),
          }
        : {
            tipoRegistro: 'ocorrencia' as const,
            ambiente: amb.nome,
            temOcorrencia,
            ...(temOcorrencia && estado.ocorrencia.tipo
              ? {
                  ocorrencia: {
                    tipo: estado.ocorrencia.tipo,
                    descricao: estado.ocorrencia.descricao,
                    foto: estado.ocorrencia.foto ?? null,
                    trilogoChamado: trilogoChamado ?? false,
                  },
                }
              : {}),
          }

      const res = await fetch(`/api/rondas/${rondaId}/ambientes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Erro ${res.status}`)
      }

      const novoRegistro: RegistroFeito = {
        ambienteId: amb.id,
        nome: amb.nome,
        tipo: amb.tipo,
        temOcorrencia,
        ...(isGases
          ? {
              purezaO2: Number(estado.medicoes.purezaO2),
              pressaoO2: Number(estado.medicoes.pressaoO2),
              pressaoAr: Number(estado.medicoes.pressaoAr),
              backupLigado: estado.backupLigado ?? false,
              temAbastecimento: temAbast,
              qtdCilindros: temAbast ? Number(estado.abastecimento.quantidade) : null,
              tamCilindro: temAbast ? estado.abastecimento.tamanho : null,
            }
          : {}),
        ...(temOcorrencia && estado.ocorrencia.tipo
          ? {
              ocorrencia: {
                tipo: estado.ocorrencia.tipo,
                descricao: estado.ocorrencia.descricao,
                foto: estado.ocorrencia.foto ?? null,
                trilogoChamado: trilogoChamado ?? null,
              },
            }
          : {}),
      }

      const novosRegistros = [...estado.registros, novoRegistro]
      const novoEstado: DraftEstado = {
        ...estado,
        rondaId,
        registros: novosRegistros,
        etapa: 'selecao',
        ambienteSelecionado: null,
      }
      setEstado(novoEstado)
      salvarDraft(novoEstado)
      toast.success(`${amb.nome} registrado!`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Finalizar ronda ─────────────────────────────────────────────────────────
  async function finalizarRonda() {
    if (!estado.rondaId) return
    setSubmitting(true)
    try {
      await fetch(`/api/rondas/${estado.rondaId}`, { method: 'PATCH' })
      await fetch('/api/rondas/draft', { method: 'DELETE' })
      toast.success('Ronda finalizada!')
      router.push(`/${tenantSlug}/ronda/historico`)
    } catch {
      toast.error('Erro ao finalizar ronda')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Abandonar ronda (mantém draft no servidor) ──────────────────────────────
  function abandonarRonda() {
    // draft já está salvo no servidor — só volta ao início
    salvarDraft(estado)
    toast('Ronda pausada. Você pode continuar depois.', { icon: '⏸️' })
    router.push(`/${tenantSlug}/hotelaria`)
  }

  // ── Foto ─────────────────────────────────────────────────────────────────────
  function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () =>
      atualizarEstado({ ocorrencia: { ...estado.ocorrencia, foto: reader.result as string } })
    reader.readAsDataURL(file)
  }

  // ── Ambientes filtrados para exibição ────────────────────────────────────────
  const ambientesFiltrados = ambientes.filter((a) =>
    a.nome.toLowerCase().includes(search.toLowerCase()),
  )
  const totalAmbientes = ambientes.length
  const totalFeitos = estado.registros.length
  const progresso = totalAmbientes > 0 ? Math.round((totalFeitos / totalAmbientes) * 100) : 0
  const tudoFeito = totalFeitos > 0 && totalFeitos >= totalAmbientes

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="form-bg min-h-screen flex flex-col">
      <Header title="Ronda" backHref={`/${tenantSlug}/hotelaria`} />

      <main className="flex-1 flex items-start justify-center px-4 py-6">
        <div className="w-full max-w-lg space-y-4">

          {/* ── BANNER: draft existente no servidor ──────────────────────── */}
          {mostrandoBannerDraft && draftServidor && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold font-sans text-amber-800 text-sm">Ronda em andamento</p>
                  <p className="text-xs font-sans text-amber-700 mt-0.5">
                    Você tem uma ronda pausada com {draftServidor.registros.length} ambiente{draftServidor.registros.length !== 1 ? 's' : ''} registrado{draftServidor.registros.length !== 1 ? 's' : ''}.
                    {' '}Iniciada às {new Date(draftServidor.iniciadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={retomar} className="flex-1 text-sm py-2">
                  <Play className="w-4 h-4" /> Continuar ronda
                </Button>
                <Button variant="outline" onClick={descartarDraft} className="flex-1 text-sm py-2">
                  <X className="w-4 h-4" /> Descartar
                </Button>
              </div>
            </div>
          )}

          {/* ── TELA INICIAL (antes de iniciar) ────────────────────────────── */}
          {!rondaIniciada && !mostrandoBannerDraft && (
            <Card shadow="md">
              <div className="flex flex-col items-center gap-4 py-2 mb-5">
                <div className="w-14 h-14 rounded-2xl bg-red-base flex items-center justify-center">
                  <MapPin className="w-7 h-7 text-white" />
                </div>
                <div className="text-center">
                  <Text as="h2" variant="heading-sm" className="text-dark mb-1 block">
                    Ronda de Inspeção
                  </Text>
                  <Text variant="body-sm" className="text-gray-300 block">
                    {loadingAmbientes
                      ? 'Carregando ambientes...'
                      : `${totalAmbientes} ambiente${totalAmbientes !== 1 ? 's' : ''} para inspecionar`}
                  </Text>
                </div>
              </div>

              <Button onClick={iniciarRonda} className="w-full" disabled={loadingAmbientes || totalAmbientes === 0}>
                <Play className="w-4 h-4" /> Iniciar Ronda
              </Button>

              {totalAmbientes === 0 && !loadingAmbientes && (
                <p className="text-center text-xs text-gray-300 font-sans mt-3">
                  Nenhum ambiente cadastrado. Solicite ao administrador.
                </p>
              )}

              <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                <Link
                  href={`/${tenantSlug}/ronda/historico`}
                  className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-red-base font-sans transition-colors"
                >
                  <History className="w-4 h-4" /> Ver histórico de rondas
                </Link>
              </div>
            </Card>
          )}

          {/* ── RONDA ATIVA ─────────────────────────────────────────────────── */}
          {rondaIniciada && (
            <>
              {/* Barra de progresso */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-sans text-gray-300">
                  <span className="font-semibold text-dark">
                    {totalFeitos} / {totalAmbientes} ambientes
                  </span>
                  <span>{progresso}% concluído</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-base rounded-full transition-all duration-500"
                    style={{ width: `${progresso}%` }}
                  />
                </div>
              </div>

              {/* ── SELEÇÃO DE AMBIENTE ──────────────────────────────────── */}
              {estado.etapa === 'selecao' && (
                <Card shadow="md" className="overflow-hidden">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-red-base flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <Text as="h2" variant="heading-sm" className="text-dark block">
                        Selecionar Ambiente
                      </Text>
                      <Text variant="body-sm" className="text-gray-300 block">
                        {tudoFeito ? 'Todos os ambientes registrados' : 'Toque no ambiente para registrar'}
                      </Text>
                    </div>
                  </div>

                  {/* Search */}
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                    <input
                      type="text"
                      placeholder="Pesquisar ambiente..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm font-sans text-dark focus:outline-none focus:ring-2 focus:ring-red-base bg-white placeholder:text-gray-300"
                    />
                    {search && (
                      <button
                        onClick={() => setSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Lista com scroll */}
                  <div className="overflow-y-auto max-h-72 space-y-1.5 pr-1 -mr-1">
                    {ambientesFiltrados.length === 0 ? (
                      <p className="text-center py-6 text-sm text-gray-300 font-sans">
                        {search ? 'Nenhum ambiente encontrado' : 'Nenhum ambiente disponível'}
                      </p>
                    ) : (
                      ambientesFiltrados.map((amb) => {
                        const feito = jaRegistrado(amb.id)
                        const reg = estado.registros.find((r) => r.ambienteId === amb.id)
                        return (
                          <button
                            key={amb.id}
                            onClick={() => selecionarAmbiente(amb)}
                            disabled={feito}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left font-sans ${
                              feito
                                ? 'border-green-200 bg-green-50 opacity-80 cursor-default'
                                : 'border-gray-200 bg-white hover:border-red-base hover:bg-red-light active:scale-98'
                            }`}
                          >
                            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${feito ? (reg?.temOcorrencia ? 'bg-orange-400' : 'bg-green-500') : 'bg-gray-200'}`} />
                            <div className="flex-1 min-w-0">
                              <span className={`text-sm font-semibold block truncate ${feito ? 'text-gray-500' : 'text-dark'}`}>
                                {amb.nome}
                              </span>
                              {feito && reg && (
                                <span className={`text-xs ${reg.temOcorrencia ? 'text-orange-500' : 'text-green-600'}`}>
                                  {reg.temOcorrencia ? '⚠ Ocorrência registrada' : '✓ Normal'}
                                </span>
                              )}
                            </div>
                            {amb.tipo === 'gases' && (
                              <FlaskConical className="w-4 h-4 text-purple-400 shrink-0" />
                            )}
                            {!feito && (
                              <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                            )}
                          </button>
                        )
                      })
                    )}
                  </div>

                  {/* Ações finais */}
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                    {tudoFeito && (
                      <Button onClick={finalizarRonda} disabled={submitting} className="w-full">
                        <CheckCircle className="w-4 h-4" /> Finalizar Ronda
                      </Button>
                    )}
                    {!tudoFeito && totalFeitos > 0 && (
                      <Button onClick={finalizarRonda} disabled={submitting} variant="outline" className="w-full">
                        <SkipForward className="w-4 h-4" /> Finalizar com {totalAmbientes - totalFeitos} pendente{totalAmbientes - totalFeitos !== 1 ? 's' : ''}
                      </Button>
                    )}
                    <button
                      onClick={() => atualizarEstado({ etapa: 'confirmar_abandono' })}
                      className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-sans font-semibold text-gray-400 hover:text-red-base transition-colors"
                    >
                      <LogOut className="w-4 h-4" /> Pausar e sair
                    </button>
                  </div>
                </Card>
              )}

              {/* ── CONFIRMAR ABANDONO ───────────────────────────────────── */}
              {estado.etapa === 'confirmar_abandono' && (
                <Card shadow="md">
                  <div className="flex flex-col items-center gap-3 py-2 mb-4">
                    <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                      <LogOut className="w-6 h-6 text-amber-600" />
                    </div>
                    <div className="text-center">
                      <Text as="h2" variant="heading-sm" className="text-dark block mb-1">
                        Pausar ronda?
                      </Text>
                      <Text variant="body-sm" className="text-gray-300 block">
                        A ronda ficará salva. Você pode continuar de onde parou quando voltar.
                      </Text>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Button onClick={abandonarRonda} className="w-full">
                      <LogOut className="w-4 h-4" /> Pausar e sair
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => atualizarEstado({ etapa: 'selecao' })}
                      className="w-full"
                    >
                      Continuar ronda
                    </Button>
                  </div>
                </Card>
              )}

              {/* ── GASES: MEDIÇÕES ──────────────────────────────────────── */}
              {estado.etapa === 'gases_medicoes' && estado.ambienteSelecionado && (
                <Card shadow="md">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#7c3aed' }}>
                      <FlaskConical className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <Text as="h2" variant="heading-sm" className="text-dark block">
                        Medições — {estado.ambienteSelecionado.nome}
                      </Text>
                      <Text variant="body-sm" className="text-gray-300 block">Inspeção de Gases Medicinais</Text>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Input
                      label="% Pureza O₂"
                      type="number" step="0.1" min="0" max="100"
                      placeholder="Ex: 93.5"
                      value={estado.medicoes.purezaO2}
                      onChange={(e) => atualizarEstado({ medicoes: { ...estado.medicoes, purezaO2: e.target.value } })}
                      error={errors.purezaO2}
                    />
                    <Input
                      label="Pressão O₂ na rede (bar)"
                      type="number" step="0.1"
                      placeholder="Ex: 4.5"
                      value={estado.medicoes.pressaoO2}
                      onChange={(e) => atualizarEstado({ medicoes: { ...estado.medicoes, pressaoO2: e.target.value } })}
                      error={errors.pressaoO2}
                    />
                    <Input
                      label="Pressão Ar Medicinal na rede (bar)"
                      type="number" step="0.1"
                      placeholder="Ex: 5.0"
                      value={estado.medicoes.pressaoAr}
                      onChange={(e) => atualizarEstado({ medicoes: { ...estado.medicoes, pressaoAr: e.target.value } })}
                      error={errors.pressaoAr}
                    />
                  </div>

                  <div className="flex gap-3 mt-6">
                    <Button variant="outline" onClick={() => atualizarEstado({ etapa: 'selecao', ambienteSelecionado: null })} className="flex-1">
                      Voltar
                    </Button>
                    <Button
                      onClick={() => {
                        const e = validarMedicoes()
                        if (Object.keys(e).length > 0) { setErrors(e); return }
                        atualizarEstado({ etapa: 'gases_backup' })
                      }}
                      className="flex-1"
                    >
                      Continuar <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              )}

              {/* ── GASES: BACKUP ───────────────────────────────────────── */}
              {estado.etapa === 'gases_backup' && estado.ambienteSelecionado && (
                <Card shadow="md">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-amber-100">
                      <BatteryFull className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <Text as="h2" variant="heading-sm" className="text-dark block">Sistema de Backup</Text>
                      <Text variant="body-sm" className="text-gray-300 block">
                        O backup de {estado.ambienteSelecionado.nome} está ligado?
                      </Text>
                    </div>
                  </div>

                  {/* Resumo medições */}
                  <div className="bg-gray-50 rounded-xl p-4 mb-5 grid grid-cols-2 gap-x-4 gap-y-1 text-sm font-sans">
                    <span className="text-gray-400">Pureza O₂:</span>
                    <span className="font-semibold text-dark">{estado.medicoes.purezaO2}%</span>
                    <span className="text-gray-400">Pressão O₂:</span>
                    <span className="font-semibold text-dark">{estado.medicoes.pressaoO2} bar</span>
                    <span className="text-gray-400">Pressão Ar:</span>
                    <span className="font-semibold text-dark">{estado.medicoes.pressaoAr} bar</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <button
                      onClick={() => atualizarEstado({ backupLigado: true, etapa: 'gases_abastecimento' })}
                      className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-green-300 bg-green-50 hover:bg-green-100 text-green-700 font-sans font-bold transition-all active:scale-95"
                    >
                      <BatteryFull className="w-8 h-8" /> Sim
                    </button>
                    <button
                      onClick={() => atualizarEstado({ backupLigado: false, etapa: 'gases_abastecimento' })}
                      className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-red-300 bg-red-50 hover:bg-red-100 text-red-700 font-sans font-bold transition-all active:scale-95"
                    >
                      <BatteryLow className="w-8 h-8" /> Não
                    </button>
                  </div>

                  <Button variant="outline" onClick={() => atualizarEstado({ etapa: 'gases_medicoes' })} className="w-full">
                    Voltar às medições
                  </Button>
                </Card>
              )}

              {/* ── GASES: ABASTECIMENTO? ───────────────────────────────── */}
              {estado.etapa === 'gases_abastecimento' && estado.ambienteSelecionado && (
                <Card shadow="md">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-sky-100">
                      <Package className="w-5 h-5 text-sky-600" />
                    </div>
                    <div>
                      <Text as="h2" variant="heading-sm" className="text-dark block">Abastecimento de Cilindros</Text>
                      <Text variant="body-sm" className="text-gray-300 block">
                        Houve abastecimento em {estado.ambienteSelecionado.nome}?
                      </Text>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <button
                      onClick={() => atualizarEstado({ etapa: 'gases_abastecimento_detalhe' })}
                      className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-700 font-sans font-bold transition-all active:scale-95"
                    >
                      <Package className="w-8 h-8" /> Sim
                    </button>
                    <button
                      onClick={() => atualizarEstado({ abastecimento: { quantidade: '', tamanho: null }, etapa: 'ocorrencia_pergunta' })}
                      className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-600 font-sans font-bold transition-all active:scale-95"
                    >
                      <X className="w-8 h-8" /> Não
                    </button>
                  </div>

                  <Button variant="outline" onClick={() => atualizarEstado({ etapa: 'gases_backup' })} className="w-full">
                    Voltar
                  </Button>
                </Card>
              )}

              {/* ── GASES: DETALHE ABASTECIMENTO ───────────────────────── */}
              {estado.etapa === 'gases_abastecimento_detalhe' && (
                <Card shadow="md">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-sky-100">
                      <Package className="w-5 h-5 text-sky-600" />
                    </div>
                    <div>
                      <Text as="h2" variant="heading-sm" className="text-dark block">Dados do Abastecimento</Text>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <Input
                      label="Quantidade de cilindros"
                      type="number" min="1" step="1"
                      placeholder="Ex: 4"
                      value={estado.abastecimento.quantidade}
                      onChange={(e) => atualizarEstado({ abastecimento: { ...estado.abastecimento, quantidade: e.target.value } })}
                      error={errors.quantidade}
                    />
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-400 font-sans">Tamanho dos cilindros</label>
                      <div className="grid grid-cols-4 gap-2">
                        {TAMANHOS_CILINDRO.map((tam) => (
                          <button
                            key={tam}
                            type="button"
                            onClick={() => atualizarEstado({ abastecimento: { ...estado.abastecimento, tamanho: tam } })}
                            className={`py-3 rounded-xl border-2 font-sans font-bold text-sm transition-all active:scale-95 ${estado.abastecimento.tamanho === tam ? 'border-sky-400 bg-sky-50 text-sky-700' : 'border-gray-200 text-gray-300 bg-white hover:border-gray-300'}`}
                          >
                            {tam}
                          </button>
                        ))}
                      </div>
                      {errors.tamanho && <span className="text-xs text-red-base font-sans">{errors.tamanho}</span>}
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <Button variant="outline" onClick={() => atualizarEstado({ etapa: 'gases_abastecimento' })} className="flex-1">
                      Voltar
                    </Button>
                    <Button
                      onClick={() => {
                        const e = validarAbastecimento()
                        if (Object.keys(e).length > 0) { setErrors(e); return }
                        atualizarEstado({ etapa: 'ocorrencia_pergunta' })
                      }}
                      className="flex-1"
                    >
                      Continuar <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              )}

              {/* ── OCORRÊNCIA: TEVE ALGUMA? ─────────────────────────────── */}
              {estado.etapa === 'ocorrencia_pergunta' && estado.ambienteSelecionado && (
                <Card shadow="md">
                  <Text as="h2" variant="heading-sm" className="text-dark mb-1 block">
                    {estado.ambienteSelecionado.nome}
                  </Text>
                  <Text variant="body-sm" className="text-gray-300 mb-4 block">
                    Alguma ocorrência identificada neste ambiente?
                  </Text>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <button
                      onClick={() => salvarAmbienteAtual(false)}
                      disabled={submitting}
                      className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-green-300 bg-green-50 hover:bg-green-100 text-green-700 font-sans font-bold transition-all active:scale-95 disabled:opacity-50"
                    >
                      <CheckCircle className="w-8 h-8" /> Normal
                    </button>
                    <button
                      onClick={() => atualizarEstado({ etapa: 'ocorrencia_detalhe' })}
                      className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-700 font-sans font-bold transition-all active:scale-95"
                    >
                      <span className="text-3xl">⚠️</span> Ocorrência
                    </button>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => atualizarEstado({
                      etapa: estado.ambienteSelecionado?.tipo === 'gases' ? 'gases_abastecimento' : 'selecao',
                      ambienteSelecionado: estado.ambienteSelecionado?.tipo === 'gases' ? estado.ambienteSelecionado : null,
                    })}
                    className="w-full"
                  >
                    Voltar
                  </Button>
                </Card>
              )}

              {/* ── OCORRÊNCIA: DETALHE ──────────────────────────────────── */}
              {estado.etapa === 'ocorrencia_detalhe' && estado.ambienteSelecionado && (
                <Card shadow="md">
                  <Text as="h2" variant="heading-sm" className="text-dark mb-1 block">
                    Detalhar ocorrência
                  </Text>
                  <Text variant="body-sm" className="text-gray-300 mb-5 block">
                    {estado.ambienteSelecionado.nome}
                  </Text>

                  <div className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-400 font-sans">Tipo de ocorrência</label>
                      <div className="grid grid-cols-3 gap-2">
                        {TIPOS_ALTERACAO.map(({ value, label, color }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => atualizarEstado({ ocorrencia: { ...estado.ocorrencia, tipo: value } })}
                            className={`py-2.5 px-2 rounded-xl border-2 font-sans font-semibold text-xs transition-all active:scale-95 ${estado.ocorrencia.tipo === value ? color : 'border-gray-200 text-gray-300 bg-white hover:border-gray-300'}`}
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
                        value={estado.ocorrencia.descricao}
                        onChange={(e) => atualizarEstado({ ocorrencia: { ...estado.ocorrencia, descricao: e.target.value } })}
                        className={`w-full px-4 py-3 rounded-xl border font-sans text-dark text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-base transition-all placeholder:text-gray-300 resize-none ${errors.descricao ? 'border-red-base' : 'border-gray-200'}`}
                      />
                      {errors.descricao && <span className="text-xs text-red-base font-sans">{errors.descricao}</span>}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-400 font-sans">Foto (opcional)</label>
                      {estado.ocorrencia.foto ? (
                        <div className="relative rounded-xl overflow-hidden border border-gray-200">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={estado.ocorrencia.foto} alt="Ocorrência" className="w-full h-48 object-cover" />
                          <button
                            type="button"
                            onClick={() => atualizarEstado({ ocorrencia: { ...estado.ocorrencia, foto: null } })}
                            className="absolute top-2 right-2 bg-dark/70 text-white rounded-full p-1"
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
                    <Button variant="outline" onClick={() => atualizarEstado({ etapa: 'ocorrencia_pergunta' })} className="flex-1">
                      Voltar
                    </Button>
                    <Button
                      onClick={() => {
                        const e = validarDetalheOcorrencia()
                        if (Object.keys(e).length > 0) { setErrors(e); return }
                        atualizarEstado({ etapa: 'trilogo' })
                      }}
                      className="flex-1"
                    >
                      Continuar <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              )}

              {/* ── TRILOGO ─────────────────────────────────────────────── */}
              {estado.etapa === 'trilogo' && estado.ambienteSelecionado && (
                <Card shadow="md">
                  <Text as="h2" variant="heading-sm" className="text-dark mb-1 block">
                    Chamado no Trilogo
                  </Text>
                  <Text variant="body-sm" className="text-gray-300 mb-6 block">
                    Foi aberto chamado no Trilogo para esta ocorrência em {estado.ambienteSelecionado.nome}?
                  </Text>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {[
                      { v: true,  label: 'Sim', color: 'border-green-400 bg-green-50 text-green-700', icon: '✅' },
                      { v: false, label: 'Não', color: 'border-red-400 bg-red-50 text-red-700',   icon: '❌' },
                    ].map(({ v, label, color, icon }) => (
                      <button
                        key={label}
                        onClick={() => salvarAmbienteAtual(true, v)}
                        disabled={submitting}
                        className={`flex flex-col items-center gap-2 p-5 rounded-xl border-2 ${color} font-sans font-bold transition-all active:scale-95 disabled:opacity-50`}
                      >
                        <span className="text-3xl">{icon}</span>
                        {label}
                      </button>
                    ))}
                  </div>

                  <Button variant="outline" onClick={() => atualizarEstado({ etapa: 'ocorrencia_detalhe' })} className="w-full">
                    Voltar
                  </Button>
                </Card>
              )}
            </>
          )}

        </div>
      </main>
    </div>
  )
}
