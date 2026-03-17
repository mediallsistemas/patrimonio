'use client'

import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Users, ArrowDownToLine, RotateCcw, Clock, ArrowLeft, LayoutDashboard, Building2,
} from 'lucide-react'
import Link from 'next/link'
import Card from '@/components/card'
import Text from '@/components/text'
import { formatarCPFDisplay } from '@/utils/format'

interface TenantStats {
  tenant: { id: string; nome: string; slug: string }
  pessoas: number
  retiradasHoje: number
  devolucoesHoje: number
  pendentes: number
}

interface RecenteAdmin {
  id: string
  pessoa_id: string
  tipo: 'retirada' | 'devolucao'
  data_hora: string
  pessoa_nome: string
  pessoa_cpf: string
  tenant_nome: string
  tenant_slug: string
}

interface AdminDashboardStats {
  totalPessoas: number
  retiradasHoje: number
  devolucoesHoje: number
  totalPendentes: number
  movimentacoesPorDia: { data: string; retiradas: number; devolucoes: number }[]
  recentes: RecenteAdmin[]
  porTenant: TenantStats[]
}

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery<AdminDashboardStats>({
    queryKey: ['admin-dashboard'],
    queryFn: () => fetch('/api/admin/dashboard').then((r) => r.json()),
    refetchInterval: 30_000,
  })

  return (
    <div className="form-bg min-h-screen flex flex-col">
      {/* Topbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm text-gray-300 hover:text-dark font-sans transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Admin
        </Link>
        <span className="text-gray-200">/</span>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#f97316] flex items-center justify-center">
            <LayoutDashboard className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold font-sans text-dark">Dashboard de Rouparia</span>
        </div>
      </div>

      <main className="flex-1 px-4 py-6 max-w-5xl mx-auto w-full space-y-6">

        {/* Cards globais */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Cadastrados',      value: data?.totalPessoas,    icon: Users,           iconBg: 'bg-blue-100',   iconColor: 'text-blue-600' },
            { label: 'Retiradas hoje',   value: data?.retiradasHoje,   icon: ArrowDownToLine, iconBg: 'bg-red-100',    iconColor: 'text-red-500'  },
            { label: 'Devoluções hoje',  value: data?.devolucoesHoje,  icon: RotateCcw,       iconBg: 'bg-emerald-100',iconColor: 'text-emerald-600' },
            { label: 'Pendentes',        value: data?.totalPendentes,  icon: Clock,           iconBg: 'bg-amber-100',  iconColor: 'text-amber-600' },
          ].map(({ label, value, icon: Icon, iconBg, iconColor }) => (
            <Card key={label} shadow="sm" padding="sm">
              <div className="flex items-center gap-3">
                <div className={`${iconBg} p-3 rounded-xl shrink-0`}>
                  <Icon className={`${iconColor} w-5 h-5`} />
                </div>
                <div>
                  <p className="text-xs text-gray-300 font-sans">{label}</p>
                  <p className="text-xl font-bold font-sans text-dark">
                    {isLoading ? '—' : String(value ?? 0)}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Por unidade */}
        {!isLoading && (data?.porTenant ?? []).length > 0 && (
          <div>
            <Text as="h2" variant="heading-sm" className="text-dark mb-3 block">
              Por unidade
            </Text>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(data?.porTenant ?? []).map(({ tenant, pessoas, retiradasHoje, devolucoesHoje, pendentes }) => (
                <Link key={tenant.id} href={`/${tenant.slug}/dashboard`}>
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all p-4 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold font-sans text-dark">{tenant.nome}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                        <span className="text-xs text-gray-300 font-sans">{pessoas} cadastrados</span>
                        <span className="text-xs text-red-400 font-sans font-semibold">{retiradasHoje} retiradas</span>
                        <span className="text-xs text-emerald-600 font-sans font-semibold">{devolucoesHoje} devoluções</span>
                        {pendentes > 0 && (
                          <span className="text-xs text-amber-500 font-sans font-semibold">{pendentes} pendentes</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Gráfico */}
        <Card shadow="sm">
          <Text as="h2" variant="heading-sm" className="text-dark mb-5 block">
            Movimentações globais — últimos 7 dias
          </Text>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data?.movimentacoesPorDia ?? []} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="data" tick={{ fontSize: 12, fontFamily: 'Cairo', fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fontFamily: 'Cairo', fill: '#9ca3af' }} allowDecimals={false} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontFamily: 'Cairo', borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.07)' }} />
              <Legend wrapperStyle={{ fontFamily: 'Cairo', fontSize: 13 }} />
              <Bar dataKey="retiradas" fill="#f97316" name="Retiradas" radius={[6, 6, 0, 0]} />
              <Bar dataKey="devolucoes" fill="#10b981" name="Devoluções" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Movimentações recentes */}
        <Card shadow="sm">
          <Text as="h2" variant="heading-sm" className="text-dark mb-5 block">
            Últimas movimentações
          </Text>

          {isLoading ? (
            <p className="text-center py-10 text-gray-300 font-sans text-sm">Carregando...</p>
          ) : !data?.recentes?.length ? (
            <p className="text-center py-10 text-gray-300 font-sans text-sm">Nenhuma movimentação registrada ainda.</p>
          ) : (
            <div className="space-y-2">
              {data.recentes.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 ${
                    m.tipo === 'retirada' ? 'border-orange-200 bg-orange-50' : 'border-emerald-200 bg-emerald-50'
                  }`}
                >
                  <span className={`text-xs font-semibold font-sans px-2 py-0.5 rounded-full shrink-0 ${
                    m.tipo === 'retirada' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {m.tipo === 'retirada' ? '↓ Retirada' : '↑ Devolução'}
                  </span>
                  <span className="text-sm font-semibold font-sans text-dark flex-1 truncate">{m.pessoa_nome}</span>
                  <span className="text-xs text-gray-300 font-sans shrink-0">{formatarCPFDisplay(m.pessoa_cpf)}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold font-sans shrink-0">{m.tenant_nome}</span>
                  <span className="text-xs text-gray-300 font-sans shrink-0">
                    {format(new Date(m.data_hora), "dd/MM 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

      </main>
    </div>
  )
}
