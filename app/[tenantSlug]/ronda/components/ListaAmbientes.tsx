import { Search, ChevronRight, CheckCircle, X, SkipForward, LogOut, FlaskConical } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Text from '@/components/ui/Text'
import type { AmbienteTenant, RegistroFeito } from '../ronda.types'

interface Props {
  ambientesFiltrados: AmbienteTenant[]
  registros: RegistroFeito[]
  search: string
  setSearch: (v: string) => void
  tudoFeito: boolean
  totalAmbientes: number
  totalFeitos: number
  submitting: boolean
  onSelecionar: (amb: AmbienteTenant) => void
  onFinalizar: () => void
  onPausar: () => void
}

export default function ListaAmbientes({
  ambientesFiltrados, registros, search, setSearch,
  tudoFeito, totalAmbientes, totalFeitos, submitting,
  onSelecionar, onFinalizar, onPausar,
}: Props) {
  function jaRegistrado(id: string) {
    return registros.some((r) => r.ambienteId === id)
  }

  return (
    <Card shadow="md" className="overflow-hidden">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-red-base flex items-center justify-center shrink-0">
          <Text as="span" className="text-white font-bold text-lg font-sans">{totalFeitos}</Text>
        </div>
        <div>
          <Text as="h2" variant="heading-sm" className="text-dark block">Selecionar Ambiente</Text>
          <Text variant="body-sm" className="text-gray-300 block">
            {tudoFeito ? 'Todos os ambientes registrados' : 'Toque no ambiente para registrar'}
          </Text>
        </div>
      </div>

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

      <div className="overflow-y-auto max-h-72 space-y-1.5 pr-1 -mr-1">
        {ambientesFiltrados.length === 0 ? (
          <p className="text-center py-6 text-sm text-gray-300 font-sans">
            {search ? 'Nenhum ambiente encontrado' : 'Nenhum ambiente disponível'}
          </p>
        ) : (
          ambientesFiltrados.map((amb) => {
            const feito = jaRegistrado(amb.id)
            const reg = registros.find((r) => r.ambienteId === amb.id)
            return (
              <button
                key={amb.id}
                onClick={() => onSelecionar(amb)}
                disabled={feito}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left font-sans ${feito ? 'border-green-200 bg-green-50 opacity-80 cursor-default' : 'border-gray-200 bg-white hover:border-red-base hover:bg-red-light active:scale-98'}`}
              >
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${feito ? (reg?.temOcorrencia ? 'bg-orange-400' : 'bg-green-500') : 'bg-gray-200'}`} />
                <div className="flex-1 min-w-0">
                  <span className={`text-sm font-semibold block truncate ${feito ? 'text-gray-500' : 'text-dark'}`}>{amb.nome}</span>
                  {feito && reg && (
                    <span className={`text-xs ${reg.temOcorrencia ? 'text-orange-500' : 'text-green-600'}`}>
                      {reg.temOcorrencia ? '⚠ Ocorrência registrada' : '✓ Normal'}
                    </span>
                  )}
                </div>
                {amb.tipo === 'gases' && <FlaskConical className="w-4 h-4 text-purple-400 shrink-0" />}
                {!feito && <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />}
              </button>
            )
          })
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
        {tudoFeito && (
          <Button onClick={onFinalizar} disabled={submitting} className="w-full">
            <CheckCircle className="w-4 h-4" /> Finalizar Ronda
          </Button>
        )}
        {!tudoFeito && totalFeitos > 0 && (
          <Button onClick={onFinalizar} disabled={submitting} variant="outline" className="w-full">
            <SkipForward className="w-4 h-4" /> Finalizar com {totalAmbientes - totalFeitos} pendente{totalAmbientes - totalFeitos !== 1 ? 's' : ''}
          </Button>
        )}
        <button
          onClick={onPausar}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-sans font-semibold text-gray-400 hover:text-red-base transition-colors"
        >
          <LogOut className="w-4 h-4" /> Pausar e sair
        </button>
      </div>
    </Card>
  )
}
