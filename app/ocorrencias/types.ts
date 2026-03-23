// ── Tipos ─────────────────────────────────────────────────────────────────────

export type TipoOcorrencia = 'eletrica' | 'hidraulica' | 'patrimonio'
export type TamanhoCilindro = 'P7' | 'P10' | 'P45' | 'P50'
export type TipoAmbiente = 'ocorrencia' | 'gases'

export type Etapa =
  | 'inicio'
  | 'blocos'
  | 'locais'
  | 'bloco_concluido'
  | 'ocorrencia_pergunta'
  | 'ocorrencia_detalhe'
  | 'trilogo'
  | 'gases_medicoes'
  | 'gases_backup'
  | 'gases_abastecimento'
  | 'gases_abastecimento_detalhe'
  | 'confirmar_abandono'
  | 'resumo_final'

export interface Local {
  nome: string
  tipo: TipoAmbiente
}

export interface Bloco {
  nome: string
  locais: Local[]
}

export interface RegistroConcluido {
  bloco: string
  local: string
  tipo: TipoAmbiente
  temOcorrencia: boolean
  tipoOcorrencia?: TipoOcorrencia
  purezaO2?: number
  pressaoO2?: number
  pressaoAr?: number
  backupLigado?: boolean
  temAbastecimento?: boolean
  qtdCilindros?: number | null
  tamCilindro?: string | null
}

export interface DetalheOcorrencia {
  tipo: TipoOcorrencia | null
  descricao: string
  foto: string | null
}

export interface DraftEstado {
  rondaId: string | null
  etapa: Etapa
  blocoSelecionado: string | null
  localSelecionado: Local | null
  concluidos: RegistroConcluido[]
  detalhe: DetalheOcorrencia
  medicoes: { purezaO2: string; pressaoO2: string; pressaoAr: string }
  backupLigado: boolean | null
  abastecimento: { quantidade: string; tamanho: TamanhoCilindro | null }
  iniciadoEm: string
}

// ── Config ─────────────────────────────────────────────────────────────────────

export const BLOCOS: Bloco[] = [
  {
    nome: 'Inspeção de Gases',
    locais: [
      { nome: 'Usina de O₂', tipo: 'gases' },
    ],
  },
  {
    nome: 'Bloco Conforto',
    locais: [
      { nome: '47 - Repouso 01', tipo: 'ocorrencia' },
      { nome: '48 - Repouso 02', tipo: 'ocorrencia' },
      { nome: '49 - Repouso 03', tipo: 'ocorrencia' },
      { nome: '50 - Repouso 04', tipo: 'ocorrencia' },
    ],
  },
  {
    nome: 'Bloco Cirúrgico',
    locais: [
      { nome: '40 - Expurgo CME', tipo: 'ocorrencia' },
      { nome: '78 - Esterilização', tipo: 'ocorrencia' },
      { nome: '79 - Lavagem de Material Contaminado', tipo: 'ocorrencia' },
      { nome: '80 - Material Autoclavado', tipo: 'ocorrencia' },
      { nome: '81 - Sala da Autoclave', tipo: 'ocorrencia' },
      { nome: '82 - Sala de Guarda de Equipamento', tipo: 'ocorrencia' },
      { nome: '83 - DML', tipo: 'ocorrencia' },
      { nome: '84 - Expurgo', tipo: 'ocorrencia' },
      { nome: '85 - Arsenal da Farmácia', tipo: 'ocorrencia' },
      { nome: '86 - Copa Centro Cirúrgico', tipo: 'ocorrencia' },
      { nome: '87 - Sala da Neonatologia', tipo: 'ocorrencia' },
      { nome: '88 - Sala de Cirurgia 01', tipo: 'ocorrencia' },
      { nome: '89 - Sala de Cirurgia 02', tipo: 'ocorrencia' },
      { nome: '90 - Sala de Cirurgia 03', tipo: 'ocorrencia' },
      { nome: '91 - RPA', tipo: 'ocorrencia' },
    ],
  },
  {
    nome: 'Bloco Atendimento Médico',
    locais: [
      { nome: '04 - Espera Consultórios', tipo: 'ocorrencia' },
      { nome: '05 - Consultório 5', tipo: 'ocorrencia' },
      { nome: '06 - Consultório 6', tipo: 'ocorrencia' },
      { nome: '07 - Ouvidoria', tipo: 'ocorrencia' },
      { nome: '08 - Utilidades', tipo: 'ocorrencia' },
      { nome: '09 - DML', tipo: 'ocorrencia' },
      { nome: '10 - Consultório 7', tipo: 'ocorrencia' },
      { nome: '11 - Sala de Ultrassonografia', tipo: 'ocorrencia' },
      { nome: '12 - Consultório 4', tipo: 'ocorrencia' },
      { nome: '13 - Consultório 3', tipo: 'ocorrencia' },
      { nome: '14 - Sala de Gesso / Sutura e Curativo', tipo: 'ocorrencia' },
      { nome: '15 - Posto de Coleta de Exame', tipo: 'ocorrencia' },
      { nome: '16 - Sala Disjuntores', tipo: 'ocorrencia' },
      { nome: '17 - Consultório 02', tipo: 'ocorrencia' },
      { nome: '18 - Internação Masculina', tipo: 'ocorrencia' },
      { nome: '19 - Posto de Enfermagem Observação', tipo: 'ocorrencia' },
      { nome: '20 - Internação Feminina', tipo: 'ocorrencia' },
      { nome: '22 - Sala de Limpeza / Expurgo', tipo: 'ocorrencia' },
      { nome: '23 - DML', tipo: 'ocorrencia' },
      { nome: '24 - Sala de Medicação 01', tipo: 'ocorrencia' },
      { nome: '25 - Sala de Medicação 02', tipo: 'ocorrencia' },
      { nome: '26 - Consultório 1', tipo: 'ocorrencia' },
      { nome: '27 - Raio X', tipo: 'ocorrencia' },
    ],
  },
  {
    nome: 'Bloco Emergência',
    locais: [
      { nome: '21 - Sala Vermelha', tipo: 'ocorrencia' },
      { nome: '28 - Recepção Sala Vermelha', tipo: 'ocorrencia' },
      { nome: '29 - Psicossocial', tipo: 'ocorrencia' },
      { nome: '30 - Necrotério', tipo: 'ocorrencia' },
    ],
  },
  {
    nome: 'Bloco Interno do Hospital',
    locais: [
      { nome: '31 - Farmácia Satélite', tipo: 'ocorrencia' },
      { nome: '32 - Sala Transfusional', tipo: 'ocorrencia' },
      { nome: '37 - Sala de Limpeza', tipo: 'ocorrencia' },
      { nome: '38 - Sala de Disjuntores', tipo: 'ocorrencia' },
      { nome: '39 - Sala de Utilidades', tipo: 'ocorrencia' },
      { nome: '46 - Farmácia Central', tipo: 'ocorrencia' },
    ],
  },
  {
    nome: 'Bloco Terceirizados / Colaboradores',
    locais: [
      { nome: '51 - Sala dos Soros', tipo: 'ocorrencia' },
      { nome: '52 - Preparo Mamadeiras', tipo: 'ocorrencia' },
      { nome: '53 - Cozinha', tipo: 'ocorrencia' },
      { nome: '54 - Laboratório', tipo: 'ocorrencia' },
      { nome: '55 - CAF 1', tipo: 'ocorrencia' },
      { nome: '56 - CAF 2', tipo: 'ocorrencia' },
      { nome: '57 - Refeitório', tipo: 'ocorrencia' },
      { nome: '58 - Sala Nutricionista', tipo: 'ocorrencia' },
      { nome: '59 - DML Nutrimax', tipo: 'ocorrencia' },
      { nome: '60 - Depósito Patrimônio', tipo: 'ocorrencia' },
      { nome: '61 - Vestiário Nutrimax', tipo: 'ocorrencia' },
      { nome: '62 - Rouparia / Roupa Limpa', tipo: 'ocorrencia' },
      { nome: '63 - Sala da Limpeza', tipo: 'ocorrencia' },
      { nome: '64 - Repouso Motorista', tipo: 'ocorrencia' },
      { nome: '65 - Sala Patrimônio e Manutenção', tipo: 'ocorrencia' },
      { nome: '66 - IML', tipo: 'ocorrencia' },
    ],
  },
  {
    nome: 'Bloco da Recepção',
    locais: [
      { nome: '01 - Recepção Geral', tipo: 'ocorrencia' },
      { nome: '02 - SAME/NIR', tipo: 'ocorrencia' },
      { nome: '03 - Triagem', tipo: 'ocorrencia' },
    ],
  },
  {
    nome: 'Bloco Administrativo',
    locais: [
      { nome: '67 - Sala do Gerente Hospitalar', tipo: 'ocorrencia' },
      { nome: '68 - Diretoria Médica', tipo: 'ocorrencia' },
      { nome: '69 - Diretoria Fundação', tipo: 'ocorrencia' },
      { nome: '70 - Sala RH/DP', tipo: 'ocorrencia' },
      { nome: '71 - Recepção Administrativa', tipo: 'ocorrencia' },
      { nome: '72 - Sala de Utilidades', tipo: 'ocorrencia' },
      { nome: '73 - Sala de Reunião', tipo: 'ocorrencia' },
      { nome: '74 - Sala dos Coordenadores', tipo: 'ocorrencia' },
      { nome: '75 - Diretor de Enfermagem', tipo: 'ocorrencia' },
      { nome: '76 - Produção e Faturamento', tipo: 'ocorrencia' },
      { nome: '77 - Sala do T.I.', tipo: 'ocorrencia' },
      { nome: '71.2 - Depósito Faturamento', tipo: 'ocorrencia' },
    ],
  },
  {
    nome: 'Bloco Enfermarias',
    locais: [
      { nome: '33 - Enfermaria 01', tipo: 'ocorrencia' },
      { nome: '34 - Enfermaria 02', tipo: 'ocorrencia' },
      { nome: '35 - Posto de Enfermagem 01 e 02', tipo: 'ocorrencia' },
      { nome: '36 - DML 01 e 02', tipo: 'ocorrencia' },
      { nome: '41 - Enfermaria 03', tipo: 'ocorrencia' },
      { nome: '42 - Enfermaria 04', tipo: 'ocorrencia' },
      { nome: '45 - Posto de Enfermagem 03 e 04', tipo: 'ocorrencia' },
    ],
  },
]

export const TIPOS_OCORRENCIA: { value: TipoOcorrencia; label: string; active: string }[] = [
  { value: 'eletrica',   label: 'Elétrica',   active: 'border-yellow-400 bg-yellow-50 text-yellow-700' },
  { value: 'hidraulica', label: 'Hidráulica', active: 'border-blue-400 bg-blue-50 text-blue-700' },
  { value: 'patrimonio', label: 'Patrimônio', active: 'border-purple-400 bg-purple-50 text-purple-700' },
]

export const TAMANHOS_CILINDRO: TamanhoCilindro[] = ['P7', 'P10', 'P45', 'P50']
export const DRAFT_DEBOUNCE_MS = 1500

export function estadoInicial(): DraftEstado {
  return {
    rondaId: null,
    etapa: 'blocos',
    blocoSelecionado: null,
    localSelecionado: null,
    concluidos: [],
    detalhe: { tipo: null, descricao: '', foto: null },
    medicoes: { purezaO2: '', pressaoO2: '', pressaoAr: '' },
    backupLigado: null,
    abastecimento: { quantidade: '', tamanho: null },
    iniciadoEm: new Date().toISOString(),
  }
}
