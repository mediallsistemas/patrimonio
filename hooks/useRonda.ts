'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import toast from 'react-hot-toast'
import type { AmbienteTenant, DraftEstado, EtapaAmbiente, RegistroFeito, TamanhoCilindro } from '@/app/[tenantSlug]/ronda/ronda.types'
import { estadoInicial } from '@/app/[tenantSlug]/ronda/ronda.types'

const DRAFT_SAVE_DEBOUNCE_MS = 1500

export function useRonda() {
  const router = useRouter()
  const { tenantSlug } = useParams<{ tenantSlug: string }>()

  const [ambientes, setAmbientes] = useState<AmbienteTenant[]>([])
  const [loadingAmbientes, setLoadingAmbientes] = useState(true)
  const [search, setSearch] = useState('')
  const [estado, setEstado] = useState<DraftEstado>(estadoInicial)
  const [iniciada, setIniciada] = useState(false)
  const [draftServidor, setDraftServidor] = useState<DraftEstado | null>(null)
  const [mostrandoBannerDraft, setMostrandoBannerDraft] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const fileInputRef = useRef<HTMLInputElement>(null)
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
        if (draft?.estado?.rondaId) {
          setDraftServidor(draft.estado as DraftEstado)
          setMostrandoBannerDraft(true)
        }
      }
    }
    init()
  }, [tenantSlug])

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

  function atualizar(parcial: Partial<DraftEstado>) {
    setEstado((prev) => {
      const next = { ...prev, ...parcial }
      if (iniciada) salvarDraft(next)
      return next
    })
    setErrors({})
  }

  function retomar() {
    if (!draftServidor) return
    setEstado(draftServidor)
    setIniciada(true)
    setMostrandoBannerDraft(false)
    setDraftServidor(null)
  }

  function descartar() {
    fetch('/api/rondas/draft', { method: 'DELETE' }).catch(() => {/**/})
    setMostrandoBannerDraft(false)
    setDraftServidor(null)
  }

  function iniciar() {
    const novo = estadoInicial()
    setEstado(novo)
    setIniciada(true)
    setMostrandoBannerDraft(false)
    salvarDraft(novo)
  }

  function selecionarAmbiente(amb: AmbienteTenant) {
    if (jaRegistrado(amb.id)) return
    const proxEtapa: EtapaAmbiente = amb.tipo === 'gases' ? 'gases_medicoes' : 'ocorrencia_pergunta'
    atualizar({
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

  async function salvarAmbiente(temOcorrencia: boolean, trilogoChamado?: boolean) {
    if (!estado.ambienteSelecionado) return
    const amb = estado.ambienteSelecionado

    setSubmitting(true)
    try {
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
              ? { ocorrencia: { tipo: estado.ocorrencia.tipo, descricao: estado.ocorrencia.descricao, foto: estado.ocorrencia.foto ?? null, trilogoChamado: trilogoChamado ?? false } }
              : {}),
          }
        : {
            tipoRegistro: 'ocorrencia' as const,
            ambiente: amb.nome,
            temOcorrencia,
            ...(temOcorrencia && estado.ocorrencia.tipo
              ? { ocorrencia: { tipo: estado.ocorrencia.tipo, descricao: estado.ocorrencia.descricao, foto: estado.ocorrencia.foto ?? null, trilogoChamado: trilogoChamado ?? false } }
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
        ...(isGases ? { purezaO2: Number(estado.medicoes.purezaO2), pressaoO2: Number(estado.medicoes.pressaoO2), pressaoAr: Number(estado.medicoes.pressaoAr), backupLigado: estado.backupLigado ?? false, temAbastecimento: temAbast, qtdCilindros: temAbast ? Number(estado.abastecimento.quantidade) : null, tamCilindro: temAbast ? estado.abastecimento.tamanho : null } : {}),
        ...(temOcorrencia && estado.ocorrencia.tipo ? { ocorrencia: { tipo: estado.ocorrencia.tipo, descricao: estado.ocorrencia.descricao, foto: estado.ocorrencia.foto ?? null, trilogoChamado: trilogoChamado ?? null } } : {}),
      }

      const novosRegistros = [...estado.registros, novoRegistro]
      const novoEstado: DraftEstado = { ...estado, rondaId, registros: novosRegistros, etapa: 'selecao', ambienteSelecionado: null }
      setEstado(novoEstado)
      salvarDraft(novoEstado)
      toast.success(`${amb.nome} registrado!`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSubmitting(false)
    }
  }

  async function finalizar() {
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

  function abandonar() {
    salvarDraft(estado)
    toast('Ronda pausada. Você pode continuar depois.', { icon: '⏸️' })
    router.push(`/${tenantSlug}/hotelaria`)
  }

  function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => atualizar({ ocorrencia: { ...estado.ocorrencia, foto: reader.result as string } })
    reader.readAsDataURL(file)
  }

  const ambientesFiltrados = ambientes.filter((a) =>
    a.nome.toLowerCase().includes(search.toLowerCase()),
  )
  const totalAmbientes = ambientes.length
  const totalFeitos = estado.registros.length
  const progresso = totalAmbientes > 0 ? Math.round((totalFeitos / totalAmbientes) * 100) : 0
  const tudoFeito = totalFeitos > 0 && totalFeitos >= totalAmbientes

  return {
    tenantSlug,
    ambientes,
    ambientesFiltrados,
    loadingAmbientes,
    search,
    setSearch,
    estado,
    iniciada,
    draftServidor,
    mostrandoBannerDraft,
    submitting,
    errors,
    setErrors,
    fileInputRef,
    totalAmbientes,
    totalFeitos,
    progresso,
    tudoFeito,
    // actions
    atualizar,
    retomar,
    descartar,
    iniciar,
    selecionarAmbiente,
    jaRegistrado,
    validarMedicoes,
    validarAbastecimento,
    validarDetalheOcorrencia,
    salvarAmbiente,
    finalizar,
    abandonar,
    handleFoto,
  }
}

export type UseRondaReturn = ReturnType<typeof useRonda>
