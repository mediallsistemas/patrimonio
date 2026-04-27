'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { X, Copy, Check, ExternalLink, Printer, MapPin } from 'lucide-react'

interface Props {
  companyId: number
  projeto: string
  ambiente: string
  onClose: () => void
}

export default function ModalQrCode({ companyId, projeto, ambiente, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
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

  useEffect(() => {
    if (!token || !canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, url, {
      width: 220,
      margin: 2,
      color: { dark: '#1e1b4b', light: '#ffffff' },
    }).catch(() => setError(true))
  }, [token, url])

  function copiarLink() {
    navigator.clipboard.writeText(url).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    })
  }

  function imprimir() {
    const canvas = canvasRef.current
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
            body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; }
            .card { border: 2px solid #e5e7eb; border-radius: 16px; padding: 24px; max-width: 320px; width: 100%; text-align: center; }
            img { width: 220px; height: 220px; margin: 0 auto 16px; display: block; }
            h2 { font-size: 16px; font-weight: 700; color: #1e1b4b; margin-bottom: 4px; }
            p.projeto { font-size: 12px; color: #7c3aed; font-weight: 600; margin-bottom: 8px; }
            p.info { font-size: 11px; color: #6b7280; }
            p.url { font-size: 9px; color: #9ca3af; margin-top: 12px; word-break: break-all; }
          </style>
        </head>
        <body>
          <div class="card">
            <img src="${img}" />
            <h2>${ambiente}</h2>
            <p class="projeto">${projeto}</p>
            <p class="info">Escaneie para ver os bens patrimoniais e agendamentos deste ambiente</p>
            <p class="url">${url}</p>
          </div>
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
          {/* Info do ambiente */}
          <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-0.5">
            <div className="flex items-center gap-1.5">
              <MapPin size={13} className="text-purple-500 shrink-0" />
              <p className="text-sm font-semibold text-gray-800">{ambiente}</p>
            </div>
            <p className="text-xs text-purple-600 font-medium pl-5">{projeto}</p>
          </div>

          {/* QR */}
          <div className="flex flex-col items-center gap-3">
            {loading && (
              <div className="w-[220px] h-[220px] bg-gray-100 rounded-xl animate-pulse flex items-center justify-center">
                <p className="text-xs text-gray-400">Gerando QR...</p>
              </div>
            )}
            {error && !loading && (
              <div className="w-[220px] h-[220px] bg-red-50 rounded-xl flex items-center justify-center">
                <p className="text-xs text-red-500">Erro ao gerar QR</p>
              </div>
            )}
            <canvas ref={canvasRef} className={`rounded-xl ${!token || loading ? 'hidden' : 'block'}`} />
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
