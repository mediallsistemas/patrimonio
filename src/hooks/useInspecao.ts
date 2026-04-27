'use client'

import { useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { toUserMessage } from '@/lib/error-message'
import * as rodadasService from '@/services/rodadas.service'
import type { Etapa, Medicoes, DadosAbastecimento, DetalheAlteracao, ResumoInspecao, TipoAlteracao } from '@/app/[tenantSlug]/inspecao/inspecao.types'
import { ETAPA_NUM, TOTAL_ETAPAS } from '@/app/[tenantSlug]/inspecao/inspecao.types'

export function useInspecao() {
  const router = useRouter()
  const { tenantSlug } = useParams<{ tenantSlug: string }>()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const ambiente = tenantSlug.toUpperCase()

  const [rodadaId, setRodadaId] = useState<string | null>(null)
  const [etapa, setEtapa] = useState<Etapa>('inicio')
  const [medicoes, setMedicoes] = useState<Medicoes>({ purezaO2: '', pressaoO2: '', pressaoAr: '' })
  const [backupLigado, setBackupLigado] = useState<boolean | null>(null)
  const [abastecimento, setAbastecimento] = useState<DadosAbastecimento>({ quantidade: '', tamanho: null })
  const [detalhe, setDetalhe] = useState<DetalheAlteracao>({ tipo: null, descricao: '', foto: null, trilogoChamado: null })
  const [resumo, setResumo] = useState<ResumoInspecao | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const progressoTotal = (ETAPA_NUM[etapa] / TOTAL_ETAPAS) * 100

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

  function handleBackup(ligado: boolean) {
    setBackupLigado(ligado)
    setEtapa('abastecimento_pergunta')
  }

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

  async function salvarAmbiente(temAlteracao: boolean, det?: DetalheAlteracao) {
    let id = rodadaId
    if (!id) {
      const criada = await rodadasService.criar()
      id = criada.id
      setRodadaId(id)
    }
    const temAbast = Boolean(abastecimento.quantidade && abastecimento.tamanho)
    await rodadasService.registrarAmbiente(id, {
      ambiente,
      purezaO2: Number(medicoes.purezaO2),
      pressaoO2: Number(medicoes.pressaoO2),
      pressaoAr: Number(medicoes.pressaoAr),
      backupLigado,
      temAbastecimento: temAbast,
      abastecimento: temAbast ? { quantidade: Number(abastecimento.quantidade), tamanho: abastecimento.tamanho } : undefined,
      temAlteracao,
      alteracao: temAlteracao && det ? { tipo: det.tipo, descricao: det.descricao, foto: det.foto, trilogoChamado: det.trilogoChamado } : undefined,
    })
  }

  async function finalizarRodada(temAlteracao: boolean, tipo?: TipoAlteracao) {
    try {
      if (rodadaId) await rodadasService.finalizar(rodadaId)
    } catch { /* não crítico */ }
    const temAbast = Boolean(abastecimento.quantidade && abastecimento.tamanho)
    setResumo({
      temAbastecimento: temAbast,
      qtdCilindros: temAbast ? Number(abastecimento.quantidade) : undefined,
      tamCilindros: temAbast ? abastecimento.tamanho ?? undefined : undefined,
      temAlteracao,
      tipo,
    })
    setEtapa('resumo')
  }

  async function handleSemAlteracao() {
    setSubmitting(true)
    try {
      await salvarAmbiente(false)
      await finalizarRodada(false)
    } catch (err) {
      toast.error(toUserMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleTrilogo(trilogoChamado: boolean) {
    const det = { ...detalhe, trilogoChamado }
    setDetalhe(det)
    setSubmitting(true)
    try {
      await salvarAmbiente(true, det)
      await finalizarRodada(true, det.tipo ?? undefined)
    } catch (err) {
      toast.error(toUserMessage(err))
    } finally {
      setSubmitting(false)
    }
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

  return {
    tenantSlug,
    ambiente,
    etapa,
    setEtapa,
    medicoes,
    setMedicoes,
    backupLigado,
    abastecimento,
    setAbastecimento,
    detalhe,
    setDetalhe,
    resumo,
    submitting,
    errors,
    setErrors,
    progressoTotal,
    fileInputRef,
    handleMedicoesNext,
    handleBackup,
    handleAbastecimentoNext,
    handleSemAlteracao,
    handleFoto,
    handleDetalheNext,
    handleTrilogo,
    resetForm,
    router,
  }
}
