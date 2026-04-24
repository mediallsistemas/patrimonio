interface Props {
  ambiente: string
  progressoTotal: number
}

export default function BarraProgresso({ ambiente, progressoTotal }: Props) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-sans text-gray-300">
        <span className="font-semibold text-dark">{ambiente}</span>
        <span>{Math.round(progressoTotal)}% concluído</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-red-base rounded-full transition-all duration-500"
          style={{ width: `${progressoTotal}%` }}
        />
      </div>
    </div>
  )
}
