import { notFound } from 'next/navigation'
import { Package, MapPin } from 'lucide-react'
import { buscarLinkAmbiente } from '@/modules/links-publicos/links-publicos.service'
import BensConteudo from './BensConteudo'

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
  const link = await buscarLinkAmbiente(token)
  if (!link) notFound()

  const bens = await fetchBensDoAmbiente(link.companyId, link.projeto, link.ambiente)

  const ativos = bens.filter(a => a.status === 1).length

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
          <StatCard label="Total"  value={bens.length} icon={<Package size={18} className="text-purple-600"  />} bg="bg-purple-100"  />
          <StatCard label="Ativos" value={ativos}      icon={<Package size={18} className="text-emerald-600" />} bg="bg-emerald-100" />
        </div>

        {/* Bens do ambiente + busca (client) */}
        {bens.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm bg-white rounded-2xl border border-gray-100">
            <Package size={40} className="mx-auto mb-3 opacity-30" />
            Nenhum bem encontrado neste ambiente.
          </div>
        ) : (
          <BensConteudo
            bens={bens}
            companyId={link.companyId}
            companyName={link.projeto}
            projeto={link.projeto}
          />
        )}

        <p className="text-center text-xs text-gray-300 pb-4">
          LinenSistem · {link.projeto} · {link.ambiente}
        </p>
      </div>
    </div>
  )
}
