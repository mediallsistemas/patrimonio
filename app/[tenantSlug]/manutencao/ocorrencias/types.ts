// ── Tipos ─────────────────────────────────────────────────────────────────────

export type TipoOcorrencia = 'eletrica' | 'hidraulica' | 'patrimonio'

export type Etapa =
  | 'inicio'
  | 'bloco_intro'
  | 'ocorrencia_pergunta'
  | 'ocorrencia_detalhe'
  | 'trilogo'
  | 'bloco_resumo'
  | 'resumo_final'

export interface DetalheOcorrencia {
  tipo: TipoOcorrencia | null
  descricao: string
  foto: string | null
  trilogoChamado: boolean | null
}

export interface AmbienteConcluido {
  blocoIdx: number
  ambiente: string
  temOcorrencia: boolean
  tipo?: TipoOcorrencia
}

export interface BlocoAmbiente {
  bloco: string
  ambientes: string[]
}

// ── Config ─────────────────────────────────────────────────────────────────────

export const BLOCOS_AMBIENTES: BlocoAmbiente[] = [
  {
    bloco: 'Bloco Conforto',
    ambientes: ['47 - Repouso 01', '48 - Repouso 02', '49 - Repouso 03', '50 - Repouso 04'],
  },
  {
    bloco: 'Bloco Cirúrgico',
    ambientes: [
      '40 - Expurgo CME', '78 - Esterilização', '79 - Lavagem de Material Contaminado',
      '80 - Material Autoclavado', '81 - Sala da Autoclave', '82 - Sala de Guarda de Equipamento',
      '83 - DML', '84 - Expurgo', '85 - Arsenal da Farmácia', '86 - Copa Centro Cirúrgico',
      '87 - Sala da Neonatologia', '88 - Sala de Cirurgia 01', '89 - Sala de Cirurgia 02',
      '90 - Sala de Cirurgia 03', '91 - RPA',
    ],
  },
  {
    bloco: 'Bloco Atendimento Médico',
    ambientes: [
      '04 - Espera Consultórios', '05 - Consultório 5', '06 - Consultório 6', '07 - Ouvidoria',
      '08 - Utilidades', '09 - DML', '10 - Consultório 7', '11 - Sala de Ultrassonografia',
      '12 - Consultório 4', '13 - Consultório 3', '14 - Sala de Gesso / Sutura e Curativo',
      '15 - Posto de Coleta de Exame', '16 - Sala Disjuntores', '17 - Consultório 02',
      '18 - Internação Masculina', '19 - Posto de Enfermagem Observação', '20 - Internação Feminina',
      '22 - Sala de Limpeza / Expurgo', '23 - DML', '24 - Sala de Medicação 01',
      '25 - Sala de Medicação 02', '26 - Consultório 1', '27 - Raio X',
    ],
  },
  {
    bloco: 'Bloco Emergência',
    ambientes: ['21 - Sala Vermelha', '28 - Recepção Sala Vermelha', '29 - Psicossocial', '30 - Necrotério'],
  },
  {
    bloco: 'Bloco Interno do Hospital',
    ambientes: [
      '31 - Farmácia Satélite', '32 - Sala Transfusional', '37 - Sala de Limpeza',
      '38 - Sala de Disjuntores', '39 - Sala de Utilidades', '46 - Farmácia Central',
    ],
  },
  {
    bloco: 'Bloco Tercerizados / Colaboradores',
    ambientes: [
      'Usina de O2', '51 - Sala dos Soros', '52 - Preparo Mamadeiras', '53 - Cozinha',
      '54 - Laboratório', '55 - CAF 1', '56 - CAF 2', '57 - Refeitório',
      '58 - Sala Nutricionista', '59 - DML Nutrimax', '60 - Depósito Patrimônio',
      '61 - Vestiário Nutrimax', '62 - Rouparia / Roupa Limpa', '63 - Sala da Limpeza',
      '64 - Repouso Motorista', '65 - Sala Patrimônio e Manutenção', '66 - IML',
    ],
  },
  {
    bloco: 'Bloco da Recepção',
    ambientes: ['01 - Recepção Geral', '02 - SAME/NIR', '03 - Triagem'],
  },
  {
    bloco: 'Bloco Administrativo',
    ambientes: [
      '67 - Sala do Gerente Hospitalar', '68 - Diretoria Médica', '69 - Diretoria Fundação',
      '70 - Sala RH/DP', '71 - Recepção Administrativa', '72 - Sala de Utilidades',
      '73 - Sala de Reunião', '74 - Sala dos Coordenadores', '75 - Diretor de Enfermagem',
      '76 - Produção e Faturamento', '77 - Sala do T.I.', '71.2 - Depósito Faturamento',
    ],
  },
  {
    bloco: 'Bloco Enfermarias',
    ambientes: [
      '33 - Enfermaria 01', '34 - Enfermaria 02', '35 - Posto de Enfermagem 01 e 02',
      '36 - DML 01 e 02', '41 - Enfermaria 03', '42 - Enfermaria 04',
      '45 - Posto de Enfermagem 03 e 04',
    ],
  },
]

export const TIPOS_OCORRENCIA: {
  value: TipoOcorrencia
  label: string
  active: string
  inactive: string
}[] = [
  {
    value: 'eletrica',
    label: 'Elétrica',
    active: 'border-yellow-400 bg-yellow-50 text-yellow-700',
    inactive: 'border-gray-200 text-gray-300 bg-white',
  },
  {
    value: 'hidraulica',
    label: 'Hidráulica',
    active: 'border-blue-400 bg-blue-50 text-blue-700',
    inactive: 'border-gray-200 text-gray-300 bg-white',
  },
  {
    value: 'patrimonio',
    label: 'Patrimônio',
    active: 'border-purple-400 bg-purple-50 text-purple-700',
    inactive: 'border-gray-200 text-gray-300 bg-white',
  },
]
