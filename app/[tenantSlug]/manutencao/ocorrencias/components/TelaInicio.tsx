'use client'

import Link from 'next/link'
import { ChevronRight, ClipboardList, History } from 'lucide-react'
import Card from '@/components/card'
import Button from '@/components/button'
import Text from '@/components/text'
import { BLOCOS_AMBIENTES } from '@/app/[tenantSlug]/manutencao/ocorrencias/types'

interface TelaInicioProps {
  tenantSlug: string
  submitting: boolean
  handleIniciar: () => Promise<void>
}

export default function TelaInicio({ tenantSlug, submitting, handleIniciar }: TelaInicioProps) {
  const totalAmbientes = BLOCOS_AMBIENTES.reduce((acc, b) => acc + b.ambientes.length, 0)

  return (
    <Card shadow="md">
      <div className="flex flex-col items-center gap-4 py-2 mb-5">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: '#0f766e' }}
        >
          <ClipboardList className="w-7 h-7 text-white" />
        </div>
        <div className="text-center">
          <Text as="h2" variant="heading-sm" className="text-dark mb-1 block">
            Registro de Ocorrências
          </Text>
          <Text variant="body-sm" className="text-gray-300 block">
            {BLOCOS_AMBIENTES.length} blocos · {totalAmbientes} ambientes
          </Text>
        </div>
      </div>

      {/* Lista de blocos */}
      <div className="grid grid-cols-2 gap-2 mb-6">
        {BLOCOS_AMBIENTES.map((b, i) => (
          <div
            key={b.bloco}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100"
          >
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold font-sans text-white"
              style={{ backgroundColor: '#0f766e' }}
            >
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold font-sans text-dark leading-tight">{b.bloco}</p>
              <p className="text-xs text-gray-300 font-sans">{b.ambientes.length} amb.</p>
            </div>
          </div>
        ))}
      </div>

      <Button onClick={handleIniciar} disabled={submitting} className="w-full">
        {submitting ? 'Iniciando...' : 'Iniciar Ronda'} <ChevronRight className="w-4 h-4" />
      </Button>

      <div className="mt-4 pt-4 border-t border-gray-100 text-center">
        <Link
          href={`/${tenantSlug}/manutencao/ocorrencias/historico`}
          className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-red-base font-sans transition-colors"
        >
          <History className="w-4 h-4" /> Ver histórico de rondas
        </Link>
      </div>
    </Card>
  )
}
