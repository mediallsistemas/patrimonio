'use client'

import { useState, useMemo, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as agendamentosService from '@/services/agendamentos.service'
import * as trilogoService from '@/services/trilogo.service'
import * as meService from '@/services/me.service'
import { ArrowLeft, Package, Layers, Search, X, CalendarPlus, QrCode } from 'lucide-react'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import type { Empresa, Asset, Agendamento } from './bens.types'
import { parseEndereco } from './bens.types'
import BemRow from './components/BemRow'
import ModalAgendamento from './components/ModalAgendamento'
import ModalQrCode from './components/ModalQrCode'
import { useAuth } from '@/hooks/useAuth'
import type { MyTenant } from '@/services/me.service'

const PAGE_SIZE = 50

export default function BensPage() {
  const { user, isLoading: authLoading } = useAuth()
  const isSuperAdmin = user?.role === 'super_admin'
  // Multi-unidade: admin_multi (viewer = alias legado) — escolhe entre os seus
  // tenants; o fluxo abaixo (meusTenants/empresasViewer) serve aos dois papéis.
  const isViewer = user?.role === 'viewer' || user?.role === 'admin_multi'

  const [empresaSel, setEmpresaSel] = useState<Empresa | null>(null)
  // admin_multi: unidade selecionada (tenant, não empresa — duas unidades podem
  // dividir a MESMA empresa Trílogo e se distinguem pelo trilogoProjectName)
  const [tenantSelId, setTenantSelId] = useState('')
  const [search,     setSearch]     = useState('')
  const [tipo,       setTipo]       = useState('')
  const [projeto,    setProjeto]    = useState('')
  const [ambiente,   setAmbiente]   = useState('')
  const [statusFiltro, setStatusFiltro] = useState<'' | '1' | '2' | '4'>('')
  const [assetModal, setAssetModal] = useState<Asset | null>(null)
  const [qrModal,    setQrModal]    = useState(false)
  const [visiveis,   setVisiveis]   = useState(PAGE_SIZE)
  const [apenasComAgendamento, setApenasComAgendamento] = useState(false)

  const { data: agendamentos = [] } = useQuery<Agendamento[]>({
    queryKey: ['agendamentos'],
    queryFn: () => agendamentosService.listar(),
    staleTime: 60 * 1000,
  })

  const agendamentoMap = useMemo(() => {
    const map = new Map<number, Agendamento[]>()
    agendamentos.forEach(ag => {
      if (!map.has(ag.trilogoAssetId)) map.set(ag.trilogoAssetId, [])
      map.get(ag.trilogoAssetId)!.push(ag)
    })
    return map
  }, [agendamentos])

  // super_admin carrega lista de todas as empresas do Trilogo
  const { data: empresas = [], isLoading: loadEmpresas } = useQuery<Empresa[]>({
    queryKey: ['trilogo-empresas'],
    queryFn: () => trilogoService.buscarEmpresas(),
    enabled: isSuperAdmin && !authLoading,
    staleTime: 30 * 60 * 1000,
  })

  // viewer carrega apenas os seus tenants (multi-tenant)
  const { data: meusTenants = [], isLoading: loadMeusTenants } = useQuery<MyTenant[]>({
    queryKey: ['me-tenants'],
    queryFn: () => meService.buscarMeusTenants(),
    enabled: isViewer && !authLoading,
    staleTime: 60 * 60 * 1000,
  })

  // tenant_admin carrega o trilogoCompanyId do próprio tenant
  const { data: myTenant } = useQuery<MyTenant>({
    queryKey: ['me-tenant'],
    queryFn: () => meService.buscarMeuTenant(),
    enabled: !isSuperAdmin && !isViewer && !authLoading,
    staleTime: 60 * 60 * 1000,
  })

  // admin_multi: o seletor é por TENANT (unidade). Selecionar por empresa não
  // funciona quando duas unidades dividem o mesmo trilogoCompanyId — as opções
  // colidiam e a segunda unidade sumia do seletor.
  const tenantsMulti = meusTenants.filter((t) => t.trilogoCompanyId !== null)
  const tenantAuto = tenantsMulti.length === 1 ? tenantsMulti[0] : null
  const tenantSel = tenantsMulti.find((t) => t.id === tenantSelId) ?? tenantAuto

  // companyId efetivo
  const effectiveCompanyId = isSuperAdmin
    ? (empresaSel?.id ?? null)
    : isViewer
      ? (tenantSel?.trilogoCompanyId ?? null)
      : (myTenant?.trilogoCompanyId ?? null)

  // projectName: recorta os bens da UNIDADE dentro da empresa. Vale para
  // tenant_admin (o seu) e admin_multi (o da unidade selecionada); super_admin
  // vê a empresa inteira.
  const effectiveProjectName = isSuperAdmin
    ? null
    : isViewer
      ? (tenantSel?.trilogoProjectName ?? null)
      : (myTenant?.trilogoProjectName ?? null)

  const { data: bensRaw = [], isLoading: loadBens } = useQuery({
    queryKey: ['trilogo-assets', effectiveCompanyId],
    queryFn: () => trilogoService.buscarAssets(effectiveCompanyId!) as unknown as Promise<Asset[]>,
    enabled: !!effectiveCompanyId,
    staleTime: 10 * 60 * 1000,
  })

  const bens = useMemo(() => {
    if (!effectiveProjectName) return bensRaw
    const proj = effectiveProjectName.toUpperCase()
    return bensRaw.filter(a => String(a.departmentFullAddress ?? '').toUpperCase().includes(proj))
  }, [bensRaw, effectiveProjectName])

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
      if (tipo         && a.assetTypeName !== tipo)                    return false
      if (projeto      && end.unidade !== projeto)                      return false
      if (ambiente     && end.ambienteSimples !== ambiente)             return false
      if (statusFiltro && a.status !== Number(statusFiltro))           return false
      if (apenasComAgendamento && !agendamentoMap.has(a.id))           return false
      if (q && !(a.description.toLowerCase().includes(q) || a.patrimony.toLowerCase().includes(q) || (a.brand ?? '').toLowerCase().includes(q))) return false
      return true
    })
  }, [bens, search, tipo, projeto, ambiente, statusFiltro, apenasComAgendamento, agendamentoMap])

  const ativos         = filtrado.filter(a => a.status === 1).length
  const manutencao     = filtrado.filter(a => a.status === 4).length
  const comAgendamento = filtrado.filter(a => agendamentoMap.get(a.id)?.some(ag => ag.status === 'pendente')).length

  // Resizable panel
  const painelRef = useRef<HTMLDivElement>(null)
  const [painelW, setPainelW] = useState<number | null>(null)
  const resizingPainel = useRef<{ startX: number; startW: number } | null>(null)

  function onPainelResizeStart(e: React.MouseEvent) {
    e.preventDefault()
    const currentW = painelRef.current?.getBoundingClientRect().width ?? 800
    resizingPainel.current = { startX: e.clientX, startW: currentW }
    function onMove(ev: MouseEvent) {
      if (!resizingPainel.current) return
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

        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Bens por Ambiente</h1>
            <p className="text-sm text-gray-500">Patrimônio cadastrado no Trílogo por setor</p>
          </div>
        </div>

        {/* Filters */}
        <Card padding="sm">
          <div className="space-y-3">
            {/* Filtros */}
            <div className="flex flex-wrap gap-2 items-center">
              {/* Seletor de unidade — super_admin escolhe empresa Trílogo;
                  admin_multi escolhe entre os SEUS tenants (por id de tenant,
                  já que unidades podem dividir a mesma empresa) */}
              {isSuperAdmin && (
                <select
                  value={empresaSel?.id ?? ''}
                  onChange={e => {
                    setEmpresaSel(empresas.find(x => x.id === Number(e.target.value)) ?? null)
                    setProjeto(''); setAmbiente(''); setTipo(''); setSearch(''); setStatusFiltro(''); setVisiveis(PAGE_SIZE)
                  }}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
                  disabled={loadEmpresas}
                >
                  <option value="">{loadEmpresas ? 'Carregando...' : 'Selecione a unidade'}</option>
                  {empresas.map(e => (
                    <option key={e.id} value={e.id}>{e.nome}</option>
                  ))}
                </select>
              )}
              {isViewer && tenantsMulti.length > 1 && (
                <select
                  value={tenantSel?.id ?? ''}
                  onChange={e => {
                    setTenantSelId(e.target.value)
                    setProjeto(''); setAmbiente(''); setTipo(''); setSearch(''); setStatusFiltro(''); setVisiveis(PAGE_SIZE)
                  }}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
                  disabled={loadMeusTenants}
                >
                  <option value="">{loadMeusTenants ? 'Carregando...' : 'Selecione a unidade'}</option>
                  {tenantsMulti.map(t => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </select>
              )}
              {!!effectiveCompanyId && !loadBens && (
                <>
                <div className="relative min-w-48 flex-1">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" placeholder="Descrição, patrimônio..." value={search}
                    onChange={e => { setSearch(e.target.value); setVisiveis(PAGE_SIZE) }}
                    className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                </div>
                <select value={tipo} onChange={e => { setTipo(e.target.value); setVisiveis(PAGE_SIZE) }}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white">
                  <option value="">Todos os tipos</option>
                  {tipos.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                {/* Filtro de projeto só quando a unidade NÃO define um projeto
                    (super_admin vendo a empresa toda). Para tenant_admin e
                    admin_multi o recorte já é o projeto da unidade — mostrar
                    este dropdown seria um segundo seletor redundante. */}
                {!effectiveProjectName && (
                  <select value={projeto} onChange={e => { setProjeto(e.target.value); setAmbiente(''); setVisiveis(PAGE_SIZE) }}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white">
                    <option value="">Todos os projetos</option>
                    {projetos.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                )}
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
                <button onClick={() => { setApenasComAgendamento(v => !v); setVisiveis(PAGE_SIZE) }}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors whitespace-nowrap ${apenasComAgendamento ? 'bg-purple-600 text-white border-purple-600' : 'text-gray-500 border-gray-200 hover:border-purple-300 hover:text-purple-600'}`}>
                  <CalendarPlus size={14} /> Com agendamento
                </button>
                {ambiente && projeto && (
                  <button onClick={() => setQrModal(true)}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-purple-200 text-purple-600 hover:bg-purple-50 transition-colors whitespace-nowrap">
                    <QrCode size={14} /> QR do ambiente
                  </button>
                )}
                {(search || tipo || projeto || ambiente || statusFiltro || apenasComAgendamento) && (
                  <button onClick={() => { setSearch(''); setTipo(''); setProjeto(''); setAmbiente(''); setStatusFiltro(''); setApenasComAgendamento(false); setVisiveis(PAGE_SIZE) }}
                    className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg whitespace-nowrap">
                    <X size={14} /> Limpar
                  </button>
                )}
                </>
              )}
            </div>
          </div>
        </Card>

        {!effectiveCompanyId && (isSuperAdmin || isViewer) && (
          <div className="text-center py-20 text-gray-400">
            <Package size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Selecione uma unidade para ver os bens patrimoniais</p>
          </div>
        )}

        {!!effectiveCompanyId && loadBens && (
          <div className="text-center py-20 text-gray-400 text-sm">Carregando bens...</div>
        )}

        {!!effectiveCompanyId && !loadBens && (
          <div ref={painelRef} className="relative space-y-4"
            style={painelW ? { width: painelW, marginLeft: 'auto', marginRight: 'auto' } : {}}>
            {/* Resize handles */}
            {['left-0', 'right-0'].map(side => (
              <div key={side} onMouseDown={onPainelResizeStart}
                className={`absolute top-0 ${side} h-full w-1.5 cursor-col-resize group z-10`}>
                <div className="w-full h-full opacity-0 group-hover:opacity-100 bg-purple-400 transition-opacity rounded-sm" />
              </div>
            ))}

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total', value: filtrado.length, icon: <Package size={18} className="text-purple-600" />, bg: 'bg-purple-100' },
                { label: 'Ativos', value: ativos, icon: <Package size={18} className="text-emerald-600" />, bg: 'bg-emerald-100' },
                { label: 'Em manutenção', value: manutencao, icon: <Layers size={18} className="text-amber-600" />, bg: 'bg-amber-100' },
                { label: 'Manutenção agendada', value: comAgendamento, icon: <CalendarPlus size={18} className="text-purple-600" />, bg: 'bg-purple-100' },
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
                          {['', 'Patrimônio', 'Descrição', 'Ambiente', 'Tipo', 'Marca', 'Modelo', 'Nº série', 'Valor', 'Data da compra', 'Status', 'Manutenção', 'Data de Cadastro'].map(h => (
                            <th key={h} className="px-3 py-3">{h}</th>
                          ))}
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
                  <p className="text-xs text-gray-400">Exibindo {Math.min(visiveis, filtrado.length)} de {filtrado.length} bens</p>
                  {visiveis < filtrado.length && (
                    <button onClick={() => setVisiveis(v => v + PAGE_SIZE)}
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

      {assetModal && (
        <ModalAgendamento
          asset={assetModal}
          agendamentos={agendamentoMap.get(assetModal.id) ?? []}
          onClose={() => setAssetModal(null)}
        />
      )}

      {qrModal && projeto && ambiente && effectiveCompanyId && (
        <ModalQrCode
          companyId={effectiveCompanyId}
          projeto={projeto}
          ambiente={ambiente}
          onClose={() => setQrModal(false)}
        />
      )}
    </div>
  )
}
