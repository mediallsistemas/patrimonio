import { describe, it, expect } from 'vitest'

import { ADMIN_MODULES, getModule } from './_modules'

// Contrato do reagrupamento: as mesmas 7 telas da lista plana anterior, com os mesmos
// `superAdminOnly`. Se alguém adicionar uma tela nova, este teste falha de propósito —
// para a decisão de em qual setor ela entra ser consciente, e não acidental.
const TELAS_ESPERADAS: Record<string, boolean> = {
  '/admin/tenants': true,
  '/admin/usuarios': false,
  '/admin/rondas': false,
  '/admin/chamados': false,
  '/admin/patrimonio': false,
  '/admin/bens': false,
  '/admin/dashboard': true,
}

const todasAsAcoes = ADMIN_MODULES.flatMap((m) => m.actions)

describe('ADMIN_MODULES — reagrupamento por setor', () => {
  it('mantém exatamente as telas da lista plana anterior', () => {
    expect(todasAsAcoes.map((a) => a.href).sort()).toEqual(Object.keys(TELAS_ESPERADAS).sort())
  })

  it('preserva quem enxerga cada tela', () => {
    for (const acao of todasAsAcoes) {
      expect(acao.superAdminOnly, acao.href).toBe(TELAS_ESPERADAS[acao.href])
    }
  })

  it('nenhuma tela aparece em dois setores', () => {
    const hrefs = todasAsAcoes.map((a) => a.href)
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })

  it('nenhum módulo fica sem telas (card vazio)', () => {
    for (const m of ADMIN_MODULES) expect(m.actions.length, m.slug).toBeGreaterThan(0)
  })

  // Módulo visível a não-super cujas telas são todas superAdminOnly viraria card que
  // abre em página vazia. O filtro do /admin cobre isso, mas a configuração não deve depender dele.
  it('módulo não-super tem ao menos uma tela não-super', () => {
    for (const m of ADMIN_MODULES.filter((x) => !x.superAdminOnly)) {
      expect(m.actions.some((a) => !a.superAdminOnly), m.slug).toBe(true)
    }
  })

  it('getModule resolve os três slugs e recusa desconhecido', () => {
    expect(getModule('administrativo')?.title).toBe('Administrativo')
    expect(getModule('patrimonio')?.title).toBe('Patrimônio')
    expect(getModule('higienizacao')?.title).toBe('Higienização e Limpeza')
    expect(getModule('inexistente' as never)).toBeUndefined()
  })

  it('href do módulo bate com o slug', () => {
    for (const m of ADMIN_MODULES) expect(m.href).toBe(`/admin/m/${m.slug}`)
  })
})
