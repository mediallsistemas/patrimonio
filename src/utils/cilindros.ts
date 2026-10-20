// Cilindros do abastecimento da inspeção de gases: as opções de tamanho e as
// regras da tela (linhas, validação, o que vai para a API). Puro, sem I/O.

// Os "P" são os tamanhos que as unidades já registravam; os de m³, os cilindros
// por capacidade. Fora da lista, o operador digita a capacidade em m³ ("Outro").
export const OPCOES_CILINDRO = ['P7', 'P10', 'P45', 'P50', '1 m³', '3 m³', '7 m³', '10 m³'] as const
export const OPCAO_OUTRO = 'outro'

// Uma linha da tela, como está sendo digitada
export interface CilindroDraft {
  opcao: string | null // um de OPCOES_CILINDRO ou OPCAO_OUTRO
  outroM3: string // capacidade digitada quando opcao === OPCAO_OUTRO
  quantidade: string
}

// Uma linha pronta para a API e para o histórico
export interface CilindroAbastecido {
  tamanho: string
  quantidade: number
}

export function cilindroVazio(): CilindroDraft {
  return { opcao: null, outroM3: '', quantidade: '' }
}

/** Capacidade digitada ("2,5" ou "2.5") como número; null se não for positiva. */
export function lerM3(texto: string): number | null {
  const numero = Number(texto.trim().replace(',', '.'))
  return texto.trim() !== '' && Number.isFinite(numero) && numero > 0 ? numero : null
}

/** Rótulo gravado: o tamanho escolhido, ou "2,5 m³" para a capacidade digitada. */
export function tamanhoDoCilindro(cilindro: CilindroDraft): string | null {
  if (cilindro.opcao !== OPCAO_OUTRO) return cilindro.opcao
  const m3 = lerM3(cilindro.outroM3)
  return m3 === null ? null : `${m3.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} m³`
}

/**
 * Linhas do abastecimento no draft. Drafts salvos antes da lista guardam um
 * tamanho só em `abastecimento`; sem nada, a tela começa com uma linha vazia.
 */
export function cilindrosDoDraft(estado: {
  cilindros?: CilindroDraft[]
  abastecimento?: { quantidade: string; tamanho: string | null }
}): CilindroDraft[] {
  if (estado.cilindros && estado.cilindros.length > 0) return estado.cilindros
  const antigo = estado.abastecimento
  if (antigo?.tamanho) return [{ opcao: antigo.tamanho, outroM3: '', quantidade: antigo.quantidade }]
  return [cilindroVazio()]
}

/** Erros por linha, nas chaves `cilindro_<i>_tamanho` e `cilindro_<i>_quantidade`. */
export function validarCilindros(cilindros: CilindroDraft[]): Record<string, string> {
  const erros: Record<string, string> = {}
  cilindros.forEach((cilindro, i) => {
    if (!cilindro.opcao) erros[`cilindro_${i}_tamanho`] = 'Selecione o tamanho'
    else if (tamanhoDoCilindro(cilindro) === null) erros[`cilindro_${i}_tamanho`] = 'Informe a capacidade em m³'
    const quantidade = Number(cilindro.quantidade)
    if (!cilindro.quantidade || !Number.isInteger(quantidade) || quantidade < 1)
      erros[`cilindro_${i}_quantidade`] = 'Informe a quantidade'
  })
  return erros
}

/** O que vai para a API: só as linhas completas. */
export function cilindrosParaEnviar(cilindros: CilindroDraft[]): CilindroAbastecido[] {
  return cilindros.flatMap((cilindro) => {
    const tamanho = tamanhoDoCilindro(cilindro)
    const quantidade = Number(cilindro.quantidade)
    return tamanho && Number.isInteger(quantidade) && quantidade >= 1 ? [{ tamanho, quantidade }] : []
  })
}

/** "4× 3 m³ · 2× P10" — para o histórico. */
export function descreverCilindros(cilindros: CilindroAbastecido[]): string {
  return cilindros.map((c) => `${c.quantidade}× ${c.tamanho}`).join(' · ')
}
