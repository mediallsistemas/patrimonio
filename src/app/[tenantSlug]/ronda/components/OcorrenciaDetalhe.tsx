'use client'

import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Upload, X, Plus, Trash2, Package } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Text from '@/components/ui/Text'
import PatrimonioBemSelector from './PatrimonioBemSelector'
import { TIPOS_OCORRENCIA, type DraftEstado, type DetalheOcorrencia } from '../ronda.types'

interface OcorrenciaDetalheProps {
  estado: DraftEstado
  errors: Record<string, string>
  submitting: boolean
  atualizar: (parcial: Partial<DraftEstado>) => void
  atualizarDetalhe: (index: number, parcial: Partial<DetalheOcorrencia>) => void
  adicionarDetalhe: () => void
  removerDetalhe: (index: number) => void
  validarDetalhe: () => Record<string, string>
  setFieldErrors: (e: Record<string, string>) => void
  handleFoto: (e: React.ChangeEvent<HTMLInputElement>, index?: number) => void
  salvarLocal: (temOcorrencia: boolean) => Promise<void>
}

export default function OcorrenciaDetalhe({
  estado,
  errors,
  submitting,
  atualizar,
  atualizarDetalhe,
  adicionarDetalhe,
  removerDetalhe,
  validarDetalhe,
  setFieldErrors,
  handleFoto,
  salvarLocal,
}: OcorrenciaDetalheProps) {
  const fileRefs = useRef<(HTMLInputElement | null)[]>([])
  const [bemModalIdx, setBemModalIdx] = useState(-1)

  function onSelecionarBem(bem: { id: number; patrimony: string; descricao: string } | null) {
    if (bemModalIdx < 0) return
    atualizarDetalhe(bemModalIdx, { bem: bem && bem.id !== 0 ? bem : null })
    setBemModalIdx(-1)
  }

  return (
    <>
      <Card shadow="md">
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={() => atualizar({ etapa: 'ocorrencia_pergunta' })}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-dark hover:bg-gray-100 transition-colors shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <Text variant="caption" className="text-gray-300 uppercase tracking-wide font-semibold block">
            {estado.blocoSelecionado}
          </Text>
        </div>
        <Text as="h2" variant="heading-sm" className="text-dark mb-1 block px-1">
          {estado.localSelecionado!.nome}
        </Text>
        <Text variant="body-sm" className="text-gray-300 mb-5 block px-1">
          Classifique e descreva {estado.detalhes.length > 1 ? 'as ocorrências' : 'o problema'}
        </Text>

        <div className="space-y-6">
          {estado.detalhes.map((detalhe, i) => (
            <div key={i} className="space-y-4">
              {estado.detalhes.length > 1 && (
                <div className="flex items-center justify-between">
                  <Text variant="caption" className="text-gray-400 font-semibold uppercase tracking-wide">
                    Ocorrência {i + 1}
                  </Text>
                  <button
                    type="button"
                    onClick={() => removerDetalhe(i)}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-sans"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remover
                  </button>
                </div>
              )}

              {/* Tipo */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-400 font-sans">Tipo de alteração</label>
                <div className="grid grid-cols-3 gap-2">
                  {TIPOS_OCORRENCIA.map(({ value, label, active }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => atualizarDetalhe(i, { tipo: value })}
                      className={`py-3 px-2 rounded-xl border-2 font-sans font-semibold text-xs transition-all active:scale-95 ${
                        detalhe.tipo === value
                          ? active
                          : 'border-gray-200 text-gray-300 bg-white hover:border-gray-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {errors[`tipo_${i}`] && (
                  <span className="text-xs text-red-base font-sans">{errors[`tipo_${i}`]}</span>
                )}
              </div>

              {/* Bem patrimônio */}
              {detalhe.tipo === 'patrimonio' && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-400 font-sans">Bem com problema</label>
                  {detalhe.bem ? (
                    <div className="flex items-center gap-3 px-3 py-3 rounded-xl border-2 border-purple-300 bg-purple-50">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                        <Package className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono font-semibold text-purple-700 truncate">
                          {detalhe.bem.patrimony}
                        </p>
                        <p className="text-sm font-sans text-dark truncate">{detalhe.bem.descricao}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBemModalIdx(i)}
                        className="text-xs font-semibold text-purple-600 hover:text-purple-800 font-sans shrink-0"
                      >
                        Trocar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setBemModalIdx(i)}
                      className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-purple-300 text-purple-500 hover:border-purple-400 hover:bg-purple-50 font-sans font-semibold text-sm flex items-center justify-center gap-2 transition-all"
                    >
                      <Package className="w-4 h-4" /> Selecionar bem
                    </button>
                  )}
                </div>
              )}

              {/* Observação */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-400 font-sans">Observação</label>
                <textarea
                  rows={3}
                  placeholder="Descreva detalhadamente o problema identificado..."
                  value={detalhe.descricao}
                  onChange={(e) => atualizarDetalhe(i, { descricao: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border font-sans text-dark text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-all placeholder:text-gray-300 resize-none ${
                    errors[`descricao_${i}`] ? 'border-red-base' : 'border-gray-200'
                  }`}
                />
                {errors[`descricao_${i}`] && (
                  <span className="text-xs text-red-base font-sans">{errors[`descricao_${i}`]}</span>
                )}
              </div>

              {/* Foto */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-400 font-sans">Foto (opcional)</label>
                {detalhe.foto ? (
                  <div className="relative rounded-xl overflow-hidden border border-gray-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={detalhe.foto} alt="Ocorrência" className="w-full h-40 object-cover" />
                    <button
                      type="button"
                      onClick={() => atualizarDetalhe(i, { foto: null })}
                      className="absolute top-2 right-2 bg-dark/70 text-white rounded-full p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRefs.current[i]?.click()}
                    className="w-full py-6 rounded-xl border-2 border-dashed border-gray-200 hover:border-teal-600 hover:bg-teal-50 transition-all flex flex-col items-center gap-2 text-gray-300 hover:text-teal-600"
                  >
                    <Upload className="w-5 h-5" />
                    <span className="text-sm font-sans">Toque para adicionar foto</span>
                  </button>
                )}
                <input
                  ref={(el) => { fileRefs.current[i] = el }}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handleFoto(e, i)}
                  className="hidden"
                />
              </div>

              {/* Trilogo */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-400 font-sans">Chamado no Trilogo?</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { v: true,  label: 'Sim', color: 'border-green-400 bg-green-50 text-green-700' },
                    { v: false, label: 'Não', color: 'border-red-400 bg-red-50 text-red-700' },
                  ].map(({ v, label, color }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => atualizarDetalhe(i, { trilogoChamado: v })}
                      className={`py-2.5 rounded-xl border-2 font-sans font-semibold text-sm transition-all active:scale-95 ${
                        detalhe.trilogoChamado === v
                          ? color
                          : 'border-gray-200 text-gray-300 bg-white hover:border-gray-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {i < estado.detalhes.length - 1 && (
                <div className="border-t border-gray-100" />
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={adicionarDetalhe}
          className="mt-4 w-full py-3 rounded-xl border-2 border-dashed border-teal-300 text-teal-600 hover:bg-teal-50 font-sans font-semibold text-sm flex items-center justify-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" /> Adicionar outra ocorrência
        </button>

        <div className="flex gap-3 mt-5">
          <Button
            variant="outline"
            onClick={() => atualizar({ etapa: 'ocorrencia_pergunta' })}
            className="flex-1"
          >
            Voltar
          </Button>
          <Button
            disabled={submitting}
            onClick={() => {
              const e = validarDetalhe()
              if (Object.keys(e).length > 0) {
                setFieldErrors(e)
                return
              }
              salvarLocal(true)
            }}
            className="flex-1"
          >
            Continuar <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </Card>

      {bemModalIdx >= 0 && (
        <PatrimonioBemSelector
          ambienteNome={estado.localSelecionado?.nome ?? ''}
          blocoNome={estado.blocoSelecionado ?? ''}
          onSelecionar={onSelecionarBem}
          onFechar={() => setBemModalIdx(-1)}
        />
      )}
    </>
  )
}
