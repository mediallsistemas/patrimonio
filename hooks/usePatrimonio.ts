'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, subMonths } from 'date-fns'
import * as adminPatrimonioService from '@/services/admin-patrimonio.service'

export interface Ticket {
  id: number
  description: string
  creationDate: string
  deadline: string
  assetId: number
  assetName: string
  assetTypeId: number
  assetTypeName: string
  patrimony: string
  companyName: string
  departmentName: string
  departmentFullAddress: string
  assigneeName: string
  priority: number
  currentStatus: { actionDescription: string }
  buildingServiceTypeDescription: string
}

export function usePatrimonio() {
  const hoje = new Date()
  const [start, setStart]       = useState(format(subMonths(hoje, 3), 'yyyy-MM-dd'))
  const [end, setEnd]           = useState(format(hoje, 'yyyy-MM-dd'))
  const [search, setSearch]     = useState('')
  const [statusFiltro, setStatusFiltro] = useState('')

  const { data = [], isLoading, isError, refetch } = useQuery<Ticket[]>({
    queryKey: ['trilogo-patrimonio', start, end],
    queryFn: () => adminPatrimonioService.listarChamados(start, end),
  })

  const filtrado = data.filter((t) => {
    const q = search.toLowerCase()
    const matchTexto =
      !q ||
      t.patrimony?.toLowerCase().includes(q) ||
      t.assetName?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      t.companyName?.toLowerCase().includes(q)
    const matchStatus =
      !statusFiltro ||
      (t.currentStatus?.actionDescription ?? '') === statusFiltro
    return matchTexto && matchStatus
  })

  const total    = data.length
  const abertos  = data.filter((t) => t.currentStatus?.actionDescription === 'Aberto').length
  const urgentes = data.filter((t) => t.priority >= 3).length
  const tipos    = [...new Set(data.map((t) => t.assetTypeName))].length

  const statusDisponiveis = [...new Set(
    data.map((t) => t.currentStatus?.actionDescription).filter(Boolean)
  )].sort() as string[]

  return {
    filtrado, isLoading, isError, refetch,
    start, setStart, end, setEnd,
    search, setSearch,
    statusFiltro, setStatusFiltro, statusDisponiveis,
    stats: { total, abertos, urgentes, tipos },
  }
}
