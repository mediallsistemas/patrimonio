'use client'

import { ChevronRight, Package } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Text from '@/components/ui/Text'
import CilindrosAbastecimento from '@/components/ui/ronda/CilindrosAbastecimento'
import { cilindrosDoDraft } from '@/utils/cilindros'
import type { DraftEstado } from '@/app/ocorrencias/types'

interface GasesAbastecimentoDetalheProps {
  estado: DraftEstado
  errors: Record<string, string>
  atualizar: (parcial: Partial<DraftEstado>) => void
  validarAbastecimento: () => Record<string, string>
  setFieldErrors: (e: Record<string, string>) => void
}

export default function GasesAbastecimentoDetalhe({
  estado,
  errors,
  atualizar,
  validarAbastecimento,
  setFieldErrors,
}: GasesAbastecimentoDetalheProps) {
  return (
    <Card shadow="md">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-blue-light flex items-center justify-center shrink-0">
          <Package className="w-5 h-5 text-blue-base" />
        </div>
        <Text as="h2" variant="heading-sm" className="text-dark block">
          Dados do Abastecimento
        </Text>
      </div>
      <CilindrosAbastecimento
        cilindros={cilindrosDoDraft(estado)}
        errors={errors}
        onChange={(cilindros) => atualizar({ cilindros })}
      />
      <div className="flex gap-3 mt-6">
        <Button
          variant="outline"
          onClick={() => atualizar({ etapa: 'gases_abastecimento' })}
          className="flex-1"
        >
          Voltar
        </Button>
        <Button
          onClick={() => {
            const e = validarAbastecimento()
            if (Object.keys(e).length > 0) { setFieldErrors(e); return }
            atualizar({ etapa: 'ocorrencia_pergunta' })
          }}
          className="flex-1"
        >
          Continuar <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  )
}
