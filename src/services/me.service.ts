import { api } from '@/services/api'

export interface MyTenant {
  trilogoCompanyId: number | null
  trilogoProjectName: string | null
  nome: string
}

export async function buscarMeuTenant(): Promise<MyTenant> {
  const json = await api.get<{ data: MyTenant }>('me/tenant')
  return json.data
}

export async function buscarMeusTenants(): Promise<MyTenant[]> {
  const json = await api.get<{ data: MyTenant[] }>('me/tenants')
  return json.data
}
