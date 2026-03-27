import { notFound } from 'next/navigation'
import { Package, CheckCircle2, AlertCircle, CalendarPlus, MapPin, Layers } from 'lucide-react'
import { buscarLinkAmbiente, listarAgendamentosPorAssets } from '@/modules/links-publicos/links-publicos.service'

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
  companyName: string
  coverPermalink: string | null
  creationDate: string | null
}

interface Agendamento {
  id: string
  trilogoAssetId: number
  titulo: string
  dataAgendada: Date | string
  dataRealizada: Date | string | null
  observacao: string | null
  status: string
  ambiente: string
}

type LinkData = NonNullable<Awaited<ReturnType<typeof buscarLinkAmbiente>>>

const STATUS_LABEL: Record<number, { label: string; color: string }> = {
  1: { label: 'Ativo',      color: 'bg-emerald-100 text-emerald-700' },
  2: { label: 'Inativo',    color: 'bg-gray-100 text-gray-500' },
  4: { label: 'Manutenção', color: 'bg-amber-100 text-amber-700' },
}

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function moeda(v: number | null) {
  if (!v) return '—'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const TOKEN_ENV = process.env.TRILOGO_TOKEN ?? ''
const TRILOGO_BASE = process.env.TRILOGO_BASE_URL ?? 'https://public.api.trilogo.app/api'

async function fetchBensDoAmbiente(companyId: number, projeto: string, ambiente: string): Promise<Asset[]> {
  try {
    const res = await fetch(`${TRILOGO_BASE}/asset`, {
      headers: { accept: 'application/json', token: TOKEN_ENV },
      next: { revalidate: 600 },
    })
    if (!res.ok) return []
    const all = (await res.json()) as Asset[]
    return all.filter(a => {
      const parts = String(a.departmentFullAddress ?? '').split('>').map(s => s.trim())
      return String(a.companyId) === String(companyId)
        && (parts[2] ?? '') === projeto
        && (parts[4] ?? parts[3] ?? '') === ambiente
    })
  } catch {
    return []
  }
}

async function getData(token: string): Promise<{ link: LinkData; bens: Asset[]; agendamentos: Agendamento[] } | null> {
  const link = await buscarLinkAmbiente(token)
  if (!link) return null
  const bens = await fetchBensDoAmbiente(link.companyId, link.projeto, link.ambiente)
  const ids = bens.map(a => a.id)
  const agendamentos = await listarAgendamentosPorAssets(ids)
  return { link, bens, agendamentos: agendamentos as unknown as Agendamento[] }
}

// ─── Calendário inline (mesmo visual do sistema) ──────────────────────────────

function CalendarioInline({ agendamentos }: { agendamentos: Agendamento[] }) {
  const anoAtual = new Date().getFullYear()
  const mesAtual = new Date().getMonth()

  const realizados = agendamentos.filter(ag => ag.status === 'realizado')
  const porMes = new Map<string, Agendamento[]>()
  realizados.forEach(ag => {
    const d = new Date((ag.dataRealizada ?? ag.dataAgendada) as string)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!porMes.has(key)) porMes.set(key, [])
    porMes.get(key)!.push(ag)
  })

  const meses = Array.from({ length: 12 }, (_, i) =>
    `${anoAtual}-${String(i + 1).padStart(2, '0')}`,
  )

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 select-none" style={{ scrollbarWidth: 'none' }}>
      {meses.map((chave, idx) => {
        const ags      = porMes.get(chave) ?? []
        const temDados = ags.length > 0
        const eAtual   = idx === mesAtual
        return (
          <div key={chave} className={`shrink-0 w-28 rounded-xl p-2.5 border transition-colors ${
            temDados  ? 'border-emerald-300 bg-emerald-50'
            : eAtual  ? 'border-purple-200 bg-purple-50'
            :           'border-gray-100 bg-gray-50'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <p className={`text-xs font-bold ${temDados ? 'text-emerald-700' : eAtual ? 'text-purple-600' : 'text-gray-400'}`}>
                {MESES[idx]}
              </p>
              {temDados && (
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-200 rounded-full w-4 h-4 flex items-center justify-center leading-none">
                  {ags.length}
                </span>
              )}
              {eAtual && !temDados && <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />}
            </div>
            {temDados ? (
              <div className="space-y-1">
                {ags.map(ag => (
                  <div key={ag.id} className="bg-white rounded-lg px-2 py-1.5 border border-emerald-100">
                    <p className="text-xs font-medium text-gray-700 leading-tight line-clamp-2">{ag.titulo}</p>
                    <p className="text-xs text-emerald-600 mt-0.5">{formatDate(ag.dataRealizada ?? ag.dataAgendada)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className={`text-xs ${eAtual ? 'text-purple-400' : 'text-gray-300'}`}>—</p>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Linha da tabela ──────────────────────────────────────────────────────────

function BemRow({ bem, agendamentos }: { bem: Asset; agendamentos: Agendamento[] }) {
  const st       = STATUS_LABEL[bem.status] ?? { label: String(bem.status), color: 'bg-gray-100 text-gray-500' }
  const hojeStr  = new Date().toISOString().slice(0, 10)
  const pendentes  = agendamentos.filter(ag => ag.status === 'pendente')
  const realizados = agendamentos.filter(ag => ag.status === 'realizado')

  const atrasado = pendentes.some(ag =>
    new Date(ag.dataAgendada as string).toISOString().slice(0, 10) < hojeStr,
  )
  const temAgendamento = pendentes.length > 0
  const agendamento = pendentes[0]

  const rowBg    = atrasado     ? 'bg-red-50 border-b border-red-100'
    : temAgendamento             ? 'bg-purple-50 border-b border-purple-100'
    :                              'bg-white border-b border-gray-100'

  return (
    <>
      <tr className={rowBg}>
        {/* Imagem */}
        <td className="px-3 py-2 w-14">
          <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center shrink-0">
            {bem.coverPermalink
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={bem.coverPermalink} alt={bem.description} className="w-full h-full object-cover" />
              : <Package size={20} className="text-gray-300" />}
          </div>
        </td>

        {/* Patrimônio */}
        <td className="px-3 py-2">
          <span className="text-sm font-mono font-medium text-purple-600 whitespace-nowrap">{bem.patrimony}</span>
        </td>

        {/* Descrição + badge de agendamento */}
        <td className="px-3 py-2 min-w-48 max-w-64">
          <p className="text-sm font-medium text-gray-800 line-clamp-2 leading-tight">{bem.description}</p>
          {temAgendamento && agendamento && (
            <div className="flex items-center gap-1 mt-1">
              {atrasado
                ? <AlertCircle size={10} className="text-red-500 shrink-0" />
                : <CalendarPlus size={10} className="text-purple-500 shrink-0" />}
              <span className={`text-xs truncate ${atrasado ? 'text-red-600' : 'text-purple-600'}`}>{agendamento.titulo}</span>
              {pendentes.length > 1 && (
                <span className={`text-xs ${atrasado ? 'text-red-400' : 'text-purple-400'}`}>+{pendentes.length - 1}</span>
              )}
            </div>
          )}
        </td>

        {/* Tipo */}
        <td className="px-3 py-2">
          <span className="text-xs text-gray-500 whitespace-nowrap">{bem.assetTypeName}</span>
        </td>

        {/* Marca */}
        <td className="px-3 py-2">
          <span className="text-xs text-gray-500 whitespace-nowrap">{bem.brand ?? '—'}</span>
        </td>

        {/* Modelo */}
        <td className="px-3 py-2">
          <span className="text-xs text-gray-500 whitespace-nowrap">{bem.model ?? '—'}</span>
        </td>

        {/* Valor */}
        <td className="px-3 py-2">
          <span className="text-xs text-gray-700 whitespace-nowrap">{moeda(bem.price)}</span>
        </td>

        {/* Data compra */}
        <td className="px-3 py-2">
          <span className="text-xs text-gray-500 whitespace-nowrap">
            {bem.purchaseDate ? new Date(bem.purchaseDate).toLocaleDateString('pt-BR') : '—'}
          </span>
        </td>

        {/* Status */}
        <td className="px-3 py-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${st.color}`}>
            {st.label}
          </span>
        </td>

        {/* Manutenção */}
        <td className="px-3 py-2">
          {temAgendamento ? (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${
              atrasado ? 'bg-red-100 text-red-700' : 'bg-purple-100 text-purple-700'
            }`}>
              {atrasado ? 'Atrasado' : 'Agendado'}
            </span>
          ) : (
            <span className="text-xs text-gray-300">—</span>
          )}
        </td>

        {/* Data cadastro */}
        <td className="px-3 py-2">
          <span className="text-xs text-gray-400 whitespace-nowrap">
            {bem.creationDate ? new Date(bem.creationDate).toLocaleDateString('pt-BR') : '—'}
          </span>
        </td>
      </tr>

      {/* Expansão: calendário + pendentes — só se tiver algum agendamento */}
      {agendamentos.length > 0 && (
        <tr className={atrasado ? 'bg-red-50' : temAgendamento ? 'bg-purple-50' : 'bg-white'}>
          <td colSpan={11} className="px-4 pb-4 pt-1">
            <div className="space-y-3">

              {/* Pendentes */}
              {pendentes.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Agendamentos pendentes</p>
                  <div className="flex flex-wrap gap-2">
                    {pendentes.map(ag => {
                      const atr = new Date(ag.dataAgendada as string).toISOString().slice(0, 10) < hojeStr
                      return (
                        <div key={ag.id} className={`border rounded-lg px-3 py-2 space-y-0.5 min-w-48 ${atr ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-gray-800">{ag.titulo}</p>
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full shrink-0 ${atr ? 'bg-red-100 text-red-700' : 'bg-purple-100 text-purple-700'}`}>
                              {atr ? 'Atrasado' : 'Agendado'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {atr
                              ? <AlertCircle size={10} className="text-red-400 shrink-0" />
                              : <CalendarPlus size={10} className="text-purple-400 shrink-0" />}
                            <p className="text-xs text-gray-500">{formatDate(ag.dataAgendada)}</p>
                          </div>
                          {ag.observacao && <p className="text-xs text-gray-400">{ag.observacao}</p>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Calendário histórico */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                  <CheckCircle2 size={12} className="text-emerald-500" />
                  Histórico {new Date().getFullYear()}
                  {realizados.length > 0 && (
                    <span className="text-gray-400 font-normal normal-case">
                      · {realizados.length} realizado{realizados.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </p>
                <CalendarioInline agendamentos={agendamentos} />
              </div>

            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default async function BemPublicoPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const data = await getData(token)
  if (!data) notFound()

  const { link, bens, agendamentos } = data

  const agMap = new Map<number, Agendamento[]>()
  agendamentos.forEach(ag => {
    if (!agMap.has(ag.trilogoAssetId)) agMap.set(ag.trilogoAssetId, [])
    agMap.get(ag.trilogoAssetId)!.push(ag)
  })

  const ativos         = bens.filter(a => a.status === 1).length
  const manutencao     = bens.filter(a => a.status === 4).length
  const comAgendamento = bens.filter(a => agMap.get(a.id)?.some(ag => ag.status === 'pendente')).length

  return (
    <div className="min-h-screen bg-gray-50 p-6 overflow-x-auto">
      <div className="space-y-6" style={{ maxWidth: '80rem', margin: '0 auto' }}>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg shrink-0">
            <MapPin size={20} className="text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{link.ambiente}</h1>
            <p className="text-sm text-gray-500">{link.projeto} · Patrimônio cadastrado no Trílogo</p>
          </div>
        </div>

        {/* Stats — igual ao sistema */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total',               value: bens.length,    icon: <Package size={18} className="text-purple-600" />,   bg: 'bg-purple-100' },
            { label: 'Ativos',              value: ativos,         icon: <Package size={18} className="text-emerald-600" />,  bg: 'bg-emerald-100' },
            { label: 'Em manutenção',       value: manutencao,     icon: <Layers  size={18} className="text-amber-600" />,    bg: 'bg-amber-100' },
            { label: 'Manutenção agendada', value: comAgendamento, icon: <CalendarPlus size={18} className="text-purple-600" />, bg: 'bg-purple-100' },
          ].map(({ label, value, icon, bg }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 ${bg} rounded-lg`}>{icon}</div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">{value}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabela */}
        {bens.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm bg-white rounded-xl border border-gray-100">
            <Package size={40} className="mx-auto mb-3 opacity-30" />
            Nenhum bem encontrado neste ambiente.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  {['', 'Patrimônio', 'Descrição', 'Tipo', 'Marca', 'Modelo', 'Valor', 'Data da compra', 'Status', 'Manutenção', 'Data de Cadastro'].map(h => (
                    <th key={h} className="px-3 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bens.map(bem => (
                  <BemRow key={bem.id} bem={bem} agendamentos={agMap.get(bem.id) ?? []} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-center text-xs text-gray-300 pb-2">
          LinenSistem · {link.projeto} · {link.ambiente}
        </p>
      </div>
    </div>
  )
}
