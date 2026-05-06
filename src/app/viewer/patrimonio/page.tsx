'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as adminPatrimonioService from '@/services/admin-patrimonio.service'
import { format, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowLeft, Package, Wrench, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import type { Ticket } from '@/services/admin-patrimonio.service'

const STATUS_COLOR: Record<string, string> = {
  'Aberto':       'bg-amber-100 text-amber-700',
  'Em andamento': 'bg-blue-100 text-blue-700',
  'Concluído':    'bg-emerald-100 text-emerald-700',
  'Cancelado':    'bg-gray-100 text-gray-500',
}

const PRIORITY_LABEL: Record<number, { label: string; color: string }> = {
  1: { label: 'Baixa',   color: 'bg-gray-100 text-gray-500' },
  2: { label: 'Média',   color: 'bg-yellow-100 text-yellow-700' },
  3: { label: 'Alta',    color: 'bg-orange-100 text-orange-700' },
  4: { label: 'Urgente', color: 'bg-red-100 text-red-700' },
}

function fmt(date: string) {
  return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: ptBR })
}

function TicketRow({ t }: { t: Ticket }) {
  const [open, setOpen] = useState(false)
  const status   = t.currentStatus?.actionDescription ?? '—'
  const priority = PRIORITY_LABEL[t.priority] ?? { label: '—', color: 'bg-gray-100 text-gray-400' }

  return (
    <>
      <tr className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => setOpen((o) => !o)}>
        <td className="px-4 py-3 text-sm font-mono text-gray-500">#{t.id}</td>
        <td className="px-4 py-3 text-sm font-medium text-gray-800">{t.patrimony}</td>
        <td className="px-4 py-3 text-sm text-gray-700">{t.assetName}</td>
        <td className="px-4 py-3 text-sm text-gray-500">{t.assetTypeName}</td>
        <td className="px-4 py-3 text-sm text-gray-500">{t.companyName}</td>
        <td className="px-4 py-3">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[status] ?? 'bg-gray-100 text-gray-500'}`}>{status}</span>
        </td>
        <td className="px-4 py-3">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${priority.color}`}>{priority.label}</span>
        </td>
        <td className="px-4 py-3 text-sm text-gray-400">{fmt(t.creationDate)}</td>
        <td className="px-4 py-3 text-gray-400">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </td>
      </tr>
      {open && (
        <tr className="bg-gray-50">
          <td colSpan={9} className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div><p className="text-gray-400 text-xs mb-1">Descrição</p><p className="text-gray-700">{t.description}</p></div>
              <div><p className="text-gray-400 text-xs mb-1">Localização</p><p className="text-gray-700">{t.departmentFullAddress}</p></div>
              <div><p className="text-gray-400 text-xs mb-1">Responsável</p><p className="text-gray-700">{t.assigneeName}</p></div>
              <div><p className="text-gray-400 text-xs mb-1">Prazo</p><p className="text-gray-700">{fmt(t.deadline)}</p></div>
              <div><p className="text-gray-400 text-xs mb-1">Tipo de serviço</p><p className="text-gray-700">{t.buildingServiceTypeDescription}</p></div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function ViewerPatrimonioPage() {
  const hoje = new Date()
  const [start, setStart] = useState(format(subMonths(hoje, 3), 'yyyy-MM-dd'))
  const [end, setEnd]     = useState(format(hoje, 'yyyy-MM-dd'))
  const [search, setSearch]       = useState('')
  const [statusFiltro, setStatusFiltro] = useState('')

  const { data = [], isLoading, isError, refetch } = useQuery<Ticket[]>({
    queryKey: ['viewer-patrimonio', start, end],
    queryFn: () => adminPatrimonioService.listarChamados(start, end),
  })

  const filtrado = data.filter((t) => {
    const q = search.toLowerCase()
    const matchTexto = !q || t.patrimony?.toLowerCase().includes(q) || t.assetName?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q) || t.companyName?.toLowerCase().includes(q)
    const matchStatus = !statusFiltro || (t.currentStatus?.actionDescription ?? '') === statusFiltro
    return matchTexto && matchStatus
  })

  const total    = data.length
  const abertos  = data.filter((t) => t.currentStatus?.actionDescription === 'Aberto').length
  const urgentes = data.filter((t) => t.priority >= 3).length
  const tipos    = [...new Set(data.map((t) => t.assetTypeName))].length
  const statusDisponiveis = [...new Set(data.map((t) => t.currentStatus?.actionDescription).filter(Boolean))].sort() as string[]

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        <div className="flex items-center gap-4">
          <Link href="/viewer" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Bens Patrimoniais</h1>
            <p className="text-sm text-gray-500">Tickets com patrimônio vinculado — via API Trílogo</p>
          </div>
        </div>

        <Card padding="sm">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">De</label>
              <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Até</label>
              <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-gray-500 mb-1">Buscar</label>
              <input type="text" placeholder="Patrimônio, bem, descrição..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Status</label>
              <select value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300">
                <option value="">Todos</option>
                {statusDisponiveis.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <button onClick={() => refetch()} className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors">Atualizar</button>
          </div>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card padding="sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg"><Package size={18} className="text-purple-600" /></div>
              <div><p className="text-2xl font-bold text-gray-800">{total}</p><p className="text-xs text-gray-500">Total de tickets</p></div>
            </div>
          </Card>
          <Card padding="sm">
            <button onClick={() => setStatusFiltro((s) => s === 'Aberto' ? '' : 'Aberto')} className={`w-full text-left flex items-center gap-3 rounded-lg transition-colors ${statusFiltro === 'Aberto' ? 'ring-2 ring-amber-400' : ''}`}>
              <div className="p-2 bg-amber-100 rounded-lg"><AlertTriangle size={18} className="text-amber-600" /></div>
              <div><p className="text-2xl font-bold text-gray-800">{abertos}</p><p className="text-xs text-gray-500">Em aberto{statusFiltro === 'Aberto' ? ' ✕' : ''}</p></div>
            </button>
          </Card>
          <Card padding="sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg"><AlertTriangle size={18} className="text-red-600" /></div>
              <div><p className="text-2xl font-bold text-gray-800">{urgentes}</p><p className="text-xs text-gray-500">Alta/Urgente</p></div>
            </div>
          </Card>
          <Card padding="sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><Wrench size={18} className="text-blue-600" /></div>
              <div><p className="text-2xl font-bold text-gray-800">{tipos}</p><p className="text-xs text-gray-500">Tipos de bem</p></div>
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
