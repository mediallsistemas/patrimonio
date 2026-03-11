'use client'

import { useQuery } from '@tanstack/react-query'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Users, ArrowDownToLine, RotateCcw, Clock } from 'lucide-react'
import Card from '@/components/card'
import Text from '@/components/text'
import Header from '@/components/header'
import { api } from '@/services/api'
import type { DashboardStats, Movimentacao } from '@/types'
import { formatarCPFDisplay } from '@/utils/format'

const statCards = [
  {
    key: 'totalPessoas' as const,
    label: 'Cadastrados',
    icon: Users,
    iconBg: 'bg-blue-light',
    iconColor: 'text-blue-base',
  },
  {
    key: 'retiradasHoje' as const,
    label: 'Retiradas hoje',
    icon: ArrowDownToLine,
    iconBg: 'bg-red-light',
    iconColor: 'text-red-base',
  },
  {
    key: 'devolucoesHoje' as const,
    label: 'Devoluções hoje',
    icon: RotateCcw,
    iconBg: 'bg-green-light',
    iconColor: 'text-green-base',
  },
  {
    key: 'totalPendentes' as const,
    label: 'Pendentes',
    icon: Clock,
    iconBg: 'bg-yellow-light',
    iconColor: 'text-yellow-base',
  },
]

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardStats>('dashboard'),
    refetchInterval: 30_000,
  })

  return (
    <div className="form-bg min-h-screen flex flex-col">
      <Header title="Dashboard" />

      <main className="flex-1 px-6 py-6 max-w-6xl mx-auto w-full">

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {statCards.map(({ key, label, icon: Icon, iconBg, iconColor }) => (
            <Card key={key} shadow="sm" padding="sm">
              <div className="flex items-center gap-3">
                <div className={`${iconBg} p-3 rounded-xl shrink-0`}>
                  <Icon className={`${iconColor} w-5 h-5`} />
                </div>
                <div>
                  <Text variant="caption" className="text-gray-300 block">
                    {label}
                  </Text>
                  <Text as="p" variant="heading-sm" className="text-dark">
                    {isLoading ? '—' : String(data?.[key] ?? 0)}
                  </Text>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Chart */}
        <Card shadow="sm" className="mb-6">
          <Text as="h2" variant="heading-sm" className="text-dark mb-5 block">
            Movimentações — últimos 7 dias
          </Text>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data?.movimentacoesPorDia ?? []} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="data" tick={{ fontSize: 12, fontFamily: 'Cairo', fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fontFamily: 'Cairo', fill: '#9ca3af' }} allowDecimals={false} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ fontFamily: 'Cairo', borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.07)' }}
              />
              <Legend wrapperStyle={{ fontFamily: 'Cairo', fontSize: 13 }} />
              <Bar dataKey="retiradas" fill="#f97316" name="Retiradas" radius={[6, 6, 0, 0]} />
              <Bar dataKey="devolucoes" fill="#10b981" name="Devoluções" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Recent movements table */}
        <Card shadow="sm">
          <Text as="h2" variant="heading-sm" className="text-dark mb-5 block">
            Últimas movimentações
          </Text>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  {['Nome', 'CPF', 'Tipo', 'Data / Hora'].map((h) => (
                    <th
                      key={h}
                      className="text-left py-2 px-3 text-xs font-semibold text-gray-300 font-sans uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-gray-300 font-sans text-sm">
                      Carregando...
                    </td>
                  </tr>
                ) : !data?.recentes?.length ? (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-gray-300 font-sans text-sm">
                      Nenhuma movimentação registrada ainda.
                    </td>
                  </tr>
                ) : (
                  data.recentes.map((m: Movimentacao) => (
                    <tr
                      key={m.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-3 text-sm font-sans text-dark font-semibold">
                        {m.pessoa_nome}
                      </td>
                      <td className="py-3 px-3 text-sm font-sans text-gray-300">
                        {formatarCPFDisplay(m.pessoa_cpf ?? '')}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold font-sans ${
                            m.tipo === 'retirada'
                              ? 'bg-red-light text-red-dark'
                              : 'bg-green-light text-green-dark'
                          }`}
                        >
                          {m.tipo === 'retirada' ? 'Retirada' : 'Devolução'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-sm font-sans text-gray-300">
                        {format(new Date(m.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

      </main>
    </div>
  )
}
