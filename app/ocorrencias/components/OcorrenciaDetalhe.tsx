'use client'

import { ChevronLeft, ChevronRight, Upload, X } from 'lucide-react'
import Card from '@/components/card'
import Button from '@/components/button'
import Text from '@/components/text'
import { TIPOS_OCORRENCIA, type DraftEstado } from '@/app/ocorrencias/types'

interface OcorrenciaDetalheProps {
  estado: DraftEstado
  errors: Record<string, string>
  fileInputRef: React.RefObject<HTMLInputElement | null>
  atualizar: (parcial: Partial<DraftEstado>) => void
  validarDetalhe: () => Record<string, string>
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>
  handleFoto: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export default function OcorrenciaDetalhe({
  estado,
  errors,
  fileInputRef,
  atualizar,
  validarDetalhe,
  setErrors,
  handleFoto,
}: OcorrenciaDetalheProps) {
  return (
    <Card shadow="md">
      <Text variant="caption" className="text-gray-300 uppercase tracking-wide font-semibold block mb-1">
        {estado.blocoSelecionado}
      </Text>
      <Text as="h2" variant="heading-sm" className="text-dark mb-1 block">
        {estado.localSelecionado!.nome}
      </Text>
      <Text variant="body-sm" className="text-gray-300 mb-5 block">
        Classifique e descreva o problema
      </Text>

      <div className="space-y-5">
        {/* Tipo */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-400 font-sans">Tipo de alteração</label>
          <div className="grid grid-cols-3 gap-2">
            {TIPOS_OCORRENCIA.map(({ value, label, active }) => (
              <button
                key={value}
                type="button"
                onClick={() => atualizar({ detalhe: { ...estado.detalhe, tipo: value } })}
                className={`py-3 px-2 rounded-xl border-2 font-sans font-semibold text-xs transition-all active:scale-95 ${
                  estado.detalhe.tipo === value
                    ? active
                    : 'border-gray-200 text-gray-300 bg-white hover:border-gray-300'
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
            value={estado.detalhe.descricao}
            onChange={(e) => atualizar({ detalhe: { ...estado.detalhe, descricao: e.target.value } })}
            className={`w-full px-4 py-3 rounded-xl border font-sans text-dark text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-all placeholder:text-gray-300 resize-none ${
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
          {estado.detalhe.foto ? (
            <div className="relative rounded-xl overflow-hidden border border-gray-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={estado.detalhe.foto} alt="Ocorrência" className="w-full h-48 object-cover" />
              <button
                type="button"
                onClick={() => atualizar({ detalhe: { ...estado.detalhe, foto: null } })}
                className="absolute top-2 right-2 bg-dark/70 text-white rounded-full p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-8 rounded-xl border-2 border-dashed border-gray-200 hover:border-teal-600 hover:bg-teal-50 transition-all flex flex-col items-center gap-2 text-gray-300 hover:text-teal-600"
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
        <Button
          variant="outline"
          onClick={() => atualizar({ etapa: 'ocorrencia_pergunta' })}
          className="flex-1"
        >
          Voltar
        </Button>
        <Button
          onClick={() => {
            const e = validarDetalhe()
            if (Object.keys(e).length > 0) {
              setErrors(e)
              return
            }
            atualizar({ etapa: 'trilogo' })
          }}
          className="flex-1"
        >
          Continuar <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  )
}
