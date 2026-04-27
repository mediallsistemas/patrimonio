'use client'

import { CheckCircle, History } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Text from '@/components/ui/Text'
import { type BlocoAPI, type DraftEstado } from '@/app/ocorrencias/types'

interface ResumoFinalProps {
  estado: DraftEstado
  blocos: BlocoAPI[]
  totalFeitos: number
  feitosNoBloco: (nome: string) => number
  resetar: () => void
}

export default function ResumoFinal({ estado, blocos, totalFeitos, feitosNoBloco, resetar }: ResumoFinalProps) {
  const router = useRouter()

  return (
    <Card shadow="md">
      <div className="flex flex-col items-center gap-3 py-2 mb-5">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <div className="text-center">
          <Text as="h2" variant="heading-sm" className="text-dark block mb-1">
            Ronda concluída!
          </Text>
          <Text variant="body-sm" className="text-gray-300 block">
            {totalFeitos} local{totalFeitos !== 1 ? 'is' : ''} verificado
            {totalFeitos !== 1 ? 's' : ''}
          </Text>
        </div>
      </div>

      {/* Resumo por bloco */}
      <div className="space-y-2 mb-6 max-h-64 overflow-y-auto pr-1">
        {blocos.map((bloco) => {
          const feitosB = feitosNoBloco(bloco.nome)
          if (feitosB === 0) return null
          const comOcorrencia = estado.concluidos.filter(
            (c) => c.bloco === bloco.nome && c.temOcorrencia,
          ).length
          return (
            <div
              key={bloco.id}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${
                comOcorrencia > 0
                  ? 'border-orange-200 bg-orange-50'
                  : 'border-green-200 bg-green-50'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full shrink-0 ${
                  comOcorrencia > 0 ? 'bg-orange-400' : 'bg-green-500'
                }`}
              />
              <span className="flex-1 text-sm font-semibold font-sans text-dark truncate">
                {bloco.nome}
              </span>
              <span className="text-xs text-gray-300 font-sans shrink-0">
                {feitosB}/{bloco.ambientes.length}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-semibold font-sans shrink-0 ${
                  comOcorrencia > 0
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-green-100 text-green-700'
                }`}
              >
                {comOcorrencia > 0
                  ? `${comOcorrencia} ocorrência${comOcorrencia > 1 ? 's' : ''}`
                  : 'Normal'}
              </span>
            </div>
          )
        })}
      </div>

      <div className="space-y-3">
        <Button onClick={resetar} className="w-full">
          Nova ronda
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push('/ocorrencias/historico')}
          className="w-full"
        >
          <History className="w-4 h-4" /> Ver histórico
        </Button>
        <Button variant="ghost" onClick={() => router.push('/')} className="w-full">
          Voltar ao início
        </Button>
      </div>
    </Card>
  )
}
