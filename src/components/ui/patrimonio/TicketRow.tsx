'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronDown, ChevronUp, Download } from 'lucide-react'
import type { ItemPatrimonio } from '@/hooks/usePatrimonio'
import {
  STATUS_CHAMADO_LABEL,
  PRIORIDADE_CHAMADO_LABEL,
  TIPO_CHAMADO_LABEL,
  type StatusChamado,
  type PrioridadeChamado,
  type TipoChamado,
} from '@/modules/chamados/chamados.types'

const STATUS_COR: Record<string, string> = {
  aberto:      'bg-amber-100 text-amber-700',
  em_execucao: 'bg-blue-100 text-blue-700',
  finalizado:  'bg-emerald-100 text-emerald-700',
  cancelado:   'bg-gray-100 text-gray-500',
}

const PRIORIDADE_COR: Record<string, string> = {
  baixa:   'bg-gray-100 text-gray-500',
  media:   'bg-yellow-100 text-yellow-700',
  alta:    'bg-orange-100 text-orange-700',
  urgente: 'bg-red-100 text-red-700',
}

function fmt(data: string | null): string {
  if (!data) return '—'
  return format(new Date(data), 'dd/MM/yyyy HH:mm', { locale: ptBR })
}

export default function TicketRow({ c }: { c: ItemPatrimonio }) {
  const [aberto, setAberto] = useState(false)

  return (
    <>
      <tr
        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
        onClick={() => setAberto((o) => !o)}
      >
        <td className="px-4 py-3 text-sm font-mono text-gray-500">
          #{c.numero}
          {/* Origem sempre à vista: o número do chamado é daqui, o do ticket é de lá. */}
          {c.trilogoTicketId !== null && (
            <span
              className="ml-1.5 inline-flex items-center gap-0.5 text-xs text-sky-600"
              title="Importado do Trílogo"
            >
              <Download size={11} />
              {c.trilogoTicketId}
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-sm font-medium text-gray-800">{c.patrimony ?? '—'}</td>
        <td className="px-4 py-3 text-sm text-gray-700">{c.descricaoBemSnapshot ?? c.titulo}</td>
        <td className="px-4 py-3 text-sm text-gray-500">
          {TIPO_CHAMADO_LABEL[c.tipo as TipoChamado] ?? c.tipo}
        </td>
        <td className="px-4 py-3 text-sm text-gray-500">{c.tenant?.nome ?? '—'}</td>
        <td className="px-4 py-3">
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COR[c.status] ?? 'bg-gray-100 text-gray-500'}`}
          >
            {STATUS_CHAMADO_LABEL[c.status as StatusChamado] ?? c.status}
          </span>
          {c.atrasado && (
            <span className="ml-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
              Atrasado
            </span>
          )}
        </td>
        <td className="px-4 py-3">
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORIDADE_COR[c.prioridade] ?? 'bg-gray-100 text-gray-400'}`}
          >
            {PRIORIDADE_CHAMADO_LABEL[c.prioridade as PrioridadeChamado] ?? c.prioridade}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-gray-400">{fmt(c.criadoEm)}</td>
        <td className="px-4 py-3 text-gray-400">
          {aberto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </td>
      </tr>

      {aberto && (
        <tr className="bg-gray-50">
          <td colSpan={9} className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400 text-xs mb-1">Descrição</p>
                <p className="text-gray-700">{c.descricao}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-1">Localização</p>
                <p className="text-gray-700">
                  {[c.blocoNomeSnapshot, c.ambienteNomeSnapshot].filter(Boolean).join(' › ') || '—'}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-1">Responsável</p>
                <p className="text-gray-700">{c.responsavel?.nome ?? 'Não atribuído'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-1">Prazo</p>
                <p className="text-gray-700">{fmt(c.prazo)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-1">Aberto por</p>
                <p className="text-gray-700">{c.criadoPor?.nome ?? '—'}</p>
              </div>
              {/* Status cru da origem: a tradução para o nosso ciclo de vida é
                  interpretação, então o texto original fica à vista. */}
              {c.trilogoStatusOrigem && (
                <div>
                  <p className="text-gray-400 text-xs mb-1">Status no Trílogo</p>
                  <p className="text-gray-700">{c.trilogoStatusOrigem}</p>
                </div>
              )}
              {c.descricaoExecucao && (
                <div className="md:col-span-2">
                  <p className="text-gray-400 text-xs mb-1">Execução</p>
                  <p className="text-gray-700">{c.descricaoExecucao}</p>
                </div>
              )}
              {c.motivoCancelamento && (
                <div className="md:col-span-2">
                  <p className="text-gray-400 text-xs mb-1">Motivo do cancelamento</p>
                  <p className="text-gray-700">{c.motivoCancelamento}</p>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
