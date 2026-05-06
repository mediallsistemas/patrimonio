'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import * as meService from '@/services/me.service'
import { ArrowLeft, Package, Layers, Search, X } from 'lucide-react'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import type { Asset } from '@/app/admin/bens/bens.types'
import { STATUS, parseEndereco, moeda } from '@/app/admin/bens/bens.types'

const PAGE_SIZE = 50

async function buscarBens(companyId: number): Promise<Asset[]> {
  const json = await api.get<{ data: Asset[] }>(`trilogo/assets?companyId=${companyId}`)
  return json.data ?? []
}

function BemRowReadOnly({ a }: { a: Asset }) {
  const end = parseEndereco(a.departmentFullAddress)
  const st  = STATUS[a.status] ?? { label: String(a.status), color: 'bg-gray-100 text-gray-500' }

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 text-sm">
      <td className="px-3 py-2.5">
        {a.coverPermalink
          ? <img src={a.coverPermalink} alt="" className="w-8 h-8 rounded object-cover" />
          : <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center"><Package size={14} className="text-gray-400" /></div>
        }
      </td>
      <td className="px-3 py-2.5 font-mono text-xs text-gray-500">{a.patrimony}</td>
      <td className="px-3 py-2.5 font-medium text-gray-800 max-w-[220px] truncate">{a.description}</td>
      <td className="px-3 py-2.5 text-gray-500 max-w-[180px] truncate">{end.ambiente}</td>
      <td className="px-3 py-2.5 text-gray-500">{a.assetTypeName}</td>
      <td className="px-3 py-2.5 text-gray-400">{a.brand ?? '—'}</td>
      <td className="px-3 py-2.5 text-gray-400">{a.model ?? '—'}</td>
      <td className="px-3 py-2.5 text-gray-400 font-mono text-xs">{a.serialNumber ?? '—'}</td>
      <td className="px-3 py-2.5 text-gray-400">{moeda(a.price)}</td>
      <td className="px-3 py-2.5 text-gray-400 text-xs">{a.purchaseDate ? new Date(a.purchaseDate).toLocaleDateString('pt-BR') : '—'}</td>
      <td className="px-3 py-2.5">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
      </td>
    </tr>
  )
}

export default function ViewerBensPage() {
  const [search,       setSearch]       = useState('')
  const [tipo,         setTipo]         = useState('')
  const [projeto,      setProjeto]      = useState('')
  const [ambiente,     setAmbiente]     = useState('')
  const [statusFiltro, setStatusFiltro] = useState<'' | '1' | '2' | '4'>('')
  const [visiveis,     setVisiveis]     = useState(PAGE_SIZE)

  const { data: myTenant } = useQuery({
    queryKey: ['me-tenant'],
    queryFn: () => meService.buscarMeuTenant(),
    staleTime: 60 * 60 * 1000,
  })

  const companyId = myTenant?.trilogoCompanyId ?? null

  const { data: bensRaw = [], isLoading } = useQuery<Asset[]>({
    queryKey: ['trilogo-assets', companyId],
    queryFn: () => buscarBens(companyId!),
    enabled: !!companyId,
    staleTime: 10 * 60 * 1000,
  })

  // Sem filtro de projeto hardcoded — a API já restringe pelo companyId do tenant
  const bens = bensRaw

  const tipos = useMemo(() => [...new Set(bens.map(a => a.assetTypeName))].sort(), [bens])
  const projetos = useMemo(() => {
    const set = new Set<string>()
    bens.forEach(a => {
      const proj = parseEndereco(a.departmentFullAddress).unidade
      if (proj && proj !== '—') set.add(proj)
    })
    return [...set].sort()
  }, [bens])
  const ambientes = useMemo(() => {
    const set = new Set<string>()
    bens.forEach(a => {
      const end = parseEndereco(a.departmentFullAddress)
      if (projeto && end.unidade !== projeto) return
      if (end.ambienteSimples && end.ambienteSimples !== '—') set.add(end.ambienteSimples)
    })
    return [...set].sort()
  }, [bens, projeto])

  const filtrado = useMemo(() => {
    const q = search.toLowerCase()
    return bens.filter(a => {
      const end = parseEndereco(a.departmentFullAddress)
      if (tipo         && a.assetTypeName !== tipo)           return false
      if (projeto      && end.unidade !== projeto)            return false
      if (ambiente     && end.ambienteSimples !== ambiente)   return false
      if (statusFiltro && a.status !== Number(statusFiltro)) return false
      if (q && !(
        a.description.toLowerCase().includes(q) ||
        a.patrimony.toLowerCase().includes(q) ||
        (a.brand ?? '').toLowerCase().includes(q)
      )) return false
      return true
    })
  }, [bens, search, tipo, projeto, ambiente, statusFiltro])

  const ativos     = filtrado.filter(a => a.status === 1).length
  const manutencao = filtrado.filter(a => a.status === 4).length

  return (
    <div className="min-h-screen bg-gray-50 p-6 overflow-x-auto">
      <div className="space-y-6 max-w-7xl mx-auto">

        <div className="flex items-center gap-4">
          <Link href="/viewer" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Bens Patrimoniais</h1>
            <p className="text-sm text-gray-500">Patrimônio cadastrado no Trílogo por unidade e ambiente</p>
          </div>
        </div>

        <Card padding="sm">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative min-w-48 flex-1">
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
            <select value={projeto} onChange={e => { setProjeto(e.target.value); setAmbiente(''); setVisiveis(PAGE_SIZE) }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white">
              <option value="">Todos os projetos</option>
              {projetos.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={ambiente} onChange={e => { setAmbiente(e.target.value); setVisiveis(PAGE_SIZE) }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white">
              <option value="">Todos os ambientes</option>
              {ambientes.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={statusFiltro} onChange={e => { setStatusFiltro(e.target.value as '' | '1' | '2' | '4'); setVisiveis(PAGE_SIZE) }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white">
              <option value="">Todos os status</option>
              <option value="1">Ativos</option>
              <option value="2">Inativos</option>
              <option value="4">Em manutenção</option>
            </select>
            {(search || tipo || projeto || ambiente || statusFiltro) && (
              <button
                onClick={() => { setSearch(''); setTipo(''); setProjeto(''); setAmbiente(''); setStatusFiltro(''); setVisiveis(PAGE_SIZE) }}
                className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg">
                <X size={14} /> Limpar
              </button>
            )}
          </div>
        </Card>

        {isLoading ? (
          <div className="text-center py-20 text-gray-400 text-sm">Carregando bens...</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total', value: filtrado.length, icon: <Package size={18} className="text-purple-600" />, bg: 'bg-purple-100' },
                { label: 'Ativos', value: ativos, icon: <Package size={18} className="text-emerald-600" />, bg: 'bg-emerald-100' },
                { label: 'Em manutenção', value: manutencao, icon: <Layers size={18} className="text-amber-600" />, bg: 'bg-amber-100' },
              ].map(({ label, value, icon, bg }) => (
                <Card key={label} padding="sm">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 ${bg} rounded-lg`}>{icon}</div>
                    <div><p className="text-2xl font-bold text-gray-800">{value}</p><p className="text-xs text-gray-500">{label}</p></div>
                  </div>
                </Card>
              ))}
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
                          {['', 'Patrimônio', 'Descrição', 'Ambiente', 'Tipo', 'Marca', 'Modelo', 'Nº série', 'Valor', 'Data compra', 'Status'].map(h => (
                            <th key={h} className="px-3 py-3">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filtrado.slice(0, visiveis).map(a => (
                          <BemRowReadOnly key={a.id} a={a} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
                <div className="flex flex-col items-center gap-2">
                  <p className="text-xs text-gray-400">Exibindo {Math.min(visiveis, filtrado.length)} de {filtrado.length} bens</p>
                  {visiveis < filtrado.length && (
                    <button
                      onClick={() => setVisiveis(v => v + PAGE_SIZE)}
                      className="px-6 py-2 text-sm font-medium text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors">
                      Mostrar mais {Math.min(PAGE_SIZE, filtrado.length - visiveis)} bens
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
