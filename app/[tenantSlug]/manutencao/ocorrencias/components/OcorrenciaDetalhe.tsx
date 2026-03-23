'use client'

import { ChevronLeft, ChevronRight, Upload, X } from 'lucide-react'
import Card from '@/components/card'
import Button from '@/components/button'
import Text from '@/components/text'
import {
  BLOCOS_AMBIENTES,
  TIPOS_OCORRENCIA,
  type DetalheOcorrencia,
  type Etapa,
} from '@/app/[tenantSlug]/manutencao/ocorrencias/types'

interface OcorrenciaDetalheProps {
  blocoIdx: number
  ambienteAtual: string
  detalhe: DetalheOcorrencia
  errors: Record<string, string>
  fileInputRef: React.RefObject<HTMLInputElement | null>
  setDetalhe: React.Dispatch<React.SetStateAction<DetalheOcorrencia>>
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>
  setEtapa: (etapa: Etapa) => void
  handleDetalheNext: () => void
  handleFoto: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export default function OcorrenciaDetalhe({
  blocoIdx,
  ambienteAtual,
  detalhe,
  errors,
  fileInputRef,
  setDetalhe,
  setErrors,
  setEtapa,
  handleDetalheNext,
  handleFoto,
}: OcorrenciaDetalheProps) {
  const blocoAtual = BLOCOS_AMBIENTES[blocoIdx]

  return (
    <Card shadow="md">
      <Text variant="caption" className="text-gray-300 uppercase tracking-wide font-semibold block mb-1">
        {blocoAtual.bloco}
      </Text>
      <Text as="h2" variant="heading-sm" className="text-dark mb-1 block">
        Detalhar ocorrência
      </Text>
      <Text variant="body-sm" className="text-gray-300 mb-5 block">
        Classifique e descreva o problema em <strong>{ambienteAtual}</strong>
      </Text>

      <div className="space-y-5">
        {/* Tipo */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-400 font-sans">Tipo de alteração</label>
          <div className="grid grid-cols-3 gap-2">
            {TIPOS_OCORRENCIA.map(({ value, label, active, inactive }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setDetalhe((d) => ({ ...d, tipo: value }))
                  setErrors((e) => ({ ...e, tipo: '' }))
                }}
                className={`py-3 px-2 rounded-xl border-2 font-sans font-semibold text-xs transition-all active:scale-95 ${
                  detalhe.tipo === value ? active : inactive
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {errors.tipo && <span className="text-xs text-red-base font-sans">{errors.tipo}</span>}
        </div>

        {/* Observação */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-gray-400 font-sans">Observação</label>
          <textarea
            rows={4}
            placeholder="Descreva detalhadamente o problema identificado..."
            value={detalhe.descricao}
            onChange={(e) => {
              setDetalhe((d) => ({ ...d, descricao: e.target.value }))
              setErrors((er) => ({ ...er, descricao: '' }))
            }}
            className={`w-full px-4 py-3 rounded-xl border font-sans text-dark text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-base transition-all placeholder:text-gray-300 resize-none ${
              errors.descricao ? 'border-red-base' : 'border-gray-200'
            }`}
          />
          {errors.descricao && (
            <span className="text-xs text-red-base font-sans">{errors.descricao}</span>
          )}
        </div>

        {/* Foto */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-400 font-sans">Foto (opcional)</label>
          {detalhe.foto ? (
            <div className="relative rounded-xl overflow-hidden border border-gray-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={detalhe.foto} alt="Ocorrência" className="w-full h-48 object-cover" />
              <button
                type="button"
                onClick={() => setDetalhe((d) => ({ ...d, foto: null }))}
                className="absolute top-2 right-2 bg-dark/70 text-white rounded-full p-1 hover:bg-dark transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-8 rounded-xl border-2 border-dashed border-gray-200 hover:border-red-base hover:bg-red-light transition-all flex flex-col items-center gap-2 text-gray-300 hover:text-red-base"
            >
              <Upload className="w-6 h-6" />
              <span className="text-sm font-sans">Toque para adicionar foto</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFoto}
            className="hidden"
          />
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <Button variant="outline" onClick={() => setEtapa('ocorrencia_pergunta')} className="flex-1">
          <ChevronLeft className="w-4 h-4" /> Voltar
        </Button>
        <Button onClick={handleDetalheNext} className="flex-1">
          Continuar <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  )
}
