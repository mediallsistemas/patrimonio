'use client'

import { useState, useMemo, useCallback, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { ChevronLeft, Inbox, Plus } from 'lucide-react'

import Text from '@/components/ui/Text'
import Button from '@/components/ui/Button'
import LogoutButton from '@/components/ui/LogoutButton'
import ChamadoCard from '@/components/ui/chamados/ChamadoCard'
import ModalFinalizarChamado from '@/components/ui/modal/ModalFinalizarChamado'
import ModalCancelarChamado from '@/components/ui/modal/ModalCancelarChamado'
import { useAuth } from '@/hooks/useAuth'
import { useChamados } from '@/hooks/useChamados'
import {
  STATUS_CHAMADO,
  STATUS_CHAMADO_LABEL,
  PRIORIDADES_CHAMADO,
  PRIORIDADE_CHAMADO_LABEL,
} from '@/modules/chamados/chamados.types'
import { ROLES_ESCRITA_CHAMADOS, ROLES_ADMIN_CHAMADOS, podeEscrever, podeCriar } from '@/modules/chamados/chamados.rules'
import type { ChamadoResumo, PrioridadeChamado } from '@/services/chamados.service'
import type { StatusChamado } from '@/modules/chamados/chamados.types'
import type { JWTPayload } from '@/modules/auth/auth.types'

type JWTRole = JWTPayload['role']

// Painel de chamados: o operador vê os abertos, assume (definindo prioridade)
// e finaliza. Admin ainda atribui, cancela e edita os campos fiscais.
export default function PainelChamadosPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = use(params)
  const router = useRouter()
  const { user } = useAuth()

  // Mesmas listas de roles do servidor (chamados.rules) — nunca denylist local
  const ehAdmin = user !== null && ROLES_ADMIN_CHAMADOS.includes(user.role)
  const escreve = user !== null && podeEscrever(user.role)
  // Abrir chamado é separado de operar: operator opera mas não cria
  const cria = user !== null && podeCriar(user.role)

  const chamadosHook = useChamados({ ehAdmin })
  const {
    chamados, carregando, filtros, setFiltros, usuarios,
    finalizar, cancelar, busyIds, handleAssumir, handleAtribuir, handleSalvarFiscal,
  } = chamadosHook

  const [finalizando, setFinalizando] = useState<ChamadoResumo | null>(null)
  const [erroFinalizar, setErroFinalizar] = useState<string | null>(null)
  const [cancelando, setCancelando] = useState<ChamadoResumo | null>(null)
  const [erroCancelar, setErroCancelar] = useState<string | null>(null)

  const handleAbrirFinalizar = useCallback((chamado: ChamadoResumo) => {
    setErroFinalizar(null)
    setFinalizando(chamado)
  }, [])

  const handleAbrirCancelar = useCallback((chamado: ChamadoResumo) => {
    setErroCancelar(null)
    setCancelando(chamado)
  }, [])

  function handleFinalizarConfirmar(input: {
    descricaoExecucao: string
    fotoExecucao: string | null
  }) {
    if (!finalizando) return
    setErroFinalizar(null)
    finalizar.mutate(
      { id: finalizando.id, input },
      {
        onSuccess: () => {
          setFinalizando(null)
          toast.success('Chamado finalizado')
        },
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
        onSuccess: () => {
          setCancelando(null)
          toast.success('Chamado cancelado')
        },
        onError: () => setErroCancelar('Falha ao cancelar. Tente novamente.'),
      },
    )
  }

  // Usuários atribuíveis: ativos, com role executor (mesma regra do servidor)
  const usuariosAtribuiveis = useMemo(
    () =>
      usuarios
        .filter((u) => u.ativo && ROLES_ESCRITA_CHAMADOS.includes(u.role as JWTRole))
        .map((u) => ({ id: u.id, nome: u.nome })),
    [usuarios],
  )

  return (
    <div className="form-bg min-h-screen flex flex-col p-6">
      <div className="w-full max-w-3xl mx-auto flex-1 flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push(`/${tenantSlug}/manutencao`)}
            className="flex items-center gap-2 text-gray-400 hover:text-dark transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <Text variant="body-sm" className="text-inherit">Voltar</Text>
          </button>
          <LogoutButton />
        </div>

        {/* Título */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-dark mb-4">
            <Inbox className="w-8 h-8 text-white" />
          </div>
          <Text as="h1" variant="heading-lg" className="text-dark mb-1 block">
            Painel de Chamados
          </Text>
          <Text variant="body-md" className="text-gray-300">
            Assuma, acompanhe e finalize os chamados da unidade
          </Text>
        </div>

        {/* Ações + filtros */}
        <div className="flex flex-wrap items-end gap-3 mb-5">
          {cria && (
            <Link href={`/${tenantSlug}/chamados/novo`}>
              <Button size="sm">
                <Plus className="w-4 h-4" />
                Novo chamado
              </Button>
            </Link>
          )}
          <div className="flex-1" />
          <div>
            <label className="block text-xs text-gray-400 font-sans mb-1">Status</label>
            <select
              value={filtros.status ?? ''}
              onChange={(e) =>
                setFiltros({ ...filtros, status: (e.target.value || undefined) as StatusChamado | undefined })
              }
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-sans text-dark bg-white focus:outline-none focus:ring-2 focus:ring-red-base"
            >
              <option value="">Todos</option>
              {STATUS_CHAMADO.map((s) => (
                <option key={s} value={s}>{STATUS_CHAMADO_LABEL[s]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 font-sans mb-1">Prioridade</label>
            <select
              value={filtros.prioridade ?? ''}
              onChange={(e) =>
                setFiltros({
                  ...filtros,
                  prioridade: (e.target.value || undefined) as PrioridadeChamado | undefined,
                })
              }
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-sans text-dark bg-white focus:outline-none focus:ring-2 focus:ring-red-base"
            >
              <option value="">Todas</option>
              {PRIORIDADES_CHAMADO.map((p) => (
                <option key={p} value={p}>{PRIORIDADE_CHAMADO_LABEL[p]}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Lista */}
        {carregando ? (
          <p className="text-center py-10 text-sm text-gray-300 font-sans">Carregando chamados...</p>
        ) : chamados.length === 0 ? (
          <div className="text-center py-10">
            <Text variant="body-md" className="text-gray-300 block">
              Nenhum chamado encontrado
            </Text>
          </div>
        ) : (
          <div className="space-y-3">
            {chamados.map((c) => (
              <ChamadoCard
                key={c.id}
                chamado={c}
                podeEscrever={escreve}
                ehAdmin={ehAdmin}
                usuarios={usuariosAtribuiveis}
                busy={busyIds.has(c.id)}
                onAssumir={handleAssumir}
                onAtribuir={handleAtribuir}
                onFinalizar={handleAbrirFinalizar}
                onCancelar={handleAbrirCancelar}
                onSalvarFiscal={handleSalvarFiscal}
              />
            ))}
          </div>
        )}
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
