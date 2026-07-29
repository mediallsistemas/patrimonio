import { api } from '@/services/api'

// Os quatro tipos que existem de fato na tabela, conferidos em produção
// (28/07/2026): eletrica 75, predial 29, patrimonio 17, hidraulica 12.
//
// 'predial' merece atenção: o comentário do schema lista só três tipos e o
// omite, mas há 29 registros dele no banco. Tirar daqui faria essas linhas
// caírem sem rótulo e sem cor na tela.
export type TipoManutencaoAdmin = 'eletrica' | 'hidraulica' | 'predial' | 'patrimonio'

export interface ManutencaoAdmin {
  id: string
  tipo: TipoManutencaoAdmin
  status: 'em_andamento' | 'concluida'
  descricao: string
  ambienteNomeSnapshot: string | null
  blocoNomeSnapshot: string | null
  patrimony: string | null
  descricaoBemSnapshot: string | null
  subtipoPatrimonio: string | null
  observacaoFinal: string | null
  fotoAntes: string
  fotoDepois: string | null
  iniciadaEm: string
  finalizadaEm: string | null
  tenant: { id: string; nome: string }
  criadoPor: { nome: string }
}

export async function listarManutencoesAdmin(): Promise<ManutencaoAdmin[]> {
  const json = await api.get<{ data: ManutencaoAdmin[] }>('admin/manutencoes')
  return json.data ?? []
}
