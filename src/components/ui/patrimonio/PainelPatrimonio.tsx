'use client'

import Link from 'next/link'
import { ArrowLeft, Package, PlayCircle, AlertTriangle, Clock } from 'lucide-react'
import Card from '@/components/ui/Card'
import TicketRow from '@/components/ui/patrimonio/TicketRow'
import { usePatrimonio } from '@/hooks/usePatrimonio'
import type { StatusChamado } from '@/modules/chamados/chamados.types'

// Corpo compartilhado de /admin/patrimonio e /viewer/patrimonio. As duas telas
// eram cópias quase idênticas; a diferença real é para onde o "voltar" aponta.

export default function PainelPatrimonio({ voltarPara }: { voltarPara: string }) {
  const {
    filtrado, isLoading, isError, refetch,
    search, setSearch,
    statusFiltro, setStatusFiltro, statusDisponiveis,
    stats,
  } = usePatrimonio()

  function alternarStatus(s: StatusChamado) {
    setStatusFiltro((atual) => (atual === s ? '' : s))
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        <div className="flex items-center gap-4">
          <Link href={voltarPara} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Bens Patrimoniais</h1>
            <p className="text-sm text-gray-500">
              Chamados com bem vinculado — abertos aqui ou importados do Trílogo
            </p>
          </div>
        </div>

        <Card padding="sm">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[220px]">
              <label className="block text-xs text-gray-500 mb-1">Buscar</label>
              <input
                type="text"
                placeholder="Patrimônio, bem, descrição, unidade..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Status</label>
              <select
                value={statusFiltro}
                onChange={(e) => setStatusFiltro(e.target.value as StatusChamado | '')}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              >
                <option value="">Todos</option>
                {statusDisponiveis.map((s) => (
                  <option key={s.valor} value={s.valor}>{s.rotulo}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
            >
              Atualizar
            </button>
          </div>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card padding="sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg"><Package size={18} className="text-purple-600" /></div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
                <p className="text-xs text-gray-500">Total de chamados</p>
              </div>
            </div>
          </Card>

          <Card padding="sm">
            <button
              onClick={() => alternarStatus('aberto')}
              className={`w-full text-left flex items-center gap-3 rounded-lg transition-colors ${statusFiltro === 'aberto' ? 'ring-2 ring-amber-400' : ''}`}
            >
              <div className="p-2 bg-amber-100 rounded-lg"><AlertTriangle size={18} className="text-amber-600" /></div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{stats.abertos}</p>
                <p className="text-xs text-gray-500">Em aberto{statusFiltro === 'aberto' ? ' ✕' : ''}</p>
              </div>
            </button>
          </Card>

          <Card padding="sm">
            <button
              onClick={() => alternarStatus('em_execucao')}
              className={`w-full text-left flex items-center gap-3 rounded-lg transition-colors ${statusFiltro === 'em_execucao' ? 'ring-2 ring-blue-400' : ''}`}
            >
              <div className="p-2 bg-blue-100 rounded-lg"><PlayCircle size={18} className="text-blue-600" /></div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{stats.emExecucao}</p>
                <p className="text-xs text-gray-500">Em execução{statusFiltro === 'em_execucao' ? ' ✕' : ''}</p>
              </div>
            </button>
          </Card>

          {/* Substitui o contador de "urgentes" do Trílogo, que somava
              priority >= 3 e mostrava sempre zero — a API devolve priority 2
              em todos os tickets. Atraso é derivado do prazo e diz algo real. */}
          <Card padding="sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg"><Clock size={18} className="text-red-600" /></div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{stats.atrasados}</p>
                <p className="text-xs text-gray-500">Atrasados</p>
              </div>
            </div>
          </Card>
        </div>

        <Card padding="none">
          {isLoading ? (
            <div className="p-12 text-center text-gray-400 text-sm">Carregando...</div>
          ) : isError ? (
            <div className="p-12 text-center text-red-500 text-sm">Erro ao carregar os chamados.</div>
          ) : filtrado.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm">
              Nenhum chamado com bem vinculado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3">Chamado</th>
                    <th className="px-4 py-3">Patrimônio</th>
                    <th className="px-4 py-3">Bem</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Unidade</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Prioridade</th>
                    <th className="px-4 py-3">Criado em</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtrado.map((c) => <TicketRow key={c.id} c={c} />)}
                </tbody>
              </table>
              <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
                {filtrado.length} de {stats.total} registros
              </div>
            </div>
          )}
        </Card>

      </div>
    </div>
  )
}
