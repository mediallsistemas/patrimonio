// Utilidades de dinheiro — valores sempre em CENTAVOS (int) no domínio.
// Único ponto de conversão/formato BRL; nunca reimplementar em componentes.

export function formatarBRL(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Para inputs de edição: "12345" centavos → "123,45"
export function centavosParaReais(centavos: number | null | undefined): string {
  if (centavos === null || centavos === undefined) return ''
  return (centavos / 100).toFixed(2).replace('.', ',')
}

// Aceita "1.234,56" ou "1234,56" ou "1234.56"; inválido/negativo → null
export function reaisParaCentavos(texto: string): number | null {
  const limpo = texto.trim().replace(/\./g, '').replace(',', '.')
  if (!limpo) return null
  const valor = Number(limpo)
  if (Number.isNaN(valor) || valor < 0) return null
  return Math.round(valor * 100)
}
