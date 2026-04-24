interface Props {
  totalFeitos: number
  totalLocais: number
  progresso: number
}

export default function BarraProgresso({ totalFeitos, totalLocais, progresso }: Props) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-sans text-gray-300">
        <span className="font-semibold text-dark">
          {totalFeitos} / {totalLocais} locais
        </span>
        <span>{progresso}% concluído</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-red-base rounded-full transition-all duration-500"
          style={{ width: `${progresso}%` }}
        />
      </div>
    </div>
  )
}
