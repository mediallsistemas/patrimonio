'use client'

import { useState } from 'react'
import { Search, X, MapPin, Building2 } from 'lucide-react'

import Card from '@/components/ui/Card'
import Text from '@/components/ui/Text'

// Card de seleção de ambiente agrupado por bloco, com busca — usado pelo
// fluxo de manutenção e pela abertura de chamados. Única implementação:
// qualquer ajuste no seletor vale para todos os fluxos.

export interface AmbienteSelecionadoPorBloco {
  id: string
  nome: string
  blocoNome: string
}

interface SeletorAmbientePorBlocoProps {
  blocos: { id: string; nome: string; ambientes: { id: string; nome: string }[] }[]
  carregando: boolean
  onSelecionar: (ambiente: AmbienteSelecionadoPorBloco) => void
}

export default function SeletorAmbientePorBloco({
  blocos,
  carregando,
  onSelecionar,
}: SeletorAmbientePorBlocoProps) {
  const [search, setSearch] = useState('')

  const q = search.trim().toLowerCase()
  const blocosFiltrados = blocos
    .map((b) => ({
      ...b,
      ambientes: q ? b.ambientes.filter((amb) => amb.nome.toLowerCase().includes(q)) : b.ambientes,
    }))
    .filter((b) => b.ambientes.length > 0)

  return (
    <Card shadow="md">
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
        <input
          type="text"
          placeholder="Pesquisar ambiente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm font-sans text-dark focus:outline-none focus:ring-2 focus:ring-red-base bg-white placeholder:text-gray-300"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="overflow-y-auto max-h-[60vh] space-y-4 pr-1 -mr-1">
        {carregando ? (
          <p className="text-center py-6 text-sm text-gray-300 font-sans">Carregando ambientes...</p>
        ) : blocosFiltrados.length === 0 ? (
          <p className="text-center py-6 text-sm text-gray-300 font-sans">
            {q ? 'Nenhum ambiente encontrado' : 'Nenhum ambiente cadastrado'}
          </p>
        ) : (
          blocosFiltrados.map((b) => (
            <div key={b.id}>
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-3.5 h-3.5 text-gray-300" />
                <Text variant="caption" className="text-gray-400 uppercase tracking-wide font-semibold block">
                  {b.nome}
                </Text>
              </div>
              <div className="space-y-1.5">
                {b.ambientes.map((amb) => (
                  <button
                    key={amb.id}
                    onClick={() => onSelecionar({ id: amb.id, nome: amb.nome, blocoNome: b.nome })}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-gray-200 bg-white hover:border-red-base hover:bg-red-light text-left font-sans transition-all active:scale-[0.98]"
                  >
                    <MapPin className="w-4 h-4 text-gray-300 shrink-0" />
                    <span className="text-sm font-semibold text-dark flex-1 truncate">{amb.nome}</span>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  )
}
