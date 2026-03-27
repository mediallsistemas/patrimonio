import { notFound } from 'next/navigation'
import { Package, CheckCircle2, AlertCircle, CalendarPlus, MapPin } from 'lucide-react'
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

// ─── Calendário de manutenções de um bem ──────────────────────────────────────

function CalendarioBem({ realizados }: { realizados: Agendamento[] }) {
  const anoAtual = new Date().getFullYear()
  const mesAtual = new Date().getMonth()

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
    <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
      {meses.map((chave, idx) => {
        const ags      = porMes.get(chave) ?? []
        const temDados = ags.length > 0
        const eAtual   = idx === mesAtual
        return (
          <div key={chave} className={`shrink-0 w-20 rounded-xl p-2 border ${
            temDados ? 'border-emerald-300 bg-emerald-50' : eAtual ? 'border-purple-200 bg-purple-50' : 'border-gray-100 bg-gray-50'
          }`}>
            <div className="flex items-center justify-between mb-1">
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
                  <div key={ag.id} className="bg-white rounded-md px-1.5 py-1 border border-emerald-100">
                    <p className="text-xs font-medium text-gray-700 line-clamp-2 leading-tight">{ag.titulo}</p>
                    <p className="text-xs text-emerald-600">{formatDate(ag.dataRealizada ?? ag.dataAgendada)}</p>
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

// ─── Card de cada bem ─────────────────────────────────────────────────────────

function BemCard({ bem, agendamentos }: { bem: Asset; agendamentos: Agendamento[] }) {
  const st       = STATUS_LABEL[bem.status] ?? { label: String(bem.status), color: 'bg-gray-100 text-gray-500' }
  const hojeStr  = new Date().toISOString().slice(0, 10)
  const pendentes  = agendamentos.filter(ag => ag.status === 'pendente')
  const realizados = agendamentos.filter(ag => ag.status === 'realizado')

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {bem.coverPermalink && (
        <div className="w-full h-40 bg-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={bem.coverPermalink} alt={bem.description} className="w-full h-full object-contain" />
        </div>
      )}

      <div className="px-4 py-4 space-y-3">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-gray-800 leading-tight">{bem.description}</p>
            <p className="text-xs font-mono font-semibold text-purple-600 mt-0.5">{bem.patrimony}</p>
          </div>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ${st.color}`}>
            {st.label}
          </span>
        </div>

        {/* Detalhes secundários */}
        {(bem.brand || bem.model || bem.assetTypeName) && (
          <div className="flex flex-wrap gap-1.5">
            {bem.assetTypeName && (
              <span className="text-xs bg-purple-50 text-purple-600 rounded-full px-2.5 py-0.5">{bem.assetTypeName}</span>
            )}
            {bem.brand && (
              <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2.5 py-0.5">{bem.brand}</span>
            )}
            {bem.model && (
              <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2.5 py-0.5">{bem.model}</span>
            )}
          </div>
        )}

        {/* Agendamentos pendentes */}
        {pendentes.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Pendentes</p>
            {pendentes.map(ag => {
              const atrasado = new Date(ag.dataAgendada as string).toISOString().slice(0, 10) < hojeStr
              return (
                <div key={ag.id} className={`border rounded-lg px-3 py-2 ${atrasado ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-gray-800">{ag.titulo}</p>
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full shrink-0 ${atrasado ? 'bg-red-100 text-red-700' : 'bg-purple-100 text-purple-700'}`}>
                      {atrasado ? 'Atrasado' : 'Agendado'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    {atrasado
                      ? <AlertCircle size={10} className="text-red-400 shrink-0" />
                      : <CalendarPlus size={10} className="text-purple-400 shrink-0" />}
                    <p className="text-xs text-gray-500">{formatDate(ag.dataAgendada)}</p>
                  </div>
                  {ag.observacao && <p className="text-xs text-gray-400 mt-0.5">{ag.observacao}</p>}
                </div>
              )
            })}
          </div>
        )}

        {/* Histórico */}
        {realizados.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1">
              <CheckCircle2 size={11} className="text-emerald-500" />
              Histórico {new Date().getFullYear()} · {realizados.length} realizado{realizados.length !== 1 ? 's' : ''}
            </p>
            <CalendarioBem realizados={realizados} />
          </div>
        )}

        {agendamentos.length === 0 && (
          <p className="text-xs text-gray-300 text-center py-1">Sem manutenções registradas</p>
        )}
      </div>
    </div>
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

  // Agrupa agendamentos por assetId
  const agMap = new Map<number, Agendamento[]>()
  agendamentos.forEach(ag => {
    if (!agMap.has(ag.trilogoAssetId)) agMap.set(ag.trilogoAssetId, [])
    agMap.get(ag.trilogoAssetId)!.push(ag)
  })

  const totalPendentes = agendamentos.filter(ag => ag.status === 'pendente').length
  const totalRealizados = agendamentos.filter(ag => ag.status === 'realizado').length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg shrink-0">
              <MapPin size={18} className="text-purple-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-purple-600 font-medium truncate">{link.projeto}</p>
              <h1 className="text-base font-bold text-gray-800 leading-tight truncate">{link.ambiente}</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">

        {/* Resumo */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Bens', value: bens.length, color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Pendentes', value: totalPendentes, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Realizados', value: totalRealizados, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`${bg} rounded-xl px-3 py-3 text-center`}>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>

        {/* Lista de bens */}
        {bens.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-12 text-center">
            <Package size={32} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-400">Nenhum bem encontrado neste ambiente</p>
          </div>
        ) : (
          bens.map(bem => (
            <BemCard key={bem.id} bem={bem} agendamentos={agMap.get(bem.id) ?? []} />
          ))
        )}

        <p className="text-center text-xs text-gray-300 pb-4">
          LinenSistem · {link.projeto} · {link.ambiente}
        </p>
      </div>
    </div>
  )
}
