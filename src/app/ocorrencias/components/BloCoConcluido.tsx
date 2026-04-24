'use client'

import { AlertTriangle, CheckCircle, ChevronRight } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Text from '@/components/ui/Text'
import { type BlocoAPI, type DraftEstado } from '@/app/ocorrencias/types'

interface BlocoConcluido {
  blocoAtual: BlocoAPI
  blocos: BlocoAPI[]
  concluidos: DraftEstado['concluidos']
  submitting: boolean
  finalizarRonda: () => Promise<void>
  atualizar: (parcial: Partial<DraftEstado>) => void
}

export default function BloCoConcluido({
  blocoAtual,
  blocos,
  concluidos,
  submitting,
  finalizarRonda,
  atualizar,
}: BlocoConcluido) {
  const comOcorrencia = concluidos.filter(
    (c) => c.bloco === blocoAtual.nome && c.temOcorrencia,
  ).length
  const todosConcluidos = blocos.every((b) =>
    b.ambientes.every((l) => concluidos.some((c) => c.bloco === b.nome && c.local === l.nome)),
  )

  return (
    <Card shadow="md">
      <div className="flex flex-col items-center gap-3 py-2 mb-5">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{
            backgroundColor: comOcorrencia > 0 ? '#fff7ed' : '#f0fdf4',
            border: `2px solid ${comOcorrencia > 0 ? '#fb923c' : '#86efac'}`,
          }}
        >
          {comOcorrencia > 0 ? (
            <AlertTriangle className="w-7 h-7" style={{ color: '#f97316' }} />
          ) : (
            <CheckCircle className="w-7 h-7" style={{ color: '#16a34a' }} />
          )}
        </div>
        <div className="text-center">
          <Text as="h2" variant="heading-sm" className="text-dark block mb-1">
            {blocoAtual.nome} concluído!
          </Text>
          <Text variant="body-sm" className="text-gray-300 block">
            {blocoAtual.ambientes.length} locais verificados
            {comOcorrencia > 0 && ` · ${comOcorrencia} ocorrência${comOcorrencia > 1 ? 's' : ''}`}
          </Text>
        </div>
      </div>

      {/* Resumo dos locais */}
      <div className="space-y-1.5 mb-5 max-h-48 overflow-y-auto pr-1">
        {blocoAtual.ambientes.map((l) => {
          const reg = concluidos.find((c) => c.bloco === blocoAtual.nome && c.local === l.nome)
          return (
            <div
              key={l.id}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl border ${
                reg?.temOcorrencia
                  ? 'border-orange-200 bg-orange-50'
                  : 'border-green-200 bg-green-50'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full shrink-0 ${
                  reg?.temOcorrencia ? 'bg-orange-400' : 'bg-green-500'
                }`}
              />
              <span className="flex-1 text-sm font-sans text-dark truncate">{l.nome}</span>
              <span
                className={`text-xs font-semibold font-sans shrink-0 ${
                  reg?.temOcorrencia ? 'text-orange-600' : 'text-green-600'
                }`}
              >
                {reg?.temOcorrencia ? '⚠ Ocorrência' : '✓ Normal'}
              </span>
            </div>
          )
        })}
      </div>

      <div className="space-y-2">
        {todosConcluidos ? (
          <>
            <Button onClick={finalizarRonda} disabled={submitting} className="w-full">
              <CheckCircle className="w-4 h-4" /> Finalizar Ronda
            </Button>
            <Button variant="outline" onClick={() => atualizar({ etapa: 'blocos' })} className="w-full">
              Ver todos os blocos
            </Button>
          </>
        ) : (
          <Button onClick={() => atualizar({ etapa: 'blocos' })} className="w-full">
            Selecionar próximo bloco <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </Card>
  )
}
