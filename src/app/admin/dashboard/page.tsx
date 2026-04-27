'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as adminTenantsService from '@/services/admin-tenants.service'
import * as adminDashboardService from '@/services/admin-dashboard.service'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Users, ArrowDownToLine, RotateCcw, Clock, ArrowLeft, LayoutDashboard, Building2, ChevronDown,
} from 'lucide-react'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import Text from '@/components/ui/Text'
import { formatarCPFDisplay } from '@/utils/format'
import { useAuth } from '@/hooks/useAuth'

interface Tenant {
  id: string
  nome: string
  slug: string
  feedbackForms?: boolean
}

interface RecenteMovimentacao {
  id: string
  pessoa_id: string
  tipo: 'retirada' | 'devolucao'
  data_hora: string
  pessoa_nome: string
  pessoa_cpf: string
}

interface TenantDashboardStats {
  tenant: Tenant
  totalPessoas: number
  retiradasHoje: number
  devolucoesHoje: number
  totalPendentes: number
  movimentacoesPorDia: { data: string; retiradas: number; devolucoes: number }[]
  recentes: RecenteMovimentacao[]
}

function groupByPerson(movs: RecenteMovimentacao[]) {
  const sorted = [...movs].sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime())
  const groups: {
    pessoaId: string
    nome: string
    cpf: string
    retirada: RecenteMovimentacao
    devolucao: RecenteMovimentacao | null
  }[] = []
  const usedIds = new Set<string>()

  for (const mov of sorted) {
    if (usedIds.has(mov.id)) continue
    if (mov.tipo !== 'retirada') continue
    usedIds.add(mov.id)
    const devolucao = sorted.find(
      (d) =>
        !usedIds.has(d.id) &&
        d.tipo === 'devolucao' &&
        d.pessoa_id === mov.pessoa_id &&
        new Date(d.data_hora) > new Date(mov.data_hora)
    ) ?? null
    if (devolucao) usedIds.add(devolucao.id)
    groups.push({ pessoaId: mov.pessoa_id, nome: mov.pessoa_nome, cpf: mov.pessoa_cpf, retirada: mov, devolucao })
  }
  return groups.reverse()
}

function TenantSelector({
  tenants,
  selectedId,
  onSelect,
}: {
  tenants: Tenant[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const selected = tenants.find((t) => t.id === selectedId)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold font-sans text-dark shadow-sm hover:border-indigo-300 hover:shadow-md transition-all min-w-56"
      >
        <Building2 className="w-4 h-4 text-indigo-500 shrink-0" />
        <span className="flex-1 text-left truncate">
          {selected ? selected.nome : 'Selecione uma unidade...'}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 bg-white border border-gray-200 rounded-xl shadow-lg min-w-56 py-1 overflow-hidden">
          {tenants.map((t) => (
            <button
              key={t.id}
              onClick={() => { onSelect(t.id); setOpen(false) }}
              className={`w-full text-left px-4 py-2.5 text-sm font-sans hover:bg-indigo-50 transition-colors flex items-center gap-2 ${
                t.id === selectedId ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-dark'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
              {t.nome}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdminDashboardPage() {
  const { user, isLoading: authLoading } = useAuth()
  const isSuperAdmin = user?.role === 'super_admin'

  // tenant_admin usa o próprio tenant fixo; super_admin escolhe no seletor
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null)
  const effectiveTenantId = isSuperAdmin ? selectedTenantId : (user?.tenantId ?? null)

  const { data: allTenants = [], isLoading: loadingTenants } = useQuery<Tenant[]>({
    queryKey: ['admin-tenants'],
    queryFn: () => adminTenantsService.listarTenants(),
    enabled: isSuperAdmin && !authLoading,
  })
  const tenants = allTenants.filter((t) => t.feedbackForms)

  const { data, isLoading } = useQuery<TenantDashboardStats>({
    queryKey: ['admin-dashboard', effectiveTenantId],
    queryFn: () => adminDashboardService.buscarMetricas(effectiveTenantId!),
    enabled: !!effectiveTenantId,
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

        {/* Seletor de tenant — apenas super_admin */}
        {isSuperAdmin && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Text as="h1" variant="heading-sm" className="text-dark shrink-0">
              Unidade:
            </Text>
            {loadingTenants ? (
              <div className="h-10 w-56 bg-gray-100 rounded-xl animate-pulse" />
            ) : (
              <TenantSelector
                tenants={tenants}
                selectedId={selectedTenantId}
                onSelect={setSelectedTenantId}
              />
            )}
            {effectiveTenantId && data?.tenant && (
              <Link
                href={`/${data.tenant.slug}/dashboard`}
                className="text-xs text-indigo-500 hover:text-indigo-700 font-sans font-semibold underline underline-offset-2"
              >
                Ver dashboard da unidade →
              </Link>
            )}
          </div>
        )}

        {/* Estado vazio — nenhum tenant selecionado */}
        {!effectiveTenantId && (
          <Card shadow="sm">
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
                <Building2 className="w-7 h-7 text-indigo-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold font-sans text-dark mb-1">Selecione uma unidade</p>
                <p className="text-xs text-gray-300 font-sans">
                  Escolha uma unidade acima para visualizar o dashboard de rouparia.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Conteúdo do dashboard — só aparece quando tenant selecionado */}
        {effectiveTenantId && (
          <>
            {/* Cards KPI */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Cadastrados',     value: data?.totalPessoas,    icon: Users,           iconBg: 'bg-blue-100',   iconColor: 'text-blue-600' },
                { label: 'Retiradas hoje',  value: data?.retiradasHoje,   icon: ArrowDownToLine, iconBg: 'bg-red-100',    iconColor: 'text-red-500'  },
                { label: 'Devoluções hoje', value: data?.devolucoesHoje,  icon: RotateCcw,       iconBg: 'bg-emerald-100',iconColor: 'text-emerald-600' },
                { label: 'Pendentes',       value: data?.totalPendentes,  icon: Clock,           iconBg: 'bg-amber-100',  iconColor: 'text-amber-600' },
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

            {/* Gráfico */}
            <Card shadow="sm">
              <Text as="h2" variant="heading-sm" className="text-dark mb-5 block">
                Movimentações — últimos 7 dias
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
                <div className="space-y-3">
                  {groupByPerson(data.recentes).map((group) => (
                    <div
                      key={group.pessoaId + group.retirada.id}
                      className={`rounded-xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 ${
                        group.devolucao ? 'border-emerald-200 bg-emerald-50' : 'border-orange-200 bg-orange-50'
                      }`}
                    >
                      {/* Status */}
                      <div className="flex items-center gap-2 sm:w-28 shrink-0">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${group.devolucao ? 'bg-emerald-500' : 'bg-orange-400 animate-pulse'}`} />
                        <span className={`text-xs font-semibold font-sans ${group.devolucao ? 'text-emerald-700' : 'text-orange-600'}`}>
                          {group.devolucao ? 'Devolvido' : 'Pendente'}
                        </span>
                      </div>

                      {/* Pessoa */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold font-sans text-dark truncate">{group.nome}</p>
                        <p className="text-xs font-sans text-gray-300">{formatarCPFDisplay(group.cpf)}</p>
                      </div>

                      {/* Retirada */}
                      <div className="flex items-center gap-2 text-xs font-sans text-gray-400 shrink-0">
                        <span className="inline-flex items-center gap-1 bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">
                          ↓ Retirada
                        </span>
                        {format(new Date(group.retirada.data_hora), "dd/MM 'às' HH:mm", { locale: ptBR })}
                      </div>

                      <span className="hidden sm:block text-gray-300 text-sm">→</span>

                      {/* Devolução */}
                      <div className="flex items-center gap-2 text-xs font-sans shrink-0">
                        {group.devolucao ? (
                          <>
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">
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
          </>
        )}

      </main>
    </div>
  )
}