'use client'

import { useState, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Package, Layers, Search, X, CalendarPlus, CheckCircle2, XCircle } from 'lucide-react'
import Link from 'next/link'
import Card from '@/components/card'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Empresa { id: number; nome: string }

interface Agendamento {
  id: string
  trilogoAssetId: number
  titulo: string
  dataAgendada: string
  observacao: string | null
  status: 'pendente' | 'realizado' | 'cancelado'
  criadoPor: string
}

interface Asset {
  id: number
  patrimony: string
  description: string
  brand: string | null
  model: string | null
  serialNumber: string | null
  price: number | null
  purchaseDate: string | null
  departmentFullAddress: string
  status: number
  assetTypeName: string
  companyId: number
  companyName: string
  coverPermalink: string | null
  observations: string | null
  creationDate: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS: Record<number, { label: string; color: string }> = {
  1: { label: 'Ativo',      color: 'bg-emerald-100 text-emerald-700' },
  2: { label: 'Inativo',    color: 'bg-gray-100 text-gray-500' },
  4: { label: 'Manutenção', color: 'bg-amber-100 text-amber-700' },
}

function parseEndereco(full: string) {
  const parts = full.split('>').map(s => s.trim()).filter(Boolean)
  return {
    empresa:  parts[0] ?? '—',
    cidade:   parts[1] ?? '—',
    unidade:  parts[2] ?? '—',
    bloco:    parts[3] ?? '—',
    // Ambiente usa os 2 últimos segmentos para dar contexto (ex: "Bloco X > Sala Y")
    // e evitar colisões de nomes entre unidades
    ambiente: parts.length > 1
      ? parts.slice(-2).join(' > ')
      : parts[0] ?? '—',
  }
}

function moeda(v: number | null) {
  if (!v) return '—'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ── Sugestões de manutenção por tipo de bem ───────────────────────────────────

const SUGESTOES_POR_TIPO: Record<string, string[]> = {
  // Veículos
  'AUTOMÓVEIS':              ['Troca de óleo', 'Alinhamento e balanceamento', 'Troca de pneus', 'Revisão de freios', 'Troca de filtro de ar', 'Troca de filtro de combustível', 'Revisão geral', 'Higienização interna'],
  'AUTOMÓVEL':               ['Troca de óleo', 'Alinhamento e balanceamento', 'Troca de pneus', 'Revisão de freios', 'Troca de filtro de ar', 'Revisão geral'],
  'VEÍCULOS':                ['Troca de óleo', 'Alinhamento e balanceamento', 'Troca de pneus', 'Revisão de freios', 'Troca de filtro de ar', 'Revisão geral'],
  'VEÍCULO':                 ['Troca de óleo', 'Alinhamento e balanceamento', 'Troca de pneus', 'Revisão de freios', 'Revisão geral'],
  // Móveis
  'MÓVEIS E ELETRODOMÉSTICOS': ['Limpeza e conservação', 'Restauração de estofado', 'Troca de peças danificadas', 'Pintura/repintura', 'Revisão de estrutura'],
  'MÓVEIS':                  ['Limpeza e conservação', 'Restauração de estofado', 'Troca de peças danificadas', 'Pintura/repintura', 'Revisão de estrutura'],
  'MÓVEL':                   ['Limpeza e conservação', 'Restauração de estofado', 'Troca de peças danificadas', 'Pintura/repintura'],
  // Equipamentos médicos / hospitalares
  'EQUIPAMENTOS HOSPITALARES': ['Calibração', 'Revisão preventiva', 'Troca de peças', 'Limpeza técnica', 'Teste de funcionamento', 'Revisão elétrica'],
  'EQUIPAMENTOS MÉDICOS':    ['Calibração', 'Revisão preventiva', 'Troca de peças', 'Limpeza técnica', 'Teste de funcionamento'],
  'EQUIPAMENTOS':            ['Revisão preventiva', 'Troca de peças', 'Limpeza técnica', 'Calibração', 'Revisão elétrica'],
  // TI / Informática
  'COMPUTADORES':            ['Formatação', 'Troca de HD/SSD', 'Limpeza interna', 'Troca de memória RAM', 'Atualização de sistema', 'Troca de bateria'],
  'INFORMÁTICA':             ['Formatação', 'Troca de HD/SSD', 'Limpeza interna', 'Troca de memória RAM', 'Atualização de sistema'],
  'IMPRESSORAS':             ['Limpeza de cabeças', 'Troca de cartucho/toner', 'Revisão de roletes', 'Manutenção preventiva'],
  // Climatização
  'AR CONDICIONADO':         ['Limpeza de filtros', 'Recarga de gás', 'Revisão do compressor', 'Limpeza geral', 'Troca de filtros'],
  'CLIMATIZAÇÃO':            ['Limpeza de filtros', 'Recarga de gás', 'Revisão preventiva', 'Limpeza geral'],
  // Elétrico
  'ELÉTRICO':                ['Revisão elétrica', 'Troca de tomadas/interruptores', 'Revisão de quadro elétrico', 'Troca de lâmpadas', 'Verificação de aterramento'],
  'INSTALAÇÕES ELÉTRICAS':   ['Revisão elétrica', 'Troca de tomadas/interruptores', 'Revisão de quadro elétrico', 'Verificação de aterramento'],
  // Hidráulico
  'HIDRÁULICO':              ['Revisão de encanamento', 'Troca de registros', 'Desentupimento', 'Reparo de vazamentos', 'Revisão de bombas'],
  'INSTALAÇÕES HIDRÁULICAS': ['Revisão de encanamento', 'Troca de registros', 'Desentupimento', 'Reparo de vazamentos'],
  // Geradores / energia
  'GERADORES':               ['Troca de óleo', 'Revisão preventiva', 'Troca de filtros', 'Teste de carga', 'Revisão do alternador'],
  'GERADOR':                 ['Troca de óleo', 'Revisão preventiva', 'Troca de filtros', 'Teste de carga'],
  // Elevadores
  'ELEVADORES':              ['Revisão preventiva', 'Lubrificação', 'Troca de cabos', 'Revisão de portas', 'Inspeção de segurança'],
  'ELEVADOR':                ['Revisão preventiva', 'Lubrificação', 'Revisão de portas', 'Inspeção de segurança'],
}

function getSugestoes(assetTypeName: string): string[] {
  const upper = assetTypeName.toUpperCase()
  // Tenta match exato
  for (const [key, vals] of Object.entries(SUGESTOES_POR_TIPO)) {
    if (upper === key.toUpperCase()) return vals
  }
  // Tenta match parcial
  for (const [key, vals] of Object.entries(SUGESTOES_POR_TIPO)) {
    if (upper.includes(key.toUpperCase()) || key.toUpperCase().includes(upper)) return vals
  }
  // Genérico
  return ['Revisão preventiva', 'Manutenção corretiva', 'Limpeza e conservação', 'Troca de peças', 'Revisão geral']
}

// ── Modal de agendamento ──────────────────────────────────────────────────────

function ModalAgendamento({ asset, agendamentos, onClose }: {
  asset: Asset
  agendamentos: Agendamento[]
  onClose: () => void
}) {
  const qc  = useQueryClient()
  const end = parseEndereco(asset.departmentFullAddress)
  const sugestoes = getSugestoes(asset.assetTypeName)
  const [titulo,  setTitulo]  = useState('')
  const [custom,  setCustom]  = useState('')
  const [data,    setData]    = useState('')
  const [obs,     setObs]     = useState('')

  const tituloFinal = titulo === '__outro__' ? custom : titulo

  const { mutate: criar, isPending: criando, isError: erroCriar } = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/agendamentos', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          trilogoAssetId: asset.id,
          patrimony:      asset.patrimony,
          descricaoBem:   asset.description,
          companyId:      asset.companyId,
          companyName:    asset.companyName,
          ambiente:       end.ambiente,
          dataAgendada:   data,
          titulo: tituloFinal,
          observacao:     obs,
        }),
      })
      if (!res.ok) throw new Error()
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agendamentos'] })
      setTitulo(''); setCustom(''); setData(''); setObs('')
    },
  })

  const { mutate: atualizarStatus } = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/agendamentos/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error()
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agendamentos'] }),
  })

  const [verHistorico, setVerHistorico] = useState(false)

  const pendentesModal    = agendamentos.filter(ag => ag.status === 'pendente')
  const realizadosModal   = agendamentos.filter(ag => ag.status === 'realizado')

  const podeSalvar = tituloFinal.trim() && data && !criando

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="font-semibold text-gray-800">Manutenções</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {/* Info do bem */}
          <div className="bg-gray-50 rounded-xl p-3 space-y-0.5">
            <p className="text-sm font-medium text-gray-800">{asset.description}</p>
            <p className="text-xs text-purple-600 font-mono">{asset.patrimony}</p>
            <p className="text-xs text-gray-500">{end.ambiente} · {end.unidade}</p>
          </div>

          {/* Agendamentos pendentes */}
          {pendentesModal.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Agendamentos pendentes</p>
              {pendentesModal.map(ag => (
                <div key={ag.id} className="border border-gray-200 rounded-lg px-3 py-2.5 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-gray-800">{ag.titulo}</p>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                      Pendente
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {new Date(ag.dataAgendada).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                  {ag.observacao && <p className="text-xs text-gray-400">{ag.observacao}</p>}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => atualizarStatus({ id: ag.id, status: 'realizado' })}
                      className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      <CheckCircle2 size={13} /> Marcar como realizado
                    </button>
                    <span className="text-gray-300">·</span>
                    <button
                      onClick={() => atualizarStatus({ id: ag.id, status: 'cancelado' })}
                      className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium"
                    >
                      <XCircle size={13} /> Cancelar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Histórico de manutenções realizadas */}
          {realizadosModal.length > 0 && (
            <div className="space-y-2">
              <button
                onClick={() => setVerHistorico(v => !v)}
                className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide hover:text-gray-600 transition-colors"
              >
                <CheckCircle2 size={13} className="text-emerald-500" />
                Histórico ({realizadosModal.length})
                <span className="text-gray-300">{verHistorico ? '▲' : '▼'}</span>
              </button>
              {verHistorico && realizadosModal.map(ag => (
                <div key={ag.id} className="border border-gray-100 rounded-lg px-3 py-2.5 space-y-1 bg-gray-50">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-gray-600">{ag.titulo}</p>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                      Realizado
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {new Date(ag.dataAgendada).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                  {ag.observacao && <p className="text-xs text-gray-400">{ag.observacao}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Formulário novo agendamento */}
          <div className="space-y-3 border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Novo agendamento</p>

            <div className="space-y-2">
              <label className="block text-xs text-gray-500 mb-1">Tipo de manutenção *</label>
              <select
                value={titulo}
                onChange={e => { setTitulo(e.target.value); setCustom('') }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
              >
                <option value="">Selecione o tipo...</option>
                {sugestoes.map(s => <option key={s} value={s}>{s}</option>)}
                <option value="__outro__">Outro (digitar)</option>
              </select>
              {titulo === '__outro__' && (
                <input
                  type="text"
                  value={custom}
                  onChange={e => setCustom(e.target.value)}
                  placeholder="Descreva o tipo de manutenção..."
                  autoFocus
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              )}
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Data *</label>
              <input
                type="date"
                value={data}
                onChange={e => setData(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Observação</label>
              <textarea
                value={obs}
                onChange={e => setObs(e.target.value)}
                rows={2}
                placeholder="Detalhes adicionais..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none"
              />
            </div>

            {erroCriar && <p className="text-xs text-red-500">Erro ao salvar. Tente novamente.</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-gray-100 shrink-0">
          <button onClick={onClose}
            className="flex-1 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            Fechar
          </button>
          <button
            onClick={() => criar()}
            disabled={!podeSalvar}
            className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg transition-colors"
            style={{ backgroundColor: podeSalvar ? '#7c3aed' : '#a78bfa' }}
          >
            {criando ? 'Salvando...' : 'Agendar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Linha de bem (tabela) ─────────────────────────────────────────────────────

function BemRow({ a, agendamentos, onAgendar }: { a: Asset; agendamentos?: Agendamento[]; onAgendar: (a: Asset) => void }) {
  const end = parseEndereco(a.departmentFullAddress)
  const st  = STATUS[a.status] ?? { label: String(a.status), color: 'bg-gray-100 text-gray-500' }
  const pendentes = agendamentos?.filter(ag => ag.status === 'pendente') ?? []
  const temAgendamento = pendentes.length > 0
  const agendamento = pendentes[0]
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)

  return (
    <tr className={temAgendamento ? 'bg-purple-50 border-b border-purple-100' : 'bg-white border-b border-gray-100 hover:bg-gray-50'}>
      {/* Imagem */}
      <td className="px-3 py-2 w-14">
        <div
          className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-gray-100 flex items-center justify-center cursor-pointer"
          onMouseEnter={e => a.coverPermalink && setMousePos({ x: e.clientX, y: e.clientY })}
          onMouseMove={e => a.coverPermalink && setMousePos({ x: e.clientX, y: e.clientY })}
          onMouseLeave={() => setMousePos(null)}
        >
          {a.coverPermalink
            ? <img src={a.coverPermalink} alt={a.description} className="w-full h-full object-cover" />
            : <Package size={20} className="text-gray-300" />
          }
        </div>
        {mousePos && a.coverPermalink && (
          <div
            className="fixed z-9999 pointer-events-none"
            style={{
              left: mousePos.x + 16,
              top: mousePos.y - 96,
            }}
          >
            <div className="bg-white rounded-xl shadow-2xl border border-gray-100 p-1.5">
              <img
                src={a.coverPermalink}
                alt={a.description}
                className="w-96 h-96 object-contain rounded-lg"
              />
            </div>
          </div>
        )}
      </td>

      {/* Patrimônio */}
      <td className="px-3 py-2 overflow-hidden">
        <span className="text-sm font-mono font-medium text-purple-600 truncate block">{a.patrimony}</span>
      </td>

      {/* Descrição */}
      <td className="px-3 py-2 overflow-hidden">
        <p className="text-sm font-medium text-gray-800 line-clamp-2 leading-tight">{a.description}</p>
        {temAgendamento && agendamento && (
          <div className="flex items-center gap-1 mt-1">
            <CalendarPlus size={10} className="text-purple-500 shrink-0" />
            <span className="text-xs text-purple-600 truncate">{agendamento.titulo}</span>
            {pendentes.length > 1 && (
              <span className="text-xs text-purple-400">+{pendentes.length - 1}</span>
            )}
          </div>
        )}
      </td>

      {/* Ambiente */}
      <td className="px-3 py-2 overflow-hidden">
        <span className="text-xs text-gray-500 line-clamp-2">{end.ambiente}</span>
      </td>

      {/* Tipo */}
      <td className="px-3 py-2 overflow-hidden">
        <span className="text-xs text-gray-500 line-clamp-2">{a.assetTypeName}</span>
      </td>

      {/* Marca */}
      <td className="px-3 py-2 overflow-hidden">
        <span className="text-xs text-gray-500 truncate block">{a.brand ?? '—'}</span>
      </td>

      {/* Modelo */}
      <td className="px-3 py-2 overflow-hidden">
        <span className="text-xs text-gray-500 truncate block">{a.model ?? '—'}</span>
      </td>

      {/* Nº série */}
      <td className="px-3 py-2 overflow-hidden">
        <span className="text-xs text-gray-500 truncate block">{a.serialNumber ?? '—'}</span>
      </td>

      {/* Valor */}
      <td className="px-3 py-2 overflow-hidden">
        <span className="text-xs text-gray-700 truncate block">{moeda(a.price)}</span>
      </td>

      {/* Data da compra */}
      <td className="px-3 py-2 overflow-hidden">
        <span className="text-xs text-gray-500 truncate block">
          {a.purchaseDate ? new Date(a.purchaseDate).toLocaleDateString('pt-BR') : '—'}
        </span>
      </td>

      {/* Status */}
      <td className="px-3 py-2 overflow-hidden">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${st.color}`}>
          {st.label}
        </span>
      </td>

      {/* Data de cadastro */}
      <td className="px-3 py-2 overflow-hidden">
        <span className="text-xs text-gray-400 truncate block">
          {new Date(a.creationDate ?? '').toLocaleDateString('pt-BR')}
        </span>
      </td>

      {/* Ação — sticky para sempre aparecer */}
      <td className={`px-3 py-2 sticky right-0 shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.05)] ${temAgendamento ? 'bg-purple-50' : 'bg-white'}`}>
        <button
          onClick={() => onAgendar(a)}
          title="Agendamento de manutenção"
          className={temAgendamento
            ? 'flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-purple-600 bg-purple-100 hover:bg-purple-200 transition-colors whitespace-nowrap'
            : 'flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-gray-500 border border-gray-200 hover:text-purple-600 hover:border-purple-200 hover:bg-purple-50 transition-colors whitespace-nowrap'
          }
        >
          <CalendarPlus size={13} />
          Agendamento
        </button>
      </td>
    </tr>
  )
}


// ── Página ────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50

export default function BensPage() {
  const [empresaSel, setEmpresaSel] = useState<Empresa | null>(null)
  const [search,     setSearch]     = useState('')
  const [tipo,       setTipo]       = useState('')
  const [projeto,    setProjeto]    = useState('')
  const [assetModal,           setAssetModal]           = useState<Asset | null>(null)
  const [visiveis,             setVisiveis]             = useState(PAGE_SIZE)
  const [apenasComAgendamento, setApenasComAgendamento] = useState(false)

  // Agendamentos — busca sempre, independente de empresa selecionada
  const { data: agendamentos = [] } = useQuery<Agendamento[]>({
    queryKey: ['agendamentos'],
    queryFn: async () => {
      const res = await fetch('/api/agendamentos')
      if (!res.ok) throw new Error()
      const json = await res.json()
      return json.data ?? json
    },
    staleTime: 60 * 1000,
  })

  // Mapa assetId → lista de agendamentos pendentes
  const agendamentoMap = useMemo(() => {
    const map = new Map<number, Agendamento[]>()
    agendamentos.forEach(ag => {
      if (!map.has(ag.trilogoAssetId)) map.set(ag.trilogoAssetId, [])
      map.get(ag.trilogoAssetId)!.push(ag)
    })
    return map
  }, [agendamentos])

  // 1. Busca leve: só as empresas
  const { data: empresas = [], isLoading: loadEmpresas } = useQuery<Empresa[]>({
    queryKey: ['trilogo-empresas'],
    queryFn: async () => {
      const res = await fetch('/api/trilogo/assets?only=empresas')
      if (!res.ok) throw new Error()
      const json = await res.json()
      return json.data ?? json
    },
    staleTime: 30 * 60 * 1000,
  })

  // 2. Só busca os bens quando uma empresa for selecionada
  const { data: bens = [], isLoading: loadBens } = useQuery<Asset[]>({
    queryKey: ['trilogo-assets', empresaSel?.id],
    queryFn: async () => {
      const res = await fetch(`/api/trilogo/assets?companyId=${empresaSel!.id}`)
      if (!res.ok) throw new Error()
      const json = await res.json()
      return json.data ?? json
    },
    enabled: !!empresaSel,
    staleTime: 10 * 60 * 1000,
  })

  // Opções dinâmicas derivadas dos bens já carregados
  const tipos = useMemo(() => [...new Set(bens.map(a => a.assetTypeName))].sort(), [bens])
  const projetos = useMemo(() => {
    const set = new Set<string>()
    bens.forEach(a => {
      const proj = parseEndereco(a.departmentFullAddress).unidade
      if (proj && proj !== '—') set.add(proj)
    })
    return [...set].sort()
  }, [bens])

  const filtrado = useMemo(() => {
    const q = search.toLowerCase()
    return bens.filter(a => {
      const end = parseEndereco(a.departmentFullAddress)
      if (tipo    && a.assetTypeName !== tipo)     return false
      if (projeto && end.unidade !== projeto)       return false
      if (apenasComAgendamento && !agendamentoMap.has(a.id)) return false
      if (q && !(
        a.description.toLowerCase().includes(q) ||
        a.patrimony.toLowerCase().includes(q) ||
        (a.brand ?? '').toLowerCase().includes(q)
      )) return false
      return true
    })
  }, [bens, search, tipo, projeto, apenasComAgendamento, agendamentoMap])

  const ativos          = filtrado.filter(a => a.status === 1).length
  const manutencao      = filtrado.filter(a => a.status === 4).length
  const comAgendamento  = filtrado.filter(a => agendamentoMap.get(a.id)?.some(ag => ag.status === 'pendente')).length

  function limpar() { setSearch(''); setTipo(''); setProjeto(''); setApenasComAgendamento(false); setVisiveis(PAGE_SIZE) }

  const painelRef = useRef<HTMLDivElement>(null)
  const [painelW, setPainelW] = useState<number | null>(null)
  const resizingPainel = useRef<{ startX: number; startW: number } | null>(null)

  function onPainelResizeStart(e: React.MouseEvent) {
    e.preventDefault()
    const currentW = painelRef.current?.getBoundingClientRect().width ?? 800
    resizingPainel.current = { startX: e.clientX, startW: currentW }

    function onMove(ev: MouseEvent) {
      if (!resizingPainel.current) return
      // multiplica por 2: expande igualmente para esquerda e direita
      const delta = (ev.clientX - resizingPainel.current.startX) * 2
      setPainelW(Math.max(400, resizingPainel.current.startW + delta))
    }
    function onUp() {
      resizingPainel.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 overflow-x-auto">
      <div className="space-y-6" style={{ maxWidth: painelW ? 'none' : '80rem', margin: '0 auto' }}>

        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Bens por Ambiente</h1>
            <p className="text-sm text-gray-500">Patrimônio cadastrado no Trílogo por setor</p>
          </div>
        </div>

        {/* Seleção de unidade — primeiro passo */}
        <Card padding="sm">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-60">
              <label className="block text-xs text-gray-500 mb-1">Selecione a unidade *</label>
              <select
                value={empresaSel?.id ?? ''}
                onChange={e => {
                  const emp = empresas.find(x => x.id === Number(e.target.value)) ?? null
                  setEmpresaSel(emp)
                  setProjeto('')
                  setTipo('')
                  setSearch('')
                  setVisiveis(PAGE_SIZE)
                }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
                disabled={loadEmpresas}
              >
                <option value="">{loadEmpresas ? 'Carregando...' : 'Escolha uma unidade'}</option>
                {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </div>

            {/* Filtros secundários — só aparecem após selecionar unidade */}
            {empresaSel && !loadBens && (
              <>
                <div className="relative flex-1 min-w-45">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Descrição, patrimônio..."
                    value={search}
                    onChange={e => { setSearch(e.target.value); setVisiveis(PAGE_SIZE) }}
                    className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>

                <select value={tipo} onChange={e => { setTipo(e.target.value); setVisiveis(PAGE_SIZE) }}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white">
                  <option value="">Todos os tipos</option>
                  {tipos.map(t => <option key={t} value={t}>{t}</option>)}
                </select>

                <select value={projeto} onChange={e => { setProjeto(e.target.value); setVisiveis(PAGE_SIZE) }}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white">
                  <option value="">Todos os projetos</option>
                  {projetos.map(p => <option key={p} value={p}>{p}</option>)}
                </select>

                <button
                  onClick={() => { setApenasComAgendamento(v => !v); setVisiveis(PAGE_SIZE) }}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors whitespace-nowrap ${
                    apenasComAgendamento
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'text-gray-500 border-gray-200 hover:border-purple-300 hover:text-purple-600'
                  }`}
                >
                  <CalendarPlus size={14} />
                  Com agendamento
                </button>

                {(search || tipo || projeto || apenasComAgendamento) && (
                  <button onClick={limpar}
                    className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg">
                    <X size={14} /> Limpar
                  </button>
                )}
              </>
            )}
          </div>
        </Card>

        {/* Estado: aguardando seleção */}
        {!empresaSel && (
          <div className="text-center py-20 text-gray-400">
            <Package size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Selecione uma unidade para ver os bens patrimoniais</p>
          </div>
        )}

        {/* Estado: carregando bens */}
        {empresaSel && loadBens && (
          <div className="text-center py-20 text-gray-400 text-sm">Carregando bens de {empresaSel.nome}...</div>
        )}

        {/* Resumo + Grid */}
        {empresaSel && !loadBens && (
          <div
            ref={painelRef}
            className="relative space-y-4"
            style={painelW ? { width: painelW, marginLeft: 'auto', marginRight: 'auto' } : {}}
          >
            {/* Handle de resize — esquerda */}
            <div
              onMouseDown={onPainelResizeStart}
              className="absolute top-0 left-0 h-full w-1.5 cursor-col-resize group z-10"
              title="Arrastar para redimensionar painel"
            >
              <div className="w-full h-full opacity-0 group-hover:opacity-100 bg-purple-400 transition-opacity rounded-sm" />
            </div>
            {/* Handle de resize — direita */}
            <div
              onMouseDown={onPainelResizeStart}
              className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize group z-10"
              title="Arrastar para redimensionar painel"
            >
              <div className="w-full h-full opacity-0 group-hover:opacity-100 bg-purple-400 transition-opacity rounded-sm" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card padding="sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg"><Package size={18} className="text-purple-600" /></div>
                  <div>
                    <p className="text-2xl font-bold text-gray-800">{filtrado.length}</p>
                    <p className="text-xs text-gray-500">Total</p>
                  </div>
                </div>
              </Card>
              <Card padding="sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg"><Package size={18} className="text-emerald-600" /></div>
                  <div>
                    <p className="text-2xl font-bold text-gray-800">{ativos}</p>
                    <p className="text-xs text-gray-500">Ativos</p>
                  </div>
                </div>
              </Card>
              <Card padding="sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg"><Layers size={18} className="text-amber-600" /></div>
                  <div>
                    <p className="text-2xl font-bold text-gray-800">{manutencao}</p>
                    <p className="text-xs text-gray-500">Em manutenção</p>
                  </div>
                </div>
              </Card>
              <Card padding="sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg"><CalendarPlus size={18} className="text-purple-600" /></div>
                  <div>
                    <p className="text-2xl font-bold text-gray-800">{comAgendamento}</p>
                    <p className="text-xs text-gray-500">Manutenção agendada</p>
                  </div>
                </div>
              </Card>
            </div>

            {filtrado.length === 0 ? (
              <div className="text-center py-16 text-gray-400 text-sm">Nenhum bem encontrado.</div>
            ) : (
              <>
                <Card padding="none">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                          <th className="px-3 py-3"></th>
                          <th className="px-3 py-3">Patrimônio</th>
                          <th className="px-3 py-3">Descrição</th>
                          <th className="px-3 py-3">Ambiente</th>
                          <th className="px-3 py-3">Tipo</th>
                          <th className="px-3 py-3">Marca</th>
                          <th className="px-3 py-3">Modelo</th>
                          <th className="px-3 py-3">Nº série</th>
                          <th className="px-3 py-3">Valor</th>
                          <th className="px-3 py-3">Data da compra</th>
                          <th className="px-3 py-3">Status</th>
                          <th className="px-3 py-3">Data de Cadastro</th>
                          <th className="px-3 py-3 sticky right-0 bg-gray-50 shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.05)]">Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtrado.slice(0, visiveis).map(a => (
                          <BemRow key={a.id} a={a} agendamentos={agendamentoMap.get(a.id)} onAgendar={setAssetModal} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>

                <div className="flex flex-col items-center gap-2">
                  <p className="text-xs text-gray-400">
                    Exibindo {Math.min(visiveis, filtrado.length)} de {filtrado.length} bens
                  </p>
                  {visiveis < filtrado.length && (
                    <button
                      onClick={() => setVisiveis(v => v + PAGE_SIZE)}
                      className="px-6 py-2 text-sm font-medium text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors"
                    >
                      Mostrar mais {Math.min(PAGE_SIZE, filtrado.length - visiveis)} bens
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {assetModal && (
        <ModalAgendamento
          asset={assetModal}
          agendamentos={agendamentoMap.get(assetModal.id) ?? []}
          onClose={() => setAssetModal(null)}
        />
      )}
    </div>
  )
}
