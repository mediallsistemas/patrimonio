import { notFound } from 'next/navigation'
import { Package, MapPin, Layers, CalendarPlus } from 'lucide-react'
import { buscarLinkAmbiente, listarAgendamentosPorAssets } from '@/modules/links-publicos/links-publicos.service'
import { BensListaFiltrada } from './BensListaFiltrada'

interface Asset {
  id: number
  patrimony: string
  description: string
  brand: string | null
  model: string | null
  serialNumber: string | null
  departmentFullAddress: string
  status: number
  assetTypeName: string
  companyId: number
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

function StatCard({ label, value, icon, bg }: { label: string; value: number; icon: React.ReactNode; bg: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 ${bg} rounded-xl`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  )
}

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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-100 rounded-xl shrink-0">
            <MapPin size={20} className="text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800 leading-tight">{link.ambiente}</h1>
            <p className="text-sm text-gray-500">{link.projeto}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Total de bens"      value={bens.length}    icon={<Package     size={18} className="text-purple-600"  />} bg="bg-purple-100"  />
          <StatCard label="Ativos"             value={ativos}         icon={<Package     size={18} className="text-emerald-600" />} bg="bg-emerald-100" />
          <StatCard label="Em manutenção"      value={manutencao}     icon={<Layers      size={18} className="text-amber-600"   />} bg="bg-amber-100"   />
          <StatCard label="Manutenção agendada" value={comAgendamento} icon={<CalendarPlus size={18} className="text-purple-600" />} bg="bg-purple-100"  />
        </div>

        {/* Lista de bens com filtro por patrimônio */}
        <BensListaFiltrada bens={bens} agendamentos={agendamentos} />

        <p className="text-center text-xs text-gray-300 pb-4">
          LinenSistem · {link.projeto} · {link.ambiente}
        </p>
      </div>
    </div>
  )
}
