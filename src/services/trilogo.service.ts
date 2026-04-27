import { api } from '@/services/api'

export interface Empresa {
  id: number
  nome: string
}

export interface TrilogoAsset {
  departmentFullAddress: string
}

export async function buscarEmpresas(): Promise<Empresa[]> {
  const json = await api.get<{ data: Empresa[] }>('trilogo/assets?only=empresas')
  return json.data ?? []
}

export async function buscarProjetos(companyId: number): Promise<string[]> {
  const json = await api.get<{ data: string[] }>(`trilogo/assets?companyId=${companyId}&only=projetos`)
  return json.data ?? []
}

export async function buscarAssets(companyId: number): Promise<TrilogoAsset[]> {
  const json = await api.get<{ data: TrilogoAsset[] }>(`trilogo/assets?companyId=${companyId}`)
  return json.data ?? []
}
