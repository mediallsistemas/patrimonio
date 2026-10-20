import { describe, expect, it } from 'vitest'
import {
  CILINDROS_POR_CAPACIDADE,
  CILINDROS_POR_CODIGO,
  OPCAO_OUTRO,
  OPCOES_CILINDRO,
  cilindroVazio,
  cilindrosDoDraft,
  cilindrosParaEnviar,
  descreverCilindros,
  lerM3,
  tamanhoDoCilindro,
  validarCilindros,
} from './cilindros'

describe('lerM3', () => {
  it('aceita vírgula ou ponto', () => {
    expect(lerM3('2,5')).toBe(2.5)
    expect(lerM3(' 3.5 ')).toBe(3.5)
  })

  it('recusa vazio, zero, negativo e texto', () => {
    expect(lerM3('')).toBeNull()
    expect(lerM3('0')).toBeNull()
    expect(lerM3('-1')).toBeNull()
    expect(lerM3('três')).toBeNull()
  })
})

describe('tamanhoDoCilindro', () => {
  it('usa o tamanho escolhido', () => {
    expect(tamanhoDoCilindro({ opcao: 'P10', outroM3: '', quantidade: '2' })).toBe('P10')
    expect(tamanhoDoCilindro({ opcao: '3 m³', outroM3: '', quantidade: '2' })).toBe('3 m³')
  })

  it('monta o rótulo da capacidade digitada no mesmo formato das opções', () => {
    expect(tamanhoDoCilindro({ opcao: OPCAO_OUTRO, outroM3: '2.5', quantidade: '1' })).toBe('2,5 m³')
    expect(tamanhoDoCilindro({ opcao: OPCAO_OUTRO, outroM3: '3', quantidade: '1' })).toBe('3 m³')
    expect(tamanhoDoCilindro({ opcao: OPCAO_OUTRO, outroM3: '', quantidade: '1' })).toBeNull()
  })
})

describe('cilindrosDoDraft', () => {
  it('usa a lista quando existe', () => {
    const lista = [{ opcao: 'P10', outroM3: '', quantidade: '4' }]
    expect(cilindrosDoDraft({ cilindros: lista })).toBe(lista)
  })

  it('converte o draft antigo de um tamanho só', () => {
    expect(cilindrosDoDraft({ abastecimento: { quantidade: '12', tamanho: 'P10' } }))
      .toEqual([{ opcao: 'P10', outroM3: '', quantidade: '12' }])
  })

  it('começa com uma linha vazia', () => {
    expect(cilindrosDoDraft({ cilindros: [], abastecimento: { quantidade: '', tamanho: null } }))
      .toEqual([cilindroVazio()])
  })
})

describe('validarCilindros', () => {
  it('aponta tamanho e quantidade de cada linha', () => {
    expect(validarCilindros([
      { opcao: 'P10', outroM3: '', quantidade: '4' },
      { opcao: null, outroM3: '', quantidade: '0' },
      { opcao: OPCAO_OUTRO, outroM3: '', quantidade: '1.5' },
    ])).toEqual({
      cilindro_1_tamanho: 'Selecione o tipo de cilindro',
      cilindro_1_quantidade: 'Informe a quantidade',
      cilindro_2_tamanho: 'Informe a capacidade em m³',
      cilindro_2_quantidade: 'Informe a quantidade',
    })
  })

  it('sem erro quando tudo está preenchido', () => {
    expect(validarCilindros([{ opcao: OPCAO_OUTRO, outroM3: '2,5', quantidade: '3' }])).toEqual({})
  })
})

describe('catálogo pré-cadastrado', () => {
  it('capacidade digitada em "Outro" gera o mesmo rótulo do catálogo', () => {
    // Senão "Outro 3,5" e o cilindro de 3,5 m³ do catálogo virariam linhas diferentes
    for (const rotulo of CILINDROS_POR_CAPACIDADE) {
      const numero = rotulo.replace(' m³', '')
      expect(tamanhoDoCilindro({ opcao: OPCAO_OUTRO, outroM3: numero, quantidade: '1' })).toBe(rotulo)
    }
  })

  it('reúne capacidades e códigos sem repetir', () => {
    expect(new Set(OPCOES_CILINDRO).size).toBe(CILINDROS_POR_CAPACIDADE.length + CILINDROS_POR_CODIGO.length)
  })
})

describe('cilindrosParaEnviar e descreverCilindros', () => {
  it('envia só as linhas completas e descreve para o histórico', () => {
    const enviar = cilindrosParaEnviar([
      { opcao: '3 m³', outroM3: '', quantidade: '4' },
      { opcao: 'P10', outroM3: '', quantidade: '2' },
      cilindroVazio(),
    ])
    expect(enviar).toEqual([{ tamanho: '3 m³', quantidade: 4 }, { tamanho: 'P10', quantidade: 2 }])
    expect(descreverCilindros(enviar)).toBe('4× 3 m³ · 2× P10')
  })
})
