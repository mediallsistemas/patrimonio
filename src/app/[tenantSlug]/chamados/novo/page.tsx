'use client'

import { useState, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, ClipboardList, Search, X, MapPin, Building2, CheckCircle, Package,
} from 'lucide-react'

import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Text from '@/components/ui/Text'
import FotoCapture from '@/components/ui/FotoCapture'
import BemSelector from '@/components/ui/patrimonio/BemSelector'
import LogoutButton from '@/components/ui/LogoutButton'
import { useAuth } from '@/hooks/useAuth'
import { useChamados } from '@/hooks/useChamados'
import {
  TIPOS_CHAMADO,
  TIPO_CHAMADO_LABEL,
  PRIORIDADES_CHAMADO,
  PRIORIDADE_CHAMADO_LABEL,
} from '@/modules/chamados/chamados.types'
import type { TipoChamado, PrioridadeChamado } from '@/services/chamados.service'

// ── Tipos do fluxo (discriminated union — sem combinações inválidas) ────────

type AmbienteSelecionado = {
  id: string
  nome: string
  blocoNome: string
}

type BemVinculado = {
  trilogoAssetId: number
  patrimony: string
  descricaoBem: string
}

type Etapa =
  | { etapa: 'ambiente' }
  | { etapa: 'dados'; ambiente: AmbienteSelecionado }
  | { etapa: 'concluido'; numero: number }

export default function NovoChamadoPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = use(params)
  const router = useRouter()
  const { user } = useAuth()

  const ehAdmin = user?.role === 'tenant_admin' || user?.role === 'super_admin'
  const { blocosChamado, blocosCarregando, usuarios, criar } = useChamados({ ehAdmin })

  const [estado, setEstado] = useState<Etapa>({ etapa: 'ambiente' })
  const [search, setSearch] = useState('')

  // Campos do formulário
  const [titulo, setTitulo] = useState('')
  const [tipo, setTipo] = useState<TipoChamado>('eletrica')
  const [prioridade, setPrioridade] = useState<PrioridadeChamado>('media')
  const [prazo, setPrazo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [foto, setFoto] = useState<string | null>(null)
  const [bem, setBem] = useState<BemVinculado | null>(null)
  const [responsavelId, setResponsavelId] = useState('')
  const [abrirBemSelector, setAbrirBemSelector] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const usuariosAtribuiveis = usuarios
    .filter((u) => u.ativo && u.role !== 'viewer' && u.role !== 'operator_forms')

  async function handleCriar() {
    if (estado.etapa !== 'dados') return
    setErro(null)
    if (titulo.trim().length < 3) { setErro('Informe o título do chamado'); return }
    if (descricao.trim().length < 3) { setErro('Descreva o problema'); return }
    if (!prazo) { setErro('Informe o prazo'); return }

    try {
      const r = await criar.mutateAsync({
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        tipo,
        prioridade,
        // prazo = fim do dia selecionado (deadline inclusivo)
        prazo: new Date(`${prazo}T23:59:59`).toISOString(),
        ambienteId: estado.ambiente.id,
        ...(bem ?? {}),
        ...(foto ? { fotoAbertura: foto } : {}),
        ...(ehAdmin && responsavelId ? { responsavelId } : {}),
      })
      setEstado({ etapa: 'concluido', numero: r.numero })
    } catch {
      setErro('Falha ao abrir o chamado. Tente novamente.')
    }
  }

  // ── Filtro de ambientes ───────────────────────────────────────────────────
  const q = search.trim().toLowerCase()
  const blocosFiltrados = blocosChamado
    .map((b) => ({
      ...b,
      ambientes: q ? b.ambientes.filter((a) => a.nome.toLowerCase().includes(q)) : b.ambientes,
    }))
    .filter((b) => b.ambientes.length > 0)

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
              } else {
                router.push(`/${tenantSlug}/chamados`)
              }
            }}
            className="flex items-center gap-2 text-gray-400 hover:text-dark transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <Text variant="body-sm" className="text-inherit">Voltar</Text>
          </button>
          <LogoutButton />
        </div>

        {/* Etapa 1 — ambiente (mesma UI da ronda) */}
        {estado.etapa === 'ambiente' && (
          <>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-dark mb-4">
                <ClipboardList className="w-8 h-8 text-white" />
              </div>
              <Text as="h1" variant="heading-lg" className="text-dark mb-1 block">
                Abrir Chamado
              </Text>
              <Text variant="body-md" className="text-gray-300">
                Onde é o problema? Selecione o ambiente
              </Text>
            </div>

            <Card shadow="md">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                <input
                  type="text"
                  placeholder="Pesquisar ambiente..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm font-sans text-dark focus:outline-none focus:ring-2 focus:ring-red-base bg-white placeholder:text-gray-300"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="overflow-y-auto max-h-[60vh] space-y-4 pr-1 -mr-1">
                {blocosCarregando ? (
                  <p className="text-center py-6 text-sm text-gray-300 font-sans">Carregando ambientes...</p>
                ) : blocosFiltrados.length === 0 ? (
                  <p className="text-center py-6 text-sm text-gray-300 font-sans">
                    {q ? 'Nenhum ambiente encontrado' : 'Nenhum ambiente cadastrado'}
                  </p>
                ) : (
                  blocosFiltrados.map((b) => (
                    <div key={b.id}>
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 className="w-3.5 h-3.5 text-gray-300" />
                        <Text variant="caption" className="text-gray-400 uppercase tracking-wide font-semibold block">
                          {b.nome}
                        </Text>
                      </div>
                      <div className="space-y-1.5">
                        {b.ambientes.map((amb) => (
                          <button
                            key={amb.id}
                            onClick={() =>
                              setEstado({
                                etapa: 'dados',
                                ambiente: { id: amb.id, nome: amb.nome, blocoNome: b.nome },
                              })
                            }
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-gray-200 bg-white hover:border-red-base hover:bg-red-light text-left font-sans transition-all active:scale-[0.98]"
                          >
                            <MapPin className="w-4 h-4 text-gray-300 shrink-0" />
                            <span className="text-sm font-semibold text-dark flex-1 truncate">{amb.nome}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </>
        )}

        {/* Etapa 2 — dados do chamado */}
        {estado.etapa === 'dados' && (
          <Card shadow="md">
            <div className="mb-4 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200">
              <Text variant="caption" className="text-gray-300 uppercase tracking-wide font-semibold block">
                Ambiente
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

              {/* Bem vinculado (opcional) */}
              {bem ? (
                <div className="px-4 py-3 rounded-xl bg-purple-50 border border-purple-200 flex items-start justify-between gap-2">
                  <div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 uppercase tracking-wide font-sans">
                      <Package className="w-3.5 h-3.5" />
                      Patrimônio · {bem.patrimony}
                    </span>
                    <Text variant="body-sm" className="text-dark block mt-0.5">{bem.descricaoBem}</Text>
                  </div>
                  <button
                    onClick={() => setBem(null)}
                    className="text-gray-300 hover:text-gray-500 shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setAbrirBemSelector(true)}>
                  <Package className="w-4 h-4" />
                  Vincular bem patrimonial (opcional)
                </Button>
              )}

              <FotoCapture
                label="Foto do problema"
                hint="Opcional"
                valor={foto}
                onChange={setFoto}
                accent="amber"
              />

              {/* Atribuição direta — só admin */}
              {ehAdmin && (
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
              )}

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
                onClick={() => {
                  setTitulo(''); setDescricao(''); setPrazo(''); setFoto(null)
                  setBem(null); setResponsavelId(''); setErro(null); setSearch('')
                  setEstado({ etapa: 'ambiente' })
                }}
                className="w-full"
              >
                Abrir outro chamado
              </Button>
              <Link href={`/${tenantSlug}/chamados`} className="block">
                <Button variant="outline" className="w-full">
                  Ir para o painel
                </Button>
              </Link>
            </div>
          </Card>
        )}
      </div>

      {abrirBemSelector && estado.etapa === 'dados' && (
        <BemSelector
          ambienteNome={estado.ambiente.nome}
          blocoNome={estado.ambiente.blocoNome}
          onFechar={() => setAbrirBemSelector(false)}
          permitirSemSelecao={false}
          onSelecionar={(b) => {
            setAbrirBemSelector(false)
            if (!b) return
            setBem({ trilogoAssetId: b.id, patrimony: b.patrimony, descricaoBem: b.descricao })
          }}
        />
      )}
    </div>
  )
}
