import { describe, it, expect } from 'vitest'

import {
  CriarChamadoSchema,
  AssumirChamadoSchema,
  AtribuirChamadoSchema,
  FinalizarChamadoSchema,
  EditarFiscalSchema,
  FiltrosChamadosSchema,
} from './chamados.types'

const AMBIENTE_ID = '3f2c1a34-9d3c-4e0a-8f21-0aa111222333'
const USER_ID = '5a6b7c8d-1e2f-4a5b-9c8d-7e6f5a4b3c2d'

const criarValido = {
  titulo: 'Vazamento no banheiro',
  descricao: 'Vazamento na pia do banheiro masculino',
  tipo: 'hidraulica',
  prazo: '2026-08-01T12:00:00Z',
  ambienteId: AMBIENTE_ID,
}

describe('CriarChamadoSchema', () => {
  it('aceita payload mínimo válido e aplica prioridade padrão media', () => {
    const r = CriarChamadoSchema.safeParse(criarValido)
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.prioridade).toBe('media')
      expect(r.data.prazo).toBeInstanceOf(Date)
    }
  })

  it('rejeita tipo desconhecido', () => {
    const r = CriarChamadoSchema.safeParse({ ...criarValido, tipo: 'v' })
    expect(r.success).toBe(false)
  })

  it('rejeita título/descrição curtos demais', () => {
    expect(CriarChamadoSchema.safeParse({ ...criarValido, titulo: 'ab' }).success).toBe(false)
    expect(CriarChamadoSchema.safeParse({ ...criarValido, descricao: 'x' }).success).toBe(false)
  })

  it('rejeita prazo inválido e ambienteId não-uuid', () => {
    expect(CriarChamadoSchema.safeParse({ ...criarValido, prazo: 'nunca' }).success).toBe(false)
    expect(CriarChamadoSchema.safeParse({ ...criarValido, ambienteId: '123' }).success).toBe(false)
  })

  it('rejeita bem incompleto (asset sem patrimony)', () => {
    const r = CriarChamadoSchema.safeParse({ ...criarValido, trilogoAssetId: 42 })
    expect(r.success).toBe(false)
  })

  it('aceita bem completo', () => {
    const r = CriarChamadoSchema.safeParse({
      ...criarValido,
      trilogoAssetId: 42,
      patrimony: 'PAT-001',
      descricaoBem: 'Cadeira de rodas',
    })
    expect(r.success).toBe(true)
  })

  it('rejeita foto acima do teto (~1.5MB base64)', () => {
    const fotoGrande = 'data:image/jpeg;base64,' + 'a'.repeat(2_000_001)
    const r = CriarChamadoSchema.safeParse({ ...criarValido, fotoAbertura: fotoGrande })
    expect(r.success).toBe(false)
  })

  it('descarta campos desconhecidos (strip do Zod)', () => {
    const r = CriarChamadoSchema.safeParse({
      ...criarValido,
      criadoPorId: 'injetado',
      tenantId: 'injetado',
    })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data).not.toHaveProperty('criadoPorId')
      expect(r.data).not.toHaveProperty('tenantId')
    }
  })
})

describe('AssumirChamadoSchema', () => {
  it('aceita vazio e prioridade opcional', () => {
    expect(AssumirChamadoSchema.safeParse({}).success).toBe(true)
    expect(AssumirChamadoSchema.safeParse({ prioridade: 'alta' }).success).toBe(true)
  })

  it('rejeita prioridade inválida', () => {
    expect(AssumirChamadoSchema.safeParse({ prioridade: 'maxima' }).success).toBe(false)
  })
})

describe('AtribuirChamadoSchema', () => {
  it('exige responsavelId uuid', () => {
    expect(AtribuirChamadoSchema.safeParse({}).success).toBe(false)
    expect(AtribuirChamadoSchema.safeParse({ responsavelId: 'abc' }).success).toBe(false)
    expect(AtribuirChamadoSchema.safeParse({ responsavelId: USER_ID }).success).toBe(true)
  })
})

describe('FinalizarChamadoSchema', () => {
  it('exige descrição da execução', () => {
    expect(FinalizarChamadoSchema.safeParse({}).success).toBe(false)
    expect(
      FinalizarChamadoSchema.safeParse({ descricaoExecucao: 'Troquei a lâmpada' }).success,
    ).toBe(true)
  })

  it('foto de execução é opcional mas respeita o teto', () => {
    const fotoGrande = 'x'.repeat(2_000_001)
    expect(
      FinalizarChamadoSchema.safeParse({
        descricaoExecucao: 'ok feito',
        fotoExecucao: fotoGrande,
      }).success,
    ).toBe(false)
  })
})

describe('FiltrosChamadosSchema — atrasados vindo de query string', () => {
  it("'true' liga o filtro; 'false' NÃO liga (nunca Boolean('false'))", () => {
    expect(FiltrosChamadosSchema.parse({ atrasados: 'true' }).atrasados).toBe(true)
    expect(FiltrosChamadosSchema.parse({ atrasados: 'false' }).atrasados).toBe(false)
    expect(FiltrosChamadosSchema.parse({}).atrasados).toBeUndefined()
  })
})

describe('EditarFiscalSchema', () => {
  it('aceita campos parciais e null (limpar)', () => {
    expect(EditarFiscalSchema.safeParse({ fornecedor: 'MEGA' }).success).toBe(true)
    expect(EditarFiscalSchema.safeParse({ fornecedor: null }).success).toBe(true)
    expect(EditarFiscalSchema.safeParse({ valorGastoCentavos: 15000 }).success).toBe(true)
  })

  it('rejeita valor negativo ou não-inteiro (centavos)', () => {
    expect(EditarFiscalSchema.safeParse({ valorGastoCentavos: -1 }).success).toBe(false)
    expect(EditarFiscalSchema.safeParse({ valorGastoCentavos: 10.5 }).success).toBe(false)
  })
})
