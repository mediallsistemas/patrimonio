'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as manutencoesService from '@/services/manutencoes.service'
import { buscarBlocos, type BlocoAPI } from '@/services/rondas.service'
import type { IniciarManutencaoInput, FinalizarManutencaoInput, TipoManutencao } from '@/services/manutencoes.service'

export type { TipoManutencao }

export interface BemBuscado {
  id: number
  patrimony: string
  description: string
  departmentFullAddress: string
  assetTypeName: string
}

// Hook único para o fluxo de manutenção do operador.
// Responsabilidades: carregar blocos do tenant (filtrando apenas ambientes
// de manutenção predial — não-gases), buscar bens por patrimony, iniciar
// e finalizar manutenções.
export function useManutencao() {
  const qc = useQueryClient()

  const { data: blocos = [], isLoading: blocosCarregando } = useQuery<BlocoAPI[]>({
    queryKey: ['me-blocos'],
    queryFn: buscarBlocos,
  })

  // Para Elétrica/Hidráulica, mostramos apenas ambientes do tipo "ocorrencia".
  // Ambientes "gases" pertencem ao fluxo de inspeção de gases medicinais.
  const blocosManutencao = blocos
    .map((b) => ({ ...b, ambientes: b.ambientes.filter((a) => a.tipo !== 'gases') }))
    .filter((b) => b.ambientes.length > 0)

  // Busca de bem por patrimony — query controlada (só dispara quando há código).
  const [patrimonyQuery, setPatrimonyQuery] = useState('')
  const {
    data: bensEncontrados = [],
    isFetching: buscandoBem,
  } = useQuery<BemBuscado[]>({
    queryKey: ['me-bens-buscar', patrimonyQuery],
    queryFn: () => manutencoesService.buscarBemPorPatrimonio(patrimonyQuery),
    enabled: patrimonyQuery.trim().length > 0,
  })

  const iniciar = useMutation({
    mutationFn: (input: IniciarManutencaoInput) => manutencoesService.iniciar(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me-manutencoes'] }),
  })

  const finalizar = useMutation({
    mutationFn: ({ id, input }: { id: string; input: FinalizarManutencaoInput }) =>
      manutencoesService.finalizar(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me-manutencoes'] }),
  })

  return {
    blocosManutencao,
    blocosCarregando,
    patrimonyQuery,
    setPatrimonyQuery,
    bensEncontrados,
    buscandoBem,
    iniciar,
    finalizar,
  }
}
