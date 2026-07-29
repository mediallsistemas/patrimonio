import { describe, it, expect } from 'vitest'

import { ADMIN_MODULES, MODULOS_VISIVEIS, TELAS_OCULTAS, getModule } from './_modules'

// Contrato do painel: as telas que ele oferece, com os respectivos
// `superAdminOnly`. Se alguém adicionar ou remover uma tela, este teste falha de
// propósito — para a decisão ser consciente, e não acidental.
//
// Nota de origem: a versão inicial desta lista dizia reproduzir "as mesmas telas
// de antes" e tinha 7 entradas, mas o painel anterior tinha 8 — faltava
// /admin/manutencoes. O teste travou o erro junto, dando a ele cara de decisão.
// Vale como aviso: este arquivo prova consistência interna, não que a lista
// esteja completa.
const TELAS_ESPERADAS: Record<string, boolean> = {
  '/admin/tenants': true,
  '/admin/usuarios': false,
  '/admin/rondas': false,
  '/admin/chamados': false,
  '/admin/bens': false,
  '/admin/manutencoes': false,
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

  it('getModule resolve os módulos visíveis e recusa desconhecido', () => {
    expect(getModule('administrativo')?.title).toBe('Administrativo')
    expect(getModule('patrimonio')?.title).toBe('Patrimônio')
    expect(getModule('inexistente' as never)).toBeUndefined()
  })

  it('href do módulo bate com o slug', () => {
    for (const m of ADMIN_MODULES) expect(m.href).toBe(`/admin/m/${m.slug}`)
  })
})

// Higienização e Limpeza está fora do ar por ora. `oculto` some com o módulo da
// UI e fecha as rotas; a definição fica no arquivo para o retorno ser uma linha.
describe('módulo oculto', () => {
  it('higienização continua definida, mas marcada como oculta', () => {
    const mod = ADMIN_MODULES.find((m) => m.slug === 'higienizacao')
    expect(mod, 'a definição não deve ser apagada — só marcada').toBeDefined()
    expect(mod?.oculto).toBe(true)
  })

  it('não aparece entre os módulos visíveis', () => {
    expect(MODULOS_VISIVEIS.map((m) => m.slug)).toEqual(['administrativo', 'patrimonio'])
  })

  // Sem isto, /admin/m/higienizacao continuaria abrindo para quem digitasse a URL.
  it('getModule recusa o slug oculto', () => {
    expect(getModule('higienizacao')).toBeUndefined()
  })

  it('as telas do módulo entram na lista de bloqueio', () => {
    expect(TELAS_OCULTAS).toEqual(['/admin/dashboard'])
  })

  it('nenhuma tela oculta aparece em módulo visível', () => {
    const visiveis = MODULOS_VISIVEIS.flatMap((m) => m.actions.map((a) => a.href))
    for (const href of TELAS_OCULTAS) expect(visiveis).not.toContain(href)
  })
})
