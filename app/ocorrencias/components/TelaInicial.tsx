'use client'

import { ClipboardList, Play } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Text from '@/components/ui/Text'

interface TelaInicialProps {
  totalLocais: number
  blocoCount: number
  iniciar: () => void
}

export default function TelaInicial({ totalLocais, blocoCount, iniciar }: TelaInicialProps) {
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
            {blocoCount} blocos · {totalLocais} locais
          </Text>
        </div>
      </div>
      <Button onClick={iniciar} className="w-full">
        <Play className="w-4 h-4" /> Iniciar Ronda
      </Button>
    </Card>
  )
}
