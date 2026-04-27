import { api } from '@/services/api'

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

export async function listarChamados(startDate: string, endDate: string): Promise<Ticket[]> {
  const json = await api.get<{ data: Ticket[] } | Ticket[]>(
    `trilogo?startDate=${startDate}&endDate=${endDate}`
  )
  if (Array.isArray(json)) return json
  return (json as { data?: Ticket[] }).data ?? []
}
