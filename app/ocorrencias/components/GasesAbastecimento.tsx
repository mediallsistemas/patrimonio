'use client'

import { Package, X } from 'lucide-react'
import Card from '@/components/card'
import Button from '@/components/button'
import Text from '@/components/text'
import type { DraftEstado } from '@/app/ocorrencias/types'

interface GasesAbastecimentoProps {
  atualizar: (parcial: Partial<DraftEstado>) => void
}

export default function GasesAbastecimento({ atualizar }: GasesAbastecimentoProps) {
  return (
    <Card shadow="md">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center shrink-0">
          <Package className="w-5 h-5 text-sky-600" />
        </div>
        <div>
          <Text as="h2" variant="heading-sm" className="text-dark block">
            Abastecimento de Cilindros
          </Text>
          <Text variant="body-sm" className="text-gray-300 block">
            Houve abastecimento de cilindros?
          </Text>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <button
          onClick={() => atualizar({ etapa: 'gases_abastecimento_detalhe' })}
          className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-700 font-sans font-bold transition-all active:scale-95"
        >
          <Package className="w-8 h-8" /> Sim
        </button>
        <button
          onClick={() =>
            atualizar({ abastecimento: { quantidade: '', tamanho: null }, etapa: 'ocorrencia_pergunta' })
          }
          className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-600 font-sans font-bold transition-all active:scale-95"
        >
          <X className="w-8 h-8" /> Não
        </button>
      </div>
      <Button variant="outline" onClick={() => atualizar({ etapa: 'gases_backup' })} className="w-full">
        Voltar
      </Button>
    </Card>
  )
}
