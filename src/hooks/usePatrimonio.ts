'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as chamadosService from '@/services/chamados.service'
import type { ChamadoResumo } from '@/services/chamados.service'
import { STATUS_CHAMADO_LABEL, type StatusChamado } from '@/modules/chamados/chamados.types'

// Fonte das telas de patrimônio.
//
// Antes isto batia na API do Trílogo a cada abertura de tela. Agora lê chamados
// com bem vinculado, que é onde os tickets do Trílogo passam a viver depois da
// sincronização — e onde já viviam os chamados abertos aqui informando o
// patrimônio. É a unificação: as duas origens na mesma lista.
//
// O recorte por data saiu junto com a leitura ao vivo: a lista já vem ordenada
// pela fila (vivos primeiro, terminais no fim) e limitada no servidor.

export type ItemPatrimonio = ChamadoResumo

export function usePatrimonio() {
  const [search, setSearch] = useState('')
  const [statusFiltro, setStatusFiltro] = useState<StatusChamado | ''>('')

  const { data = [], isLoading, isError, refetch } = useQuery<ChamadoResumo[]>({
    queryKey: ['chamados-patrimonio'],
    queryFn: () => chamadosService.listar({ comBem: true }),
  })

  const filtrado = useMemo(() => {
    const q = search.trim().toLowerCase()
    return data.filter((c) => {
      const matchTexto =
        !q ||
        c.patrimony?.toLowerCase().includes(q) ||
        c.descricaoBemSnapshot?.toLowerCase().includes(q) ||
        c.titulo?.toLowerCase().includes(q) ||
        c.descricao?.toLowerCase().includes(q) ||
        c.tenant?.nome?.toLowerCase().includes(q)
      const matchStatus = !statusFiltro || c.status === statusFiltro
      return matchTexto && matchStatus
    })
  }, [data, search, statusFiltro])

  const stats = useMemo(() => ({
    total: data.length,
    abertos: data.filter((c) => c.status === 'aberto').length,
    emExecucao: data.filter((c) => c.status === 'em_execucao').length,
    // Substitui o contador antigo de "urgentes", que somava priority >= 3 do
    // Trílogo. Na prática ele mostrava sempre zero: todos os 868 tickets da API
    // vêm com priority 2. Atrasado é derivado do prazo e diz algo de verdade.
    atrasados: data.filter((c) => c.atrasado).length,
  }), [data])

  // Só os status presentes na lista — nada de oferecer filtro que não filtra.
  const statusDisponiveis = useMemo(() => {
    const presentes = [...new Set(data.map((c) => c.status))] as StatusChamado[]
    return presentes
      .sort()
      .map((s) => ({ valor: s, rotulo: STATUS_CHAMADO_LABEL[s] ?? s }))
  }, [data])

  return {
    filtrado, isLoading, isError, refetch,
    search, setSearch,
    statusFiltro, setStatusFiltro, statusDisponiveis,
    stats,
  }
}
