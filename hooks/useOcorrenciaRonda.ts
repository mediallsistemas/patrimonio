'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  BLOCOS,
  DRAFT_DEBOUNCE_MS,
  estadoInicial,
  type Bloco,
  type Local,
  type DraftEstado,
  type RegistroConcluido,
  type TipoOcorrencia,
} from '@/app/ocorrencias/types'

export interface OcorrenciaRondaState {
  // Estado
  rondaIniciada: boolean
  estado: DraftEstado
  searchBlocos: string
  searchLocais: string
  submitting: boolean
  errors: Record<string, string>
  showCheck: boolean
  draftServidor: DraftEstado | null
  mostrarBanner: boolean

  // Refs
  fileInputRef: React.RefObject<HTMLInputElement | null>

  // Dados derivados
  totalLocais: number
  totalFeitos: number
  progresso: number
  blocoAtual: Bloco | undefined
  blocosFiltrados: Bloco[]
  locaisFiltrados: Local[]

  // Setters simples
  setSearchBlocos: (v: string) => void
  setSearchLocais: (v: string) => void
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>

  // Handlers
  atualizar: (parcial: Partial<DraftEstado>) => void
  iniciar: () => void
  retomar: () => void
  descartarDraft: () => void
  feitosNoBloco: (nomeBloco: string) => number
  localFeito: (nomeBloco: string, nomeLocal: string) => boolean
  blocoCompleto: (bloco: Bloco) => boolean
  selecionarBloco: (bloco: Bloco) => void
  selecionarLocal: (local: Local) => void
  salvarLocal: (temOcorrencia: boolean, trilogoChamado?: boolean) => Promise<void>
  finalizarRonda: () => Promise<void>
  abandonar: () => void
  handleFoto: (e: React.ChangeEvent<HTMLInputElement>) => void
  validarMedicoes: () => Record<string, string>
  validarAbastecimento: () => Record<string, string>
  validarDetalhe: () => Record<string, string>
}

export function useOcorrenciaRonda(): OcorrenciaRondaState {
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
      .then((r) => (r.ok ? r.json() : null))
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

  // ── Selecionar bloco / local ──────────────────────────────────────────────
  function selecionarBloco(bloco: Bloco) {
    atualizar({ blocoSelecionado: bloco.nome, etapa: 'locais' })
    setSearchLocais('')
  }

  function selecionarLocal(local: Local) {
    if (localFeito(estado.blocoSelecionado!, local.nome)) return
    const etapa = local.tipo === 'gases' ? 'gases_medicoes' : 'ocorrencia_pergunta'
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
      const temAbast =
        isGases && Boolean(estado.abastecimento.quantidade && estado.abastecimento.tamanho)

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
            ...(temOcorrencia && estado.detalhe.tipo
              ? {
                  ocorrencia: {
                    tipo: estado.detalhe.tipo,
                    descricao: estado.detalhe.descricao,
                    foto: estado.detalhe.foto,
                    trilogoChamado: trilogoChamado ?? false,
                  },
                }
              : {}),
          }
        : {
            tipoRegistro: 'ocorrencia',
            ambiente: local.nome,
            temOcorrencia,
            ...(temOcorrencia && estado.detalhe.tipo
              ? {
                  ocorrencia: {
                    tipo: estado.detalhe.tipo,
                    descricao: estado.detalhe.descricao,
                    foto: estado.detalhe.foto,
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

      if (!temOcorrencia) {
        setShowCheck(true)
        setTimeout(() => setShowCheck(false), 900)
      }

      const novoRegistro: RegistroConcluido = {
        bloco: blocoNome,
        local: local.nome,
        tipo: local.tipo,
        temOcorrencia,
        tipoOcorrencia: temOcorrencia ? (estado.detalhe.tipo ?? undefined) : undefined,
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
      }

      const novosConcluidos = [...estado.concluidos, novoRegistro]
      const bloco = BLOCOS.find((b) => b.nome === blocoNome)!
      const blocoAgora = bloco.locais.every((l) =>
        novosConcluidos.some((c) => c.bloco === blocoNome && c.local === l.nome),
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
      try {
        await fetch(`/api/rondas/${estado.rondaId}`, { method: 'PATCH' })
      } catch {
        /* não crítico */
      }
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
    reader.onload = () =>
      atualizar({ detalhe: { ...estado.detalhe, foto: reader.result as string } })
    reader.readAsDataURL(file)
  }

  // ── Validações ────────────────────────────────────────────────────────────
  function validarMedicoes() {
    const e: Record<string, string> = {}
    if (!estado.medicoes.purezaO2 || isNaN(Number(estado.medicoes.purezaO2)))
      e.purezaO2 = 'Informe o valor'
    if (!estado.medicoes.pressaoO2 || isNaN(Number(estado.medicoes.pressaoO2)))
      e.pressaoO2 = 'Informe o valor'
    if (!estado.medicoes.pressaoAr || isNaN(Number(estado.medicoes.pressaoAr)))
      e.pressaoAr = 'Informe o valor'
    return e
  }

  function validarAbastecimento() {
    const e: Record<string, string> = {}
    if (
      !estado.abastecimento.quantidade ||
      isNaN(Number(estado.abastecimento.quantidade)) ||
      Number(estado.abastecimento.quantidade) < 1
    )
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
  const totalLocais = BLOCOS.reduce((acc, b) => acc + b.locais.length, 0)
  const totalFeitos = estado.concluidos.length
  const progresso = Math.round((totalFeitos / totalLocais) * 100)

  const blocoAtual = BLOCOS.find((b) => b.nome === estado.blocoSelecionado)

  const blocosFiltrados = BLOCOS.filter((b) =>
    b.nome.toLowerCase().includes(searchBlocos.toLowerCase()),
  )

  const locaisFiltrados = blocoAtual
    ? blocoAtual.locais.filter((l) =>
        l.nome.toLowerCase().includes(searchLocais.toLowerCase()),
      )
    : []

  return {
    rondaIniciada,
    estado,
    searchBlocos,
    searchLocais,
    submitting,
    errors,
    showCheck,
    draftServidor,
    mostrarBanner,
    fileInputRef,
    totalLocais,
    totalFeitos,
    progresso,
    blocoAtual,
    blocosFiltrados,
    locaisFiltrados,
    setSearchBlocos,
    setSearchLocais,
    setErrors,
    atualizar,
    iniciar,
    retomar,
    descartarDraft,
    feitosNoBloco,
    localFeito,
    blocoCompleto,
    selecionarBloco,
    selecionarLocal,
    salvarLocal,
    finalizarRonda,
    abandonar,
    handleFoto,
    validarMedicoes,
    validarAbastecimento,
    validarDetalhe,
  }
}
