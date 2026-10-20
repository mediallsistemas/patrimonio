'use client'

import { Plus, Trash2 } from 'lucide-react'
import Input from '@/components/ui/Input'
import {
  CILINDROS_POR_CAPACIDADE,
  CILINDROS_POR_CODIGO,
  OPCAO_OUTRO,
  cilindroVazio,
  type CilindroDraft,
} from '@/utils/cilindros'

interface CilindrosAbastecimentoProps {
  cilindros: CilindroDraft[]
  errors: Record<string, string>
  onChange: (cilindros: CilindroDraft[]) => void
}

// Linhas do abastecimento de gases: em cada uma, o tipo de cilindro (do
// catálogo pré-cadastrado em utils/cilindros, ou a capacidade digitada em
// "Outro") e a quantidade. A unidade pode receber cilindros de vários tipos no
// mesmo abastecimento. A lista é longa, então é um <select> — no celular abre o
// seletor nativo.
export default function CilindrosAbastecimento({ cilindros, errors, onChange }: CilindrosAbastecimentoProps) {
  const atualizarLinha = (indice: number, parcial: Partial<CilindroDraft>) =>
    onChange(cilindros.map((c, i) => (i === indice ? { ...c, ...parcial } : c)))
  const removerLinha = (indice: number) => onChange(cilindros.filter((_, i) => i !== indice))
  const variasLinhas = cilindros.length > 1

  return (
    <div className="space-y-4">
      {cilindros.map((cilindro, i) => {
        const erroTipo = errors[`cilindro_${i}_tamanho`]
        return (
          <div key={i} className="rounded-xl border border-gray-200 p-3 space-y-3">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor={`cilindro-${i}-tipo`} className="text-sm font-semibold text-gray-400 font-sans">
                  {variasLinhas ? `Tipo de cilindro (${i + 1})` : 'Tipo de cilindro'}
                </label>
                {variasLinhas && (
                  <button
                    type="button"
                    onClick={() => removerLinha(i)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-base hover:bg-red-light transition-colors"
                    aria-label={`Remover o tipo de cilindro ${i + 1}`}
                    title="Remover"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <select
                id={`cilindro-${i}-tipo`}
                value={cilindro.opcao ?? ''}
                onChange={(e) => atualizarLinha(i, { opcao: e.target.value || null })}
                aria-invalid={Boolean(erroTipo)}
                className={`w-full px-4 py-3 rounded-xl border font-sans text-dark text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-base transition-all ${
                  erroTipo ? 'border-red-base' : 'border-gray-200'
                }`}
              >
                <option value="">Selecione o cilindro</option>
                <optgroup label="Capacidade (m³)">
                  {CILINDROS_POR_CAPACIDADE.map((tipo) => (
                    <option key={tipo} value={tipo}>Cilindro de {tipo}</option>
                  ))}
                </optgroup>
                <optgroup label="Código do fornecedor">
                  {CILINDROS_POR_CODIGO.map((tipo) => (
                    <option key={tipo} value={tipo}>{tipo}</option>
                  ))}
                </optgroup>
                <option value={OPCAO_OUTRO}>Outro: digitar a capacidade em m³</option>
              </select>
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
            {erroTipo && <span className="block text-xs text-red-base font-sans">{erroTipo}</span>}

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
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-blue-base/50 text-blue-dark font-sans font-semibold text-sm hover:bg-blue-light transition-colors"
      >
        <Plus className="w-4 h-4" />
        Adicionar outro tipo de cilindro
      </button>
    </div>
  )
}
