import { describe, it, expect } from 'vitest'
import { pertenceAoTenant, visivelPara, casaPorNome, tokensDe } from './escopo'

// Vínculos reais de produção (conferidos em 28/07/2026). O Amapá é o caso que
// importa: três hospitais dividindo o mesmo companyId 168.
const HRPG = { trilogoCompanyId: 168, trilogoProjectName: 'HRPG', slug: 'hrpg', nome: 'Hospital Regional de Porto Grande' }
const UEI  = { trilogoCompanyId: 168, trilogoProjectName: 'UEI', slug: 'uei', nome: 'UEI — Unidade de Emergência Integrada' }
const UPA  = { trilogoCompanyId: 168, trilogoProjectName: 'UPA ZONA SUL', slug: 'upa-zona-sul', nome: 'UPA Zona Sul de Macapá' }
const HMMD = { trilogoCompanyId: 166, trilogoProjectName: 'HMMD', slug: 'hmmdo', nome: "Hospital Municipal de Machadinho D'Oeste" }

// Formato real do endereço na API.
const bem = (companyId: number, projeto: string) => ({
  companyId,
  departmentFullAddress: `Mediall Brasil - AMAPÁ > MACAPÁ > ${projeto} > Sala de patrimônio`,
})

describe('pertenceAoTenant', () => {
  it('casa a unidade pelo projeto no endereço', () => {
    expect(pertenceAoTenant(bem(168, 'HRPG'), HRPG)).toBe(true)
  })

  // O ponto de tudo isto: companyId igual não é a mesma unidade.
  it('não entrega bem de outra unidade da mesma empresa', () => {
    expect(pertenceAoTenant(bem(168, 'UEI'), HRPG)).toBe(false)
    expect(pertenceAoTenant(bem(168, 'UPA ZONA SUL'), HRPG)).toBe(false)
    expect(pertenceAoTenant(bem(168, 'HRPG'), UEI)).toBe(false)
  })

  it('empresa diferente nunca casa', () => {
    expect(pertenceAoTenant(bem(166, 'HRPG'), HRPG)).toBe(false)
    expect(pertenceAoTenant(bem(168, 'HMMD'), HMMD)).toBe(false)
  })

  it('sem projeto configurado, o nome do tenant no endereço resolve', () => {
    const semProjeto = { ...HRPG, trilogoProjectName: null }
    expect(pertenceAoTenant(bem(168, 'HRPG'), semProjeto)).toBe(true)
  })

  // Sem esta precedência o casamento por nome ALARGA em vez de restringir. Caso
  // real: o tenant da Sede tem slug 'mediall-goiania', e MEDIALL/GOIANIA
  // aparecem no endereço de todo bem da empresa — de 894 bens visíveis ele
  // passaria a 1.773.
  it('projeto configurado é a palavra final — nome não serve de segunda chance', () => {
    const sede = {
      trilogoCompanyId: 4,
      trilogoProjectName: 'SEDE',
      slug: 'mediall-goiania',
      nome: 'Mediall Brasil — Goiânia (Sede)',
    }
    const outroProjeto = {
      companyId: 4,
      departmentFullAddress: 'Mediall Brasil - GOIÁS > GOIÂNIA > DEPOSITO NORTE > Almoxarifado',
    }
    expect(pertenceAoTenant(outroProjeto, sede)).toBe(false)
  })

  // Era `if (!projectName) return true`: enxergava a empresa inteira.
  it('sem projeto e sem nome no endereço, FECHA', () => {
    const semProjeto = { trilogoCompanyId: 168, trilogoProjectName: null, slug: 'zzz', nome: 'Unidade Sem Nome' }
    expect(pertenceAoTenant(bem(168, 'UEI'), semProjeto)).toBe(false)
  })

  it('endereço ausente não vira passe livre', () => {
    expect(pertenceAoTenant({ companyId: 168 }, HRPG)).toBe(false)
  })

  it('companyId como string ainda casa — a API varia', () => {
    expect(pertenceAoTenant({ ...bem(168, 'HRPG'), companyId: '168' }, HRPG)).toBe(true)
  })
})

describe('visivelPara', () => {
  it('multiunidade enxerga as suas, e só as suas', () => {
    const minhas = [HRPG, UPA]
    expect(visivelPara(bem(168, 'HRPG'), minhas)).toBe(true)
    expect(visivelPara(bem(168, 'UPA ZONA SUL'), minhas)).toBe(true)
    expect(visivelPara(bem(168, 'UEI'), minhas)).toBe(false)
  })

  it('sem vínculo nenhum não enxerga nada', () => {
    expect(visivelPara(bem(168, 'HRPG'), [])).toBe(false)
  })
})

describe('casaPorNome', () => {
  const palavras = (s: string) => new Set(tokensDe(s))

  it('exige palavra inteira — "PG" não casa dentro de "HRPG"', () => {
    const pg = { trilogoCompanyId: 168, trilogoProjectName: null, slug: 'pg', nome: 'PG' }
    expect(casaPorNome(pg, palavras('MEDIALL > MACAPA > HRPG > SALA'))).toBe(false)
  })

  it('exige todas as palavras do nome', () => {
    const sul = { trilogoCompanyId: 1, trilogoProjectName: null, slug: 'x', nome: 'Hospital Regional Sul' }
    expect(casaPorNome(sul, palavras('HOSPITAL REGIONAL NORTE'))).toBe(false)
    expect(casaPorNome(sul, palavras('HOSPITAL REGIONAL SUL - ALA 1'))).toBe(true)
  })

  it('ignora acento', () => {
    const u = { trilogoCompanyId: 1, trilogoProjectName: null, slug: 'x', nome: 'Emergência' }
    expect(casaPorNome(u, palavras('UNIDADE DE EMERGENCIA'))).toBe(true)
  })
})

describe('tokensDe', () => {
  it('descarta palavras de até duas letras', () => {
    expect(tokensDe('Hospital de Porto Grande')).toEqual(['HOSPITAL', 'PORTO', 'GRANDE'])
  })

  it('quebra no formato de caminho da API', () => {
    expect(tokensDe('Mediall Brasil - AMAPÁ > MACAPÁ > HRPG'))
      .toEqual(['MEDIALL', 'BRASIL', 'AMAPA', 'MACAPA', 'HRPG'])
  })
})
