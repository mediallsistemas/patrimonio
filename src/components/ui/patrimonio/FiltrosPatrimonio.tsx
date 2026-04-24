'use client'

import Card from '@/components/ui/Card'

interface FiltrosPatrimonioProps {
  start: string
  end: string
  search: string
  statusFiltro: string
  statusDisponiveis: string[]
  onStartChange: (v: string) => void
  onEndChange: (v: string) => void
  onSearchChange: (v: string) => void
  onStatusChange: (v: string) => void
  onRefetch: () => void
}

export function FiltrosPatrimonio({
  start, end, search, statusFiltro, statusDisponiveis,
  onStartChange, onEndChange, onSearchChange, onStatusChange, onRefetch,
}: FiltrosPatrimonioProps) {
  return (
    <Card padding="sm">
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">De</label>
          <input
            type="date"
            value={start}
            onChange={(e) => onStartChange(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Até</label>
          <input
            type="date"
            value={end}
            onChange={(e) => onEndChange(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-gray-500 mb-1">Buscar</label>
          <input
            type="text"
            placeholder="Patrimônio, bem, descrição..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Status</label>
          <select
            value={statusFiltro}
            onChange={(e) => onStatusChange(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
          >
            <option value="">Todos</option>
            {statusDisponiveis.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <button
          onClick={onRefetch}
          className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
        >
          Atualizar
        </button>
      </div>
    </Card>
  )
}
