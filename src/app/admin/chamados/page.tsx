'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format, subMonths } from 'date-fns'
import {
  ArrowLeft, Inbox, CheckCircle, Loader2, AlertTriangle, Wallet, PlayCircle,
} from 'lucide-react'

import Card from '@/components/ui/Card'
import Text from '@/components/ui/Text'
import ChamadoCard from '@/components/ui/chamados/ChamadoCard'
import ModalFinalizarChamado from '@/components/ui/modal/ModalFinalizarChamado'
import ModalCancelarChamado from '@/components/ui/modal/ModalCancelarChamado'
import { useAuth } from '@/hooks/useAuth'
import { useChamados, useDashboardChamados } from '@/hooks/useChamados'
import { formatarBRL } from '@/utils/moeda'
import {
  PRIORIDADE_CHAMADO_LABEL,
  STATUS_CHAMADO_LABEL,
  STATUS_CHAMADO,
  PRIORIDADES_CHAMADO,
  type PrioridadeChamado,
  type StatusChamado,
} from '@/modules/chamados/chamados.types'
import { ROLES_ESCRITA_CHAMADOS } from '@/modules/chamados/chamados.rules'
import type { ChamadoResumo } from '@/services/chamados.service'
import type { JWTPayload } from '@/modules/auth/auth.types'

type JWTRole = JWTPayload['role']

// Painel gerencial de chamados (admin) — tiles de resumo seguidos da lista
// real dos chamados (mesmo card interativo do painel de tenant).

export default function DashboardChamadosPage() {
  const hoje = new Date()
  const [de, setDe] = useState(format(subMonths(hoje, 3), 'yyyy-MM-dd'))
  const [ate, setAte] = useState(format(hoje, 'yyyy-MM-dd'))

  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'super_admin'

  const { data, isLoading, isError } = useDashboardChamados({
    de: `${de}T00:00:00`,
    ate: `${ate}T23:59:59`,
  })

  const chamadosHook = useChamados({ ehAdmin: true })
  const {
    chamados, carregando: carregandoLista, filtros, setFiltros, usuarios,
    finalizar, cancelar, busyIds, handleAssumir, handleAtribuir, handleSalvarFiscal,
  } = chamadosHook

  const [finalizando, setFinalizando] = useState<ChamadoResumo | null>(null)
  const [erroFinalizar, setErroFinalizar] = useState<string | null>(null)
  const [cancelando, setCancelando] = useState<ChamadoResumo | null>(null)
  const [erroCancelar, setErroCancelar] = useState<string | null>(null)

  function handleFinalizarConfirmar(input: { descricaoExecucao: string; fotoExecucao: string | null }) {
    if (!finalizando) return
    setErroFinalizar(null)
    finalizar.mutate(
      { id: finalizando.id, input },
      {
        onSuccess: () => setFinalizando(null),
        onError: () => setErroFinalizar('Falha ao finalizar. Tente novamente.'),
      },
    )
  }

  function handleCancelarConfirmar(motivo?: string) {
    if (!cancelando) return
    setErroCancelar(null)
    cancelar.mutate(
      { id: cancelando.id, motivo },
      {
        onSuccess: () => setCancelando(null),
        onError: () => setErroCancelar('Falha ao cancelar. Tente novamente.'),
      },
    )
  }

  // Super_admin vê chamados de VÁRIOS tenants na mesma lista — o dropdown de
  // "Atribuir" de cada card só pode oferecer usuários do MESMO tenant do
  // chamado (o servidor já rejeita um responsável de outro tenant; aqui
  // evitamos oferecer uma opção que sempre falharia). Para tenant_admin,
  // `usuarios` já vem só do seu próprio tenant, então o filtro é um no-op.
  function usuariosDoTenant(tenantId: string) {
    return usuarios
      .filter((u) => u.ativo && u.tenantId === tenantId && ROLES_ESCRITA_CHAMADOS.includes(u.role as JWTRole))
      .map((u) => ({ id: u.id, nome: u.nome }))
  }

  const tiles = data
    ? [
        { label: 'Total de chamados', valor: String(data.total), icon: Inbox, cor: 'bg-purple-100 text-purple-600' },
        { label: 'Finalizados', valor: String(data.finalizados), icon: CheckCircle, cor: 'bg-emerald-100 text-emerald-600' },
        { label: 'Em execução', valor: String(data.emExecucao), icon: PlayCircle, cor: 'bg-blue-100 text-blue-600' },
        { label: 'Atrasados', valor: String(data.atrasados), icon: AlertTriangle, cor: 'bg-red-100 text-red-600' },
        { label: 'Valor gasto', valor: formatarBRL(data.valorGastoCentavos), icon: Wallet, cor: 'bg-amber-100 text-amber-600' },
      ]
    : []

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Painel de Chamados</h1>
            <p className="text-sm text-gray-500">Indicadores dos chamados de manutenção da unidade</p>
          </div>
        </div>

        {/* Filtro de período (dashboard) */}
        <Card padding="sm">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">De</label>
              <input
                type="date"
                value={de}
                onChange={(e) => setDe(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Até</label>
              <input
                type="date"
                value={ate}
                onChange={(e) => setAte(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>
          </div>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-gray-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Carregando indicadores...
          </div>
        ) : isError || !data ? (
          <Card padding="lg">
            <p className="text-center text-sm text-gray-400 py-8">
              Não foi possível carregar os indicadores. Este painel é exclusivo de administradores.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {tiles.map(({ label, valor, icon: Icon, cor }) => (
              <Card key={label} padding="sm">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${cor}`}>
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xl font-bold text-gray-800 truncate" title={valor}>{valor}</p>
                    <p className="text-xs text-gray-500">{label}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Lista de chamados */}
        <div className="pt-2">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <Text variant="heading-sm" className="text-dark">Chamados</Text>
            <div className="flex flex-wrap gap-3">
              <select
                value={filtros.status ?? ''}
                onChange={(e) =>
                  setFiltros({ ...filtros, status: (e.target.value || undefined) as StatusChamado | undefined })
                }
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-300"
              >
                <option value="">Todos os status</option>
                {STATUS_CHAMADO.map((s) => (
                  <option key={s} value={s}>{STATUS_CHAMADO_LABEL[s]}</option>
                ))}
              </select>
              <select
                value={filtros.prioridade ?? ''}
                onChange={(e) =>
                  setFiltros({
                    ...filtros,
                    prioridade: (e.target.value || undefined) as PrioridadeChamado | undefined,
                  })
                }
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-300"
              >
                <option value="">Todas as prioridades</option>
                {PRIORIDADES_CHAMADO.map((p) => (
                  <option key={p} value={p}>{PRIORIDADE_CHAMADO_LABEL[p]}</option>
                ))}
              </select>
            </div>
          </div>

          {carregandoLista ? (
            <p className="text-center py-10 text-sm text-gray-400">Carregando chamados...</p>
          ) : chamados.length === 0 ? (
            <Card padding="lg">
              <p className="text-center text-sm text-gray-400 py-4">Nenhum chamado encontrado.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {chamados.map((c) => (
                <ChamadoCard
                  key={c.id}
                  chamado={c}
                  podeEscrever
                  ehAdmin
                  mostrarTenant={isSuperAdmin}
                  usuarios={usuariosDoTenant(c.tenant.id)}
                  busy={busyIds.has(c.id)}
                  onAssumir={handleAssumir}
                  onAtribuir={handleAtribuir}
                  onFinalizar={(chamado) => { setErroFinalizar(null); setFinalizando(chamado) }}
                  onCancelar={(chamado) => { setErroCancelar(null); setCancelando(chamado) }}
                  onSalvarFiscal={handleSalvarFiscal}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <ModalFinalizarChamado
        chamado={finalizando}
        loading={chamadosHook.finalizar.isPending}
        erro={erroFinalizar}
        onConfirmar={handleFinalizarConfirmar}
        onClose={() => setFinalizando(null)}
      />
      <ModalCancelarChamado
        chamado={cancelando}
        loading={chamadosHook.cancelar.isPending}
        erro={erroCancelar}
        onConfirmar={handleCancelarConfirmar}
        onClose={() => setCancelando(null)}
      />
    </div>
  )
}
