'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { Ticket } from '@/hooks/usePatrimonio'

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

export function TicketRow({ t }: { t: Ticket }) {
  const [open, setOpen] = useState(false)
  const status   = t.currentStatus?.actionDescription ?? '—'
  const priority = PRIORITY_LABEL[t.priority] ?? { label: '—', color: 'bg-gray-100 text-gray-400' }

  return (
    <>
      <tr
        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
        onClick={() => setOpen((o) => !o)}
      >
        <td className="px-4 py-3 text-sm font-mono text-gray-500">#{t.id}</td>
        <td className="px-4 py-3 text-sm font-medium text-gray-800">{t.patrimony}</td>
        <td className="px-4 py-3 text-sm text-gray-700">{t.assetName}</td>
        <td className="px-4 py-3 text-sm text-gray-500">{t.assetTypeName}</td>
        <td className="px-4 py-3 text-sm text-gray-500">{t.companyName}</td>
        <td className="px-4 py-3">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[status] ?? 'bg-gray-100 text-gray-500'}`}>
            {status}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${priority.color}`}>
            {priority.label}
          </span>
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
              <div>
                <p className="text-gray-400 text-xs mb-1">Descrição</p>
                <p className="text-gray-700">{t.description}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-1">Localização</p>
                <p className="text-gray-700">{t.departmentFullAddress}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-1">Responsável</p>
                <p className="text-gray-700">{t.assigneeName}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-1">Prazo</p>
                <p className="text-gray-700">{fmt(t.deadline)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-1">Tipo de serviço</p>
                <p className="text-gray-700">{t.buildingServiceTypeDescription}</p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
