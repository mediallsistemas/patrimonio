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
import Card from '@/components/ui/Card'
import Text from '@/components/ui/Text'
import Header from '@/components/ui/Header'
import { api } from '@/services/api'
import type { DashboardStats, Movimentacao } from '@/types'
import { formatarCPFDisplay } from '@/utils/format'

function groupByPerson(movs: Movimentacao[]) {
  // Sort oldest first to pair retirada → devolucao correctly
  const sorted = [...movs].sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime())

  const groups: {
    pessoaId: string
    nome: string
    cpf: string
    retirada: Movimentacao
    devolucao: Movimentacao | null
  }[] = []

  const usedIds = new Set<string>()

  for (const mov of sorted) {
    if (usedIds.has(mov.id)) continue
    if (mov.tipo !== 'retirada') continue

    usedIds.add(mov.id)

    // Find the next devolucao from same person after this retirada
    const devolucao = sorted.find(
      (d) =>
        !usedIds.has(d.id) &&
        d.tipo === 'devolucao' &&
        d.pessoa_id === mov.pessoa_id &&
        new Date(d.data_hora) > new Date(mov.data_hora)
    ) ?? null

    if (devolucao) usedIds.add(devolucao.id)

    groups.push({
      pessoaId: mov.pessoa_id,
      nome: mov.pessoa_nome ?? '',
      cpf: mov.pessoa_cpf ?? '',
      retirada: mov,
      devolucao,
    })
  }

  // Show most recent first
  return groups.reverse()
}

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

        {/* Recent movements — agrupado por pessoa */}
        <Card shadow="sm">
          <Text as="h2" variant="heading-sm" className="text-dark mb-5 block">
            Últimas movimentações
          </Text>

          {isLoading ? (
            <p className="text-center py-10 text-gray-300 font-sans text-sm">Carregando...</p>
          ) : !data?.recentes?.length ? (
            <p className="text-center py-10 text-gray-300 font-sans text-sm">Nenhuma movimentação registrada ainda.</p>
          ) : (
            <div className="space-y-3">
              {groupByPerson(data.recentes).map((group) => (
                <div
                  key={group.pessoaId + group.retirada.id}
                  className={`rounded-xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 ${
                    group.devolucao ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'
                  }`}
                >
                  {/* Status indicator */}
                  <div className="flex items-center gap-2 sm:w-28 shrink-0">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${group.devolucao ? 'bg-green-500' : 'bg-orange-400 animate-pulse'}`} />
                    <span className={`text-xs font-semibold font-sans ${group.devolucao ? 'text-green-700' : 'text-orange-600'}`}>
                      {group.devolucao ? 'Devolvido' : 'Pendente'}
                    </span>
                  </div>

                  {/* Person */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold font-sans text-dark truncate">{group.nome}</p>
                    <p className="text-xs font-sans text-gray-300">{formatarCPFDisplay(group.cpf)}</p>
                  </div>

                  {/* Retirada */}
                  <div className="flex items-center gap-2 text-xs font-sans text-gray-400 shrink-0">
                    <span className="inline-flex items-center gap-1 bg-red-light text-red-dark px-2 py-0.5 rounded-full font-semibold">
                      ↓ Retirada
                    </span>
                    {format(new Date(group.retirada.data_hora), "dd/MM 'às' HH:mm", { locale: ptBR })}
                  </div>

                  {/* Arrow */}
                  <span className="hidden sm:block text-gray-300 text-sm">→</span>

                  {/* Devolução */}
                  <div className="flex items-center gap-2 text-xs font-sans shrink-0">
                    {group.devolucao ? (
                      <>
                        <span className="inline-flex items-center gap-1 bg-green-light text-green-dark px-2 py-0.5 rounded-full font-semibold">
                          ↑ Devolução
                        </span>
                        <span className="text-gray-400">
                          {format(new Date(group.devolucao.data_hora), "dd/MM 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </>
                    ) : (
                      <span className="text-orange-400 font-semibold">Aguardando devolução...</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

      </main>
    </div>
  )
}
