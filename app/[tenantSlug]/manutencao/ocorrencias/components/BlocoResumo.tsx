'use client'

import { CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import Card from '@/components/card'
import Button from '@/components/button'
import Text from '@/components/text'
import {
  BLOCOS_AMBIENTES,
  TIPOS_OCORRENCIA,
  type AmbienteConcluido,
} from '@/app/[tenantSlug]/manutencao/ocorrencias/types'

interface BlocoResumoProps {
  blocoIdx: number
  concluidosBloco: AmbienteConcluido[]
  isUltimoBloco: boolean
  handleProximoBloco: () => void
  handleVoltarBloco: () => void
}

export default function BlocoResumo({
  blocoIdx,
  concluidosBloco,
  isUltimoBloco,
  handleProximoBloco,
  handleVoltarBloco,
}: BlocoResumoProps) {
  const blocoAtual = BLOCOS_AMBIENTES[blocoIdx]

  return (
    <Card shadow="md">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-green-100">
          <CheckCircle className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <Text as="h2" variant="heading-sm" className="text-dark block">
            {blocoAtual.bloco} concluído
          </Text>
          <Text variant="body-sm" className="text-gray-300 block">
            {concluidosBloco.length} ambiente{concluidosBloco.length !== 1 ? 's' : ''} verificado
            {concluidosBloco.length !== 1 ? 's' : ''}
          </Text>
        </div>
      </div>

      {/* Lista de ambientes do bloco */}
      <div className="space-y-1.5 mb-6">
        {concluidosBloco.map(({ ambiente, temOcorrencia, tipo }) => (
          <div
            key={ambiente}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${
              temOcorrencia ? 'border-orange-200 bg-orange-50' : 'border-green-200 bg-green-50'
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full shrink-0 ${
                temOcorrencia ? 'bg-orange-400' : 'bg-green-500'
              }`}
            />
            <span className="flex-1 text-sm font-sans text-dark truncate">{ambiente}</span>
            {temOcorrencia && tipo ? (
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-semibold font-sans shrink-0 ${
                  TIPOS_OCORRENCIA.find((t) => t.value === tipo)?.active ?? ''
                }`}
              >
                {TIPOS_OCORRENCIA.find((t) => t.value === tipo)?.label}
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold font-sans bg-green-100 text-green-700 shrink-0">
                Normal
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Navegação */}
      {!isUltimoBloco ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-300 font-sans">próximo</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>
          <div className="px-3 py-2.5 rounded-xl bg-teal-50 border border-teal-200 mb-3 text-sm font-sans text-teal-700">
            <strong>{BLOCOS_AMBIENTES[blocoIdx + 1].bloco}</strong>
            {' · '}
            {BLOCOS_AMBIENTES[blocoIdx + 1].ambientes.length} ambientes
          </div>
          <div className="flex gap-3">
            {blocoIdx > 0 && (
              <Button variant="outline" onClick={handleVoltarBloco} className="flex-1">
                <ChevronLeft className="w-4 h-4" /> Bloco anterior
              </Button>
            )}
            <Button onClick={handleProximoBloco} className="flex-1">
              Próximo bloco <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {blocoIdx > 0 && (
            <Button variant="outline" onClick={handleVoltarBloco} className="w-full">
              <ChevronLeft className="w-4 h-4" /> Revisar bloco anterior
            </Button>
          )}
          <Button onClick={handleProximoBloco} className="w-full">
            <CheckCircle className="w-4 h-4" /> Finalizar ronda
          </Button>
        </div>
      )}
    </Card>
  )
}
