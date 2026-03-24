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
  type Etapa,
  type DetalheOcorrencia,
  type AmbienteConcluido,
  type TipoOcorrencia,
  type OcorrenciaItem,
  type TrilogoAsset,
} from '@/app/[tenantSlug]/manutencao/ocorrencias/types'

export interface OcorrenciaRondaTenantState {
  // Estado
  rondaId: string | null
  blocoIdx: number
  ambienteIdx: number
  concluidos: AmbienteConcluido[]
  etapa: Etapa
  detalhe: DetalheOcorrencia
  ocorrenciasStaged: OcorrenciaItem[]
  submitting: boolean
  errors: Record<string, string>
  showOverlay: boolean
  draft: RondaDraftEstado | null
  draftCarregado: boolean

  // Patrimônio / Trílogo
  companyId: number | null
  loadingAssets: boolean
  bensDoAmbiente: TrilogoAsset[]

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
  handleIniciar: (blocoInicio?: number, selectedCompanyId?: number) => Promise<void>
  handleSemOcorrencia: () => Promise<void>
  handleFoto: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleDetalheNext: () => void
  handleAdicionarOutro: () => void
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
  const [ocorrenciasStaged, setOcorrenciasStaged] = useState<OcorrenciaItem[]>([])
  const [submitting, setSubmitting]   = useState(false)
  const [errors, setErrors]           = useState<Record<string, string>>({})
  const [showOverlay, setShowOverlay] = useState(false)
  const [draft, setDraft]             = useState<RondaDraftEstado | null>(null)
  const [draftCarregado, setDraftCarregado] = useState(false)

  // ── Patrimônio / Trílogo assets ────────────────────────────────────────────
  const [companyId, setCompanyId]     = useState<number | null>(null)
  const [allAssets, setAllAssets]     = useState<TrilogoAsset[]>([])
  const [loadingAssets, setLoadingAssets] = useState(false)

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

  // ── Ambiente atual → bens do Trílogo filtrados ────────────────────────────
  // Strip leading "NNN - " from ronda ambiente name for fuzzy match
  function normalizar(s: string) {
    return s.replace(/^\d+[\s.-]+/, '').toLowerCase().trim()
  }

  const bensDoAmbiente: TrilogoAsset[] = companyId
    ? allAssets.filter((a) => {
        const parts = a.departmentFullAddress.split('>').map((p) => p.trim())
        const trilogoAmbiente = parts[parts.length - 1] ?? ''
        const rondaNorm = normalizar(ambienteAtual)
        const trilogoNorm = trilogoAmbiente.toLowerCase().trim()
        return trilogoNorm.includes(rondaNorm) || rondaNorm.includes(trilogoNorm)
      })
    : []

  // ── Iniciar ronda ──────────────────────────────────────────────────────────
  async function handleIniciar(blocoInicio: number = 0, selectedCompanyId?: number) {
    setSubmitting(true)
    try {
      const res = await fetch('/api/rondas', { method: 'POST' })
      if (!res.ok) throw new Error('Falha ao iniciar ronda')
      const { data: ronda } = await res.json()
      setRondaId(ronda.id)
      setBlocoIdx(blocoInicio)
      setAmbienteIdx(0)

      // Pre-load assets for patrimônio selection (non-blocking)
      if (selectedCompanyId) {
        setCompanyId(selectedCompanyId)
        setLoadingAssets(true)
        fetch(`/api/trilogo/assets?companyId=${selectedCompanyId}`)
          .then((r) => r.json())
          .then((j: { data?: TrilogoAsset[] } | TrilogoAsset[]) => {
            const list = Array.isArray(j) ? j : (j.data ?? [])
            setAllAssets(list)
          })
          .catch(() => { /* assets são opcionais, não bloqueia a ronda */ })
          .finally(() => setLoadingAssets(false))
      }

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
      avancarAmbiente(false, undefined)
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

  // ── Detalhe: validar ──────────────────────────────────────────────────────
  function validarDetalhe(): boolean {
    const e: Record<string, string> = {}
    if (!detalhe.tipo) e.tipo = 'Selecione o tipo'
    if (!detalhe.descricao.trim()) e.descricao = 'Descreva o problema'
    if (!detalhe.foto) e.foto = 'A foto é obrigatória'
    if (Object.keys(e).length > 0) { setErrors(e); return false }
    setErrors({})
    return true
  }

  function handleDetalheNext() {
    if (!validarDetalhe()) return
    setEtapa('trilogo')
  }

  // ── Adicionar outro problema no mesmo ambiente ─────────────────────────────
  function handleAdicionarOutro() {
    if (!validarDetalhe()) return
    setOcorrenciasStaged((prev) => [
      ...prev,
      {
        tipo: detalhe.tipo!,
        descricao: detalhe.descricao,
        foto: detalhe.foto,
        bemPatrimony: detalhe.bemSelecionado?.patrimony ?? null,
        bemDescricao: detalhe.bemSelecionado?.description ?? null,
      },
    ])
    setDetalhe({ tipo: null, descricao: '', foto: null, trilogoChamado: null, bemSelecionado: null })
    setErrors({})
  }

  // ── Trilogo ────────────────────────────────────────────────────────────────
  async function handleTrilogo(trilogoChamado: boolean) {
    const allItems: OcorrenciaItem[] = [
      ...ocorrenciasStaged,
      {
        tipo: detalhe.tipo!,
        descricao: detalhe.descricao,
        foto: detalhe.foto,
        bemPatrimony: detalhe.bemSelecionado?.patrimony ?? null,
        bemDescricao: detalhe.bemSelecionado?.description ?? null,
      },
    ]
    setShowOverlay(true)
    await new Promise((r) => setTimeout(r, 700))
    setShowOverlay(false)
    setSubmitting(true)
    try {
      // Save each problem as a separate RegistroAmbiente row
      for (const item of allItems) {
        await salvarAmbienteComOcorrencia(item, trilogoChamado)
      }
      avancarAmbiente(true, allItems[0].tipo)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Salvar ambiente na API ─────────────────────────────────────────────────
  async function salvarAmbiente(temOcorrencia: boolean) {
    const res = await fetch(`/api/rondas/${rondaId}/ambientes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipoRegistro: 'ocorrencia', ambiente: ambienteAtual, temOcorrencia }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error ?? `Erro ${res.status}`)
    }
  }

  async function salvarAmbienteComOcorrencia(item: OcorrenciaItem, trilogoChamado: boolean) {
    const res = await fetch(`/api/rondas/${rondaId}/ambientes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipoRegistro: 'ocorrencia',
        ambiente: ambienteAtual,
        temOcorrencia: true,
        ocorrencia: {
          tipo: item.tipo,
          descricao: item.descricao,
          foto: item.foto,
          trilogoChamado,
        },
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
    setDetalhe({ tipo: null, descricao: '', foto: null, trilogoChamado: null, bemSelecionado: null })
    setOcorrenciasStaged([])
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
    ocorrenciasStaged,
    submitting,
    errors,
    showOverlay,
    draft,
    draftCarregado,
    companyId,
    loadingAssets,
    bensDoAmbiente,
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
    handleAdicionarOutro,
    handleTrilogo,
    handleProximoBloco,
    handleVoltarBloco,
    handleContinuarDraft,
    handleCancelarDraft,
  }
}
