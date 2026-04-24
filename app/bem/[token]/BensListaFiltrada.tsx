'use client'

import { useState } from 'react'
import { Search, X, Package } from 'lucide-react'
import BemCard from './BemCard'

interface Asset {
  id: number
  patrimony: string
  description: string
  brand: string | null
  model: string | null
  serialNumber: string | null
  departmentFullAddress: string
  status: number
  assetTypeName: string
  companyId: number
  companyName: string
  coverPermalink: string | null
  creationDate: string | null
}

interface Agendamento {
  id: string
  trilogoAssetId: number
  titulo: string
  dataAgendada: Date | string
  dataRealizada: Date | string | null
  observacao: string | null
  status: string
  ambiente: string
}

interface Props {
  bens: Asset[]
  agendamentos: Agendamento[]
}

export function BensListaFiltrada({ bens, agendamentos }: Props) {
  const [filtro, setFiltro] = useState('')

  const agMap = new Map<number, Agendamento[]>()
  agendamentos.forEach((ag) => {
    if (!agMap.has(ag.trilogoAssetId)) agMap.set(ag.trilogoAssetId, [])
    agMap.get(ag.trilogoAssetId)!.push(ag)
  })

  const q = filtro.trim().toLowerCase()
  const filtrados = q
    ? bens.filter((a) => a.patrimony.toLowerCase().includes(q))
    : bens

  return (
    <div className="space-y-3">
      {bens.length > 1 && (
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nº patrimônio..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
          {filtro && (
            <button
              onClick={() => setFiltro('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {filtrados.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm bg-white rounded-2xl border border-gray-100">
          <Package size={40} className="mx-auto mb-3 opacity-30" />
          {q ? `Nenhum bem encontrado para "${filtro}".` : 'Nenhum bem encontrado neste ambiente.'}
        </div>
      ) : (
        filtrados.map((bem) => (
          <BemCard key={bem.id} bem={bem} agendamentos={agMap.get(bem.id) ?? []} />
        ))
      )}
    </div>
  )
}
