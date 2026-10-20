'use client'

import { Plus, Trash2 } from 'lucide-react'
import Input from '@/components/ui/Input'
import {
  OPCAO_OUTRO,
  OPCOES_CILINDRO,
  cilindroVazio,
  type CilindroDraft,
} from '@/utils/cilindros'

interface CilindrosAbastecimentoProps {
  cilindros: CilindroDraft[]
  errors: Record<string, string>
  onChange: (cilindros: CilindroDraft[]) => void
}

// Linhas do abastecimento de gases: em cada uma, o tamanho do cilindro (P ou
// m³, ou a capacidade digitada em "Outro") e a quantidade. A unidade pode
// receber cilindros de vários tamanhos no mesmo abastecimento.
export default function CilindrosAbastecimento({ cilindros, errors, onChange }: CilindrosAbastecimentoProps) {
  const atualizarLinha = (indice: number, parcial: Partial<CilindroDraft>) =>
    onChange(cilindros.map((c, i) => (i === indice ? { ...c, ...parcial } : c)))
  const removerLinha = (indice: number) => onChange(cilindros.filter((_, i) => i !== indice))
  const variasLinhas = cilindros.length > 1

  return (
    <div className="space-y-4">
      {cilindros.map((cilindro, i) => {
        const erroTamanho = errors[`cilindro_${i}_tamanho`]
        return (
          <div key={i} className="rounded-xl border border-gray-200 p-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span id={`cilindro-${i}-tamanho`} className="text-sm font-semibold text-gray-400 font-sans">
                {variasLinhas ? `Tamanho dos cilindros (${i + 1})` : 'Tamanho dos cilindros'}
              </span>
              {variasLinhas && (
                <button
                  type="button"
                  onClick={() => removerLinha(i)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-base hover:bg-red-50 transition-colors"
                  aria-label={`Remover tamanho ${i + 1}`}
                  title="Remover"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div role="group" aria-labelledby={`cilindro-${i}-tamanho`} className="grid grid-cols-4 gap-2">
              {[...OPCOES_CILINDRO, OPCAO_OUTRO].map((opcao) => {
                const selecionada = cilindro.opcao === opcao
                return (
                  <button
                    key={opcao}
                    type="button"
                    aria-pressed={selecionada}
                    onClick={() => atualizarLinha(i, { opcao })}
                    className={`py-2.5 rounded-xl border-2 font-sans font-bold text-sm transition-all active:scale-95 ${
                      selecionada
                        ? 'border-sky-400 bg-sky-50 text-sky-700'
                        : 'border-gray-200 text-gray-300 bg-white hover:border-gray-300'
                    }`}
                  >
                    {opcao === OPCAO_OUTRO ? 'Outro' : opcao}
                  </button>
                )
              })}
            </div>

            {cilindro.opcao === OPCAO_OUTRO && (
              <Input
                id={`cilindro-${i}-m3`}
                label="Capacidade do cilindro (m³)"
                inputMode="decimal"
                placeholder="Ex: 2,5"
                value={cilindro.outroM3}
                onChange={(e) => atualizarLinha(i, { outroM3: e.target.value })}
              />
            )}
            {erroTamanho && <span className="block text-xs text-red-base font-sans">{erroTamanho}</span>}

            <Input
              id={`cilindro-${i}-quantidade`}
              label="Quantidade de cilindros"
              type="number"
              min="1"
              step="1"
              placeholder="Ex: 4"
              value={cilindro.quantidade}
              onChange={(e) => atualizarLinha(i, { quantidade: e.target.value })}
              error={errors[`cilindro_${i}_quantidade`]}
            />
          </div>
        )
      })}

      <button
        type="button"
        onClick={() => onChange([...cilindros, cilindroVazio()])}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-sky-200 text-sky-700 font-sans font-semibold text-sm hover:bg-sky-50 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Adicionar outro tamanho
      </button>
    </div>
  )
}
