'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, Wrench, User, Calendar } from 'lucide-react'
import * as manutencoesService from '@/services/manutencoes.service'
import FotoLightbox from '@/components/ui/FotoLightbox'
import type { ManutencaoRealizadaDetalhe } from '@/services/manutencoes.service'

interface Props {
  id: string
  onClose: () => void
}

function formatDateTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function ModalManutencaoRealizadaDetalhe({ id, onClose }: Props) {
  const { data, isLoading, isError } = useQuery<ManutencaoRealizadaDetalhe>({
    queryKey: ['manutencao-realizada-detalhe', id],
    queryFn: () => manutencoesService.buscarRealizadaDetalhe(id),
    staleTime: 5 * 60 * 1000,
  })
  const [fotoAmpliada, setFotoAmpliada] = useState<number | null>(null)

  // Antes sempre existe (é obrigatória ao iniciar a manutenção); depois só
  // quando a manutenção foi finalizada. A ordem aqui define a das setas.
  const fotosAmpliaveis = [
    ...(data?.fotoAntes ? [{ src: data.fotoAntes, legenda: 'Antes' }] : []),
    ...(data?.fotoDepois ? [{ src: data.fotoDepois, legenda: 'Depois' }] : []),
  ]

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Wrench size={16} className="text-emerald-500" />
            Manutenção realizada
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {isLoading && <p className="text-sm text-gray-400 text-center py-10">Carregando...</p>}
          {isError && <p className="text-sm text-red-500 text-center py-10">Erro ao carregar manutenção.</p>}
          {data && (
            <>
              <div className="space-y-1">
                <p className="text-base font-semibold text-gray-800">
                  {data.subtipoPatrimonio ?? 'Manutenção'}
                </p>
                <p className="text-sm text-gray-500">{data.descricaoBemSnapshot}</p>
                <p className="text-xs text-purple-600 font-mono">{data.patrimony}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-gray-400 uppercase tracking-wide font-semibold mb-0.5 flex items-center gap-1">
                    <Calendar size={10} /> Iniciada
                  </p>
                  <p className="text-gray-700">{formatDateTime(data.iniciadaEm)}</p>
                </div>
                <div className="bg-emerald-50 rounded-lg px-3 py-2">
                  <p className="text-emerald-600 uppercase tracking-wide font-semibold mb-0.5 flex items-center gap-1">
                    <Calendar size={10} /> Finalizada
                  </p>
                  <p className="text-emerald-700">{formatDateTime(data.finalizadaEm)}</p>
                </div>
              </div>

              <div className="text-xs text-gray-500 flex items-center gap-1">
                <User size={11} className="text-gray-400" />
                {data.criadoPor.nome}
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">O que foi feito</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{data.descricao}</p>
              </div>

              {data.observacaoFinal && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Observação final</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{data.observacaoFinal}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Antes</p>
                  <button
                    type="button"
                    onClick={() => setFotoAmpliada(0)}
                    className="w-full rounded-lg border border-amber-100 overflow-hidden block hover:opacity-90 transition-opacity cursor-zoom-in"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={data.fotoAntes} alt="Antes" className="w-full block" />
                  </button>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Depois</p>
                  {data.fotoDepois ? (
                    <button
                      type="button"
                      onClick={() => setFotoAmpliada(fotosAmpliaveis.length - 1)}
                      className="w-full rounded-lg border border-emerald-100 overflow-hidden block hover:opacity-90 transition-opacity cursor-zoom-in"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={data.fotoDepois} alt="Depois" className="w-full block" />
                    </button>
                  ) : (
                    <div className="w-full aspect-square rounded-lg border border-dashed border-gray-200 flex items-center justify-center text-xs text-gray-300">
                      Sem foto
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 shrink-0">
          <button onClick={onClose} className="w-full py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            Fechar
          </button>
        </div>
      </div>

      <FotoLightbox
        fotos={fotosAmpliaveis}
        indice={fotoAmpliada}
        onFechar={() => setFotoAmpliada(null)}
        onNavegar={setFotoAmpliada}
      />
    </div>
  )
}
