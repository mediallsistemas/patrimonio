'use client'

import { ChevronLeft, ChevronRight, FlaskConical, Search, X } from 'lucide-react'
import Card from '@/components/ui/Card'
import Text from '@/components/ui/Text'
import { TIPOS_OCORRENCIA, type Bloco, type DraftEstado } from '@/app/ocorrencias/types'

interface ListaLocaisProps {
  blocoAtual: Bloco
  locaisFiltrados: Bloco['locais']
  searchLocais: string
  setSearchLocais: (v: string) => void
  concluidos: DraftEstado['concluidos']
  feitosNoBloco: (nome: string) => number
  localFeito: (bloco: string, local: string) => boolean
  selecionarLocal: (local: Bloco['locais'][0]) => void
  atualizar: (parcial: Partial<DraftEstado>) => void
}

export default function ListaLocais({
  blocoAtual,
  locaisFiltrados,
  searchLocais,
  setSearchLocais,
  concluidos,
  feitosNoBloco,
  localFeito,
  selecionarLocal,
  atualizar,
}: ListaLocaisProps) {
  return (
    <Card shadow="md">
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => atualizar({ etapa: 'blocos', blocoSelecionado: null })}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-dark hover:bg-gray-100 transition-colors shrink-0"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <Text as="h2" variant="heading-sm" className="text-dark block truncate">
            {blocoAtual.nome}
          </Text>
          <Text variant="body-sm" className="text-gray-300 block">
            {feitosNoBloco(blocoAtual.nome)}/{blocoAtual.locais.length} locais registrados
          </Text>
        </div>
      </div>

      {/* Barra de progresso do bloco */}
      <div className="h-1 bg-gray-100 rounded-full overflow-hidden mb-4">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.round((feitosNoBloco(blocoAtual.nome) / blocoAtual.locais.length) * 100)}%`,
            backgroundColor: '#0f766e',
          }}
        />
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
        <input
          type="text"
          placeholder="Pesquisar local..."
          value={searchLocais}
          onChange={(e) => setSearchLocais(e.target.value)}
          className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 text-sm font-sans text-dark focus:outline-none focus:ring-2 focus:ring-teal-600 bg-white placeholder:text-gray-300"
        />
        {searchLocais && (
          <button
            onClick={() => setSearchLocais('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Lista */}
      <div className="overflow-y-auto max-h-72 space-y-1.5 pr-1 -mr-1">
        {locaisFiltrados.map((local) => {
          const feito = localFeito(blocoAtual.nome, local.nome)
          const reg = concluidos.find(
            (c) => c.bloco === blocoAtual.nome && c.local === local.nome,
          )
          return (
            <button
              key={local.nome}
              onClick={() => selecionarLocal(local)}
              disabled={feito}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left font-sans ${
                feito
                  ? reg?.temOcorrencia
                    ? 'border-orange-200 bg-orange-50 cursor-default'
                    : 'border-green-200 bg-green-50 cursor-default'
                  : 'border-gray-200 bg-white hover:border-teal-600 hover:bg-teal-50 active:scale-95'
              }`}
            >
              <div
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  feito
                    ? reg?.temOcorrencia
                      ? 'bg-orange-400'
                      : 'bg-green-500'
                    : 'bg-gray-200'
                }`}
              />
              <div className="flex-1 min-w-0">
                <span
                  className={`text-sm font-semibold block truncate ${feito ? 'text-gray-400' : 'text-dark'}`}
                >
                  {local.nome}
                </span>
                {feito && reg && (
                  <span className={`text-xs ${reg.temOcorrencia ? 'text-orange-500' : 'text-green-600'}`}>
                    {reg.temOcorrencia
                      ? `⚠ ${TIPOS_OCORRENCIA.find((t) => t.value === reg.tipoOcorrencia)?.label ?? 'Ocorrência'}`
                      : '✓ Normal'}
                  </span>
                )}
              </div>
              {local.tipo === 'gases' && !feito && (
                <FlaskConical className="w-4 h-4 text-purple-400 shrink-0" />
              )}
              {!feito && <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />}
            </button>
          )
        })}
      </div>
    </Card>
  )
}
