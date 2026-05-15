// Lê um arquivo de imagem, redimensiona para no máximo MAX_PX no maior lado
// e devolve uma data URL JPEG comprimida (qualidade 0.7). Mesmo algoritmo
// usado em useRondaBase.handleFoto — extraído para ser reutilizado por outros
// fluxos de captura (manutenção, futuras feições).
const MAX_PX = 1280
const QUALITY = 0.7

export async function arquivoParaBase64Comprimido(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file)
  try {
    const img = await carregarImagem(objectUrl)
    const scale = Math.min(1, MAX_PX / Math.max(img.width, img.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.width * scale)
    canvas.height = Math.round(img.height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas não suportado')
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', QUALITY)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function carregarImagem(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Falha ao carregar imagem'))
    img.src = src
  })
}
