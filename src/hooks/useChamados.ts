'use client'

import { useCallback, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

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

// Referência estável — para operadores a query fica `enabled: false` e o data
// nunca resolve; um `[]` literal no default do destructuring criaria uma
// referência NOVA a cada render, quebrando o useMemo/memo() a jusante.
const USUARIOS_VAZIO: Usuario[] = []

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
  const { data: usuarios = USUARIOS_VAZIO } = useQuery<Usuario[]>({
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

  // Sem busy/toast próprios: cancelar é sempre confirmado via
  // ModalCancelarChamado (mesmo padrão de finalizar) — a exclusividade do
  // modal já impede cliques concorrentes, dispensando o Set de busyIds.
  const cancelar = useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo?: string }) => chamadosService.cancelar(id, motivo),
    onSuccess: invalidar,
  })

  const editarFiscal = useMutation({
    mutationFn: ({ id, input }: { id: string; input: EditarFiscalInput }) =>
      chamadosService.editarFiscal(id, input),
    onSuccess: invalidar,
  })

  // Busy por card: Set explícito de IDs em voo — nunca derivar de
  // mutation.isPending/variables (compartilhada entre todos os cards da
  // lista; uma segunda chamada concorrente sobrescreveria de qual card
  // era "o" pendente e derrubaria os callbacks da primeira).
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set())
  const marcarBusy = useCallback((id: string) => {
    setBusyIds((s) => new Set(s).add(id))
  }, [])
  const desmarcarBusy = useCallback((id: string) => {
    setBusyIds((s) => {
      const n = new Set(s)
      n.delete(id)
      return n
    })
  }, [])

  // mutateAsync (não mutate+callbacks): cada clique fica preso à própria
  // promise, imune a um segundo clique concorrente na mesma mutation
  // compartilhada sobrescrever o observer e derrubar o toast do primeiro.
  const handleAssumir = useCallback(
    (id: string, prioridade?: PrioridadeChamado) => {
      marcarBusy(id)
      assumir
        .mutateAsync({ id, prioridade })
        .then(() => toast.success('Chamado assumido — você é o responsável'))
        .catch(() => toast.error('Não foi possível assumir. Alguém pode ter assumido antes.'))
        .finally(() => desmarcarBusy(id))
    },
    [assumir.mutateAsync, marcarBusy, desmarcarBusy],
  )

  const handleAtribuir = useCallback(
    (id: string, responsavelId: string) => {
      marcarBusy(id)
      atribuir
        .mutateAsync({ id, responsavelId })
        .then(() => toast.success('Chamado atribuído'))
        .catch(() => toast.error('Não foi possível atribuir o chamado'))
        .finally(() => desmarcarBusy(id))
    },
    [atribuir.mutateAsync, marcarBusy, desmarcarBusy],
  )

  const handleSalvarFiscal = useCallback(
    (
      id: string,
      input: { fornecedor: string | null; numeroOrdemCompra: string | null; valorGastoCentavos: number | null },
    ) => {
      marcarBusy(id)
      editarFiscal
        .mutateAsync({ id, input })
        .then(() => toast.success('Dados fiscais salvos'))
        .catch(() => toast.error('Não foi possível salvar os dados fiscais'))
        .finally(() => desmarcarBusy(id))
    },
    [editarFiscal.mutateAsync, marcarBusy, desmarcarBusy],
  )

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
    busyIds,
    handleAssumir,
    handleAtribuir,
    handleSalvarFiscal,
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
