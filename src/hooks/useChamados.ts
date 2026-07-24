'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as chamadosService from '@/services/chamados.service'
import { buscarBlocos, type BlocoAPI } from '@/services/rondas.service'
import { listarUsuarios, type Usuario } from '@/services/admin-usuarios.service'
import type {
  ChamadoResumo,
  CriarChamadoInput,
  FinalizarChamadoInput,
  EditarFiscalInput,
  FiltrosChamados,
  PrioridadeChamado,
} from '@/services/chamados.service'

export type {
  ChamadoResumo,
  CriarChamadoInput,
  FinalizarChamadoInput,
  FiltrosChamados,
  PrioridadeChamado,
}

// Hook único do painel de chamados: lista com filtros + todas as mutations.
// `ehAdmin` habilita as queries exclusivas de admin (usuários p/ atribuir);
// `comBlocos` liga a query de blocos/ambientes (pesada) — só a tela de criação usa.
export function useChamados(opts: { ehAdmin?: boolean; comBlocos?: boolean } = {}) {
  const qc = useQueryClient()
  const [filtros, setFiltros] = useState<FiltrosChamados>({})

  const { data: chamados = [], isLoading: carregando } = useQuery<ChamadoResumo[]>({
    queryKey: ['chamados', filtros],
    queryFn: () => chamadosService.listar(filtros),
  })

  // Blocos/ambientes do tenant — mesma fonte da ronda (tela de seleção reusada)
  const { data: blocos = [], isLoading: blocosCarregando } = useQuery<BlocoAPI[]>({
    queryKey: ['me-blocos'],
    queryFn: buscarBlocos,
    enabled: opts.comBlocos === true,
  })

  // Ambientes de manutenção predial (não-gases), como no fluxo de manutenção
  const blocosChamado = blocos
    .map((b) => ({ ...b, ambientes: b.ambientes.filter((a) => a.tipo !== 'gases') }))
    .filter((b) => b.ambientes.length > 0)

  // Usuários do tenant para o dropdown de atribuição — só admin
  const { data: usuarios = [] } = useQuery<Usuario[]>({
    queryKey: ['chamados-usuarios-atribuiveis'],
    queryFn: listarUsuarios,
    enabled: opts.ehAdmin === true,
  })

  const invalidar = () => qc.invalidateQueries({ queryKey: ['chamados'] })

  const criar = useMutation({
    mutationFn: (input: CriarChamadoInput) => chamadosService.criar(input),
    onSuccess: invalidar,
  })

  const assumir = useMutation({
    mutationFn: ({ id, prioridade }: { id: string; prioridade?: PrioridadeChamado }) =>
      chamadosService.assumir(id, prioridade),
    onSuccess: invalidar,
  })

  const atribuir = useMutation({
    mutationFn: ({
      id,
      responsavelId,
      prioridade,
    }: {
      id: string
      responsavelId: string
      prioridade?: PrioridadeChamado
    }) => chamadosService.atribuir(id, responsavelId, prioridade),
    onSuccess: invalidar,
  })

  const finalizar = useMutation({
    mutationFn: ({ id, input }: { id: string; input: FinalizarChamadoInput }) =>
      chamadosService.finalizar(id, input),
    onSuccess: invalidar,
  })

  const cancelar = useMutation({
    mutationFn: (id: string) => chamadosService.cancelar(id),
    onSuccess: invalidar,
  })

  const editarFiscal = useMutation({
    mutationFn: ({ id, input }: { id: string; input: EditarFiscalInput }) =>
      chamadosService.editarFiscal(id, input),
    onSuccess: invalidar,
  })

  return {
    chamados,
    carregando,
    filtros,
    setFiltros,
    blocosChamado,
    blocosCarregando,
    usuarios,
    criar,
    assumir,
    atribuir,
    finalizar,
    cancelar,
    editarFiscal,
  }
}

// Fotos do chamado sob demanda (padrão FotoLazy)
export function useFotosChamado(id: string | null) {
  return useQuery({
    queryKey: ['chamado-fotos', id],
    queryFn: () => chamadosService.buscarFotos(id!),
    enabled: id !== null,
  })
}

// Dashboard gerencial — usado apenas nas telas de admin
export function useDashboardChamados(periodo?: { de?: string; ate?: string }) {
  return useQuery({
    queryKey: ['chamados-dashboard', periodo],
    queryFn: () => chamadosService.dashboard(periodo),
  })
}
