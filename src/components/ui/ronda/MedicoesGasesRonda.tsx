'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Camera, FlaskConical, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import FotoLightbox from '@/components/ui/FotoLightbox'
import * as rondasService from '@/services/rondas.service'
import type { MedicaoGas, RegistroAmbiente } from '@/services/rondas.types'

const MEDICOES: { chave: MedicaoGas; rotulo: string; unidade: string }[] = [
  { chave: 'purezaO2', rotulo: 'Pureza O₂', unidade: '%' },
  { chave: 'pressaoO2', rotulo: 'Pressão O₂', unidade: 'bar' },
  { chave: 'pressaoAr', rotulo: 'Pressão Ar', unidade: 'bar' },
]

function formatar(valor: number | null | undefined, unidade: string): string {
  if (valor === null || valor === undefined) return '—'
  return `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ${unidade}`
}

// Medições de gases da ronda selecionada no histórico, com a foto do relógio
// de cada valor. A lista só diz quais medições têm foto; a imagem é buscada
// quando alguém pede para vê-la.
export function MedicoesGasesRonda({ ambientes }: { ambientes: RegistroAmbiente[] }) {
  const registros = ambientes.filter((a) => a.tipoRegistro === 'gases')
  if (registros.length === 0) return null

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 pb-1">
        <FlaskConical className="w-3.5 h-3.5 text-purple-500" />
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
          Medições de gases
        </span>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
          {registros.length}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {registros.map((registro) => (
          <CartaoMedicoes key={registro.id} registro={registro} />
        ))}
      </div>
    </section>
  )
}

function CartaoMedicoes({ registro }: { registro: RegistroAmbiente }) {
  const comFoto = new Set((registro.fotosMedicoes ?? []).map((f) => f.medicao))

  return (
    <div className="bg-white rounded-xl ring-1 ring-gray-100 px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-gray-700 truncate">{registro.ambiente}</p>
        <p className="text-[11px] text-gray-400 tabular-nums shrink-0">
          {format(new Date(registro.concluidoEm), 'HH:mm', { locale: ptBR })}
        </p>
      </div>
      <dl className="mt-2 space-y-1.5">
        {MEDICOES.map(({ chave, rotulo, unidade }) => (
          <div key={chave} className="flex items-center justify-between gap-2 text-xs">
            <dt className="text-gray-400">{rotulo}</dt>
            <dd className="flex items-center gap-2 font-semibold text-gray-700 tabular-nums">
              {formatar(registro[chave], unidade)}
              {comFoto.has(chave) && (
                <FotoMedicaoLazy
                  registroId={registro.id}
                  medicao={chave}
                  legenda={`${rotulo}: ${registro.ambiente}`}
                />
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function FotoMedicaoLazy({
  registroId,
  medicao,
  legenda,
}: {
  registroId: string
  medicao: MedicaoGas
  legenda: string
}) {
  const [aberta, setAberta] = useState(false)
  const { data, isFetching, isError } = useQuery({
    queryKey: ['foto-medicao', registroId, medicao],
    queryFn: () => rondasService.buscarFotoMedicao(registroId, medicao),
    enabled: aberta,
    staleTime: Infinity,
    retry: 1,
  })

  return (
    <>
      <button
        type="button"
        onClick={() => setAberta(true)}
        className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
        aria-label={`Ver foto do relógio: ${legenda}`}
      >
        {aberta && isFetching ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Camera className="w-3.5 h-3.5" />
        )}
        Foto
      </button>
      {aberta && isError && <span className="text-[11px] font-normal text-gray-300">indisponível</span>}

      <FotoLightbox
        fotos={data?.foto ? [{ src: data.foto, legenda }] : []}
        indice={aberta && data?.foto ? 0 : null}
        onFechar={() => setAberta(false)}
      />
    </>
  )
}
