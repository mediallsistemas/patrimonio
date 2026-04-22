'use client'

import { ArrowLeft, Package, Wrench, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import { FiltrosPatrimonio } from '@/components/ui/patrimonio/FiltrosPatrimonio'
import { TicketRow } from '@/components/ui/patrimonio/TicketRow'
import { usePatrimonio } from '@/hooks/usePatrimonio'

export default function PatrimonioPage() {
  const {
    filtrado, isLoading, isError, refetch,
    start, setStart, end, setEnd,
    search, setSearch,
    statusFiltro, setStatusFiltro, statusDisponiveis,
    stats: { total, abertos, urgentes, tipos },
  } = usePatrimonio()

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Bens Patrimoniais</h1>
            <p className="text-sm text-gray-500">Tickets com patrimônio vinculado — via API Trílogo</p>
          </div>
        </div>

        <FiltrosPatrimonio
          start={start} end={end} search={search}
          statusFiltro={statusFiltro} statusDisponiveis={statusDisponiveis}
          onStartChange={setStart} onEndChange={setEnd}
          onSearchChange={setSearch} onStatusChange={setStatusFiltro}
          onRefetch={refetch}
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card padding="sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg"><Package size={18} className="text-purple-600" /></div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{total}</p>
                <p className="text-xs text-gray-500">Total de tickets</p>
              </div>
            </div>
          </Card>
          <Card padding="sm">
            <button
              onClick={() => setStatusFiltro((s) => s === 'Aberto' ? '' : 'Aberto')}
              className={`w-full text-left flex items-center gap-3 rounded-lg transition-colors ${statusFiltro === 'Aberto' ? 'ring-2 ring-amber-400' : ''}`}
            >
              <div className="p-2 bg-amber-100 rounded-lg"><AlertTriangle size={18} className="text-amber-600" /></div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{abertos}</p>
                <p className="text-xs text-gray-500">Em aberto{statusFiltro === 'Aberto' ? ' ✕' : ''}</p>
              </div>
            </button>
          </Card>
          <Card padding="sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg"><AlertTriangle size={18} className="text-red-600" /></div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{urgentes}</p>
                <p className="text-xs text-gray-500">Alta/Urgente</p>
              </div>
            </div>
          </Card>
          <Card padding="sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><Wrench size={18} className="text-blue-600" /></div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{tipos}</p>
                <p className="text-xs text-gray-500">Tipos de bem</p>
              </div>
            </div>
          </Card>
        </div>

        <Card padding="none">
          {isLoading ? (
            <div className="p-12 text-center text-gray-400 text-sm">Carregando...</div>
          ) : isError ? (
            <div className="p-12 text-center text-red-500 text-sm">Erro ao carregar dados do Trílogo.</div>
          ) : filtrado.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm">Nenhum ticket encontrado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3">Ticket</th>
                    <th className="px-4 py-3">Patrimônio</th>
                    <th className="px-4 py-3">Bem</th>
                    <th className="px-4 py-3">Categoria</th>
                    <th className="px-4 py-3">Unidade</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Prioridade</th>
                    <th className="px-4 py-3">Criado em</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtrado.map((t) => <TicketRow key={t.id} t={t} />)}
                </tbody>
              </table>
              <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
                {filtrado.length} de {total} registros
              </div>
            </div>
          )}
        </Card>

      </div>
    </div>
  )
}
