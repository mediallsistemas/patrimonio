import { describe, expect, it } from 'vitest'
import { lerEndereco, normalizarNome, resolverAmbienteDoLink } from './ambiente-do-link'

// Endereços no formato real do Trílogo: Empresa > Cidade > PROJETO > Bloco > Ambiente
const HRGM = 'Mediall Brasil - RONDÔNIA > GUAJARÁ MIRIM > HRGM'
const HRPG = 'Mediall Brasil - AMAPÁ > PORTO GRANDE > HRPG'

const bem = (id: number, endereco: string) => ({ id, departmentFullAddress: endereco })
const ids = (bens: { id: number }[]) => bens.map((b) => b.id)

describe('normalizarNome', () => {
  it('ignora acento, caixa, pontuação e espaço repetido', () => {
    expect(normalizarNome('PRÉ-PARTO/ PARTO / PÓS-PARTO 02')).toBe('PRE PARTO PARTO POS PARTO 02')
    expect(normalizarNome('Dml-Pediatria')).toBe(normalizarNome('DML  PEDIATRIA'))
  })
})

describe('lerEndereco', () => {
  it('usa o 5º segmento como ambiente e o 4º quando só há quatro níveis', () => {
    expect(lerEndereco(`${HRGM} > CENTRO CIRÚRGICO > SALA 01`)).toMatchObject({
      projeto: 'HRGM', bloco: 'CENTRO CIRÚRGICO', ambiente: 'SALA 01', niveis: 5,
    })
    expect(lerEndereco(`${HRPG} > LOGISTICA`)).toMatchObject({ projeto: 'HRPG', ambiente: 'LOGISTICA', niveis: 4 })
  })

  it('descarta segmento vazio como o admin faz ao gerar o QR', () => {
    expect(lerEndereco(`${HRGM} > BLOCO A >  > EXPURGO`).ambiente).toBe('EXPURGO')
  })
})

describe('resolverAmbienteDoLink', () => {
  it('mantém o casamento exato de sempre', () => {
    const bens = [bem(1, `${HRGM} > CC > EXPURGO`), bem(2, `${HRGM} > CC > COPA`)]
    const r = resolverAmbienteDoLink({ projeto: 'HRGM', ambiente: 'EXPURGO' }, bens)
    expect(r.tipo).toBe('exato')
    expect(ids(r.bens)).toEqual([1])
  })

  it('o nome exato vence ambientes parecidos', () => {
    const bens = [bem(1, `${HRGM} > CC > SALA TECNICA`), bem(2, `${HRGM} > CC > SALA TECNICA 01`)]
    const r = resolverAmbienteDoLink({ projeto: 'HRGM', ambiente: 'SALA TECNICA' }, bens)
    expect(r.tipo).toBe('exato')
    expect(ids(r.bens)).toEqual([1])
  })

  it('segue o ambiente que mudou só acento, caixa ou pontuação', () => {
    const bens = [bem(1, `${HRGM} > PEDIATRIA > DML-PEDIATRIA`)]
    const r = resolverAmbienteDoLink({ projeto: 'HRGM', ambiente: 'DML PEDIATRIA' }, bens)
    expect(r.tipo).toBe('grafia')
    expect(r.ambientesAtuais).toEqual(['DML-PEDIATRIA'])
    expect(ids(r.bens)).toEqual([1])
  })

  it('segue o ambiente que virou bloco com sub-ambientes', () => {
    const bens = [
      bem(1, `${HRPG} > LOGISTICA > VINDO DA MATRIZ`),
      bem(2, `${HRPG} > LOGISTICA > EXPEDIÇÃO`),
      bem(3, `${HRPG} > ADMINISTRATIVO > LOGISTICA REVERSA`),
    ]
    const r = resolverAmbienteDoLink({ projeto: 'HRPG', ambiente: 'LOGISTICA' }, bens)
    expect(r.tipo).toBe('subdividido')
    expect(r.ambientesAtuais).toEqual(['EXPEDIÇÃO', 'VINDO DA MATRIZ'])
    expect(ids(r.bens)).toEqual([1, 2])
  })

  it('segue o único ambiente que contém o nome antigo inteiro', () => {
    const bens = [
      bem(1, `${HRGM} > CC > RPA - RECUPERAÇÃO PÓS ANESTÉSICA`),
      bem(2, `${HRGM} > CC > SALA DE CIRURGIA 01`),
    ]
    const r = resolverAmbienteDoLink({ projeto: 'HRGM', ambiente: 'RECUPERAÇÃO PÓS ANESTÉSICA' }, bens)
    expect(r.tipo).toBe('renomeado')
    expect(r.ambientesAtuais).toEqual(['RPA - RECUPERAÇÃO PÓS ANESTÉSICA'])
    expect(ids(r.bens)).toEqual([1])
  })

  it('trata grafias do mesmo nome novo como um ambiente só', () => {
    const bens = [
      bem(1, `${HRGM} > ADM > Sala do Administrativo / RH`),
      bem(2, `${HRGM} > ADM > SALA DO ADMINISTRATIVO - RH`),
    ]
    const r = resolverAmbienteDoLink({ projeto: 'HRGM', ambiente: 'Sala do Administrativo' }, bens)
    expect(r.tipo).toBe('renomeado')
    expect(ids(r.bens)).toEqual([1, 2])
  })

  it('não escolhe quando mais de um ambiente contém o nome antigo', () => {
    const bens = [bem(1, `${HRGM} > TI > SALA TECNICA 01`), bem(2, `${HRGM} > TI > SALA TÉCNICA 02`)]
    const r = resolverAmbienteDoLink({ projeto: 'HRGM', ambiente: 'SALA TECNICA' }, bens)
    expect(r.tipo).toBe('nao-encontrado')
    expect(r.bens).toEqual([])
    expect(r.candidatos).toEqual(['SALA TECNICA 01', 'SALA TÉCNICA 02'])
  })

  it('não estende nome de uma palavra só', () => {
    const bens = [bem(1, `${HRGM} > INTERNAÇÃO > UTI NEONATAL`)]
    const r = resolverAmbienteDoLink({ projeto: 'HRGM', ambiente: 'UTI' }, bens)
    expect(r.tipo).toBe('nao-encontrado')
    expect(r.candidatos).toEqual([])
  })

  it('compara palavras inteiras', () => {
    const bens = [bem(1, `${HRGM} > CC > SALA CIRURGIA 10`)]
    const r = resolverAmbienteDoLink({ projeto: 'HRGM', ambiente: 'SALA CIRURGIA 1' }, bens)
    expect(r.tipo).toBe('nao-encontrado')
  })

  it('não procura em outro projeto', () => {
    const bens = [bem(1, `${HRPG} > LOGISTICA > VINDO DA MATRIZ`), bem(2, `${HRPG} > CC > DML-PEDIATRIA`)]
    expect(resolverAmbienteDoLink({ projeto: 'UEI', ambiente: 'LOGISTICA' }, bens).tipo).toBe('nao-encontrado')
    expect(resolverAmbienteDoLink({ projeto: 'HRGM', ambiente: 'DML PEDIATRIA' }, bens).tipo).toBe('nao-encontrado')
  })

  it('diz que não encontrou quando o ambiente foi esvaziado', () => {
    const bens = [bem(1, `${HRGM} > CC > EXPURGO`)]
    const r = resolverAmbienteDoLink({ projeto: 'HRGM', ambiente: 'PLANTONISTA' }, bens)
    expect(r).toEqual({ tipo: 'nao-encontrado', bens: [], ambientesAtuais: [], candidatos: [] })
  })
})
