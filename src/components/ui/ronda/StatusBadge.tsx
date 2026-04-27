import type { Ronda } from '@/services/rondas.types'

export function StatusBadge({ ronda }: { ronda: Ronda }) {
  const totalOcs = ronda.ambientes
    .filter((a) => a.temOcorrencia)
    .reduce((acc, a) => acc + a.ocorrencias.length, 0)
  const emAndamento = ronda.finalizadoEm === null

  if (emAndamento) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full font-semibold font-sans bg-blue-100 text-blue-700 animate-pulse">
        Em andamento
      </span>
    )
  }

  if (totalOcs > 0) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full font-semibold font-sans bg-orange-100 text-orange-700">
        {totalOcs} ocorrência{totalOcs > 1 ? 's' : ''}
      </span>
    )
  }

  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-semibold font-sans bg-green-100 text-green-700">
      Tudo normal
    </span>
  )
}
