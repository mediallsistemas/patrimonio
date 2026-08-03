'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, Inbox, CheckCircle, Building2 } from 'lucide-react'

import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Text from '@/components/ui/Text'
import FotoCapture from '@/components/ui/FotoCapture'
import LogoutButton from '@/components/ui/LogoutButton'
import SeletorAmbientePorBloco from '@/components/ui/SeletorAmbientePorBloco'
import { useAuth } from '@/hooks/useAuth'
import { listarTenants } from '@/services/admin-tenants.service'
import { listarUsuarios } from '@/services/admin-usuarios.service'
import { buscarBlocosAdmin } from '@/services/rondas.service'
import * as chamadosService from '@/services/chamados.service'
import {
  TIPOS_CHAMADO,
  TIPO_CHAMADO_LABEL,
  PRIORIDADES_CHAMADO,
  PRIORIDADE_CHAMADO_LABEL,
  CriarChamadoSchema,
} from '@/modules/chamados/chamados.types'
import { ROLES_ESCRITA_CHAMADOS } from '@/modules/chamados/chamados.rules'
import type { TipoChamado, PrioridadeChamado } from '@/services/chamados.service'
import type { JWTPayload } from '@/modules/auth/auth.types'

type JWTRole = JWTPayload['role']

type AmbienteSelecionado = { id: string; nome: string; blocoNome: string }

type Etapa =
  | { etapa: 'tenant' }
  | { etapa: 'ambiente' }
  | { etapa: 'dados'; ambiente: AmbienteSelecionado }
  | { etapa: 'concluido'; numero: number }

// Abertura de chamado escolhendo a unidade: super_admin (qualquer hospital) e
// admin_multi (somente as unidades que administra — /api/admin/tenants e
// /api/admin/blocos já devolvem/validam o recorte). O fluxo começa escolhendo
// o hospital, depois reaproveita a mesma seleção de ambiente e o mesmo
// formulário do fluxo do tenant. Vincular bem fica de fora aqui — a busca de
// bens é escopada pela sessão (não cross-tenant).
export default function NovoChamadoAdminPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const { user } = useAuth()

  // viewer (alias legado de admin_multi) segue congelado sem criar chamados
  // (fora de ROLES_CRIACAO_CHAMADOS) — a API devolveria 403.
  const naoAutorizado =
    user !== null && user.role !== 'super_admin' && user.role !== 'admin_multi'
  useEffect(() => {
    if (naoAutorizado) router.replace('/admin/chamados')
  }, [naoAutorizado, router])

  const [tenantId, setTenantId] = useState('')
  const [estado, setEstado] = useState<Etapa>({ etapa: 'tenant' })
  const [searchAmbiente, setSearchAmbiente] = useState('')

  // Campos do formulário
  const [titulo, setTitulo] = useState('')
  const [tipo, setTipo] = useState<TipoChamado>('eletrica')
  const [prioridade, setPrioridade] = useState<PrioridadeChamado>('media')
  const [prazo, setPrazo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [foto, setFoto] = useState<string | null>(null)
  const [responsavelId, setResponsavelId] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  // Papéis que abrem chamado pelo painel escolhendo a unidade; a API
  // /admin/tenants já devolve o recorte certo (todas p/ super, as suas p/ multi)
  const podeEscolherUnidade =
    user?.role === 'super_admin' || user?.role === 'admin_multi'

  const { data: tenants = [] } = useQuery({
    queryKey: ['admin-tenants'],
    queryFn: listarTenants,
    enabled: podeEscolherUnidade,
  })

  const { data: blocos = [], isLoading: blocosCarregando } = useQuery({
    queryKey: ['admin-blocos', tenantId],
    queryFn: () => buscarBlocosAdmin(tenantId),
    enabled: tenantId !== '',
  })

  const { data: usuarios = [] } = useQuery({
    queryKey: ['admin-usuarios-chamado'],
    queryFn: listarUsuarios,
    enabled: podeEscolherUnidade,
  })

  // Só ambientes de manutenção predial (não-gases), como no fluxo do tenant
  const blocosChamado = useMemo(
    () =>
      blocos
        .map((b) => ({ ...b, ambientes: b.ambientes.filter((a) => a.tipo !== 'gases') }))
        .filter((b) => b.ambientes.length > 0),
    [blocos],
  )

  // Responsáveis atribuíveis: do hospital escolhido, ativos e com role executor
  const usuariosAtribuiveis = useMemo(
    () =>
      usuarios
        .filter(
          (u) =>
            u.ativo &&
            u.tenantId === tenantId &&
            ROLES_ESCRITA_CHAMADOS.includes(u.role as JWTRole),
        )
        .map((u) => ({ id: u.id, nome: u.nome })),
    [usuarios, tenantId],
  )

  const criar = useMutation({
    mutationFn: (input: chamadosService.CriarChamadoInput) => chamadosService.criar(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chamados'] }),
  })

  const nomeTenant = tenants.find((t) => t.id === tenantId)?.nome ?? ''

  function reiniciar() {
    setTitulo(''); setDescricao(''); setPrazo(''); setFoto(null)
    setResponsavelId(''); setErro(null); setSearchAmbiente('')
  }

  async function handleCriar() {
    if (estado.etapa !== 'dados') return
    setErro(null)

    const parsed = CriarChamadoSchema.safeParse({
      tenantId,
      titulo,
      descricao,
      tipo,
      prioridade,
      prazo: prazo ? new Date(`${prazo}T23:59:59`).toISOString() : undefined,
      ambienteId: estado.ambiente.id,
      ...(foto ? { fotoAbertura: foto } : {}),
      ...(responsavelId ? { responsavelId } : {}),
    })
    if (!parsed.success) {
      setErro(parsed.error.issues[0]?.message ?? 'Preencha os campos obrigatórios')
      return
    }

    try {
      const r = await criar.mutateAsync({
        ...parsed.data,
        prazo: parsed.data.prazo.toISOString(),
      })
      setEstado({ etapa: 'concluido', numero: r.numero })
    } catch {
      setErro('Falha ao abrir o chamado. Tente novamente.')
    }
  }

  return (
    <div className="form-bg min-h-screen flex flex-col p-6">
      <div className="w-full max-w-2xl mx-auto flex-1 flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => {
              if (estado.etapa === 'dados') {
                if (confirm('Voltar agora descartará os dados preenchidos. Continuar?')) {
                  setEstado({ etapa: 'ambiente' })
                }
              } else if (estado.etapa === 'ambiente') {
                setEstado({ etapa: 'tenant' })
              } else {
                router.push('/admin/chamados')
              }
            }}
            className="flex items-center gap-2 text-gray-400 hover:text-dark transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <Text variant="body-sm" className="text-inherit">Voltar</Text>
          </button>
          <LogoutButton />
        </div>

        {/* Etapa 0 — hospital */}
        {estado.etapa === 'tenant' && (
          <>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-dark mb-4">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <Text as="h1" variant="heading-lg" className="text-dark mb-1 block">
                Abrir Chamado
              </Text>
              <Text variant="body-md" className="text-gray-300">
                Para qual hospital é o chamado?
              </Text>
            </div>

            <Card shadow="md">
              <Text variant="caption" className="text-gray-400 uppercase tracking-wide font-semibold block mb-1.5">
                Hospital *
              </Text>
              <select
                value={tenantId}
                onChange={(e) => {
                  // Trocar de hospital invalida um responsável já escolhido
                  // (ele é de outro tenant) — limpa para não submeter um
                  // responsavelId que o servidor rejeitaria.
                  setTenantId(e.target.value)
                  setResponsavelId('')
                }}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-sans text-dark bg-white focus:outline-none focus:ring-2 focus:ring-red-base"
              >
                <option value="">Selecione o hospital...</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>

              <Button
                onClick={() => setEstado({ etapa: 'ambiente' })}
                disabled={tenantId === ''}
                className="w-full mt-4"
              >
                Continuar
              </Button>
            </Card>
          </>
        )}

        {/* Etapa 1 — ambiente */}
        {estado.etapa === 'ambiente' && (
          <>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-dark mb-4">
                <Inbox className="w-8 h-8 text-white" />
              </div>
              <Text as="h1" variant="heading-lg" className="text-dark mb-1 block">
                Abrir Chamado
              </Text>
              <Text variant="body-md" className="text-gray-300">
                {nomeTenant} · Selecione o ambiente
              </Text>
            </div>

            <SeletorAmbientePorBloco
              blocos={blocosChamado}
              carregando={blocosCarregando}
              search={searchAmbiente}
              onSearchChange={setSearchAmbiente}
              onSelecionar={(ambiente) => setEstado({ etapa: 'dados', ambiente })}
            />
          </>
        )}

        {/* Etapa 2 — dados */}
        {estado.etapa === 'dados' && (
          <Card shadow="md">
            <div className="mb-4 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200">
              <Text variant="caption" className="text-gray-300 uppercase tracking-wide font-semibold block">
                {nomeTenant} · Ambiente
              </Text>
              <Text variant="body-md" className="text-dark block">
                {estado.ambiente.nome}
                <span className="text-gray-300"> · {estado.ambiente.blocoNome}</span>
              </Text>
            </div>

            <div className="space-y-4">
              <div>
                <Text variant="caption" className="text-gray-400 uppercase tracking-wide font-semibold block mb-1.5">
                  Título *
                </Text>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex.: Descarga do banheiro feminino quebrada"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-sans text-dark focus:outline-none focus:ring-2 focus:ring-red-base bg-white placeholder:text-gray-300"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Text variant="caption" className="text-gray-400 uppercase tracking-wide font-semibold block mb-1.5">
                    Tipo *
                  </Text>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as TipoChamado)}
                    className="w-full px-3 py-3 rounded-xl border border-gray-200 text-sm font-sans text-dark bg-white focus:outline-none focus:ring-2 focus:ring-red-base"
                  >
                    {TIPOS_CHAMADO.map((t) => (
                      <option key={t} value={t}>{TIPO_CHAMADO_LABEL[t]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Text variant="caption" className="text-gray-400 uppercase tracking-wide font-semibold block mb-1.5">
                    Prioridade
                  </Text>
                  <select
                    value={prioridade}
                    onChange={(e) => setPrioridade(e.target.value as PrioridadeChamado)}
                    className="w-full px-3 py-3 rounded-xl border border-gray-200 text-sm font-sans text-dark bg-white focus:outline-none focus:ring-2 focus:ring-red-base"
                  >
                    {PRIORIDADES_CHAMADO.map((p) => (
                      <option key={p} value={p}>{PRIORIDADE_CHAMADO_LABEL[p]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Text variant="caption" className="text-gray-400 uppercase tracking-wide font-semibold block mb-1.5">
                    Prazo *
                  </Text>
                  <input
                    type="date"
                    value={prazo}
                    onChange={(e) => setPrazo(e.target.value)}
                    className="w-full px-3 py-3 rounded-xl border border-gray-200 text-sm font-sans text-dark bg-white focus:outline-none focus:ring-2 focus:ring-red-base"
                  />
                </div>
              </div>

              <div>
                <Text variant="caption" className="text-gray-400 uppercase tracking-wide font-semibold block mb-1.5">
                  O que ocorreu? *
                </Text>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descreva o problema encontrado"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-sans text-dark focus:outline-none focus:ring-2 focus:ring-red-base bg-white placeholder:text-gray-300 resize-none"
                />
              </div>

              <FotoCapture
                label="Foto do problema"
                hint="Opcional"
                valor={foto}
                onChange={setFoto}
                accent="amber"
              />

              {/* Atribuição direta (opcional) */}
              <div>
                <Text variant="caption" className="text-gray-400 uppercase tracking-wide font-semibold block mb-1.5">
                  Atribuir diretamente (opcional)
                </Text>
                <select
                  value={responsavelId}
                  onChange={(e) => setResponsavelId(e.target.value)}
                  className="w-full px-3 py-3 rounded-xl border border-gray-200 text-sm font-sans text-dark bg-white focus:outline-none focus:ring-2 focus:ring-red-base"
                >
                  <option value="">Deixar em aberto no painel</option>
                  {usuariosAtribuiveis.map((u) => (
                    <option key={u.id} value={u.id}>{u.nome}</option>
                  ))}
                </select>
              </div>

              {erro && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <p className="text-sm text-red-600 font-sans">{erro}</p>
                </div>
              )}

              <Button onClick={handleCriar} disabled={criar.isPending} className="w-full">
                {criar.isPending ? 'Abrindo...' : 'Abrir chamado'}
              </Button>
            </div>
          </Card>
        )}

        {/* Etapa 3 — concluído */}
        {estado.etapa === 'concluido' && (
          <Card shadow="md" className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-100 mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <Text as="h2" variant="heading-md" className="text-dark mb-1 block">
              Chamado #{estado.numero} aberto
            </Text>
            <Text variant="body-md" className="text-gray-300 block mb-6">
              Ele já aparece no painel para ser assumido
            </Text>

            <div className="space-y-2 max-w-xs mx-auto">
              <Button
                onClick={() => { reiniciar(); setEstado({ etapa: 'ambiente' }) }}
                className="w-full"
              >
                Abrir outro neste hospital
              </Button>
              <Link href="/admin/chamados" className="block">
                <Button variant="outline" className="w-full">
                  Ir para o painel
                </Button>
              </Link>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
