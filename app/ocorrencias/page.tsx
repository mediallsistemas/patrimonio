'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle, ChevronRight, ChevronLeft, Upload, X,
  History, AlertTriangle, ClipboardList,
  Search, FlaskConical, BatteryFull, BatteryLow,
  Package, LogOut, Play,
} from 'lucide-react'
import toast from 'react-hot-toast'

// ── Feedback visual central ───────────────────────────────────────────────────

function CheckFeedback({ show }: { show: boolean }) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
      style={{
        opacity: show ? 1 : 0,
        transform: show ? 'scale(1)' : 'scale(0.6)',
        transition: 'opacity 0.25s ease, transform 0.25s ease',
      }}
    >
      <div
        className="rounded-full p-6"
        style={{ backgroundColor: '#f97316', boxShadow: '0 8px 32px rgba(249,115,22,0.45)' }}
      >
        <CheckCircle className="w-16 h-16" style={{ color: '#ffffff' }} strokeWidth={2.5} />
      </div>
    </div>
  )
}
import Link from 'next/link'
import Card from '@/components/card'
import Button from '@/components/button'
import Input from '@/components/input'
import Text from '@/components/text'
import Header from '@/components/header'

// ── Tipos ─────────────────────────────────────────────────────────────────────

type TipoOcorrencia = 'eletrica' | 'hidraulica' | 'patrimonio'
type TamanhoCilindro = 'P7' | 'P10' | 'P45' | 'P50'
type TipoAmbiente = 'ocorrencia' | 'gases'

type Etapa =
  | 'inicio'
  | 'blocos'
  | 'locais'
  | 'bloco_concluido'      // resumo do bloco + opção de ir ao próximo
  | 'ocorrencia_pergunta'
  | 'ocorrencia_detalhe'
  | 'trilogo'
  | 'gases_medicoes'
  | 'gases_backup'
  | 'gases_abastecimento'
  | 'gases_abastecimento_detalhe'
  | 'confirmar_abandono'
  | 'resumo_final'

interface Local {
  nome: string
  tipo: TipoAmbiente
}

interface Bloco {
  nome: string
  locais: Local[]
}

interface RegistroConcluido {
  bloco: string
  local: string
  tipo: TipoAmbiente
  temOcorrencia: boolean
  tipoOcorrencia?: TipoOcorrencia
  purezaO2?: number
  pressaoO2?: number
  pressaoAr?: number
  backupLigado?: boolean
  temAbastecimento?: boolean
  qtdCilindros?: number | null
  tamCilindro?: string | null
}

interface DetalheOcorrencia {
  tipo: TipoOcorrencia | null
  descricao: string
  foto: string | null
}

interface DraftEstado {
  rondaId: string | null
  etapa: Etapa
  blocoSelecionado: string | null
  localSelecionado: Local | null
  concluidos: RegistroConcluido[]
  detalhe: DetalheOcorrencia
  medicoes: { purezaO2: string; pressaoO2: string; pressaoAr: string }
  backupLigado: boolean | null
  abastecimento: { quantidade: string; tamanho: TamanhoCilindro | null }
  iniciadoEm: string
}

// ── Estrutura de blocos ───────────────────────────────────────────────────────

const BLOCOS: Bloco[] = [
  {
    nome: 'Inspeção de Gases',
    locais: [
      { nome: 'Usina de O₂', tipo: 'gases' },
    ],
  },
  {
    nome: 'Bloco Conforto',
    locais: [
      { nome: '47 - Repouso 01', tipo: 'ocorrencia' },
      { nome: '48 - Repouso 02', tipo: 'ocorrencia' },
      { nome: '49 - Repouso 03', tipo: 'ocorrencia' },
      { nome: '50 - Repouso 04', tipo: 'ocorrencia' },
    ],
  },
  {
    nome: 'Bloco Cirúrgico',
    locais: [
      { nome: '40 - Expurgo CME', tipo: 'ocorrencia' },
      { nome: '78 - Esterilização', tipo: 'ocorrencia' },
      { nome: '79 - Lavagem de Material Contaminado', tipo: 'ocorrencia' },
      { nome: '80 - Material Autoclavado', tipo: 'ocorrencia' },
      { nome: '81 - Sala da Autoclave', tipo: 'ocorrencia' },
      { nome: '82 - Sala de Guarda de Equipamento', tipo: 'ocorrencia' },
      { nome: '83 - DML', tipo: 'ocorrencia' },
      { nome: '84 - Expurgo', tipo: 'ocorrencia' },
      { nome: '85 - Arsenal da Farmácia', tipo: 'ocorrencia' },
      { nome: '86 - Copa Centro Cirúrgico', tipo: 'ocorrencia' },
      { nome: '87 - Sala da Neonatologia', tipo: 'ocorrencia' },
      { nome: '88 - Sala de Cirurgia 01', tipo: 'ocorrencia' },
      { nome: '89 - Sala de Cirurgia 02', tipo: 'ocorrencia' },
      { nome: '90 - Sala de Cirurgia 03', tipo: 'ocorrencia' },
      { nome: '91 - RPA', tipo: 'ocorrencia' },
    ],
  },
  {
    nome: 'Bloco Atendimento Médico',
    locais: [
      { nome: '04 - Espera Consultórios', tipo: 'ocorrencia' },
      { nome: '05 - Consultório 5', tipo: 'ocorrencia' },
      { nome: '06 - Consultório 6', tipo: 'ocorrencia' },
      { nome: '07 - Ouvidoria', tipo: 'ocorrencia' },
      { nome: '08 - Utilidades', tipo: 'ocorrencia' },
      { nome: '09 - DML', tipo: 'ocorrencia' },
      { nome: '10 - Consultório 7', tipo: 'ocorrencia' },
      { nome: '11 - Sala de Ultrassonografia', tipo: 'ocorrencia' },
      { nome: '12 - Consultório 4', tipo: 'ocorrencia' },
      { nome: '13 - Consultório 3', tipo: 'ocorrencia' },
      { nome: '14 - Sala de Gesso / Sutura e Curativo', tipo: 'ocorrencia' },
      { nome: '15 - Posto de Coleta de Exame', tipo: 'ocorrencia' },
      { nome: '16 - Sala Disjuntores', tipo: 'ocorrencia' },
      { nome: '17 - Consultório 02', tipo: 'ocorrencia' },
      { nome: '18 - Internação Masculina', tipo: 'ocorrencia' },
      { nome: '19 - Posto de Enfermagem Observação', tipo: 'ocorrencia' },
      { nome: '20 - Internação Feminina', tipo: 'ocorrencia' },
      { nome: '22 - Sala de Limpeza / Expurgo', tipo: 'ocorrencia' },
      { nome: '23 - DML', tipo: 'ocorrencia' },
      { nome: '24 - Sala de Medicação 01', tipo: 'ocorrencia' },
      { nome: '25 - Sala de Medicação 02', tipo: 'ocorrencia' },
      { nome: '26 - Consultório 1', tipo: 'ocorrencia' },
      { nome: '27 - Raio X', tipo: 'ocorrencia' },
    ],
  },
  {
    nome: 'Bloco Emergência',
    locais: [
      { nome: '21 - Sala Vermelha', tipo: 'ocorrencia' },
      { nome: '28 - Recepção Sala Vermelha', tipo: 'ocorrencia' },
      { nome: '29 - Psicossocial', tipo: 'ocorrencia' },
      { nome: '30 - Necrotério', tipo: 'ocorrencia' },
    ],
  },
  {
    nome: 'Bloco Interno do Hospital',
    locais: [
      { nome: '31 - Farmácia Satélite', tipo: 'ocorrencia' },
      { nome: '32 - Sala Transfusional', tipo: 'ocorrencia' },
      { nome: '37 - Sala de Limpeza', tipo: 'ocorrencia' },
      { nome: '38 - Sala de Disjuntores', tipo: 'ocorrencia' },
      { nome: '39 - Sala de Utilidades', tipo: 'ocorrencia' },
      { nome: '46 - Farmácia Central', tipo: 'ocorrencia' },
    ],
  },
  {
    nome: 'Bloco Terceirizados / Colaboradores',
    locais: [
      { nome: '51 - Sala dos Soros', tipo: 'ocorrencia' },
      { nome: '52 - Preparo Mamadeiras', tipo: 'ocorrencia' },
      { nome: '53 - Cozinha', tipo: 'ocorrencia' },
      { nome: '54 - Laboratório', tipo: 'ocorrencia' },
      { nome: '55 - CAF 1', tipo: 'ocorrencia' },
      { nome: '56 - CAF 2', tipo: 'ocorrencia' },
      { nome: '57 - Refeitório', tipo: 'ocorrencia' },
      { nome: '58 - Sala Nutricionista', tipo: 'ocorrencia' },
      { nome: '59 - DML Nutrimax', tipo: 'ocorrencia' },
      { nome: '60 - Depósito Patrimônio', tipo: 'ocorrencia' },
      { nome: '61 - Vestiário Nutrimax', tipo: 'ocorrencia' },
      { nome: '62 - Rouparia / Roupa Limpa', tipo: 'ocorrencia' },
      { nome: '63 - Sala da Limpeza', tipo: 'ocorrencia' },
      { nome: '64 - Repouso Motorista', tipo: 'ocorrencia' },
      { nome: '65 - Sala Patrimônio e Manutenção', tipo: 'ocorrencia' },
      { nome: '66 - IML', tipo: 'ocorrencia' },
    ],
  },
  {
    nome: 'Bloco da Recepção',
    locais: [
      { nome: '01 - Recepção Geral', tipo: 'ocorrencia' },
      { nome: '02 - SAME/NIR', tipo: 'ocorrencia' },
      { nome: '03 - Triagem', tipo: 'ocorrencia' },
    ],
  },
  {
    nome: 'Bloco Administrativo',
    locais: [
      { nome: '67 - Sala do Gerente Hospitalar', tipo: 'ocorrencia' },
      { nome: '68 - Diretoria Médica', tipo: 'ocorrencia' },
      { nome: '69 - Diretoria Fundação', tipo: 'ocorrencia' },
      { nome: '70 - Sala RH/DP', tipo: 'ocorrencia' },
      { nome: '71 - Recepção Administrativa', tipo: 'ocorrencia' },
      { nome: '72 - Sala de Utilidades', tipo: 'ocorrencia' },
      { nome: '73 - Sala de Reunião', tipo: 'ocorrencia' },
      { nome: '74 - Sala dos Coordenadores', tipo: 'ocorrencia' },
      { nome: '75 - Diretor de Enfermagem', tipo: 'ocorrencia' },
      { nome: '76 - Produção e Faturamento', tipo: 'ocorrencia' },
      { nome: '77 - Sala do T.I.', tipo: 'ocorrencia' },
      { nome: '71.2 - Depósito Faturamento', tipo: 'ocorrencia' },
    ],
  },
  {
    nome: 'Bloco Enfermarias',
    locais: [
      { nome: '33 - Enfermaria 01', tipo: 'ocorrencia' },
      { nome: '34 - Enfermaria 02', tipo: 'ocorrencia' },
      { nome: '35 - Posto de Enfermagem 01 e 02', tipo: 'ocorrencia' },
      { nome: '36 - DML 01 e 02', tipo: 'ocorrencia' },
      { nome: '41 - Enfermaria 03', tipo: 'ocorrencia' },
      { nome: '42 - Enfermaria 04', tipo: 'ocorrencia' },
      { nome: '45 - Posto de Enfermagem 03 e 04', tipo: 'ocorrencia' },
    ],
  },
]

const TIPOS_OCORRENCIA: { value: TipoOcorrencia; label: string; active: string }[] = [
  { value: 'eletrica',   label: 'Elétrica',   active: 'border-yellow-400 bg-yellow-50 text-yellow-700' },
  { value: 'hidraulica', label: 'Hidráulica', active: 'border-blue-400 bg-blue-50 text-blue-700' },
  { value: 'patrimonio', label: 'Patrimônio', active: 'border-purple-400 bg-purple-50 text-purple-700' },
]

const TAMANHOS_CILINDRO: TamanhoCilindro[] = ['P7', 'P10', 'P45', 'P50']
const DRAFT_DEBOUNCE_MS = 1500

function estadoInicial(): DraftEstado {
  return {
    rondaId: null,
    etapa: 'blocos',
    blocoSelecionado: null,
    localSelecionado: null,
    concluidos: [],
    detalhe: { tipo: null, descricao: '', foto: null },
    medicoes: { purezaO2: '', pressaoO2: '', pressaoAr: '' },
    backupLigado: null,
    abastecimento: { quantidade: '', tamanho: null },
    iniciadoEm: new Date().toISOString(),
  }
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function OcorrenciasPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [rondaIniciada, setRondaIniciada] = useState(false)
  const [estado, setEstado] = useState<DraftEstado>(estadoInicial)
  const [searchBlocos, setSearchBlocos] = useState('')
  const [searchLocais, setSearchLocais] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showCheck, setShowCheck] = useState(false)

  const [draftServidor, setDraftServidor] = useState<DraftEstado | null>(null)
  const [mostrarBanner, setMostrarBanner] = useState(false)

  // ── Carregar draft ────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/rondas/draft')
      .then((r) => r.ok ? r.json() : null)
      .then((j) => {
        const d = j?.data ?? j
        if (d?.estado?.rondaId) {
          setDraftServidor(d.estado as DraftEstado)
          setMostrarBanner(true)
        }
      })
      .catch(() => {})
  }, [])

  // ── Salvar draft (debounced) ──────────────────────────────────────────────
  const salvarDraft = useCallback((est: DraftEstado) => {
    if (draftTimer.current) clearTimeout(draftTimer.current)
    draftTimer.current = setTimeout(() => {
      fetch('/api/rondas/draft', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(est),
      }).catch(() => {})
    }, DRAFT_DEBOUNCE_MS)
  }, [])

  function atualizar(parcial: Partial<DraftEstado>) {
    setEstado((prev) => {
      const next = { ...prev, ...parcial }
      if (rondaIniciada) salvarDraft(next)
      return next
    })
    setErrors({})
  }

  // ── Iniciar / retomar ─────────────────────────────────────────────────────
  function iniciar() {
    const novo = estadoInicial()
    setEstado(novo)
    setRondaIniciada(true)
    setMostrarBanner(false)
    salvarDraft(novo)
  }

  function retomar() {
    if (!draftServidor) return
    setEstado(draftServidor)
    setRondaIniciada(true)
    setMostrarBanner(false)
  }

  function descartarDraft() {
    fetch('/api/rondas/draft', { method: 'DELETE' }).catch(() => {})
    setMostrarBanner(false)
    setDraftServidor(null)
  }

  // ── Helpers de progresso ──────────────────────────────────────────────────
  function feitosNoBloco(nomeBloco: string) {
    return estado.concluidos.filter((c) => c.bloco === nomeBloco).length
  }

  function localFeito(nomeBloco: string, nomeLocal: string) {
    return estado.concluidos.some((c) => c.bloco === nomeBloco && c.local === nomeLocal)
  }

  function blocoCompleto(bloco: Bloco) {
    return bloco.locais.every((l) => localFeito(bloco.nome, l.nome))
  }

  const totalLocais = BLOCOS.reduce((acc, b) => acc + b.locais.length, 0)
  const totalFeitos = estado.concluidos.length
  const progresso = Math.round((totalFeitos / totalLocais) * 100)

  // ── Selecionar bloco ──────────────────────────────────────────────────────
  function selecionarBloco(bloco: Bloco) {
    atualizar({ blocoSelecionado: bloco.nome, etapa: 'locais' })
    setSearchLocais('')
  }

  // ── Selecionar local ──────────────────────────────────────────────────────
  function selecionarLocal(local: Local) {
    if (localFeito(estado.blocoSelecionado!, local.nome)) return
    const etapa: Etapa = local.tipo === 'gases' ? 'gases_medicoes' : 'ocorrencia_pergunta'
    atualizar({
      localSelecionado: local,
      etapa,
      detalhe: { tipo: null, descricao: '', foto: null },
      medicoes: { purezaO2: '', pressaoO2: '', pressaoAr: '' },
      backupLigado: null,
      abastecimento: { quantidade: '', tamanho: null },
    })
  }

  // ── Salvar local na API ───────────────────────────────────────────────────
  async function salvarLocal(temOcorrencia: boolean, trilogoChamado?: boolean) {
    const local = estado.localSelecionado!
    const blocoNome = estado.blocoSelecionado!
    setSubmitting(true)
    try {
      let rondaId = estado.rondaId
      if (!rondaId) {
        const res = await fetch('/api/rondas', { method: 'POST' })
        if (!res.ok) throw new Error('Falha ao criar ronda')
        const j = await res.json()
        rondaId = (j.data ?? j).id as string
      }

      const isGases = local.tipo === 'gases'
      const temAbast = isGases && Boolean(estado.abastecimento.quantidade && estado.abastecimento.tamanho)

      const body = isGases
        ? {
            tipoRegistro: 'gases',
            ambiente: local.nome,
            purezaO2: Number(estado.medicoes.purezaO2),
            pressaoO2: Number(estado.medicoes.pressaoO2),
            pressaoAr: Number(estado.medicoes.pressaoAr),
            backupLigado: estado.backupLigado ?? false,
            temAbastecimento: temAbast,
            qtdCilindros: temAbast ? Number(estado.abastecimento.quantidade) : null,
            tamCilindro: temAbast ? estado.abastecimento.tamanho : null,
            temOcorrencia,
            ...(temOcorrencia && estado.detalhe.tipo ? {
              ocorrencia: {
                tipo: estado.detalhe.tipo,
                descricao: estado.detalhe.descricao,
                foto: estado.detalhe.foto,
                trilogoChamado: trilogoChamado ?? false,
              },
            } : {}),
          }
        : {
            tipoRegistro: 'ocorrencia',
            ambiente: local.nome,
            temOcorrencia,
            ...(temOcorrencia && estado.detalhe.tipo ? {
              ocorrencia: {
                tipo: estado.detalhe.tipo,
                descricao: estado.detalhe.descricao,
                foto: estado.detalhe.foto,
                trilogoChamado: trilogoChamado ?? false,
              },
            } : {}),
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

      if (!temOcorrencia) {
        setShowCheck(true)
        setTimeout(() => setShowCheck(false), 900)
      }

      const novoRegistro: RegistroConcluido = {
        bloco: blocoNome,
        local: local.nome,
        tipo: local.tipo,
        temOcorrencia,
        tipoOcorrencia: temOcorrencia ? estado.detalhe.tipo ?? undefined : undefined,
        ...(isGases ? {
          purezaO2: Number(estado.medicoes.purezaO2),
          pressaoO2: Number(estado.medicoes.pressaoO2),
          pressaoAr: Number(estado.medicoes.pressaoAr),
          backupLigado: estado.backupLigado ?? false,
          temAbastecimento: temAbast,
          qtdCilindros: temAbast ? Number(estado.abastecimento.quantidade) : null,
          tamCilindro: temAbast ? estado.abastecimento.tamanho : null,
        } : {}),
      }

      const novosConcluidos = [...estado.concluidos, novoRegistro]

      // Verifica se o bloco ficou completo
      const bloco = BLOCOS.find((b) => b.nome === blocoNome)!
      const blocoAgora = bloco.locais.every((l) =>
        novosConcluidos.some((c) => c.bloco === blocoNome && c.local === l.nome)
      )

      const novoEstado: DraftEstado = {
        ...estado,
        rondaId,
        concluidos: novosConcluidos,
        etapa: blocoAgora ? 'bloco_concluido' : 'locais',
        localSelecionado: null,
      }
      setEstado(novoEstado)
      salvarDraft(novoEstado)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Finalizar ronda ───────────────────────────────────────────────────────
  async function finalizarRonda() {
    if (estado.rondaId) {
      try { await fetch(`/api/rondas/${estado.rondaId}`, { method: 'PATCH' }) } catch { /* não crítico */ }
    }
    await fetch('/api/rondas/draft', { method: 'DELETE' }).catch(() => {})
    atualizar({ etapa: 'resumo_final' })
  }

  // ── Abandonar ─────────────────────────────────────────────────────────────
  function abandonar() {
    salvarDraft(estado)
    toast('Ronda pausada. Você pode continuar depois.', { icon: '⏸️' })
    router.push('/')
  }

  // ── Foto ──────────────────────────────────────────────────────────────────
  function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => atualizar({ detalhe: { ...estado.detalhe, foto: reader.result as string } })
    reader.readAsDataURL(file)
  }

  // ── Validações ────────────────────────────────────────────────────────────
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

  function validarDetalhe() {
    const e: Record<string, string> = {}
    if (!estado.detalhe.tipo) e.tipo = 'Selecione o tipo'
    if (!estado.detalhe.descricao.trim()) e.descricao = 'Descreva o problema'
    return e
  }

  // ── Dados derivados ───────────────────────────────────────────────────────
  const blocoAtual = BLOCOS.find((b) => b.nome === estado.blocoSelecionado)

  const blocosFiltrados = BLOCOS.filter((b) =>
    b.nome.toLowerCase().includes(searchBlocos.toLowerCase())
  )

  const locaisFiltrados = blocoAtual
    ? blocoAtual.locais.filter((l) =>
        l.nome.toLowerCase().includes(searchLocais.toLowerCase())
      )
    : []

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="form-bg min-h-screen flex flex-col">
      <CheckFeedback show={showCheck} />
      <Header title="Registro de Ocorrências" />

      <main className="flex-1 flex items-start justify-center px-4 py-6">
        <div className="w-full max-w-lg space-y-4">

          {/* ── BANNER DRAFT ─────────────────────────────────────────────── */}
          {mostrarBanner && draftServidor && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold font-sans text-amber-800 text-sm">Ronda em andamento</p>
                  <p className="text-xs font-sans text-amber-700 mt-0.5">
                    {draftServidor.concluidos.length} local{draftServidor.concluidos.length !== 1 ? 'is' : ''} registrado{draftServidor.concluidos.length !== 1 ? 's' : ''} · iniciada às{' '}
                    {new Date(draftServidor.iniciadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
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

          {/* ── TELA INICIAL ─────────────────────────────────────────────── */}
          {!rondaIniciada && !mostrarBanner && (
            <Card shadow="md">
              <div className="flex flex-col items-center gap-4 py-2 mb-5">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#0f766e' }}>
                  <ClipboardList className="w-7 h-7 text-white" />
                </div>
                <div className="text-center">
                  <Text as="h2" variant="heading-sm" className="text-dark mb-1 block">Registro de Ocorrências</Text>
                  <Text variant="body-sm" className="text-gray-300 block">
                    {BLOCOS.length} blocos · {totalLocais} locais
                  </Text>
                </div>
              </div>
              <Button onClick={iniciar} className="w-full">
                <Play className="w-4 h-4" /> Iniciar Ronda
              </Button>
              <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                <Link href="/ocorrencias/historico" className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-red-base font-sans transition-colors">
                  <History className="w-4 h-4" /> Ver histórico de rondas
                </Link>
              </div>
            </Card>
          )}

          {/* ── RONDA ATIVA ──────────────────────────────────────────────── */}
          {rondaIniciada && (
            <>
              {/* Barra de progresso geral */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-sans text-gray-300">
                  <span className="font-semibold text-dark">{totalFeitos} / {totalLocais} locais</span>
                  <span>{progresso}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${progresso}%`, backgroundColor: '#0f766e' }}
                  />
                </div>
              </div>

              {/* ── LISTA DE BLOCOS ───────────────────────────────────────── */}
              {estado.etapa === 'blocos' && (
                <Card shadow="md">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#0f766e' }}>
                      <ClipboardList className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <Text as="h2" variant="heading-sm" className="text-dark block">Selecionar Bloco</Text>
                      <Text variant="body-sm" className="text-gray-300 block">Escolha o bloco que está inspecionando</Text>
                    </div>
                  </div>

                  {/* Search blocos */}
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                    <input
                      type="text"
                      placeholder="Pesquisar bloco..."
                      value={searchBlocos}
                      onChange={(e) => setSearchBlocos(e.target.value)}
                      className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 text-sm font-sans text-dark focus:outline-none focus:ring-2 focus:ring-teal-600 bg-white placeholder:text-gray-300"
                    />
                    {searchBlocos && (
                      <button onClick={() => setSearchBlocos('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Lista de blocos */}
                  <div className="overflow-y-auto max-h-80 space-y-2 pr-1 -mr-1">
                    {blocosFiltrados.map((bloco) => {
                      const feitos = feitosNoBloco(bloco.nome)
                      const completo = blocoCompleto(bloco)
                      const comOcorrencia = estado.concluidos.filter((c) => c.bloco === bloco.nome && c.temOcorrencia).length
                      return (
                        <button
                          key={bloco.nome}
                          onClick={() => selecionarBloco(bloco)}
                          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all text-left font-sans active:scale-95"
                          style={
                            completo
                              ? { borderColor: '#f97316', backgroundColor: '#fff7ed' }
                              : feitos > 0
                                ? { borderColor: '#fdba74', backgroundColor: '#fff7ed' }
                                : { borderColor: '#e5e7eb', backgroundColor: '#ffffff' }
                          }
                        >
                          {/* Ícone de status */}
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold font-sans"
                            style={{
                              backgroundColor: completo ? '#f97316' : feitos > 0 ? '#fdba74' : '#d1d5db',
                              color: '#ffffff',
                            }}
                          >
                            {completo ? <CheckCircle className="w-4 h-4" /> : feitos > 0 ? feitos : bloco.locais.length}
                          </div>

                          <div className="flex-1 min-w-0">
                            <span
                              className="text-sm font-semibold block"
                              style={{ color: completo ? '#c2410c' : feitos > 0 ? '#ea580c' : '#111827' }}
                            >
                              {bloco.nome}
                            </span>
                            <span className="text-xs text-gray-300 font-sans">
                              {feitos}/{bloco.locais.length} locais
                              {comOcorrencia > 0 && (
                                <span style={{ color: '#f97316' }} className="ml-1">· {comOcorrencia} ocorrência{comOcorrencia > 1 ? 's' : ''}</span>
                              )}
                            </span>
                          </div>

                          {bloco.locais.some((l) => l.tipo === 'gases') && (
                            <FlaskConical className="w-4 h-4 text-purple-400 shrink-0" />
                          )}
                          <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                        </button>
                      )
                    })}
                  </div>

                  {/* Ações */}
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                    {totalFeitos > 0 && (
                      <Button onClick={finalizarRonda} disabled={submitting} variant="outline" className="w-full">
                        <CheckCircle className="w-4 h-4" />
                        {totalFeitos >= totalLocais
                          ? 'Finalizar Ronda'
                          : `Finalizar com ${totalLocais - totalFeitos} pendente${totalLocais - totalFeitos !== 1 ? 's' : ''}`}
                      </Button>
                    )}
                    <button
                      onClick={() => atualizar({ etapa: 'confirmar_abandono' })}
                      className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-sans font-semibold text-gray-400 hover:text-red-base transition-colors"
                    >
                      <LogOut className="w-4 h-4" /> Pausar e sair
                    </button>
                  </div>
                </Card>
              )}

              {/* ── LISTA DE LOCAIS DO BLOCO ──────────────────────────────── */}
              {estado.etapa === 'locais' && blocoAtual && (
                <Card shadow="md">
                  <div className="flex items-center gap-3 mb-4">
                    <button
                      onClick={() => atualizar({ etapa: 'blocos', blocoSelecionado: null })}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-dark hover:bg-gray-100 transition-colors shrink-0"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <Text as="h2" variant="heading-sm" className="text-dark block truncate">{blocoAtual.nome}</Text>
                      <Text variant="body-sm" className="text-gray-300 block">
                        {feitosNoBloco(blocoAtual.nome)}/{blocoAtual.locais.length} locais registrados
                      </Text>
                    </div>
                  </div>

                  {/* Barra de progresso do bloco */}
                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden mb-4">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.round((feitosNoBloco(blocoAtual.nome) / blocoAtual.locais.length) * 100)}%`,
                        backgroundColor: '#0f766e',
                      }}
                    />
                  </div>

                  {/* Search locais */}
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                    <input
                      type="text"
                      placeholder="Pesquisar local..."
                      value={searchLocais}
                      onChange={(e) => setSearchLocais(e.target.value)}
                      className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 text-sm font-sans text-dark focus:outline-none focus:ring-2 focus:ring-teal-600 bg-white placeholder:text-gray-300"
                    />
                    {searchLocais && (
                      <button onClick={() => setSearchLocais('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Lista de locais */}
                  <div className="overflow-y-auto max-h-72 space-y-1.5 pr-1 -mr-1">
                    {locaisFiltrados.map((local) => {
                      const feito = localFeito(blocoAtual.nome, local.nome)
                      const reg = estado.concluidos.find((c) => c.bloco === blocoAtual.nome && c.local === local.nome)
                      return (
                        <button
                          key={local.nome}
                          onClick={() => selecionarLocal(local)}
                          disabled={feito}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left font-sans ${
                            feito
                              ? reg?.temOcorrencia
                                ? 'border-orange-200 bg-orange-50 cursor-default'
                                : 'border-green-200 bg-green-50 cursor-default'
                              : 'border-gray-200 bg-white hover:border-teal-600 hover:bg-teal-50 active:scale-95'
                          }`}
                        >
                          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            feito ? (reg?.temOcorrencia ? 'bg-orange-400' : 'bg-green-500') : 'bg-gray-200'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <span className={`text-sm font-semibold block truncate ${feito ? 'text-gray-400' : 'text-dark'}`}>
                              {local.nome}
                            </span>
                            {feito && reg && (
                              <span className={`text-xs ${reg.temOcorrencia ? 'text-orange-500' : 'text-green-600'}`}>
                                {reg.temOcorrencia
                                  ? `⚠ ${TIPOS_OCORRENCIA.find(t => t.value === reg.tipoOcorrencia)?.label ?? 'Ocorrência'}`
                                  : '✓ Normal'}
                              </span>
                            )}
                          </div>
                          {local.tipo === 'gases' && !feito && (
                            <FlaskConical className="w-4 h-4 text-purple-400 shrink-0" />
                          )}
                          {!feito && <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />}
                        </button>
                      )
                    })}
                  </div>

                </Card>
              )}

              {/* ── BLOCO CONCLUÍDO ───────────────────────────────────────── */}
              {estado.etapa === 'bloco_concluido' && blocoAtual && (() => {
                const idx = BLOCOS.findIndex((b) => b.nome === blocoAtual.nome)

                const comOcorrencia = estado.concluidos.filter((c) => c.bloco === blocoAtual.nome && c.temOcorrencia).length
                const isUltimo = idx === BLOCOS.length - 1
                return (
                  <Card shadow="md">
                    <div className="flex flex-col items-center gap-3 py-2 mb-5">
                      <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: comOcorrencia > 0 ? '#fff7ed' : '#f0fdf4', border: `2px solid ${comOcorrencia > 0 ? '#fb923c' : '#86efac'}` }}>
                        {comOcorrencia > 0
                          ? <AlertTriangle className="w-7 h-7" style={{ color: '#f97316' }} />
                          : <CheckCircle className="w-7 h-7" style={{ color: '#16a34a' }} />}
                      </div>
                      <div className="text-center">
                        <Text as="h2" variant="heading-sm" className="text-dark block mb-1">
                          {blocoAtual.nome} concluído!
                        </Text>
                        <Text variant="body-sm" className="text-gray-300 block">
                          {blocoAtual.locais.length} locais verificados
                          {comOcorrencia > 0 && ` · ${comOcorrencia} ocorrência${comOcorrencia > 1 ? 's' : ''}`}
                        </Text>
                      </div>
                    </div>

                    {/* Resumo dos locais do bloco */}
                    <div className="space-y-1.5 mb-5 max-h-48 overflow-y-auto pr-1">
                      {blocoAtual.locais.map((l) => {
                        const reg = estado.concluidos.find((c) => c.bloco === blocoAtual.nome && c.local === l.nome)
                        return (
                          <div key={l.nome} className={`flex items-center gap-3 px-3 py-2 rounded-xl border ${reg?.temOcorrencia ? 'border-orange-200 bg-orange-50' : 'border-green-200 bg-green-50'}`}>
                            <div className={`w-2 h-2 rounded-full shrink-0 ${reg?.temOcorrencia ? 'bg-orange-400' : 'bg-green-500'}`} />
                            <span className="flex-1 text-sm font-sans text-dark truncate">{l.nome}</span>
                            <span className={`text-xs font-semibold font-sans shrink-0 ${reg?.temOcorrencia ? 'text-orange-600' : 'text-green-600'}`}>
                              {reg?.temOcorrencia ? '⚠ Ocorrência' : '✓ Normal'}
                            </span>
                          </div>
                        )
                      })}
                    </div>

                    <div className="space-y-2">
                      {!isUltimo ? (
                        <>
                          <Button onClick={() => atualizar({ etapa: 'blocos' })} className="w-full">
                            Selecionar próximo bloco <ChevronRight className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button onClick={finalizarRonda} disabled={submitting} className="w-full">
                            <CheckCircle className="w-4 h-4" /> Finalizar Ronda
                          </Button>
                          <Button variant="outline" onClick={() => atualizar({ etapa: 'blocos' })} className="w-full">
                            Ver todos os blocos
                          </Button>
                        </>
                      )}
                    </div>
                  </Card>
                )
              })()}

              {/* ── CONFIRMAR ABANDONO ────────────────────────────────────── */}
              {estado.etapa === 'confirmar_abandono' && (
                <Card shadow="md">
                  <div className="flex flex-col items-center gap-3 py-2 mb-4">
                    <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                      <LogOut className="w-6 h-6 text-amber-600" />
                    </div>
                    <div className="text-center">
                      <Text as="h2" variant="heading-sm" className="text-dark block mb-1">Pausar ronda?</Text>
                      <Text variant="body-sm" className="text-gray-300 block">
                        A ronda fica salva. Ao voltar à página você pode continuar de onde parou.
                      </Text>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Button onClick={abandonar} className="w-full"><LogOut className="w-4 h-4" /> Pausar e sair</Button>
                    <Button variant="outline" onClick={() => atualizar({ etapa: 'blocos' })} className="w-full">Continuar ronda</Button>
                  </div>
                </Card>
              )}

              {/* ── TEVE OCORRÊNCIA? ─────────────────────────────────────── */}
              {estado.etapa === 'ocorrencia_pergunta' && estado.localSelecionado && (
                <Card shadow="md">
                  <div className="flex items-center gap-3 mb-1">
                    <button
                      onClick={() => atualizar({ etapa: 'locais', localSelecionado: null })}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-dark hover:bg-gray-100 transition-colors shrink-0"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <Text variant="caption" className="text-gray-300 uppercase tracking-wide font-semibold block">
                      {estado.blocoSelecionado}
                    </Text>
                  </div>
                  <Text as="h2" variant="heading-sm" className="text-dark mb-1 block px-1">{estado.localSelecionado.nome}</Text>
                  <Text variant="body-sm" className="text-gray-300 mb-5 block px-1">Teve algum tipo de alteração neste local?</Text>

                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => salvarLocal(false)} disabled={submitting}
                      className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-green-300 bg-green-50 hover:bg-green-100 text-green-700 font-sans font-bold transition-all active:scale-95 disabled:opacity-50">
                      <CheckCircle className="w-8 h-8" /> Não
                    </button>
                    <button onClick={() => atualizar({ etapa: 'ocorrencia_detalhe' })}
                      className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-700 font-sans font-bold transition-all active:scale-95">
                      <AlertTriangle className="w-8 h-8" /> Sim
                    </button>
                  </div>
                </Card>
              )}

              {/* ── DETALHE OCORRÊNCIA ────────────────────────────────────── */}
              {estado.etapa === 'ocorrencia_detalhe' && estado.localSelecionado && (
                <Card shadow="md">
                  <Text variant="caption" className="text-gray-300 uppercase tracking-wide font-semibold block mb-1">{estado.blocoSelecionado}</Text>
                  <Text as="h2" variant="heading-sm" className="text-dark mb-1 block">{estado.localSelecionado.nome}</Text>
                  <Text variant="body-sm" className="text-gray-300 mb-5 block">Classifique e descreva o problema</Text>

                  <div className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-400 font-sans">Tipo de alteração</label>
                      <div className="grid grid-cols-3 gap-2">
                        {TIPOS_OCORRENCIA.map(({ value, label, active }) => (
                          <button key={value} type="button"
                            onClick={() => atualizar({ detalhe: { ...estado.detalhe, tipo: value } })}
                            className={`py-3 px-2 rounded-xl border-2 font-sans font-semibold text-xs transition-all active:scale-95 ${estado.detalhe.tipo === value ? active : 'border-gray-200 text-gray-300 bg-white hover:border-gray-300'}`}>
                            {label}
                          </button>
                        ))}
                      </div>
                      {errors.tipo && <span className="text-xs text-red-base font-sans">{errors.tipo}</span>}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-400 font-sans">Observação</label>
                      <textarea rows={4} placeholder="Descreva detalhadamente o problema identificado..."
                        value={estado.detalhe.descricao}
                        onChange={(e) => atualizar({ detalhe: { ...estado.detalhe, descricao: e.target.value } })}
                        className={`w-full px-4 py-3 rounded-xl border font-sans text-dark text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-all placeholder:text-gray-300 resize-none ${errors.descricao ? 'border-red-base' : 'border-gray-200'}`}
                      />
                      {errors.descricao && <span className="text-xs text-red-base font-sans">{errors.descricao}</span>}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-400 font-sans">Foto (opcional)</label>
                      {estado.detalhe.foto ? (
                        <div className="relative rounded-xl overflow-hidden border border-gray-200">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={estado.detalhe.foto} alt="Ocorrência" className="w-full h-48 object-cover" />
                          <button type="button" onClick={() => atualizar({ detalhe: { ...estado.detalhe, foto: null } })} className="absolute top-2 right-2 bg-dark/70 text-white rounded-full p-1">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full py-8 rounded-xl border-2 border-dashed border-gray-200 hover:border-teal-600 hover:bg-teal-50 transition-all flex flex-col items-center gap-2 text-gray-300 hover:text-teal-600">
                          <Upload className="w-6 h-6" />
                          <span className="text-sm font-sans">Toque para adicionar foto</span>
                        </button>
                      )}
                      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFoto} className="hidden" />
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <Button variant="outline" onClick={() => atualizar({ etapa: 'ocorrencia_pergunta' })} className="flex-1">Voltar</Button>
                    <Button onClick={() => {
                      const e = validarDetalhe()
                      if (Object.keys(e).length > 0) { setErrors(e); return }
                      atualizar({ etapa: 'trilogo' })
                    }} className="flex-1">
                      Continuar <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              )}

              {/* ── TRILOGO ───────────────────────────────────────────────── */}
              {estado.etapa === 'trilogo' && estado.localSelecionado && (
                <Card shadow="md">
                  <Text variant="caption" className="text-gray-300 uppercase tracking-wide font-semibold block mb-1">{estado.blocoSelecionado}</Text>
                  <Text as="h2" variant="heading-sm" className="text-dark mb-1 block">Chamado no Trilogo</Text>
                  <Text variant="body-sm" className="text-gray-300 mb-6 block">
                    Foi aberto chamado no Trilogo para a ocorrência em <strong>{estado.localSelecionado.nome}</strong>?
                  </Text>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {[
                      { v: true,  label: 'Sim', color: 'border-green-400 bg-green-50 text-green-700', icon: '✅' },
                      { v: false, label: 'Não', color: 'border-red-400 bg-red-50 text-red-700',       icon: '❌' },
                    ].map(({ v, label, color, icon }) => (
                      <button key={label} onClick={() => salvarLocal(true, v)} disabled={submitting}
                        className={`flex flex-col items-center gap-2 p-5 rounded-xl border-2 ${color} font-sans font-bold transition-all active:scale-95 disabled:opacity-50`}>
                        <span className="text-3xl">{icon}</span>{label}
                      </button>
                    ))}
                  </div>
                  <Button variant="outline" onClick={() => atualizar({ etapa: 'ocorrencia_detalhe' })} className="w-full">Voltar</Button>
                </Card>
              )}

              {/* ── GASES: MEDIÇÕES ───────────────────────────────────────── */}
              {estado.etapa === 'gases_medicoes' && estado.localSelecionado && (
                <Card shadow="md">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#7c3aed' }}>
                      <FlaskConical className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <Text as="h2" variant="heading-sm" className="text-dark block">Medições de Gases</Text>
                      <Text variant="body-sm" className="text-gray-300 block">{estado.localSelecionado.nome}</Text>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <Input label="% Pureza O₂" type="number" step="0.1" min="0" max="100" placeholder="Ex: 93.5"
                      value={estado.medicoes.purezaO2}
                      onChange={(e) => atualizar({ medicoes: { ...estado.medicoes, purezaO2: e.target.value } })}
                      error={errors.purezaO2} />
                    <Input label="Pressão O₂ na rede (bar)" type="number" step="0.1" placeholder="Ex: 4.5"
                      value={estado.medicoes.pressaoO2}
                      onChange={(e) => atualizar({ medicoes: { ...estado.medicoes, pressaoO2: e.target.value } })}
                      error={errors.pressaoO2} />
                    <Input label="Pressão Ar Medicinal na rede (bar)" type="number" step="0.1" placeholder="Ex: 5.0"
                      value={estado.medicoes.pressaoAr}
                      onChange={(e) => atualizar({ medicoes: { ...estado.medicoes, pressaoAr: e.target.value } })}
                      error={errors.pressaoAr} />
                  </div>
                  <div className="flex gap-3 mt-6">
                    <Button variant="outline" onClick={() => atualizar({ etapa: 'locais', localSelecionado: null })} className="flex-1">Voltar</Button>
                    <Button onClick={() => {
                      const e = validarMedicoes()
                      if (Object.keys(e).length > 0) { setErrors(e); return }
                      atualizar({ etapa: 'gases_backup' })
                    }} className="flex-1">
                      Continuar <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              )}

              {/* ── GASES: BACKUP ─────────────────────────────────────────── */}
              {estado.etapa === 'gases_backup' && (
                <Card shadow="md">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                      <BatteryFull className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <Text as="h2" variant="heading-sm" className="text-dark block">Sistema de Backup</Text>
                      <Text variant="body-sm" className="text-gray-300 block">O backup da usina está ligado?</Text>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 mb-5 grid grid-cols-2 gap-x-4 gap-y-1 text-sm font-sans">
                    <span className="text-gray-400">Pureza O₂:</span><span className="font-semibold text-dark">{estado.medicoes.purezaO2}%</span>
                    <span className="text-gray-400">Pressão O₂:</span><span className="font-semibold text-dark">{estado.medicoes.pressaoO2} bar</span>
                    <span className="text-gray-400">Pressão Ar:</span><span className="font-semibold text-dark">{estado.medicoes.pressaoAr} bar</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <button onClick={() => atualizar({ backupLigado: true, etapa: 'gases_abastecimento' })}
                      className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-green-300 bg-green-50 hover:bg-green-100 text-green-700 font-sans font-bold transition-all active:scale-95">
                      <BatteryFull className="w-8 h-8" /> Sim
                    </button>
                    <button onClick={() => atualizar({ backupLigado: false, etapa: 'gases_abastecimento' })}
                      className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-red-300 bg-red-50 hover:bg-red-100 text-red-700 font-sans font-bold transition-all active:scale-95">
                      <BatteryLow className="w-8 h-8" /> Não
                    </button>
                  </div>
                  <Button variant="outline" onClick={() => atualizar({ etapa: 'gases_medicoes' })} className="w-full">Voltar</Button>
                </Card>
              )}

              {/* ── GASES: ABASTECIMENTO? ─────────────────────────────────── */}
              {estado.etapa === 'gases_abastecimento' && (
                <Card shadow="md">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center shrink-0">
                      <Package className="w-5 h-5 text-sky-600" />
                    </div>
                    <div>
                      <Text as="h2" variant="heading-sm" className="text-dark block">Abastecimento de Cilindros</Text>
                      <Text variant="body-sm" className="text-gray-300 block">Houve abastecimento de cilindros?</Text>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <button onClick={() => atualizar({ etapa: 'gases_abastecimento_detalhe' })}
                      className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-700 font-sans font-bold transition-all active:scale-95">
                      <Package className="w-8 h-8" /> Sim
                    </button>
                    <button onClick={() => atualizar({ abastecimento: { quantidade: '', tamanho: null }, etapa: 'ocorrencia_pergunta' })}
                      className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-600 font-sans font-bold transition-all active:scale-95">
                      <X className="w-8 h-8" /> Não
                    </button>
                  </div>
                  <Button variant="outline" onClick={() => atualizar({ etapa: 'gases_backup' })} className="w-full">Voltar</Button>
                </Card>
              )}

              {/* ── GASES: DETALHE ABASTECIMENTO ─────────────────────────── */}
              {estado.etapa === 'gases_abastecimento_detalhe' && (
                <Card shadow="md">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center shrink-0">
                      <Package className="w-5 h-5 text-sky-600" />
                    </div>
                    <Text as="h2" variant="heading-sm" className="text-dark block">Dados do Abastecimento</Text>
                  </div>
                  <div className="space-y-5">
                    <Input label="Quantidade de cilindros" type="number" min="1" step="1" placeholder="Ex: 4"
                      value={estado.abastecimento.quantidade}
                      onChange={(e) => atualizar({ abastecimento: { ...estado.abastecimento, quantidade: e.target.value } })}
                      error={errors.quantidade} />
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-400 font-sans">Tamanho dos cilindros</label>
                      <div className="grid grid-cols-4 gap-2">
                        {TAMANHOS_CILINDRO.map((tam) => (
                          <button key={tam} type="button"
                            onClick={() => atualizar({ abastecimento: { ...estado.abastecimento, tamanho: tam } })}
                            className={`py-3 rounded-xl border-2 font-sans font-bold text-sm transition-all active:scale-95 ${estado.abastecimento.tamanho === tam ? 'border-sky-400 bg-sky-50 text-sky-700' : 'border-gray-200 text-gray-300 bg-white hover:border-gray-300'}`}>
                            {tam}
                          </button>
                        ))}
                      </div>
                      {errors.tamanho && <span className="text-xs text-red-base font-sans">{errors.tamanho}</span>}
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <Button variant="outline" onClick={() => atualizar({ etapa: 'gases_abastecimento' })} className="flex-1">Voltar</Button>
                    <Button onClick={() => {
                      const e = validarAbastecimento()
                      if (Object.keys(e).length > 0) { setErrors(e); return }
                      atualizar({ etapa: 'ocorrencia_pergunta' })
                    }} className="flex-1">
                      Continuar <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              )}

              {/* ── RESUMO FINAL ──────────────────────────────────────────── */}
              {estado.etapa === 'resumo_final' && (
                <Card shadow="md">
                  <div className="flex flex-col items-center gap-3 py-2 mb-5">
                    <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <div className="text-center">
                      <Text as="h2" variant="heading-sm" className="text-dark block mb-1">Ronda concluída!</Text>
                      <Text variant="body-sm" className="text-gray-300 block">
                        {totalFeitos} local{totalFeitos !== 1 ? 'is' : ''} verificado{totalFeitos !== 1 ? 's' : ''}
                      </Text>
                    </div>
                  </div>

                  {/* Resumo por bloco */}
                  <div className="space-y-2 mb-6 max-h-64 overflow-y-auto pr-1">
                    {BLOCOS.map((bloco) => {
                      const feitosB = feitosNoBloco(bloco.nome)
                      if (feitosB === 0) return null
                      const comOcorrencia = estado.concluidos.filter((c) => c.bloco === bloco.nome && c.temOcorrencia).length
                      return (
                        <div key={bloco.nome} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${comOcorrencia > 0 ? 'border-orange-200 bg-orange-50' : 'border-green-200 bg-green-50'}`}>
                          <div className={`w-2 h-2 rounded-full shrink-0 ${comOcorrencia > 0 ? 'bg-orange-400' : 'bg-green-500'}`} />
                          <span className="flex-1 text-sm font-semibold font-sans text-dark truncate">{bloco.nome}</span>
                          <span className="text-xs text-gray-300 font-sans shrink-0">{feitosB}/{bloco.locais.length}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold font-sans shrink-0 ${comOcorrencia > 0 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                            {comOcorrencia > 0 ? `${comOcorrencia} ocorrência${comOcorrencia > 1 ? 's' : ''}` : 'Normal'}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  <div className="space-y-3">
                    <Button onClick={() => { setEstado(estadoInicial()); setRondaIniciada(false) }} className="w-full">Nova ronda</Button>
                    <Button variant="outline" onClick={() => router.push('/ocorrencias/historico')} className="w-full">
                      <History className="w-4 h-4" /> Ver histórico
                    </Button>
                    <Button variant="ghost" onClick={() => router.push('/')} className="w-full">Voltar ao início</Button>
                  </div>
                </Card>
              )}
            </>
          )}

        </div>
      </main>
    </div>
  )
}
