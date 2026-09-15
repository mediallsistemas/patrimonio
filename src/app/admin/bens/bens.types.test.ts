import { describe, it, expect } from 'vitest'

import { rotuloUnidade } from './bens.types'

describe('rotuloUnidade', () => {
  it('empresa Mediall + projeto vira "REGIÃO - Projeto X"', () => {
    expect(rotuloUnidade('Mediall Brasil - AMAPÁ', 'HRPG')).toBe('AMAPÁ - Projeto HRPG')
  })

  it('normaliza os espaços irregulares do companyName do Trílogo', () => {
    expect(rotuloUnidade('Mediall Brasil -  RONDÔNIA', 'HM JARU')).toBe('RONDÔNIA - Projeto HM JARU')
    expect(rotuloUnidade(' Mediall Brasil - GOIÁS', 'SEDE')).toBe('GOIÁS - Projeto SEDE')
  })

  it('sem projeto mostra só a região (super_admin vendo a empresa inteira)', () => {
    expect(rotuloUnidade('Mediall Brasil - AMAPÁ', '')).toBe('AMAPÁ')
    expect(rotuloUnidade('Mediall Brasil - AMAPÁ', null)).toBe('AMAPÁ')
  })

  it('empresa fora do padrão Mediall mantém o nome', () => {
    expect(rotuloUnidade('Life North', 'CACOAL - RO')).toBe('Life North - Projeto CACOAL - RO')
    expect(rotuloUnidade('KERNHOLZ - HOLDING', null)).toBe('KERNHOLZ - HOLDING')
  })

  it('sem empresa e sem projeto não gera rótulo', () => {
    expect(rotuloUnidade(undefined, null)).toBeNull()
    expect(rotuloUnidade('', '  ')).toBeNull()
  })
})
