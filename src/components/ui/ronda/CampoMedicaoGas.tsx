'use client'

import { useRef, useState } from 'react'
import { Camera, ImagePlus, Loader2, X } from 'lucide-react'
import Input from '@/components/ui/Input'
import FotoLightbox from '@/components/ui/FotoLightbox'
import { arquivoParaBase64Comprimido } from '@/utils/foto'

interface CampoMedicaoGasProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id'> {
  id: string
  label: string
  error?: string
  foto: string | null
  onFotoChange: (foto: string | null) => void
}

// Campo de uma medição de gases com a foto do relógio ao lado do rótulo: o
// operador fotografa (câmera) ou escolhe da galeria a leitura que digitou,
// para guardar o registro. A foto é opcional.
export default function CampoMedicaoGas({
  id,
  label,
  error,
  foto,
  onFotoChange,
  ...inputProps
}: CampoMedicaoGasProps) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const galeriaRef = useRef<HTMLInputElement>(null)
  const [processando, setProcessando] = useState(false)
  const [falhou, setFalhou] = useState(false)
  const [ampliada, setAmpliada] = useState(false)

  async function onArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // permite escolher o mesmo arquivo de novo
    if (!file) return
    setProcessando(true)
    setFalhou(false)
    try {
      onFotoChange(await arquivoParaBase64Comprimido(file))
    } catch {
      setFalhou(true)
    } finally {
      setProcessando(false)
    }
  }

  const botao =
    'w-9 h-9 rounded-lg flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400'

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-gray-400 font-sans">
          {label}
        </label>
        <div className="flex items-center gap-1.5 shrink-0">
          {foto ? (
            <>
              <button
                type="button"
                onClick={() => setAmpliada(true)}
                className={`${botao} overflow-hidden ring-1 ring-purple-200`}
                aria-label={`Ver foto do relógio: ${label}`}
                title="Ver foto"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={foto} alt="" className="w-full h-full object-cover" />
              </button>
              <button
                type="button"
                onClick={() => onFotoChange(null)}
                className={`${botao} text-gray-400 hover:text-red-base hover:bg-red-50`}
                aria-label={`Remover foto do relógio: ${label}`}
                title="Remover foto"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          ) : processando ? (
            <span className={`${botao} text-purple-600`} role="status" aria-label="Processando foto">
              <Loader2 className="w-4 h-4 animate-spin" />
            </span>
          ) : (
            <>
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                className={`${botao} bg-purple-50 text-purple-600 hover:bg-purple-100`}
                aria-label={`Tirar foto do relógio: ${label}`}
                title="Tirar foto"
              >
                <Camera className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => galeriaRef.current?.click()}
                className={`${botao} bg-purple-50 text-purple-600 hover:bg-purple-100`}
                aria-label={`Adicionar foto da galeria: ${label}`}
                title="Adicionar foto da galeria"
              >
                <ImagePlus className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      <Input id={id} error={error} {...inputProps} />
      {falhou && (
        <span className="text-xs text-red-base font-sans">Não foi possível ler a foto. Tente de novo.</span>
      )}

      {/* capture abre direto a câmera traseira; sem capture, o celular oferece a galeria */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={onArquivo} className="hidden" />
      <input ref={galeriaRef} type="file" accept="image/*" onChange={onArquivo} className="hidden" />

      <FotoLightbox
        fotos={foto ? [{ src: foto, legenda: label }] : []}
        indice={ampliada && foto ? 0 : null}
        onFechar={() => setAmpliada(false)}
      />
    </div>
  )
}
