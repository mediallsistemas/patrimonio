import React, { useRef } from 'react'
import { Upload, X, ChevronRight } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Text from '@/components/ui/Text'
import { TIPOS_ALTERACAO } from '../ronda.types'
import type { TipoAlteracao } from '../ronda.types'

interface Props {
  nomeAmbiente: string
  ocorrencia: { tipo: TipoAlteracao | null; descricao: string; foto: string | null }
  errors: Record<string, string>
  onChange: (v: { tipo: TipoAlteracao | null; descricao: string; foto: string | null }) => void
  onVoltar: () => void
  onContinuar: () => void
}

export default function OcorrenciaDetalhe({ nomeAmbiente, ocorrencia, errors, onChange, onVoltar, onContinuar }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => onChange({ ...ocorrencia, foto: reader.result as string })
    reader.readAsDataURL(file)
  }

  return (
    <Card shadow="md">
      <Text as="h2" variant="heading-sm" className="text-dark mb-1 block">Detalhar ocorrência</Text>
      <Text variant="body-sm" className="text-gray-300 mb-5 block">{nomeAmbiente}</Text>

      <div className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-400 font-sans">Tipo de ocorrência</label>
          <div className="grid grid-cols-3 gap-2">
            {TIPOS_ALTERACAO.map(({ value, label, color }) => (
              <button key={value} type="button"
                onClick={() => onChange({ ...ocorrencia, tipo: value })}
                className={`py-2.5 px-2 rounded-xl border-2 font-sans font-semibold text-xs transition-all active:scale-95 ${ocorrencia.tipo === value ? color : 'border-gray-200 text-gray-300 bg-white hover:border-gray-300'}`}>
                {label}
              </button>
            ))}
          </div>
          {errors.tipo && <span className="text-xs text-red-base font-sans">{errors.tipo}</span>}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-gray-400 font-sans">Observação</label>
          <textarea rows={4} placeholder="Descreva detalhadamente o problema identificado..."
            value={ocorrencia.descricao}
            onChange={(e) => onChange({ ...ocorrencia, descricao: e.target.value })}
            className={`w-full px-4 py-3 rounded-xl border font-sans text-dark text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-base transition-all placeholder:text-gray-300 resize-none ${errors.descricao ? 'border-red-base' : 'border-gray-200'}`} />
          {errors.descricao && <span className="text-xs text-red-base font-sans">{errors.descricao}</span>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-400 font-sans">Foto (opcional)</label>
          {ocorrencia.foto ? (
            <div className="relative rounded-xl overflow-hidden border border-gray-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ocorrencia.foto} alt="Ocorrência" className="w-full h-48 object-cover" />
              <button type="button"
                onClick={() => onChange({ ...ocorrencia, foto: null })}
                className="absolute top-2 right-2 bg-dark/70 text-white rounded-full p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="w-full py-8 rounded-xl border-2 border-dashed border-gray-200 hover:border-red-base hover:bg-red-light transition-all flex flex-col items-center gap-2 text-gray-300 hover:text-red-base">
              <Upload className="w-6 h-6" />
              <span className="text-sm font-sans">Toque para adicionar foto</span>
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFoto} className="hidden" />
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <Button variant="outline" onClick={onVoltar} className="flex-1">Voltar</Button>
        <Button onClick={onContinuar} className="flex-1">
          Continuar <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  )
}
