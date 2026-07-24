import { AlertTriangle } from 'lucide-react'

import {
  PRIORIDADE_CHAMADO_LABEL,
  STATUS_CHAMADO_LABEL,
  type PrioridadeChamado,
  type StatusChamado,
} from '@/modules/chamados/chamados.types'

// Badges compartilhados do domínio de chamados (painel + dashboard)

const STATUS_COLOR: Record<StatusChamado, string> = {
  aberto: 'bg-amber-100 text-amber-700',
  em_execucao: 'bg-blue-100 text-blue-700',
  finalizado: 'bg-emerald-100 text-emerald-700',
  cancelado: 'bg-gray-100 text-gray-500',
}

const PRIORIDADE_COLOR: Record<PrioridadeChamado, string> = {
  baixa: 'bg-gray-100 text-gray-500',
  media: 'bg-yellow-100 text-yellow-700',
  alta: 'bg-orange-100 text-orange-700',
  urgente: 'bg-red-100 text-red-700',
}

export function StatusChamadoBadge({ status }: { status: StatusChamado }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full font-sans ${STATUS_COLOR[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {STATUS_CHAMADO_LABEL[status] ?? status}
    </span>
  )
}

export function PrioridadeChamadoBadge({ prioridade }: { prioridade: PrioridadeChamado }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full font-sans ${PRIORIDADE_COLOR[prioridade] ?? 'bg-gray-100 text-gray-500'}`}>
      {PRIORIDADE_CHAMADO_LABEL[prioridade] ?? prioridade}
    </span>
  )
}

export function AtrasadoBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-sans">
      <AlertTriangle className="w-3 h-3" />
      Atrasado
    </span>
  )
}
