'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { X, Copy, Check, ExternalLink, Printer } from 'lucide-react'

// Card dimensions (px at 96dpi — scaled up for print)
const CARD_W = 320
const LOGO_H = 80      // logo area height
const LABEL_H = 48     // ambiente name area height
const QR_SIZE = 220
const PAD = 20
const CARD_H = PAD + LOGO_H + 16 + LABEL_H + 16 + QR_SIZE + PAD

interface Props {
  companyId: number
  projeto: string
  ambiente: string
  onClose: () => void
}

export default function ModalQrCode({ companyId, projeto, ambiente, onClose }: Props) {
  const previewRef = useRef<HTMLCanvasElement>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [copiado, setCopiado] = useState(false)

  const base = (process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin).trim()
  const url = token ? `${base}/bem/${token}` : ''

  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        const res = await fetch('/api/bens/link-publico', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ companyId, projeto, ambiente }),
        })
        if (!res.ok) throw new Error()
        const body = (await res.json()) as { data: { token: string } }
        if (!cancelled) setToken(body.data.token)
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    init()
    return () => { cancelled = true }
  }, [companyId, projeto, ambiente])

  // Compose the card onto previewRef once token is ready
  useEffect(() => {
    if (!token || !previewRef.current) return

    const canvas = previewRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = CARD_W
    canvas.height = CARD_H

    async function draw() {
      if (!ctx) return
      // White background
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, CARD_W, CARD_H)

      // --- Logo ---
      const logo = new window.Image()
      logo.src = '/Logo_mediall.png'
      await new Promise<void>((resolve) => {
        logo.onload = () => resolve()
        logo.onerror = () => resolve() // skip logo on error
      })
      if (logo.complete && logo.naturalWidth > 0) {
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
        width: QR_SIZE,
        margin: 2,
        color: { dark: '#1e1b4b', light: '#ffffff' },
      })
      const qrY = PAD + LOGO_H + 16 + LABEL_H + 16
      ctx.drawImage(qrCanvas, (CARD_W - QR_SIZE) / 2, qrY)
    }

    draw().catch(() => setError(true))
  }, [token, url, ambiente])

  function copiarLink() {
    navigator.clipboard.writeText(url).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    })
  }

  function imprimir() {
    const canvas = previewRef.current
    if (!canvas) return
    const img = canvas.toDataURL('image/png')
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code — ${ambiente}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #fff; }
            img { display: block; max-width: 100%; }
          </style>
        </head>
        <body>
          <img src="${img}" />
          <script>window.onload = () => { window.print(); window.close() }<\/script>
        </body>
      </html>
    `)
    win.document.close()
  }

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
            {loading && (
              <div className="w-[320px] h-[404px] bg-gray-100 rounded-xl animate-pulse flex items-center justify-center">
                <p className="text-xs text-gray-400">Gerando QR...</p>
              </div>
            )}
            {error && !loading && (
              <div className="w-[320px] h-[404px] bg-red-50 rounded-xl flex items-center justify-center">
                <p className="text-xs text-red-500">Erro ao gerar QR</p>
              </div>
            )}
            <canvas
              ref={previewRef}
              className={`rounded-xl border border-gray-100 shadow-sm ${!token || loading ? 'hidden' : 'block'}`}
              style={{ width: CARD_W, height: CARD_H }}
            />
            {token && (
              <p className="text-xs text-gray-400 text-center break-all px-2">{url}</p>
            )}
          </div>

          {/* Ações */}
          <div className="flex gap-2">
            <button onClick={copiarLink} disabled={!token}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40">
              {copiado ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              {copiado ? 'Copiado!' : 'Copiar link'}
            </button>
            <a href={url} target="_blank" rel="noopener noreferrer"
              className={`flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors ${!token ? 'pointer-events-none opacity-40' : ''}`}>
              <ExternalLink size={14} />
            </a>
            <button onClick={imprimir} disabled={!token}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40">
              <Printer size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
