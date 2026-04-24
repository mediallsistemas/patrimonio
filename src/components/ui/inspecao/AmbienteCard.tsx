'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronDown, ChevronUp, Building2, Package } from 'lucide-react'
import Text from '@/components/ui/Text'
import { FotoLazyAmbiente } from '@/components/ui/inspecao/FotoLazyAmbiente'
import type { AmbienteInspecionado } from '@/services/inspecao.types'

const TIPO_LABEL: Record<string, { label: string; color: string }> = {
  eletrica:   { label: 'Elétrica',   color: 'bg-yellow-100 text-yellow-700' },
  hidraulica: { label: 'Hidráulica', color: 'bg-blue-100 text-blue-700' },
  patrimonio: { label: 'Patrimônio', color: 'bg-purple-100 text-purple-700' },
}

export function AmbienteCard({ amb }: { amb: AmbienteInspecionado }) {
  const [aberto, setAberto] = useState(false)

  return (
    <div className={`rounded-xl border transition-all ${amb.temAlteracao ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-white'}`}>
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        onClick={() => setAberto((v) => !v)}
      >
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-blue-600">
          <Building2 className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold font-sans text-dark text-sm">{amb.ambiente}</span>
            {amb.temAlteracao && amb.alteracao ? (
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold font-sans ${TIPO_LABEL[amb.alteracao.tipo]?.color ?? 'bg-gray-100 text-gray-500'}`}>
                {TIPO_LABEL[amb.alteracao.tipo]?.label ?? amb.alteracao.tipo}
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold font-sans bg-green-100 text-green-700">Normal</span>
            )}
          </div>
          <span className="text-xs text-gray-300 font-sans">
            {format(new Date(amb.concluidoEm), 'HH:mm', { locale: ptBR })}
          </span>
        </div>
        {aberto ? <ChevronUp className="w-4 h-4 text-gray-300 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-300 shrink-0" />}
      </button>

      {aberto && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-100 pt-3">
          <div>
            <Text variant="caption" className="text-gray-300 uppercase tracking-wide font-semibold block mb-2">Medições</Text>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm font-sans">
              <span className="text-gray-400">Pureza O₂</span>
              <span className="font-semibold text-dark">{amb.purezaO2}%</span>
              <span className="text-gray-400">Pressão O₂</span>
              <span className="font-semibold text-dark">{amb.pressaoO2} bar</span>
              <span className="text-gray-400">Pressão Ar</span>
              <span className="font-semibold text-dark">{amb.pressaoAr} bar</span>
              <span className="text-gray-400">Backup</span>
              <span className={`font-semibold ${amb.backupLigado ? 'text-green-600' : 'text-red-600'}`}>
                {amb.backupLigado ? 'Ligado' : 'Desligado'}
              </span>
            </div>
          </div>

          {amb.temAbastecimento && amb.abastecimento && (
            <div>
              <Text variant="caption" className="text-gray-300 uppercase tracking-wide font-semibold block mb-2">Abastecimento</Text>
              <div className="flex items-center gap-2 bg-sky-50 rounded-xl px-3 py-2">
                <Package className="w-4 h-4 text-sky-600 shrink-0" />
                <span className="text-sm font-sans text-sky-700">
                  <strong>{amb.abastecimento.quantidade}</strong> cilindro{amb.abastecimento.quantidade !== 1 ? 's' : ''} — tamanho <strong>{amb.abastecimento.tamanho}</strong>
                </span>
              </div>
            </div>
          )}

          {amb.temAlteracao && amb.alteracao && (
            <div>
              <Text variant="caption" className="text-gray-300 uppercase tracking-wide font-semibold block mb-2">Ocorrência</Text>
              <div className="space-y-2 text-sm font-sans">
                <p className="text-gray-700">{amb.alteracao.descricao}</p>
                <div className="flex items-center gap-4">
                  <span className="text-gray-400">Trilogo:</span>
                  <span className={`font-semibold ${amb.alteracao.trilogoChamado ? 'text-green-600' : 'text-red-600'}`}>
                    {amb.alteracao.trilogoChamado ? 'Chamado aberto' : 'Não aberto'}
                  </span>
                </div>
                <FotoLazyAmbiente ambienteId={amb.id} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
