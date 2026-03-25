'use client'

import { useState } from 'react'
import { Package, CalendarPlus } from 'lucide-react'
import type { Asset, Agendamento } from '../bens.types'
import { STATUS, parseEndereco, moeda } from '../bens.types'

interface Props {
  a: Asset
  agendamentos?: Agendamento[]
  onAgendar: (a: Asset) => void
}

export default function BemRow({ a, agendamentos, onAgendar }: Props) {
  const end = parseEndereco(a.departmentFullAddress)
  const st  = STATUS[a.status] ?? { label: String(a.status), color: 'bg-gray-100 text-gray-500' }
  const pendentes = agendamentos?.filter(ag => ag.status === 'pendente') ?? []
  const temAgendamento = pendentes.length > 0
  const agendamento = pendentes[0]
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)

  return (
    <tr className={temAgendamento ? 'bg-purple-50 border-b border-purple-100' : 'bg-white border-b border-gray-100 hover:bg-gray-50'}>
      <td className="px-3 py-2 w-14">
        <div
          className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-gray-100 flex items-center justify-center cursor-pointer"
          onMouseEnter={e => a.coverPermalink && setMousePos({ x: e.clientX, y: e.clientY })}
          onMouseMove={e => a.coverPermalink && setMousePos({ x: e.clientX, y: e.clientY })}
          onMouseLeave={() => setMousePos(null)}
        >
          {a.coverPermalink
            ? <img src={a.coverPermalink} alt={a.description} className="w-full h-full object-cover" />
            : <Package size={20} className="text-gray-300" />}
        </div>
        {mousePos && a.coverPermalink && (
          <div className="fixed z-9999 pointer-events-none" style={{ left: mousePos.x + 16, top: mousePos.y - 96 }}>
            <div className="bg-white rounded-xl shadow-2xl border border-gray-100 p-1.5">
              <img src={a.coverPermalink} alt={a.description} className="w-96 h-96 object-contain rounded-lg" />
            </div>
          </div>
        )}
      </td>
      <td className="px-3 py-2 overflow-hidden">
        <span className="text-sm font-mono font-medium text-purple-600 truncate block">{a.patrimony}</span>
      </td>
      <td className="px-3 py-2 overflow-hidden">
        <p className="text-sm font-medium text-gray-800 line-clamp-2 leading-tight">{a.description}</p>
        {temAgendamento && agendamento && (
          <div className="flex items-center gap-1 mt-1">
            <CalendarPlus size={10} className="text-purple-500 shrink-0" />
            <span className="text-xs text-purple-600 truncate">{agendamento.titulo}</span>
            {pendentes.length > 1 && <span className="text-xs text-purple-400">+{pendentes.length - 1}</span>}
          </div>
        )}
      </td>
      <td className="px-3 py-2 overflow-hidden"><span className="text-xs text-gray-500 line-clamp-2">{end.ambiente}</span></td>
      <td className="px-3 py-2 overflow-hidden"><span className="text-xs text-gray-500 line-clamp-2">{a.assetTypeName}</span></td>
      <td className="px-3 py-2 overflow-hidden"><span className="text-xs text-gray-500 truncate block">{a.brand ?? '—'}</span></td>
      <td className="px-3 py-2 overflow-hidden"><span className="text-xs text-gray-500 truncate block">{a.model ?? '—'}</span></td>
      <td className="px-3 py-2 overflow-hidden"><span className="text-xs text-gray-500 truncate block">{a.serialNumber ?? '—'}</span></td>
      <td className="px-3 py-2 overflow-hidden"><span className="text-xs text-gray-700 truncate block">{moeda(a.price)}</span></td>
      <td className="px-3 py-2 overflow-hidden">
        <span className="text-xs text-gray-500 truncate block">
          {a.purchaseDate ? new Date(a.purchaseDate).toLocaleDateString('pt-BR') : '—'}
        </span>
      </td>
      <td className="px-3 py-2 overflow-hidden">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${st.color}`}>{st.label}</span>
      </td>
      <td className="px-3 py-2 overflow-hidden">
        <span className="text-xs text-gray-400 truncate block">
          {new Date(a.creationDate ?? '').toLocaleDateString('pt-BR')}
        </span>
      </td>
      <td className={`px-3 py-2 sticky right-0 shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.05)] ${temAgendamento ? 'bg-purple-50' : 'bg-white'}`}>
        <button onClick={() => onAgendar(a)} title="Agendamento de manutenção"
          className={temAgendamento
            ? 'flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-purple-600 bg-purple-100 hover:bg-purple-200 transition-colors whitespace-nowrap'
            : 'flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-gray-500 border border-gray-200 hover:text-purple-600 hover:border-purple-200 hover:bg-purple-50 transition-colors whitespace-nowrap'}>
          <CalendarPlus size={13} /> Agendamento
        </button>
      </td>
    </tr>
  )
}
