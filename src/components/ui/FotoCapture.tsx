'use client'

import { useRef, useState } from 'react'
import { Camera, X, Loader2 } from 'lucide-react'
import Text from '@/components/ui/Text'
import { arquivoParaBase64Comprimido } from '@/utils/foto'

interface FotoCaptureProps {
  label: string
  hint?: string
  valor: string | null
  onChange: (base64: string | null) => void
  disabled?: boolean
  // Cor de destaque do botão "tirar foto"
  accent?: 'red' | 'green' | 'purple' | 'amber'
}

const ACCENTS = {
  red:    { bg: 'bg-red-base',   hover: 'hover:bg-red-dark',     ring: 'focus:ring-red-base' },
  green:  { bg: 'bg-emerald-600', hover: 'hover:bg-emerald-700',  ring: 'focus:ring-emerald-500' },
  purple: { bg: 'bg-purple-600',  hover: 'hover:bg-purple-700',   ring: 'focus:ring-purple-500' },
  amber:  { bg: 'bg-amber-500',   hover: 'hover:bg-amber-600',    ring: 'focus:ring-amber-400' },
}

export default function FotoCapture({
  label,
  hint,
  valor,
  onChange,
  disabled = false,
  accent = 'red',
}: FotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [carregando, setCarregando] = useState(false)
  const cores = ACCENTS[accent]

  async function onArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // permite re-selecionar o mesmo arquivo
    if (!file) return
    setCarregando(true)
    try {
      const base64 = await arquivoParaBase64Comprimido(file)
      onChange(base64)
    } catch {
      // Mantém estado anterior; usuário pode tentar novamente.
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="space-y-2">
      <div>
        <Text variant="caption" className="text-gray-400 uppercase tracking-wide font-semibold block">
          {label}
        </Text>
        {hint && (
          <Text variant="body-sm" className="text-gray-300 block">{hint}</Text>
        )}
      </div>

      {valor ? (
        <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={valor} alt={label} className="w-full max-h-72 object-contain" />
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur flex items-center justify-center text-gray-500 hover:text-red-base shadow-sm"
              aria-label="Remover foto"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled || carregando}
          onClick={() => inputRef.current?.click()}
          className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl ${cores.bg} ${cores.hover} text-white font-sans font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 ${cores.ring}`}
        >
          {carregando ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <Camera className="w-5 h-5" />
              Tirar foto
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onArquivo}
        className="hidden"
      />
    </div>
  )
}
