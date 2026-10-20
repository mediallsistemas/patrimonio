import {
  MEDICOES_GAS,
  type CilindroAbastecidoInput,
  type MedicaoGas,
  type RegistroAmbienteInput,
} from './rondas.types'

/**
 * Fotos de relógio que acompanham o registro: só as medições que vieram com
 * foto, na ordem de MEDICOES_GAS. Registro de ocorrência não tem medição.
 */
export function fotosMedicoesParaGravar(
  input: RegistroAmbienteInput,
): { medicao: MedicaoGas; foto: string }[] {
  if (input.tipoRegistro !== 'gases' || !input.fotosMedicoes) return []
  const fotos = input.fotosMedicoes
  return MEDICOES_GAS.flatMap((medicao) => {
    const foto = fotos[medicao]
    return foto ? [{ medicao, foto }] : []
  })
}

/**
 * Cilindros do abastecimento, um por tamanho (linhas repetidas somam).
 * Aceita a lista `cilindros` e o formato antigo de um tamanho só
 * (qtdCilindros + tamCilindro), que uma tela aberta antes do deploy ainda envia.
 */
export function cilindrosParaGravar(input: RegistroAmbienteInput): CilindroAbastecidoInput[] {
  if (input.tipoRegistro !== 'gases' || !input.temAbastecimento) return []

  const origem: CilindroAbastecidoInput[] = input.cilindros?.length
    ? input.cilindros
    : input.tamCilindro?.trim() && input.qtdCilindros
      ? [{ tamanho: input.tamCilindro, quantidade: input.qtdCilindros }]
      : []

  const porTamanho = new Map<string, number>()
  for (const { tamanho, quantidade } of origem) {
    const chave = tamanho.trim()
    porTamanho.set(chave, (porTamanho.get(chave) ?? 0) + quantidade)
  }
  return [...porTamanho].map(([tamanho, quantidade]) => ({ tamanho, quantidade }))
}

/**
 * Resumo para as colunas antigas de registros_ambientes: total de cilindros e
 * os tamanhos ("3 m³ + P10"). Sem cilindros, as duas ficam nulas.
 */
export function resumoCilindros(cilindros: CilindroAbastecidoInput[]): {
  qtdCilindros: number | null
  tamCilindro: string | null
} {
  if (cilindros.length === 0) return { qtdCilindros: null, tamCilindro: null }
  return {
    qtdCilindros: cilindros.reduce((total, c) => total + c.quantidade, 0),
    tamCilindro: cilindros.map((c) => c.tamanho).join(' + '),
  }
}
