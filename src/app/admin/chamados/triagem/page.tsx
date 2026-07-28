'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format, subDays } from 'date-fns'
import {
  ArrowLeft, Inbox, Loader2, RefreshCw, AlertTriangle, CheckCircle2, Building2,
} from 'lucide-react'

import Card from '@/components/ui/Card'
import Text from '@/components/ui/Text'
import * as triagemService from '@/services/triagem-trilogo.service'
import type { ResultadoSincronizacao } from '@/services/triagem-trilogo.service'

// Fila de tickets do Trílogo que a sincronização não conseguiu importar.
//
// A janela de busca é móvel (7 dias): sem esta tela, o ticket recusado ficava só
// no retorno da execução do cron e, passada a janela, deixava de ser buscado.
// Aqui ele fica visível até alguém resolver — e o agrupamento por motivo mostra
// se o problema é uma regra (dezenas com o mesmo motivo) ou caso isolado.

function fmtData(iso: string): string {
  return format(new Date(iso), 'dd/MM/yyyy HH:mm')
}

export default function TriagemTrilogoPage() {
  const qc = useQueryClient()
  const hoje = new Date()

  const [incluirResolvidos, setIncluirResolvidos] = useState(false)
  const [inicio, setInicio] = useState(format(subDays(hoje, 7), 'yyyy-MM-dd'))
  const [fim, setFim] = useState(format(hoje, 'yyyy-MM-dd'))
  const [resultado, setResultado] = useState<ResultadoSincronizacao | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['triagem-trilogo', incluirResolvidos],
    queryFn: () => triagemService.listarTriagem(incluirResolvidos),
  })

  const sincronizacao = useMutation({
    mutationFn: (simular: boolean) => triagemService.sincronizar({ inicio, fim, simular }),
    onSuccess: (r) => {
      setResultado(r)
      setErro(null)
      if (!r.simulacao) qc.invalidateQueries({ queryKey: ['triagem-trilogo'] })
    },
    onError: (e: Error) => {
      setErro(e.message)
      setResultado(null)
    },
  })

  const motivos = Object.entries(data?.porMotivo ?? {}).sort((a, b) => b[1] - a[1])
  const rodando = sincronizacao.isPending

  return (
    <div className="form-bg min-h-screen p-6">
      <div className="w-full max-w-5xl mx-auto space-y-5">

        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={18} />
          </Link>
          <div className="w-8 h-8 rounded-lg bg-[#7c3aed] flex items-center justify-center">
            <Inbox className="w-4 h-4 text-white" />
          </div>
          <div>
            <Text as="h1" variant="heading-sm" className="text-gray-800">
              Triagem do Trílogo
            </Text>
            <Text variant="caption">
              Tickets que a sincronização não conseguiu transformar em chamado
            </Text>
          </div>
        </div>

        {/* ── Sincronizar ─────────────────────────────────────────────────── */}
        <Card padding="sm">
          <Text variant="body-sm-bold" className="text-gray-700">Sincronizar agora</Text>
          <Text variant="caption" className="block mt-0.5 mb-3">
            O cron roda uma vez por dia com janela de 7 dias. Use aqui para importar um
            período maior ou para conferir antes, sem gravar.
          </Text>

          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1">
              <Text variant="caption">Início</Text>
              <input
                type="date"
                value={inicio}
                onChange={(e) => setInicio(e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-700"
              />
            </label>
            <label className="flex flex-col gap-1">
              <Text variant="caption">Fim</Text>
              <input
                type="date"
                value={fim}
                onChange={(e) => setFim(e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-700"
              />
            </label>

            <button
              onClick={() => sincronizacao.mutate(true)}
              disabled={rodando}
              className="flex items-center gap-1.5 border border-gray-200 text-gray-600 text-sm font-medium px-3 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              {rodando ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Simular
            </button>
            <button
              onClick={() => sincronizacao.mutate(false)}
              disabled={rodando}
              className="flex items-center gap-1.5 bg-[#7c3aed] text-white text-sm font-semibold px-3 py-2 rounded-lg hover:bg-[#6d28d9] disabled:opacity-50"
            >
              {rodando ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Importar
            </button>
          </div>

          {erro && (
            <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {erro}
            </p>
          )}

          {resultado && (
            <div className="mt-3 space-y-2">
              <div className="flex flex-wrap gap-2">
                {[
                  ['Buscados', resultado.buscados],
                  [resultado.simulacao ? 'Importaria' : 'Importados', resultado.criados],
                  ['Já existiam', resultado.jaExistiam],
                  ['Em triagem', resultado.emTriagem],
                ].map(([rotulo, valor]) => (
                  <div key={String(rotulo)} className="border border-gray-200 rounded-lg px-3 py-1.5">
                    <Text variant="caption" className="block">{rotulo}</Text>
                    <Text variant="body-md-bold" className="text-gray-800">{valor}</Text>
                  </div>
                ))}
              </div>

              {resultado.simulacao && (
                <p className="text-xs text-gray-400">Simulação — nada foi gravado.</p>
              )}

              {/* Vínculo fraco: só o companyId confirmou a unidade. Se a empresa
                  tiver um hospital não cadastrado, é aqui que o chamado erra —
                  e o índice único impede reimportar corrigido depois. */}
              {resultado.vinculadosSoPorEmpresa > 0 && (
                <p className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <Building2 size={14} className="mt-0.5 shrink-0" />
                  <span>
                    <strong>{resultado.vinculadosSoPorEmpresa}</strong>{' '}
                    {resultado.vinculadosSoPorEmpresa === 1 ? 'chamado teve' : 'chamados tiveram'} a
                    unidade definida só pela empresa, sem projeto nem nome que confirmasse.
                    Confira se foram para o hospital certo — depois de importado não dá para
                    reimportar corrigido.
                  </span>
                </p>
              )}
            </div>
          )}
        </Card>

        {/* ── Resumo por motivo ───────────────────────────────────────────── */}
        {motivos.length > 0 && (
          <Card padding="sm">
            <Text variant="body-sm-bold" className="text-gray-700">Por motivo</Text>
            <div className="mt-2 flex flex-wrap gap-2">
              {motivos.map(([motivo, qtd]) => (
                <div
                  key={motivo}
                  className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5"
                >
                  <Text variant="body-sm-bold" className="text-gray-800">{qtd}</Text>
                  <Text variant="caption">{motivo}</Text>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ── Fila ────────────────────────────────────────────────────────── */}
        <Card padding="sm">
          <div className="flex items-center justify-between mb-3">
            <Text variant="body-sm-bold" className="text-gray-700">
              Fila {data ? `(${data.total})` : ''}
            </Text>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={incluirResolvidos}
                onChange={(e) => setIncluirResolvidos(e.target.checked)}
                className="accent-[#7c3aed]"
              />
              <Text variant="caption">Incluir resolvidos</Text>
            </label>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-10 gap-2 text-gray-400 text-sm">
              <Loader2 size={18} className="animate-spin" />
              Carregando...
            </div>
          )}

          {isError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              Erro ao carregar a fila.
            </p>
          )}

          {data && data.itens.length === 0 && (
            <div className="text-center py-10 text-gray-400 text-sm">
              <CheckCircle2 size={36} className="mx-auto mb-3 opacity-30" />
              Nenhum ticket pendente de triagem.
            </div>
          )}

          {data && data.itens.length > 0 && (
            <div className="space-y-2">
              {data.itens.map((t) => (
                <div
                  key={t.trilogoTicketId}
                  className={`border rounded-xl p-3 ${
                    t.resolvidoEm ? 'border-gray-100 bg-gray-50/60' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Text variant="body-sm-bold" className="text-gray-800">
                          Ticket #{t.trilogoTicketId}
                        </Text>
                        {t.resolvidoEm ? (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                            Resolvido
                          </span>
                        ) : (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                            {t.motivo}
                          </span>
                        )}
                        {t.statusOrigem && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                            Origem: {t.statusOrigem}
                          </span>
                        )}
                        {/* Repetição alta é sinal de regra a ajustar, não de caso isolado. */}
                        {t.ocorrencias > 1 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                            {t.ocorrencias}× recusado
                          </span>
                        )}
                      </div>

                      {t.descricao && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{t.descricao}</p>
                      )}
                      {t.endereco && (
                        <p className="text-xs text-gray-400 mt-0.5">{t.endereco}</p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <Text variant="caption" className="block">Última vez</Text>
                      <Text variant="caption" className="text-gray-600">{fmtData(t.ultimaVezEm)}</Text>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {data && data.total >= data.limite && (
            <p className="flex items-center gap-1.5 mt-3 text-xs text-amber-700">
              <AlertTriangle size={13} />
              Mostrando os primeiros {data.limite}. Há mais na fila.
            </p>
          )}
        </Card>
      </div>
    </div>
  )
}
