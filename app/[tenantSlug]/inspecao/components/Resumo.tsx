import { CheckCircle, FlaskConical, History } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Text from '@/components/ui/Text'
import type { ResumoInspecao } from '../inspecao.types'
import { TIPOS_ALTERACAO } from '../inspecao.types'

interface Props {
  ambiente: string
  tenantSlug: string
  resumo: ResumoInspecao
  onNovaInspecao: () => void
  onHistorico: () => void
  onVoltar: () => void
}

export default function Resumo({ ambiente, tenantSlug, resumo, onNovaInspecao, onHistorico, onVoltar }: Props) {
  return (
    <Card shadow="md">
      <div className="flex flex-col items-center gap-3 py-2 mb-5">
        <div className="w-14 h-14 rounded-full bg-green-light flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-base" />
        </div>
        <div className="text-center">
          <Text as="h2" variant="heading-sm" className="text-dark block mb-1">
            Inspeção concluída!
          </Text>
          <Text variant="body-sm" className="text-gray-300 block">
            Ambiente {ambiente} inspecionado com sucesso
          </Text>
        </div>
      </div>

      <div className={`flex items-center gap-3 p-3 rounded-xl border mb-6 ${resumo.temAlteracao ? 'border-orange-200 bg-orange-50' : 'border-green-200 bg-green-50'}`}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#7c3aed' }}>
          <FlaskConical className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold font-sans text-dark">{ambiente}</span>
          {resumo.temAbastecimento && (
            <span className="text-xs text-sky-600 font-sans ml-2">
              · {resumo.qtdCilindros} cil. {resumo.tamCilindros}
            </span>
          )}
          {resumo.temAlteracao && resumo.tipo && (
            <span className="text-xs text-orange-600 font-sans ml-2">
              · {TIPOS_ALTERACAO.find((t) => t.value === resumo.tipo)?.label}
            </span>
          )}
        </div>
        <span className={`text-xs font-semibold font-sans px-2 py-0.5 rounded-full ${resumo.temAlteracao ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
          {resumo.temAlteracao ? 'Ocorrência' : 'Normal'}
        </span>
      </div>

      <div className="space-y-3">
        <Button onClick={onNovaInspecao} className="w-full">Nova inspeção</Button>
        <Button variant="outline" onClick={onHistorico} className="w-full">
          <History className="w-4 h-4" />
          Ver histórico
        </Button>
        <Button variant="ghost" onClick={onVoltar} className="w-full">
          Voltar ao início
        </Button>
      </div>
    </Card>
  )
}
