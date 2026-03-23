'use client'

import { useState, useRef, useEffect } from 'react'
import toast from 'react-hot-toast'
import {
  useRondaDraft,
  carregarDraft,
  descartarDraft,
  type RondaDraftEstado,
} from '@/lib/hooks/useRondaDraft'
import {
  BLOCOS_AMBIENTES,
  TIPOS_OCORRENCIA,
  type Etapa,
  type DetalheOcorrencia,
  type AmbienteConcluido,
  type TipoOcorrencia,
} from '@/app/[tenantSlug]/manutencao/ocorrencias/types'

export interface OcorrenciaRondaTenantState {
  // Estado
  rondaId: string | null
  blocoIdx: number
  ambienteIdx: number
  concluidos: AmbienteConcluido[]
  etapa: Etapa
  detalhe: DetalheOcorrencia
  submitting: boolean
  errors: Record<string, string>
  showOverlay: boolean
  draft: RondaDraftEstado | null
  draftCarregado: boolean

  // Refs
  fileInputRef: React.RefObject<HTMLInputElement | null>

  // Dados derivados
  blocoAtual: (typeof BLOCOS_AMBIENTES)[0]
  ambienteAtual: string
  isUltimoAmbiente: boolean
  isUltimoBloco: boolean
  totalBlocos: number
  blocosFeitos: number
  progressoPct: number
  concluidosBloco: AmbienteConcluido[]

  // Setters
  setDetalhe: React.Dispatch<React.SetStateAction<DetalheOcorrencia>>
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>
  setEtapa: React.Dispatch<React.SetStateAction<Etapa>>
  setBlocoIdx: React.Dispatch<React.SetStateAction<number>>

  // Handlers
  handleIniciar: () => Promise<void>
  handleSemOcorrencia: () => Promise<void>
  handleFoto: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleDetalheNext: () => void
  handleTrilogo: (trilogoChamado: boolean) => Promise<void>
  handleProximoBloco: () => void
  handleVoltarBloco: () => void
  handleContinuarDraft: () => void
  handleCancelarDraft: () => Promise<void>
}

export function useOcorrenciaRondaTenant(): OcorrenciaRondaTenantState {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [rondaId, setRondaId]         = useState<string | null>(null)
  const [blocoIdx, setBlocoIdx]       = useState(0)
  const [ambienteIdx, setAmbienteIdx] = useState(0)
  const [concluidos, setConcluidos]   = useState<AmbienteConcluido[]>([])
  const [etapa, setEtapa]             = useState<Etapa>('inicio')
  const [detalhe, setDetalhe]         = useState<DetalheOcorrencia>({
    tipo: null, descricao: '', foto: null, trilogoChamado: null,
  })
  const [submitting, setSubmitting]   = useState(false)
  const [errors, setErrors]           = useState<Record<string, string>>({})
  const [showOverlay, setShowOverlay] = useState(false)
  const [draft, setDraft]             = useState<RondaDraftEstado | null>(null)
  const [draftCarregado, setDraftCarregado] = useState(false)

  // ── Draft persistence ──────────────────────────────────────────────────────
  useEffect(() => {
    carregarDraft().then((d) => {
      setDraft(d)
      setDraftCarregado(true)
    })
  }, [])

  const draftEstado: RondaDraftEstado | null =
    etapa !== 'inicio' && etapa !== 'resumo_final' && rondaId
      ? {
          rondaId,
          blocoIdx,
          ambienteIdx,
          concluidos,
          salvoEm: new Date().toISOString(),
        }
      : null

  useRondaDraft(draftEstado, etapa !== 'inicio' && etapa !== 'resumo_final')

  function handleContinuarDraft() {
    if (!draft) return
    setRondaId(draft.rondaId)
    setBlocoIdx(draft.blocoIdx)
    setAmbienteIdx(draft.ambienteIdx)
    setConcluidos(draft.concluidos as AmbienteConcluido[])
    setDraft(null)
    setEtapa('ocorrencia_pergunta')
  }

  async function handleCancelarDraft() {
    await descartarDraft()
    setDraft(null)
  }

  // ── Dados derivados ────────────────────────────────────────────────────────
  const blocoAtual        = BLOCOS_AMBIENTES[blocoIdx]
  const ambienteAtual     = blocoAtual.ambientes[ambienteIdx]
  const isUltimoAmbiente  = ambienteIdx === blocoAtual.ambientes.length - 1
  const isUltimoBloco     = blocoIdx === BLOCOS_AMBIENTES.length - 1
  const totalBlocos       = BLOCOS_AMBIENTES.length
  const blocosFeitos      = etapa === 'bloco_resumo' || etapa === 'resumo_final' ? blocoIdx + 1 : blocoIdx
  const progressoPct      = Math.round((blocosFeitos / totalBlocos) * 100)
  const concluidosBloco   = concluidos.filter((c) => c.blocoIdx === blocoIdx)

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

  // ── Sem ocorrência ─────────────────────────────────────────────────────────
  async function handleSemOcorrencia() {
    setShowOverlay(true)
    await new Promise((r) => setTimeout(r, 700))
    setShowOverlay(false)
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

  // ── Detalhe: validar e avançar ─────────────────────────────────────────────
  function handleDetalheNext() {
    const e: Record<string, string> = {}
    if (!detalhe.tipo) e.tipo = 'Selecione o tipo'
    if (!detalhe.descricao.trim()) e.descricao = 'Descreva o problema'
    if (Object.keys(e).length > 0) { setErrors(e); return }
    setErrors({})
    setEtapa('trilogo')
  }

  // ── Trilogo ────────────────────────────────────────────────────────────────
  async function handleTrilogo(trilogoChamado: boolean) {
    const det = { ...detalhe, trilogoChamado }
    setDetalhe(det)
    setShowOverlay(true)
    await new Promise((r) => setTimeout(r, 700))
    setShowOverlay(false)
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

  // ── Salvar ambiente na API ─────────────────────────────────────────────────
  async function salvarAmbiente(temOcorrencia: boolean, det?: DetalheOcorrencia) {
    const res = await fetch(`/api/rondas/${rondaId}/ambientes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ambiente: ambienteAtual,
        temOcorrencia,
        ocorrencia:
          temOcorrencia && det
            ? {
                tipo: det.tipo,
                descricao: det.descricao,
                foto: det.foto,
                trilogoChamado: det.trilogoChamado,
              }
            : undefined,
      }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error ?? `Erro ${res.status}`)
    }
  }

  // ── Avançar ambiente ───────────────────────────────────────────────────────
  function avancarAmbiente(temOcorrencia: boolean, tipo?: TipoOcorrencia) {
    setConcluidos((prev) => [
      ...prev,
      { blocoIdx, ambiente: ambienteAtual, temOcorrencia, tipo },
    ])
    resetDetalhe()

    if (!isUltimoAmbiente) {
      setAmbienteIdx((i) => i + 1)
      setEtapa('ocorrencia_pergunta')
    } else {
      setEtapa('bloco_resumo')
    }
  }

  function resetDetalhe() {
    setDetalhe({ tipo: null, descricao: '', foto: null, trilogoChamado: null })
    setErrors({})
  }

  // ── Próximo / voltar bloco ─────────────────────────────────────────────────
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

  function handleVoltarBloco() {
    if (blocoIdx === 0) return
    const blocoAnterior = blocoIdx - 1
    setConcluidos((prev) => prev.filter((c) => c.blocoIdx < blocoAnterior))
    setBlocoIdx(blocoAnterior)
    setAmbienteIdx(BLOCOS_AMBIENTES[blocoAnterior].ambientes.length - 1)
    resetDetalhe()
    setEtapa('bloco_resumo')
  }

  async function finalizarRonda() {
    try { await fetch(`/api/rondas/${rondaId}`, { method: 'PATCH' }) } catch { /* não crítico */ }
    await descartarDraft()
    setEtapa('resumo_final')
  }

  return {
    rondaId,
    blocoIdx,
    ambienteIdx,
    concluidos,
    etapa,
    detalhe,
    submitting,
    errors,
    showOverlay,
    draft,
    draftCarregado,
    fileInputRef,
    blocoAtual,
    ambienteAtual,
    isUltimoAmbiente,
    isUltimoBloco,
    totalBlocos,
    blocosFeitos,
    progressoPct,
    concluidosBloco,
    setDetalhe,
    setErrors,
    setEtapa,
    setBlocoIdx,
    handleIniciar,
    handleSemOcorrencia,
    handleFoto,
    handleDetalheNext,
    handleTrilogo,
    handleProximoBloco,
    handleVoltarBloco,
    handleContinuarDraft,
    handleCancelarDraft,
  }
}
