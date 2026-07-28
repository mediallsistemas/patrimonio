'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ArrowLeft, Inbox, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react'

import Card from '@/components/ui/Card'
import Text from '@/components/ui/Text'
import * as triagemService from '@/services/triagem-trilogo.service'

// Tickets do Trílogo que a sincronização não conseguiu transformar em chamado.
//
// Tela de leitura, sem botão: a sincronização é automática e roda com janela de
// um ano, então tudo que aparece aqui é reprocessado na noite seguinte sozinho.
// O contador de recusas é o que interessa — um ticket recusado 30 vezes é uma
// regra de conversão a ajustar, não um caso isolado esperando alguém clicar.

function fmtData(iso: string): string {
  return format(new Date(iso), 'dd/MM/yyyy HH:mm')
}

export default function TriagemTrilogoPage() {
  const [incluirResolvidos, setIncluirResolvidos] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['triagem-trilogo', incluirResolvidos],
    queryFn: () => triagemService.listarTriagem(incluirResolvidos),
  })

  const motivos = Object.entries(data?.porMotivo ?? {}).sort((a, b) => b[1] - a[1])

  return (
    <div className="form-bg min-h-screen p-6">
      <div className="w-full max-w-5xl mx-auto space-y-5">

        <div className="flex items-center gap-3">
          <Link href="/admin/m/patrimonio" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={18} />
          </Link>
          <div className="w-8 h-8 rounded-lg bg-[#d97706] flex items-center justify-center">
            <Inbox className="w-4 h-4 text-white" />
          </div>
          <div>
            <Text as="h1" variant="heading-sm" className="text-gray-800">
              Triagem do Trílogo
            </Text>
            <Text variant="caption">
              Tickets que a sincronização automática não conseguiu virar chamado
            </Text>
          </div>
        </div>

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
                className="accent-[#d97706]"
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
              Nenhum ticket pendente — a sincronização importou tudo que encontrou.
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
                      <Text variant="caption" className="block">Última tentativa</Text>
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
