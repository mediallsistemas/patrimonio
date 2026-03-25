export interface Empresa { id: number; nome: string }

export interface Agendamento {
  id: string
  trilogoAssetId: number
  titulo: string
  dataAgendada: string
  observacao: string | null
  status: 'pendente' | 'realizado' | 'cancelado'
  criadoPor: string
}

export interface Asset {
  id: number
  patrimony: string
  description: string
  brand: string | null
  model: string | null
  serialNumber: string | null
  price: number | null
  purchaseDate: string | null
  departmentFullAddress: string
  status: number
  assetTypeName: string
  companyId: number
  companyName: string
  coverPermalink: string | null
  observations: string | null
  creationDate: string | null
}

export const STATUS: Record<number, { label: string; color: string }> = {
  1: { label: 'Ativo',      color: 'bg-emerald-100 text-emerald-700' },
  2: { label: 'Inativo',    color: 'bg-gray-100 text-gray-500' },
  4: { label: 'Manutenção', color: 'bg-amber-100 text-amber-700' },
}

export function parseEndereco(full: string) {
  const parts = full.split('>').map(s => s.trim()).filter(Boolean)
  return {
    empresa:  parts[0] ?? '—',
    cidade:   parts[1] ?? '—',
    unidade:  parts[2] ?? '—',
    bloco:    parts[3] ?? '—',
    ambiente: parts.length > 1 ? parts.slice(-2).join(' > ') : parts[0] ?? '—',
  }
}

export function moeda(v: number | null) {
  if (!v) return '—'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export const SUGESTOES_POR_TIPO: Record<string, string[]> = {
  'AUTOMÓVEIS':              ['Troca de óleo', 'Alinhamento e balanceamento', 'Troca de pneus', 'Revisão de freios', 'Troca de filtro de ar', 'Troca de filtro de combustível', 'Revisão geral', 'Higienização interna'],
  'AUTOMÓVEL':               ['Troca de óleo', 'Alinhamento e balanceamento', 'Troca de pneus', 'Revisão de freios', 'Troca de filtro de ar', 'Revisão geral'],
  'VEÍCULOS':                ['Troca de óleo', 'Alinhamento e balanceamento', 'Troca de pneus', 'Revisão de freios', 'Troca de filtro de ar', 'Revisão geral'],
  'VEÍCULO':                 ['Troca de óleo', 'Alinhamento e balanceamento', 'Troca de pneus', 'Revisão de freios', 'Revisão geral'],
  'MÓVEIS E ELETRODOMÉSTICOS': ['Limpeza e conservação', 'Restauração de estofado', 'Troca de peças danificadas', 'Pintura/repintura', 'Revisão de estrutura'],
  'MÓVEIS':                  ['Limpeza e conservação', 'Restauração de estofado', 'Troca de peças danificadas', 'Pintura/repintura', 'Revisão de estrutura'],
  'MÓVEL':                   ['Limpeza e conservação', 'Restauração de estofado', 'Troca de peças danificadas', 'Pintura/repintura'],
  'EQUIPAMENTOS HOSPITALARES': ['Calibração', 'Revisão preventiva', 'Troca de peças', 'Limpeza técnica', 'Teste de funcionamento', 'Revisão elétrica'],
  'EQUIPAMENTOS MÉDICOS':    ['Calibração', 'Revisão preventiva', 'Troca de peças', 'Limpeza técnica', 'Teste de funcionamento'],
  'EQUIPAMENTOS':            ['Revisão preventiva', 'Troca de peças', 'Limpeza técnica', 'Calibração', 'Revisão elétrica'],
  'COMPUTADORES':            ['Formatação', 'Troca de HD/SSD', 'Limpeza interna', 'Troca de memória RAM', 'Atualização de sistema', 'Troca de bateria'],
  'INFORMÁTICA':             ['Formatação', 'Troca de HD/SSD', 'Limpeza interna', 'Troca de memória RAM', 'Atualização de sistema'],
  'IMPRESSORAS':             ['Limpeza de cabeças', 'Troca de cartucho/toner', 'Revisão de roletes', 'Manutenção preventiva'],
  'AR CONDICIONADO':         ['Limpeza de filtros', 'Recarga de gás', 'Revisão do compressor', 'Limpeza geral', 'Troca de filtros'],
  'CLIMATIZAÇÃO':            ['Limpeza de filtros', 'Recarga de gás', 'Revisão preventiva', 'Limpeza geral'],
  'ELÉTRICO':                ['Revisão elétrica', 'Troca de tomadas/interruptores', 'Revisão de quadro elétrico', 'Troca de lâmpadas', 'Verificação de aterramento'],
  'INSTALAÇÕES ELÉTRICAS':   ['Revisão elétrica', 'Troca de tomadas/interruptores', 'Revisão de quadro elétrico', 'Verificação de aterramento'],
  'HIDRÁULICO':              ['Revisão de encanamento', 'Troca de registros', 'Desentupimento', 'Reparo de vazamentos', 'Revisão de bombas'],
  'INSTALAÇÕES HIDRÁULICAS': ['Revisão de encanamento', 'Troca de registros', 'Desentupimento', 'Reparo de vazamentos'],
  'GERADORES':               ['Troca de óleo', 'Revisão preventiva', 'Troca de filtros', 'Teste de carga', 'Revisão do alternador'],
  'GERADOR':                 ['Troca de óleo', 'Revisão preventiva', 'Troca de filtros', 'Teste de carga'],
  'ELEVADORES':              ['Revisão preventiva', 'Lubrificação', 'Troca de cabos', 'Revisão de portas', 'Inspeção de segurança'],
  'ELEVADOR':                ['Revisão preventiva', 'Lubrificação', 'Revisão de portas', 'Inspeção de segurança'],
}

export function getSugestoes(assetTypeName: string): string[] {
  const upper = assetTypeName.toUpperCase()
  for (const [key, vals] of Object.entries(SUGESTOES_POR_TIPO)) {
    if (upper === key.toUpperCase()) return vals
  }
  for (const [key, vals] of Object.entries(SUGESTOES_POR_TIPO)) {
    if (upper.includes(key.toUpperCase()) || key.toUpperCase().includes(upper)) return vals
  }
  return ['Revisão preventiva', 'Manutenção corretiva', 'Limpeza e conservação', 'Troca de peças', 'Revisão geral']
}
