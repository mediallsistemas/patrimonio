'use client'

import { CheckCircle, History } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Card from '@/components/card'
import Button from '@/components/button'
import Text from '@/components/text'
import { BLOCOS_AMBIENTES, type AmbienteConcluido } from '@/app/[tenantSlug]/manutencao/ocorrencias/types'

interface ResumoFinalProps {
  tenantSlug: string
  concluidos: AmbienteConcluido[]
  onNovaRonda: () => void
}

export default function ResumoFinal({ tenantSlug, concluidos, onNovaRonda }: ResumoFinalProps) {
  const router = useRouter()

  return (
    <Card shadow="md">
      <div className="flex flex-col items-center gap-3 py-2 mb-5">
        <div className="w-14 h-14 rounded-full bg-green-light flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-base" />
        </div>
        <div className="text-center">
          <Text as="h2" variant="heading-sm" className="text-dark block mb-1">
            Ronda concluída!
          </Text>
          <Text variant="body-sm" className="text-gray-300 block">
            {BLOCOS_AMBIENTES.length} blocos · {concluidos.length} ambientes verificados
          </Text>
        </div>
      </div>

      {/* Resumo por bloco */}
      <div className="space-y-2 mb-6">
        {BLOCOS_AMBIENTES.map((b, i) => {
          const ambsBloco = concluidos.filter((c) => c.blocoIdx === i)
          const comOcor   = ambsBloco.filter((c) => c.temOcorrencia).length
          return (
            <div
              key={b.bloco}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${
                comOcor > 0 ? 'border-orange-200 bg-orange-50' : 'border-green-200 bg-green-50'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full shrink-0 ${
                  comOcor > 0 ? 'bg-orange-400' : 'bg-green-500'
                }`}
              />
              <span className="flex-1 text-sm font-semibold font-sans text-dark">{b.bloco}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-semibold font-sans shrink-0 ${
                  comOcor > 0 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                }`}
              >
                {comOcor > 0 ? `${comOcor} ocorrência${comOcor > 1 ? 's' : ''}` : 'Normal'}
              </span>
            </div>
          )
        })}
      </div>

      <div className="space-y-3">
        <Button onClick={onNovaRonda} className="w-full">
          Nova ronda
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push(`/${tenantSlug}/manutencao/ocorrencias/historico`)}
          className="w-full"
        >
          <History className="w-4 h-4" /> Ver histórico
        </Button>
        <Button
          variant="ghost"
          onClick={() => router.push(`/${tenantSlug}/manutencao`)}
          className="w-full"
        >
          Voltar ao início
        </Button>
      </div>
    </Card>
  )
}
