'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  DRAFT_DEBOUNCE_MS,
  estadoInicial,
  detalheVazio,
  type DraftEstado,
  type DetalheOcorrencia,
  type BemSelecionado,
  type OcorrenciaRondaState,
  type RegistroConcluido,
  type BlocoAPI,
  type AmbienteAPI,
} from '@/app/ocorrencias/types'
import * as rondasService from '@/services/rondas.service'

export type { OcorrenciaRondaState }

export function useOcorrenciaRonda(): OcorrenciaRondaState {
  const router = useRouter()
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
  const [loadingDraft, setLoadingDraft] = useState(true)
  const [blocos, setBlocos] = useState<BlocoAPI[]>([])
  const [loadingBlocos, setLoadingBlocos] = useState(true)

  // ── Carregar blocos dinâmicos da API ──────────────────────────────────────
  useEffect(() => {
    rondasService.buscarBlocos()
      .then((blocos) => setBlocos(blocos as BlocoAPI[]))
      .catch(() => {})
      .finally(() => setLoadingBlocos(false))
  }, [])

  // ── Carregar draft ────────────────────────────────────────────────────────
  useEffect(() => {
    rondasService.buscarDraft()
      .then((draft) => {
        const d = draft?.estado as DraftEstado | undefined
        if (d?.rondaId && d.etapa !== 'resumo_final') {
          setDraftServidor(d)
          setMostrarBanner(true)
        }
      })
      .catch(() => {})
      .finally(() => setLoadingDraft(false))
  }, [])

  // ── Salvar draft (debounced) ──────────────────────────────────────────────
  const salvarDraft = useCallback((est: DraftEstado) => {
    if (draftTimer.current) clearTimeout(draftTimer.current)
    draftTimer.current = setTimeout(() => {
      rondasService.salvarDraftAPI(est).catch(() => {})
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
    rondasService.descartarDraftAPI().catch(() => {})
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

  function blocoCompleto(bloco: BlocoAPI) {
    return bloco.ambientes.every((l) => localFeito(bloco.nome, l.nome))
  }

  // ── Selecionar bloco / local ──────────────────────────────────────────────
  function selecionarBloco(bloco: BlocoAPI) {
    atualizar({ blocoSelecionado: bloco.nome, etapa: 'locais' })
    setSearchLocais('')
  }

  function selecionarLocal(local: AmbienteAPI) {
    if (localFeito(estado.blocoSelecionado!, local.nome)) return
    const etapa = local.tipo === 'gases' ? 'gases_medicoes' : 'ocorrencia_pergunta'
    atualizar({
      localSelecionado: { nome: local.nome, tipo: local.tipo },
      etapa,
      detalhes: [detalheVazio()],
      medicoes: { purezaO2: '', pressaoO2: '', pressaoAr: '' },
      backupLigado: null,
      abastecimento: { quantidade: '', tamanho: null },
    })
  }

  function atualizarDetalhe(index: number, parcial: Partial<DetalheOcorrencia>) {
    setEstado((prev) => {
      const next = { ...prev, detalhes: prev.detalhes.map((d, i) => i === index ? { ...d, ...parcial } : d) }
      if (rondaIniciada) salvarDraft(next)
      return next
    })
    setErrors({})
  }

  function adicionarDetalhe() {
    setEstado((prev) => {
      const next = { ...prev, detalhes: [...prev.detalhes, detalheVazio()] }
      if (rondaIniciada) salvarDraft(next)
      return next
    })
  }

  function removerDetalhe(index: number) {
    setEstado((prev) => {
      if (prev.detalhes.length <= 1) return prev
      const next = { ...prev, detalhes: prev.detalhes.filter((_, i) => i !== index) }
      if (rondaIniciada) salvarDraft(next)
      return next
    })
  }

  async function salvarLocal(temOcorrencia: boolean) {
    return salvarLocalComDetalhes(temOcorrencia)
  }

  // ── Selecionar bem (patrimônio) ───────────────────────────────────────────
  function selecionarBem(bem: BemSelecionado) {
    const idx = estado.detalhes.findIndex((d) => d.tipo === 'patrimonio')
    const target = idx >= 0 ? idx : 0
    const bemValue = bem.id === 0 ? null : bem
    const novosDetalhes = estado.detalhes.map((d, i) =>
      i === target ? { ...d, bem: bemValue } : d,
    )
    salvarLocalComDetalhes(true, novosDetalhes)
  }

  // ── Salvar local na API ───────────────────────────────────────────────────
  async function salvarLocalComDetalhes(
    temOcorrencia: boolean,
    detalhesOverride?: typeof estado.detalhes,
  ) {
    const local = estado.localSelecionado!
    const blocoNome = estado.blocoSelecionado!
    const detalhes = detalhesOverride ?? estado.detalhes
    setSubmitting(true)
    try {
      let rondaId = estado.rondaId
      if (!rondaId) {
        const nova = await rondasService.criar()
        rondaId = nova.id
      }

      const isGases = local.tipo === 'gases'
      const temAbast =
        isGases && Boolean(estado.abastecimento.quantidade && estado.abastecimento.tamanho)

      const ocorrenciasValidas = detalhes.filter((d) => d.tipo !== null).map((d) => ({
        tipo: d.tipo!,
        descricao: d.descricao,
        foto: d.foto,
        trilogoChamado: d.trilogoChamado,
        ...(d.bem ? { bemPatrimony: d.bem.patrimony, bemDescricao: d.bem.descricao } : {}),
      }))

      const body = isGases
        ? {
            tipoRegistro: 'gases' as const,
            ambiente: local.nome,
            purezaO2: Number(estado.medicoes.purezaO2),
            pressaoO2: Number(estado.medicoes.pressaoO2),
            pressaoAr: Number(estado.medicoes.pressaoAr),
            backupLigado: estado.backupLigado ?? false,
            temAbastecimento: temAbast,
            qtdCilindros: temAbast ? Number(estado.abastecimento.quantidade) : null,
            tamCilindro: temAbast ? estado.abastecimento.tamanho : null,
            temOcorrencia,
            ...(ocorrenciasValidas.length ? { ocorrencias: ocorrenciasValidas } : {}),
          }
        : {
            tipoRegistro: 'ocorrencia' as const,
            ambiente: local.nome,
            temOcorrencia,
            ...(ocorrenciasValidas.length ? { ocorrencias: ocorrenciasValidas } : {}),
          }

      await rondasService.registrarAmbiente(rondaId, body)

      if (!temOcorrencia) {
        setShowCheck(true)
        setTimeout(() => setShowCheck(false), 900)
      }

      const blocoAtualObj = blocos.find((b) => b.nome === blocoNome)
      const novoRegistro: RegistroConcluido = {
        bloco: blocoNome,
        local: local.nome,
        tipo: local.tipo,
        temOcorrencia,
        tiposOcorrencia: ocorrenciasValidas.map((o) => o.tipo),
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
      const blocoAgora = blocoAtualObj
        ? blocoAtualObj.ambientes.every((l) =>
            novosConcluidos.some((c) => c.bloco === blocoNome && c.local === l.nome),
          )
        : false

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
    // Cancel any pending draft save so it doesn't re-create the draft after discard
    if (draftTimer.current) {
      clearTimeout(draftTimer.current)
      draftTimer.current = null
    }
    setSubmitting(true)
    try {
      if (estado.rondaId) {
        await rondasService.finalizar(estado.rondaId)
      }
      await rondasService.descartarDraftAPI().catch(() => {})
      // Fechar a sessão: mostrar resumo e limpar o draft ativo
      setRondaIniciada(false)
      setDraftServidor(null)
      setMostrarBanner(false)
      setEstado((prev) => ({ ...prev, etapa: 'resumo_final' }))
    } catch {
      toast.error('Erro ao finalizar ronda')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Abandonar ─────────────────────────────────────────────────────────────
  function abandonar() {
    salvarDraft(estado)
    toast('Ronda pausada. Você pode continuar depois.', { icon: '⏸️' })
    router.push('/')
  }

  // ── Foto ──────────────────────────────────────────────────────────────────
  function handleFoto(e: React.ChangeEvent<HTMLInputElement>, index = 0) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => atualizarDetalhe(index, { foto: reader.result as string })
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
    estado.detalhes.forEach((d, i) => {
      if (!d.tipo) e[`tipo_${i}`] = 'Selecione o tipo'
      if (!d.descricao.trim()) e[`descricao_${i}`] = 'Descreva o problema'
    })
    return e
  }

  // ── Dados derivados ───────────────────────────────────────────────────────
  const totalLocais = blocos.reduce((acc, b) => acc + b.ambientes.length, 0)
  const totalFeitos = estado.concluidos.length
  const progresso = totalLocais > 0 ? Math.round((totalFeitos / totalLocais) * 100) : 0

  const blocoAtual = blocos.find((b) => b.nome === estado.blocoSelecionado)

  const blocosFiltrados = blocos.filter((b) =>
    b.nome.toLowerCase().includes(searchBlocos.toLowerCase()),
  )

  const locaisFiltrados = blocoAtual
    ? blocoAtual.ambientes.filter((l) =>
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
    totalLocais,
    totalFeitos,
    progresso,
    blocos,
    loadingBlocos,
    loadingDraft,
    blocoAtual,
    blocosFiltrados,
    locaisFiltrados,
    setSearchBlocos,
    setSearchLocais,
    setErrors,
    atualizar,
    atualizarDetalhe,
    adicionarDetalhe,
    removerDetalhe,
    iniciar,
    retomar,
    descartarDraft,
    feitosNoBloco,
    localFeito,
    blocoCompleto,
    selecionarBloco,
    selecionarLocal,
    salvarLocal,
    selecionarBem,
    finalizarRonda,
    abandonar,
    handleFoto,
    validarMedicoes,
    validarAbastecimento,
    validarDetalhe,
  }
}
