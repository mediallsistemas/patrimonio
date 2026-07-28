'use client'

import { memo, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ChevronDown, ChevronUp, MapPin, User, Package, CalendarClock, UserPlus, Ban, Building2, Download,
} from 'lucide-react'

import Button from '@/components/ui/Button'
import Text from '@/components/ui/Text'
import { centavosParaReais, reaisParaCentavos } from '@/utils/moeda'
import { StatusChamadoBadge, PrioridadeChamadoBadge, AtrasadoBadge } from './ChamadoBadges'
import { FotoLazyChamado } from './FotoLazyChamado'
import {
  TIPO_CHAMADO_LABEL,
  PRIORIDADES_CHAMADO,
  PRIORIDADE_CHAMADO_LABEL,
} from '@/modules/chamados/chamados.types'
import type { ChamadoResumo, PrioridadeChamado } from '@/services/chamados.service'

interface UsuarioOption {
  id: string
  nome: string
}

interface ChamadoCardProps {
  chamado: ChamadoResumo
  podeEscrever: boolean
  ehAdmin: boolean
  usuarios?: UsuarioOption[]
  busy?: boolean
  // Exibe o nome da unidade — útil só em listas cross-tenant (admin global)
  mostrarTenant?: boolean
  onAssumir: (id: string, prioridade?: PrioridadeChamado) => void
  onAtribuir: (id: string, responsavelId: string) => void
  onFinalizar: (chamado: ChamadoResumo) => void
  onCancelar: (chamado: ChamadoResumo) => void
  onSalvarFiscal: (
    id: string,
    input: { fornecedor: string | null; numeroOrdemCompra: string | null; valorGastoCentavos: number | null },
  ) => void
}

function fmtData(iso: string) {
  return format(new Date(iso), 'dd/MM/yyyy HH:mm', { locale: ptBR })
}

function ChamadoCardBase({
  chamado: c,
  podeEscrever,
  ehAdmin,
  usuarios = [],
  busy = false,
  mostrarTenant = false,
  onAssumir,
  onAtribuir,
  onFinalizar,
  onCancelar,
  onSalvarFiscal,
}: ChamadoCardProps) {
  const [aberto, setAberto] = useState(false)
  const [prioridadeAssumir, setPrioridadeAssumir] = useState<PrioridadeChamado>(c.prioridade)
  const [responsavelAtribuir, setResponsavelAtribuir] = useState('')
  // Campos fiscais — estado local do admin, salvo em bloco
  const [fornecedor, setFornecedor] = useState(c.fornecedor ?? '')
  const [ordemCompra, setOrdemCompra] = useState(c.numeroOrdemCompra ?? '')
  const [valorReais, setValorReais] = useState(centavosParaReais(c.valorGastoCentavos))

  // O card tem key={c.id} estável — sem isso, um refetch (ex.: outro admin
  // salvou fiscais deste mesmo chamado) nunca chegaria aos campos locais, e
  // "Salvar fiscais" aqui reverteria o valor mais novo em silêncio.
  useEffect(() => {
    setFornecedor(c.fornecedor ?? '')
    setOrdemCompra(c.numeroOrdemCompra ?? '')
    setValorReais(centavosParaReais(c.valorGastoCentavos))
  }, [c.fornecedor, c.numeroOrdemCompra, c.valorGastoCentavos])

  const vivo = c.status === 'aberto' || c.status === 'em_execucao'

  return (
    <div
      className={`bg-white rounded-2xl border shadow-sm transition-all ${
        c.atrasado ? 'border-red-200' : 'border-gray-200'
      }`}
    >
      {/* Cabeçalho clicável */}
      <button
        onClick={() => setAberto((v) => !v)}
        className="w-full flex items-start gap-3 px-5 py-4 text-left cursor-pointer"
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-xs font-mono text-gray-400">#{c.numero}</span>
            <StatusChamadoBadge status={c.status} />
            <PrioridadeChamadoBadge prioridade={c.prioridade} />
            {c.atrasado && <AtrasadoBadge />}
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-sans">
              {TIPO_CHAMADO_LABEL[c.tipo] ?? c.tipo}
            </span>
          </div>
          <Text variant="body-md-bold" className="text-dark block truncate">{c.titulo}</Text>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-gray-400 font-sans">
            {mostrarTenant && (
              <span className="inline-flex items-center gap-1 font-semibold text-gray-500">
                <Building2 className="w-3 h-3" />
                {c.tenant.nome}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {c.ambienteNomeSnapshot ?? '—'}
              {c.blocoNomeSnapshot ? ` · ${c.blocoNomeSnapshot}` : ''}
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="w-3 h-3" />
              Prazo {fmtData(c.prazo)}
            </span>
            {c.responsavel && (
              <span className="inline-flex items-center gap-1">
                <User className="w-3 h-3" />
                {c.responsavel.nome}
              </span>
            )}
          </div>
        </div>
        {aberto ? (
          <ChevronUp className="w-4 h-4 text-gray-300 shrink-0 mt-1" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-300 shrink-0 mt-1" />
        )}
      </button>

      {/* Detalhe expandido */}
      {aberto && (
        <div className="px-5 pb-5 space-y-4 border-t border-gray-100 pt-4">
          <div>
            <Text variant="caption" className="text-gray-300 uppercase tracking-wide font-semibold block mb-1">
              Descrição
            </Text>
            <Text variant="body-sm" className="text-dark block whitespace-pre-wrap">{c.descricao}</Text>
          </div>

          {c.patrimony && (
            <div className="px-4 py-3 rounded-xl bg-purple-50 border border-purple-200">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 uppercase tracking-wide font-sans">
                <Package className="w-3.5 h-3.5" />
                Patrimônio · {c.patrimony}
              </span>
              {c.descricaoBemSnapshot && (
                <Text variant="body-sm" className="text-dark block mt-0.5">{c.descricaoBemSnapshot}</Text>
              )}
            </div>
          )}

          {/* Origem — só aparece em chamado vindo do Trílogo. Sem isso, ninguém consegue
              distinguir na tela o que nasceu aqui do que veio da sincronização. */}
          {c.trilogoTicketId !== null && (
            <div className="px-4 py-2.5 rounded-xl bg-sky-50 border border-sky-200">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 uppercase tracking-wide font-sans">
                <Download className="w-3.5 h-3.5" />
                Origem · Trílogo #{c.trilogoTicketId}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-sans">
            <div>
              <p className="text-gray-300 mb-0.5">Criado por</p>
              <p className="text-gray-500 font-medium">{c.criadoPor.nome}</p>
            </div>
            <div>
              <p className="text-gray-300 mb-0.5">Criado em</p>
              <p className="text-gray-500 font-medium">{fmtData(c.criadoEm)}</p>
            </div>
            {c.assumidoEm && (
              <div>
                <p className="text-gray-300 mb-0.5">Assumido em</p>
                <p className="text-gray-500 font-medium">{fmtData(c.assumidoEm)}</p>
              </div>
            )}
            {c.finalizadoEm && (
              <div>
                <p className="text-gray-300 mb-0.5">Finalizado em</p>
                <p className="text-gray-500 font-medium">{fmtData(c.finalizadoEm)}</p>
              </div>
            )}
          </div>

          {c.descricaoExecucao && (
            <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <Text variant="caption" className="text-emerald-700 uppercase tracking-wide font-semibold block mb-1">
                Execução
              </Text>
              <Text variant="body-sm" className="text-dark block whitespace-pre-wrap">{c.descricaoExecucao}</Text>
            </div>
          )}

          {c.status === 'cancelado' && (
            <div className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-200">
              <Text variant="caption" className="text-gray-500 uppercase tracking-wide font-semibold block mb-1">
                Motivo do cancelamento
              </Text>
              <Text variant="body-sm" className="text-dark block whitespace-pre-wrap">
                {c.motivoCancelamento ?? 'Não informado'}
              </Text>
            </div>
          )}

          <FotoLazyChamado chamadoId={c.id} />

          {/* ── Ações ─────────────────────────────────────────────────── */}
          {podeEscrever && vivo && (
            <div className="flex flex-wrap items-end gap-3 pt-2 border-t border-gray-100">
              {/* Admin usa Atribuir para se designar (ou designar outro);
                  Assumir só faz sentido para quem não tem Atribuir */}
              {!ehAdmin && c.status === 'aberto' && (
                <div className="flex items-end gap-2">
                  <div>
                    <label className="block text-xs text-gray-400 font-sans mb-1">Prioridade</label>
                    <select
                      value={prioridadeAssumir}
                      onChange={(e) => setPrioridadeAssumir(e.target.value as PrioridadeChamado)}
                      className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-sans text-dark bg-white focus:outline-none focus:ring-2 focus:ring-red-base"
                    >
                      {PRIORIDADES_CHAMADO.map((p) => (
                        <option key={p} value={p}>{PRIORIDADE_CHAMADO_LABEL[p]}</option>
                      ))}
                    </select>
                  </div>
                  <Button size="sm" disabled={busy} onClick={() => onAssumir(c.id, prioridadeAssumir)}>
                    Assumir
                  </Button>
                </div>
              )}

              {ehAdmin && (
                <div className="flex items-end gap-2">
                  <div>
                    <label className="block text-xs text-gray-400 font-sans mb-1">Atribuir a</label>
                    <select
                      value={responsavelAtribuir}
                      onChange={(e) => setResponsavelAtribuir(e.target.value)}
                      className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-sans text-dark bg-white focus:outline-none focus:ring-2 focus:ring-red-base"
                    >
                      <option value="">Selecione...</option>
                      {usuarios.map((u) => (
                        <option key={u.id} value={u.id}>{u.nome}</option>
                      ))}
                    </select>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy || !responsavelAtribuir}
                    onClick={() => onAtribuir(c.id, responsavelAtribuir)}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Atribuir
                  </Button>
                </div>
              )}

              <Button size="sm" variant="success" disabled={busy} onClick={() => onFinalizar(c)}>
                Finalizar
              </Button>

              {ehAdmin && (
                <Button size="sm" variant="secondary" disabled={busy} onClick={() => onCancelar(c)}>
                  <Ban className="w-3.5 h-3.5" />
                  Cancelar
                </Button>
              )}
            </div>
          )}

          {/* ── Campos fiscais — visíveis SOMENTE para admin ──────────── */}
          {ehAdmin && (
            <div className="pt-3 border-t border-gray-100">
              <Text variant="caption" className="text-gray-400 uppercase tracking-wide font-semibold block mb-2">
                Dados fiscais (visível apenas para administradores)
              </Text>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-xs text-gray-400 font-sans mb-1">Fornecedor</label>
                  <input
                    type="text"
                    value={fornecedor}
                    onChange={(e) => setFornecedor(e.target.value)}
                    placeholder="Nome do fornecedor"
                    className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-sans text-dark bg-white focus:outline-none focus:ring-2 focus:ring-red-base placeholder:text-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 font-sans mb-1">Nº ordem de compra</label>
                  <input
                    type="text"
                    value={ordemCompra}
                    onChange={(e) => setOrdemCompra(e.target.value)}
                    placeholder="OC-000"
                    className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-sans text-dark bg-white focus:outline-none focus:ring-2 focus:ring-red-base placeholder:text-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 font-sans mb-1">Valor gasto (R$)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={valorReais}
                    onChange={(e) => setValorReais(e.target.value)}
                    placeholder="0,00"
                    className="w-32 px-3 py-2 rounded-lg border border-gray-200 text-sm font-sans text-dark bg-white focus:outline-none focus:ring-2 focus:ring-red-base placeholder:text-gray-300"
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    onSalvarFiscal(c.id, {
                      fornecedor: fornecedor.trim() || null,
                      numeroOrdemCompra: ordemCompra.trim() || null,
                      valorGastoCentavos: reaisParaCentavos(valorReais),
                    })
                  }
                >
                  Salvar fiscais
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Lista pode ter até 200 cards — memoizado para re-renderizar só o card
// cuja prop mudou (ex.: busy individual durante uma mutation).
const ChamadoCard = memo(ChamadoCardBase)
export default ChamadoCard
