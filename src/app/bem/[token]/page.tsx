import { notFound } from 'next/navigation'
import { Package, MapPin, Info } from 'lucide-react'
import {
  buscarLinkAmbiente,
  listarBensDoLink,
  type BemPublico,
} from '@/modules/links-publicos/links-publicos.service'
import type { ResolucaoAmbiente } from '@/modules/links-publicos/ambiente-do-link'
import BensConteudo from './BensConteudo'

function listaDeNomes(nomes: string[]): string {
  return nomes.map(n => `“${n}”`).join(', ')
}

// O QR guarda o nome do ambiente de quando foi gerado; se o Trílogo mudou o
// nome, quem escaneia precisa saber por que a lista não bate com a placa.
function avisoDeMudanca(resolucao: ResolucaoAmbiente<BemPublico>): string | null {
  switch (resolucao.tipo) {
    case 'grafia':
    case 'renomeado':
      return `No Trílogo, este ambiente agora se chama ${listaDeNomes(resolucao.ambientesAtuais)}.`
    case 'subdividido':
      return resolucao.ambientesAtuais.length === 1
        ? `No Trílogo, os bens deste ambiente agora ficam em ${listaDeNomes(resolucao.ambientesAtuais)}.`
        : `No Trílogo, este ambiente foi dividido em ${listaDeNomes(resolucao.ambientesAtuais)}. A lista mostra os bens de todos.`
    default:
      return null
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

  // Trílogo fora do ar não pode virar "nenhum bem neste ambiente".
  let resolucao: ResolucaoAmbiente<BemPublico> | null = null
  try {
    resolucao = await listarBensDoLink(link)
  } catch (error) {
    console.error('[bem/[token]] listarBensDoLink:', error)
  }

  const bens = resolucao?.bens ?? []
  const ativos = bens.filter(a => a.status === 1).length
  const aviso = resolucao ? avisoDeMudanca(resolucao) : null

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

        {aviso && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-2xl p-3 text-sm text-amber-800">
            <Info size={16} className="shrink-0 mt-0.5" />
            <p>{aviso}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Total"  value={bens.length} icon={<Package size={18} className="text-purple-600"  />} bg="bg-purple-100"  />
          <StatCard label="Ativos" value={ativos}      icon={<Package size={18} className="text-emerald-600" />} bg="bg-emerald-100" />
        </div>

        {/* Bens do ambiente + busca (client) */}
        {bens.length === 0 ? (
          <div className="text-center py-16 px-6 text-gray-400 text-sm bg-white rounded-2xl border border-gray-100 space-y-2">
            <Package size={40} className="mx-auto mb-3 opacity-30" />
            {resolucao === null ? (
              <p>Não foi possível consultar os bens no Trílogo agora. Tente de novo em alguns minutos.</p>
            ) : (
              <>
                <p>
                  Este ambiente não aparece mais no Trílogo com esse nome. Ele foi renomeado, dividido
                  ou esvaziado depois que o QR code foi gerado. Peça ao patrimônio um QR code novo.
                </p>
                {resolucao.candidatos.length > 0 && (
                  <p>Ambientes com nome parecido hoje: {listaDeNomes(resolucao.candidatos)}.</p>
                )}
              </>
            )}
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
