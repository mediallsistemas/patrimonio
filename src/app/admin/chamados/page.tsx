'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format, subMonths } from 'date-fns'
import {
  ArrowLeft, ClipboardList, CheckCircle, Loader2, AlertTriangle, Wallet, PlayCircle,
} from 'lucide-react'

import Card from '@/components/ui/Card'
import Text from '@/components/ui/Text'
import { useDashboardChamados } from '@/hooks/useChamados'
import {
  TIPO_CHAMADO_LABEL,
  PRIORIDADE_CHAMADO_LABEL,
  STATUS_CHAMADO_LABEL,
  type TipoChamado,
  type PrioridadeChamado,
  type StatusChamado,
} from '@/modules/chamados/chamados.types'

// Painel gerencial de chamados (admin) — espelha o painel da planilha:
// totais + distribuição por status/prioridade/tipo/responsável.
// Cores de status/prioridade seguem o mesmo mapa dos badges do painel;
// identidade sempre carregada pelo rótulo de texto, nunca só pela cor.

const STATUS_BAR_COLOR: Record<string, string> = {
  aberto: 'bg-amber-400',
  em_execucao: 'bg-blue-400',
  finalizado: 'bg-emerald-400',
  cancelado: 'bg-gray-300',
}

const PRIORIDADE_BAR_COLOR: Record<string, string> = {
  baixa: 'bg-gray-300',
  media: 'bg-yellow-400',
  alta: 'bg-orange-400',
  urgente: 'bg-red-400',
}

function fmtReais(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Lista de barras horizontais: rótulo + barra proporcional + valor.
// Uma única série (magnitude) — barra em um tom, valor sempre visível.
function BarrasDistribuicao({
  titulo,
  itens,
  corPorChave,
}: {
  titulo: string
  itens: { chave: string; rotulo: string; qtde: number }[]
  corPorChave?: Record<string, string>
}) {
  const max = Math.max(1, ...itens.map((i) => i.qtde))
  const visiveis = itens.filter((i) => i.qtde > 0)
  return (
    <Card padding="sm">
      <Text variant="body-sm-bold" className="text-dark block mb-3">{titulo}</Text>
      {visiveis.length === 0 ? (
        <p className="text-xs text-gray-300 font-sans py-2">Sem chamados no período</p>
      ) : (
        <div className="space-y-2">
          {visiveis.map((i) => (
            <div key={i.chave} className="flex items-center gap-2">
              <span className="w-32 shrink-0 text-xs text-gray-500 font-sans truncate" title={i.rotulo}>
                {i.rotulo}
              </span>
              <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
                <div
                  className={`h-full rounded ${corPorChave?.[i.chave] ?? 'bg-teal-500'}`}
                  style={{ width: `${(i.qtde / max) * 100}%` }}
                />
              </div>
              <span className="w-8 shrink-0 text-right text-xs font-semibold text-gray-600 font-sans">
                {i.qtde}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

export default function DashboardChamadosPage() {
  const hoje = new Date()
  const [de, setDe] = useState(format(subMonths(hoje, 3), 'yyyy-MM-dd'))
  const [ate, setAte] = useState(format(hoje, 'yyyy-MM-dd'))

  const { data, isLoading, isError } = useDashboardChamados({
    de: `${de}T00:00:00`,
    ate: `${ate}T23:59:59`,
  })

  const tiles = data
    ? [
        { label: 'Total de chamados', valor: String(data.total), icon: ClipboardList, cor: 'bg-purple-100 text-purple-600' },
        { label: 'Finalizados', valor: String(data.finalizados), icon: CheckCircle, cor: 'bg-emerald-100 text-emerald-600' },
        { label: 'Em execução', valor: String(data.emExecucao), icon: PlayCircle, cor: 'bg-blue-100 text-blue-600' },
        { label: 'Atrasados', valor: String(data.atrasados), icon: AlertTriangle, cor: 'bg-red-100 text-red-600' },
        { label: 'Valor gasto', valor: fmtReais(data.valorGastoCentavos), icon: Wallet, cor: 'bg-amber-100 text-amber-600' },
      ]
    : []

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Painel de Chamados</h1>
            <p className="text-sm text-gray-500">Indicadores dos chamados de manutenção da unidade</p>
          </div>
        </div>

        {/* Filtro de período */}
        <Card padding="sm">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">De</label>
              <input
                type="date"
                value={de}
                onChange={(e) => setDe(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Até</label>
              <input
                type="date"
                value={ate}
                onChange={(e) => setAte(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>
          </div>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-gray-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Carregando indicadores...
          </div>
        ) : isError || !data ? (
          <Card padding="lg">
            <p className="text-center text-sm text-gray-400 py-8">
              Não foi possível carregar os indicadores. Este painel é exclusivo de administradores.
            </p>
          </Card>
        ) : (
          <>
            {/* Tiles de resumo */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {tiles.map(({ label, valor, icon: Icon, cor }) => (
                <Card key={label} padding="sm">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${cor}`}>
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xl font-bold text-gray-800 truncate" title={valor}>{valor}</p>
                      <p className="text-xs text-gray-500">{label}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Distribuições */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <BarrasDistribuicao
                titulo="Chamados por status"
                corPorChave={STATUS_BAR_COLOR}
                itens={data.porStatus.map((s) => ({
                  chave: s.status,
                  rotulo: STATUS_CHAMADO_LABEL[s.status as StatusChamado] ?? s.status,
                  qtde: s.qtde,
                }))}
              />
              <BarrasDistribuicao
                titulo="Chamados por prioridade"
                corPorChave={PRIORIDADE_BAR_COLOR}
                itens={data.porPrioridade.map((p) => ({
                  chave: p.prioridade,
                  rotulo: PRIORIDADE_CHAMADO_LABEL[p.prioridade as PrioridadeChamado] ?? p.prioridade,
                  qtde: p.qtde,
                }))}
              />
              <BarrasDistribuicao
                titulo="Chamados por tipo"
                itens={data.porTipo.map((t) => ({
                  chave: t.tipo,
                  rotulo: TIPO_CHAMADO_LABEL[t.tipo as TipoChamado] ?? t.tipo,
                  qtde: t.qtde,
                }))}
              />
              <BarrasDistribuicao
                titulo="Chamados por responsável"
                itens={data.porResponsavel.map((r) => ({
                  chave: r.responsavelId ?? 'sem',
                  rotulo: r.nome,
                  qtde: r.qtde,
                }))}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
