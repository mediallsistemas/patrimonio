'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { X, Copy, Check, ExternalLink, Printer, Download } from 'lucide-react'

// Card dimensions (px at 96dpi — scaled up for print)
const CARD_W = 320
const LOGO_H = 80      // logo area height
const LABEL_H = 48     // ambiente name area height
const QR_SIZE = 220
const PAD = 20
const BORDER = 6
const CARD_H = PAD + LOGO_H + 16 + LABEL_H + 16 + QR_SIZE + PAD
const BORDER_COLOR = '#0097B2'

// O canvas é desenhado em SCALE× e exibido/baixado no tamanho lógico: sem isso
// o QR sai serrilhado no papel e pode falhar a leitura em etiqueta pequena.
const SCALE = 3

// O logo não pode pendurar o desenho: sem timeout, uma requisição travada
// (proxy/rede ruim) deixava o cartão só com fundo e borda — em branco, sem erro.
const LOGO_TIMEOUT_MS = 3000

const MAPA_HTML: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }

function escaparHtml(texto: string): string {
  return texto.replace(/[&<>"]/g, (c) => MAPA_HTML[c] ?? c)
}

function nomeArquivo(ambiente: string): string {
  const base = ambiente
    .normalize('NFD')
    .replace(new RegExp('[\u0300-\u036f]', 'g'), '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  return `qrcode-${base || 'ambiente'}.png`
}

/** Carrega o logo com timeout — resolve `null` em erro ou demora, nunca pendura. */
function carregarLogo(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const logo = new window.Image()
    const timer = setTimeout(() => resolve(null), LOGO_TIMEOUT_MS)
    logo.onload = () => {
      clearTimeout(timer)
      resolve(logo.naturalWidth > 0 ? logo : null)
    }
    logo.onerror = () => {
      clearTimeout(timer)
      resolve(null)
    }
    logo.src = '/Logo_mediall.png'
  })
}

interface Props {
  companyId: number
  projeto: string
  ambiente: string
  onClose: () => void
}

export default function ModalQrCode({ companyId, projeto, ambiente, onClose }: Props) {
  const previewRef = useRef<HTMLCanvasElement>(null)
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)
  // Só libera as ações quando o cartão terminou de ser desenhado — antes disso
  // o canvas ainda não tem o QR (ele é a última coisa pintada) e baixar/imprimir
  // gerava um cartão em branco ou sem o código.
  const [pronto, setPronto] = useState(false)
  const [popupBloqueado, setPopupBloqueado] = useState(false)

  const base = (process.env.NEXT_PUBLIC_APP_URL || window.location.origin).trim()
  const url = token ? `${base}/bem/${token}` : ''

  useEffect(() => {
    let cancelled = false
    async function init(): Promise<void> {
      try {
        const res = await fetch('/api/bens/link-publico', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ companyId, projeto, ambiente }),
        })
        if (!res.ok) {
          throw new Error(
            res.status === 401 || res.status === 403
              ? 'Seu usuário não tem permissão para gerar o QR deste ambiente.'
              : 'Não foi possível gerar o QR. Tente novamente.',
          )
        }
        const body = (await res.json()) as { data: { token: string } }
        if (!cancelled) setToken(body.data.token)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erro ao gerar QR')
      }
    }
    init()
    return () => { cancelled = true }
  }, [companyId, projeto, ambiente])

  // Compose the card onto previewRef once token is ready
  useEffect(() => {
    if (!token || !previewRef.current) return

    let cancelled = false
    const canvas = previewRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    setPronto(false)
    canvas.width = CARD_W * SCALE
    canvas.height = CARD_H * SCALE
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0)

    async function draw(): Promise<void> {
      if (!ctx) return
      // White background
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, CARD_W, CARD_H)

      // --- Border ---
      const r = 16 // corner radius
      ctx.strokeStyle = BORDER_COLOR
      ctx.lineWidth = BORDER
      ctx.beginPath()
      ctx.moveTo(r, BORDER / 2)
      ctx.lineTo(CARD_W - r, BORDER / 2)
      ctx.quadraticCurveTo(CARD_W - BORDER / 2, BORDER / 2, CARD_W - BORDER / 2, r)
      ctx.lineTo(CARD_W - BORDER / 2, CARD_H - r)
      ctx.quadraticCurveTo(CARD_W - BORDER / 2, CARD_H - BORDER / 2, CARD_W - r, CARD_H - BORDER / 2)
      ctx.lineTo(r, CARD_H - BORDER / 2)
      ctx.quadraticCurveTo(BORDER / 2, CARD_H - BORDER / 2, BORDER / 2, CARD_H - r)
      ctx.lineTo(BORDER / 2, r)
      ctx.quadraticCurveTo(BORDER / 2, BORDER / 2, r, BORDER / 2)
      ctx.closePath()
      ctx.stroke()

      // --- Logo (opcional: some sem quebrar o cartão se falhar/demorar) ---
      const logo = await carregarLogo()
      if (cancelled) return
      if (logo) {
        const aspect = logo.naturalWidth / logo.naturalHeight
        const lh = LOGO_H
        const lw = lh * aspect
        ctx.drawImage(logo, (CARD_W - lw) / 2, PAD, lw, lh)
      }

      // --- Ambiente name ---
      const labelY = PAD + LOGO_H + 16
      ctx.fillStyle = '#1e1b4b'
      ctx.font = 'bold 18px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      // Wrap text if needed
      const maxWidth = CARD_W - PAD * 2
      const words = ambiente.split(' ')
      const lines: string[] = []
      let line = ''
      for (const word of words) {
        const test = line ? `${line} ${word}` : word
        if (ctx.measureText(test).width > maxWidth && line) {
          lines.push(line)
          line = word
        } else {
          line = test
        }
      }
      lines.push(line)
      const lineH = 22
      const totalTextH = lines.length * lineH
      const textStartY = labelY + (LABEL_H - totalTextH) / 2 + lineH / 2
      lines.forEach((l, i) => ctx.fillText(l, CARD_W / 2, textStartY + i * lineH))

      // --- QR code ---
      const qrCanvas = document.createElement('canvas')
      await QRCode.toCanvas(qrCanvas, url, {
        width: QR_SIZE * SCALE,
        margin: 2,
        color: { dark: '#1e1b4b', light: '#ffffff' },
      })
      if (cancelled) return
      const qrY = PAD + LOGO_H + 16 + LABEL_H + 16
      // Módulos do QR são quadrados — interpolar só borra as bordas.
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(qrCanvas, (CARD_W - QR_SIZE) / 2, qrY, QR_SIZE, QR_SIZE)
    }

    draw()
      .then(() => { if (!cancelled) setPronto(true) })
      .catch(() => { if (!cancelled) setError('Não foi possível desenhar o QR.') })

    return () => { cancelled = true }
  }, [token, url, ambiente])

  function copiarLink(): void {
    navigator.clipboard.writeText(url).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    })
  }

  function baixar(): void {
    const canvas = previewRef.current
    if (!canvas || !pronto) return
    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    link.download = nomeArquivo(ambiente)
    link.click()
  }

  function imprimir(): void {
    const canvas = previewRef.current
    if (!canvas || !pronto) return
    const img = canvas.toDataURL('image/png')
    const win = window.open('', '_blank')
    if (!win) {
      // Pop-up bloqueado: antes isso falhava calado e parecia que o botão não fazia nada.
      setPopupBloqueado(true)
      return
    }
    setPopupBloqueado(false)
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code — ${escaparHtml(ambiente)}</title>
          <style>
            @page { margin: 12mm; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { text-align: center; background: #fff; }
            img { display: inline-block; width: ${CARD_W}px; max-width: 100%; }
          </style>
        </head>
        <body>
          <img id="qr" src="${img}" />
          <script>
            // Só imprime depois da imagem pronta e só fecha depois do print —
            // print() + close() colados imprimiam página em branco em alguns navegadores.
            var alvo = document.getElementById('qr')
            function imprimir() { window.focus(); window.print() }
            window.addEventListener('afterprint', function () { window.close() })
            if (alvo.complete) imprimir(); else alvo.onload = imprimir
          <\/script>
        </body>
      </html>
    `)
    win.document.close()
  }

  const acoesLiberadas = pronto && !error

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">QR Code do ambiente</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {/* Composed card preview */}
          <div className="flex flex-col items-center gap-3">
            {!error && !acoesLiberadas && (
              <div style={{ width: CARD_W, height: CARD_H }}
                className="bg-gray-100 rounded-xl animate-pulse flex items-center justify-center">
                <p className="text-xs text-gray-400">Gerando QR...</p>
              </div>
            )}
            {error && (
              <div style={{ width: CARD_W, height: CARD_H }}
                className="bg-red-50 rounded-xl flex items-center justify-center px-6">
                <p className="text-xs text-red-500 text-center">{error}</p>
              </div>
            )}
            <canvas
              ref={previewRef}
              className={`rounded-xl border border-gray-100 shadow-sm ${acoesLiberadas ? 'block' : 'hidden'}`}
              style={{ width: CARD_W, height: CARD_H }}
            />
            {acoesLiberadas && (
              <p className="text-xs text-gray-400 text-center break-all px-2">{url}</p>
            )}
          </div>

          {popupBloqueado && (
            <p className="text-xs text-amber-600 text-center">
              O navegador bloqueou a janela de impressão. Libere o pop-up para este site ou use o botão de download.
            </p>
          )}

          {/* Ações */}
          <div className="flex gap-2">
            <button onClick={baixar} disabled={!acoesLiberadas}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-40">
              <Download size={14} /> Baixar PNG
            </button>
            <button onClick={copiarLink} disabled={!acoesLiberadas}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40">
              {copiado ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            </button>
            <a href={url} target="_blank" rel="noopener noreferrer"
              className={`flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors ${!acoesLiberadas ? 'pointer-events-none opacity-40' : ''}`}>
              <ExternalLink size={14} />
            </a>
            <button onClick={imprimir} disabled={!acoesLiberadas}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40">
              <Printer size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
