'use client'

import { CheckCircle, ChevronRight, ClipboardList, FlaskConical, LogOut, Search, X } from 'lucide-react'
import Card from '@/components/card'
import Button from '@/components/button'
import Text from '@/components/text'
import { TIPOS_OCORRENCIA, type Bloco, type DraftEstado } from '@/app/ocorrencias/types'

interface ListaBlocosProps {
  blocosFiltrados: Bloco[]
  searchBlocos: string
  setSearchBlocos: (v: string) => void
  concluidos: DraftEstado['concluidos']
  submitting: boolean
  totalFeitos: number
  totalLocais: number
  feitosNoBloco: (nome: string) => number
  blocoCompleto: (bloco: Bloco) => boolean
  selecionarBloco: (bloco: Bloco) => void
  finalizarRonda: () => Promise<void>
  atualizar: (parcial: Partial<DraftEstado>) => void
}

export default function ListaBlocos({
  blocosFiltrados,
  searchBlocos,
  setSearchBlocos,
  concluidos,
  submitting,
  totalFeitos,
  totalLocais,
  feitosNoBloco,
  blocoCompleto,
  selecionarBloco,
  finalizarRonda,
  atualizar,
}: ListaBlocosProps) {
  return (
    <Card shadow="md">
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: '#0f766e' }}
        >
          <ClipboardList className="w-5 h-5 text-white" />
        </div>
        <div>
          <Text as="h2" variant="heading-sm" className="text-dark block">
            Selecionar Bloco
          </Text>
          <Text variant="body-sm" className="text-gray-300 block">
            Escolha o bloco que está inspecionando
          </Text>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
        <input
          type="text"
          placeholder="Pesquisar bloco..."
          value={searchBlocos}
          onChange={(e) => setSearchBlocos(e.target.value)}
          className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 text-sm font-sans text-dark focus:outline-none focus:ring-2 focus:ring-teal-600 bg-white placeholder:text-gray-300"
        />
        {searchBlocos && (
          <button
            onClick={() => setSearchBlocos('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Lista */}
      <div className="overflow-y-auto max-h-80 space-y-2 pr-1 -mr-1">
        {blocosFiltrados.map((bloco) => {
          const feitos = feitosNoBloco(bloco.nome)
          const completo = blocoCompleto(bloco)
          const comOcorrencia = concluidos.filter(
            (c) => c.bloco === bloco.nome && c.temOcorrencia,
          ).length
          return (
            <button
              key={bloco.nome}
              onClick={() => selecionarBloco(bloco)}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all text-left font-sans active:scale-95"
              style={
                completo
                  ? { borderColor: '#f97316', backgroundColor: '#fff7ed' }
                  : feitos > 0
                    ? { borderColor: '#fdba74', backgroundColor: '#fff7ed' }
                    : { borderColor: '#e5e7eb', backgroundColor: '#ffffff' }
              }
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold font-sans"
                style={{
                  backgroundColor: completo ? '#f97316' : feitos > 0 ? '#fdba74' : '#d1d5db',
                  color: '#ffffff',
                }}
              >
                {completo ? <CheckCircle className="w-4 h-4" /> : feitos > 0 ? feitos : bloco.locais.length}
              </div>
              <div className="flex-1 min-w-0">
                <span
                  className="text-sm font-semibold block"
                  style={{ color: completo ? '#c2410c' : feitos > 0 ? '#ea580c' : '#111827' }}
                >
                  {bloco.nome}
                </span>
                <span className="text-xs text-gray-300 font-sans">
                  {feitos}/{bloco.locais.length} locais
                  {comOcorrencia > 0 && (
                    <span style={{ color: '#f97316' }} className="ml-1">
                      · {comOcorrencia} ocorrência{comOcorrencia > 1 ? 's' : ''}
                    </span>
                  )}
                </span>
              </div>
              {bloco.locais.some((l) => l.tipo === 'gases') && (
                <FlaskConical className="w-4 h-4 text-purple-400 shrink-0" />
              )}
              <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
            </button>
          )
        })}
      </div>

      {/* Ações */}
      <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
        {totalFeitos > 0 && (
          <Button onClick={finalizarRonda} disabled={submitting} variant="outline" className="w-full">
            <CheckCircle className="w-4 h-4" />
            {totalFeitos >= totalLocais
              ? 'Finalizar Ronda'
              : `Finalizar com ${totalLocais - totalFeitos} pendente${totalLocais - totalFeitos !== 1 ? 's' : ''}`}
          </Button>
        )}
        <button
          onClick={() => atualizar({ etapa: 'confirmar_abandono' })}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-sans font-semibold text-gray-400 hover:text-red-base transition-colors"
        >
          <LogOut className="w-4 h-4" /> Pausar e sair
        </button>
      </div>
    </Card>
  )
}
