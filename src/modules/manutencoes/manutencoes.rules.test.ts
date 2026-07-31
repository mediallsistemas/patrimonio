import { describe, it, expect } from 'vitest'

import { podeVerRelatorio, ROLES_RELATORIO_MANUTENCOES } from './manutencoes.rules'

describe('manutencoes.rules — Relatório de Manutenções', () => {
  it('operator NAO vê o relatório', () => {
    expect(podeVerRelatorio('operator')).toBe(false)
  })

  it('gestão e leitura veem o relatório', () => {
    expect(podeVerRelatorio('super_admin')).toBe(true)
    expect(podeVerRelatorio('tenant_admin')).toBe(true)
    expect(podeVerRelatorio('admin_multi')).toBe(true)
    expect(podeVerRelatorio('operator_patrimonio')).toBe(true)
    expect(podeVerRelatorio('viewer')).toBe(true)
  })

  it('operator_forms (outro sistema) não vê', () => {
    expect(podeVerRelatorio('operator_forms')).toBe(false)
  })

  // A UI, o guard de rota e a API consomem esta mesma lista. Se alguém voltar a
  // incluir 'operator' aqui, o relatório reaparece nos três lugares de uma vez —
  // este teste é o que impede isso passar despercebido.
  it('a lista exportada não contém operator', () => {
    expect(ROLES_RELATORIO_MANUTENCOES).not.toContain('operator')
  })
})
