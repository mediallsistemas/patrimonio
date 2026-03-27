'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown, FlaskConical, Search, X, CheckCircle2 } from 'lucide-react'
import Card from '@/components/ui/Card'
import Text from '@/components/ui/Text'
import { TIPOS_OCORRENCIA, type BlocoAPI, type AmbienteAPI, type DraftEstado } from '@/app/ocorrencias/types'

interface ListaLocaisProps {
  blocoAtual: BlocoAPI
  locaisFiltrados: AmbienteAPI[]
  searchLocais: string
  setSearchLocais: (v: string) => void
  concluidos: DraftEstado['concluidos']
  feitosNoBloco: (nome: string) => number
  localFeito: (bloco: string, local: string) => boolean
  selecionarLocal: (local: AmbienteAPI) => void
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
  const [mostrarConcluidos, setMostrarConcluidos] = useState(false)

  const pendentes = locaisFiltrados.filter((l) => !localFeito(blocoAtual.nome, l.nome))
  const feitos = locaisFiltrados.filter((l) => localFeito(blocoAtual.nome, l.nome))

  function renderItem(local: AmbienteAPI) {
    const feito = localFeito(blocoAtual.nome, local.nome)
    const reg = concluidos.find((c) => c.bloco === blocoAtual.nome && c.local === local.nome)
    return (
      <button
        key={local.id}
        onClick={() => !feito && selecionarLocal(local)}
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
          <span className={`text-sm font-semibold block truncate ${feito ? 'text-gray-400' : 'text-dark'}`}>
            {local.nome}
          </span>
          {feito && reg && (
            <span className={`text-xs ${reg.temOcorrencia ? 'text-orange-500' : 'text-green-600'}`}>
              {reg.temOcorrencia
                ? `⚠ ${TIPOS_OCORRENCIA.find((t) => reg.tiposOcorrencia?.includes(t.value))?.label ?? 'Ocorrência'}`
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
  }

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
            {feitosNoBloco(blocoAtual.nome)}/{blocoAtual.ambientes.length} locais registrados
          </Text>
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="h-1 bg-gray-100 rounded-full overflow-hidden mb-4">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${blocoAtual.ambientes.length > 0 ? Math.round((feitosNoBloco(blocoAtual.nome) / blocoAtual.ambientes.length) * 100) : 0}%`,
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

      <div className="overflow-y-auto max-h-[65vh] pr-1 -mr-1 space-y-3">
        {/* Pendentes */}
        {pendentes.length > 0 && (
          <div className="space-y-1.5">
            {searchLocais && (
              <p className="text-xs font-semibold text-gray-300 uppercase tracking-wide px-1 mb-1">
                Pendentes ({pendentes.length})
              </p>
            )}
            {pendentes.map(renderItem)}
          </div>
        )}

        {pendentes.length === 0 && feitos.length > 0 && !searchLocais && (
          <p className="text-center py-4 text-sm text-green-600 font-sans font-semibold">
            Todos os locais foram registrados!
          </p>
        )}

        {/* Seção de concluídos — colapsável */}
        {feitos.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setMostrarConcluidos((v) => !v)}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left text-sm font-semibold font-sans">
                Concluídos — {feitos.length} local{feitos.length !== 1 ? 'is' : ''}
              </span>
              <ChevronDown
                className={`w-4 h-4 shrink-0 transition-transform duration-200 ${mostrarConcluidos ? 'rotate-180' : ''}`}
              />
            </button>

            {mostrarConcluidos && (
              <div className="space-y-1.5 mt-1.5">
                {feitos.map(renderItem)}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
