import { describe, it, expect } from 'vitest'
import { escopoLeitura, filtroEscopo } from './tenant-filter'

// O ponto destes testes é uma regra só: quando o escopo não resolve nenhuma
// unidade, o filtro tem que FECHAR. Um where vazio aqui devolve as linhas de
// todos os hospitais.

describe('escopoLeitura', () => {
  it('super_admin é global', () => {
    expect(escopoLeitura({ role: 'super_admin', tenantId: null, tenantIds: undefined }))
      .toEqual({ global: true })
  })

  it('super_admin continua global mesmo tendo tenantId', () => {
    expect(escopoLeitura({ role: 'super_admin', tenantId: 'h1', tenantIds: ['h1'] }))
      .toEqual({ global: true })
  })

  it('role comum fica restrita ao próprio tenant', () => {
    expect(escopoLeitura({ role: 'operator', tenantId: 'h1', tenantIds: undefined }))
      .toEqual({ global: false, tenantIds: ['h1'] })
  })

  it('multiunidade recebe todas as unidades vinculadas', () => {
    expect(escopoLeitura({ role: 'viewer', tenantId: 'h1', tenantIds: ['h1', 'h2'] }))
      .toEqual({ global: false, tenantIds: ['h1', 'h2'] })
  })

  it('não duplica o tenant principal já presente em tenantIds', () => {
    const e = escopoLeitura({ role: 'viewer', tenantId: 'h1', tenantIds: ['h1', 'h2', 'h1'] })
    expect(e).toEqual({ global: false, tenantIds: ['h1', 'h2'] })
  })

  it('token antigo, só com tenantIds, ainda resolve', () => {
    expect(escopoLeitura({ role: 'tenant_admin', tenantId: null, tenantIds: ['h2'] }))
      .toEqual({ global: false, tenantIds: ['h2'] })
  })

  it('role comum sem nenhuma unidade não vira global', () => {
    expect(escopoLeitura({ role: 'operator', tenantId: null, tenantIds: undefined }))
      .toEqual({ global: false, tenantIds: [] })
  })
})

describe('filtroEscopo', () => {
  it('global não filtra', () => {
    expect(filtroEscopo({ global: true })).toEqual({})
  })

  it('uma unidade vira igualdade simples', () => {
    expect(filtroEscopo({ global: false, tenantIds: ['h1'] })).toEqual({ tenantId: 'h1' })
  })

  it('várias unidades viram IN', () => {
    expect(filtroEscopo({ global: false, tenantIds: ['h1', 'h2'] }))
      .toEqual({ tenantId: { in: ['h1', 'h2'] } })
  })

  it('sem unidade FECHA — nunca devolve where vazio', () => {
    const where = filtroEscopo({ global: false, tenantIds: [] })
    expect(where).toEqual({ tenantId: { in: [] } })
    expect(where).not.toEqual({})
  })

  it('sessão sem unidade de role comum não enxerga nada (fim a fim)', () => {
    const where = filtroEscopo(escopoLeitura({ role: 'operator', tenantId: null }))
    expect(where).toEqual({ tenantId: { in: [] } })
  })
})
