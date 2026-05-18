'use client'

import { useState, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, Zap, Droplet, Package, Search, X, Wrench,
  CheckCircle, MapPin, Building2,
} from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Text from '@/components/ui/Text'
import FotoCapture from '@/components/ui/FotoCapture'
import BemSelector from '@/components/ui/patrimonio/BemSelector'
import LogoutButton from '@/components/ui/LogoutButton'
import { useManutencao, type TipoManutencao } from '@/hooks/useManutencao'
import { getSugestoes } from '@/app/admin/bens/bens.types'

// ── Tipos do fluxo ──────────────────────────────────────────────────────────
// Estado modelado como discriminated union para evitar combinações inválidas.

type AmbienteSelecionado = {
  id: string
  nome: string
  blocoNome: string
}

type BemSelecionadoEstado = {
  trilogoAssetId: number
  patrimony: string
  descricaoBem: string
  assetTypeName: string
}

type Etapa =
  | { etapa: 'ambientes' }
  | { etapa: 'tipo'; ambiente: AmbienteSelecionado }
  | {
      etapa: 'iniciar'
      tipo: TipoManutencao
      ambiente: AmbienteSelecionado
      bem?: BemSelecionadoEstado
    }
  | {
      etapa: 'finalizar'
      tipo: TipoManutencao
      manutencaoId: string
      ambiente: AmbienteSelecionado
      bem?: BemSelecionadoEstado
    }
  | { etapa: 'concluida'; tipo: TipoManutencao }

const ACCENT: Record<TipoManutencao, { bg: string; texto: string; nome: string; Icon: typeof Zap }> = {
  eletrica:   { bg: '#f59e0b', texto: 'text-amber-700',   nome: 'Elétrica',   Icon: Zap },
  hidraulica: { bg: '#0ea5e9', texto: 'text-sky-700',     nome: 'Hidráulica', Icon: Droplet },
  patrimonio: { bg: '#7c3aed', texto: 'text-purple-700',  nome: 'Patrimônio', Icon: Package },
}

export default function RealizarManutencaoPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = use(params)
  const router = useRouter()
  const manutencao = useManutencao()

  const [estado, setEstado] = useState<Etapa>({ etapa: 'ambientes' })
  const [descricao, setDescricao] = useState('')
  const [subtipoPatrimonio, setSubtipoPatrimonio] = useState('')
  const [subtipoCustom, setSubtipoCustom] = useState('')
  const [fotoAntes, setFotoAntes] = useState<string | null>(null)
  const [fotoDepois, setFotoDepois] = useState<string | null>(null)
  const [observacaoFinal, setObservacaoFinal] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [searchAmbiente, setSearchAmbiente] = useState('')
  const [abrirBemSelector, setAbrirBemSelector] = useState(false)

  function resetCampos() {
    setDescricao('')
    setSubtipoPatrimonio('')
    setSubtipoCustom('')
    setFotoAntes(null)
    setFotoDepois(null)
    setObservacaoFinal('')
    setErro(null)
    setSearchAmbiente('')
  }

  function voltarAoInicio() {
    resetCampos()
    setEstado({ etapa: 'ambientes' })
  }

  async function handleIniciar() {
    if (estado.etapa !== 'iniciar') return
    setErro(null)
    if (!descricao.trim()) { setErro('Descreva o problema'); return }
    if (!fotoAntes) { setErro('Tire a foto do antes'); return }

    try {
      if (estado.tipo === 'patrimonio') {
        if (!estado.bem) { setErro('Selecione o bem'); return }
        const subtipoFinal = (subtipoPatrimonio === '__outro__' ? subtipoCustom : subtipoPatrimonio).trim()
        if (!subtipoFinal) { setErro('Selecione o tipo de manutenção'); return }
        const r = await manutencao.iniciar.mutateAsync({
          tipo: 'patrimonio',
          trilogoAssetId: estado.bem.trilogoAssetId,
          patrimony: estado.bem.patrimony,
          descricaoBem: estado.bem.descricaoBem,
          subtipoPatrimonio: subtipoFinal,
          descricao,
          fotoAntes,
        })
        setEstado({ etapa: 'finalizar', tipo: 'patrimonio', manutencaoId: r.id, ambiente: estado.ambiente, bem: estado.bem })
      } else {
        if (!estado.ambiente) { setErro('Selecione o ambiente'); return }
        const r = await manutencao.iniciar.mutateAsync({
          tipo: estado.tipo,
          ambienteId: estado.ambiente.id,
          descricao,
          fotoAntes,
        })
        setEstado({
          etapa: 'finalizar',
          tipo: estado.tipo,
          manutencaoId: r.id,
          ambiente: estado.ambiente,
        })
      }
    } catch {
      setErro('Falha ao iniciar manutenção. Tente novamente.')
    }
  }

  async function handleFinalizar() {
    if (estado.etapa !== 'finalizar') return
    setErro(null)
    if (!fotoDepois) { setErro('Tire a foto do depois'); return }
    try {
      await manutencao.finalizar.mutateAsync({
        id: estado.manutencaoId,
        input: { fotoDepois, observacaoFinal: observacaoFinal.trim() || undefined },
      })
      setEstado({ etapa: 'concluida', tipo: estado.tipo })
    } catch {
      setErro('Falha ao finalizar. Tente novamente.')
    }
  }

  return (
    <div className="form-bg min-h-screen flex flex-col p-6">
      <div className="w-full max-w-2xl mx-auto flex-1 flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => {
              if (estado.etapa === 'ambientes' || estado.etapa === 'concluida') {
                router.push(`/${tenantSlug}/manutencao`)
              } else if (estado.etapa === 'tipo') {
                setEstado({ etapa: 'ambientes' })
              } else if (estado.etapa === 'iniciar' || estado.etapa === 'finalizar') {
                // Em iniciar/finalizar, voltar exige confirmação para evitar perder progresso
                if (confirm('Voltar agora descartará a foto e a descrição. Continuar?')) {
                  voltarAoInicio()
                }
              }
            }}
            className="flex items-center gap-2 text-gray-400 hover:text-dark transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <Text variant="body-sm" className="text-inherit">Voltar</Text>
          </button>
          <LogoutButton />
        </div>

        {/* Conteúdo */}
        {estado.etapa === 'ambientes' && (
          <TelaAmbientes
            search={searchAmbiente}
            setSearch={setSearchAmbiente}
            blocos={manutencao.blocosManutencao}
            carregando={manutencao.blocosCarregando}
            onSelecionar={(ambiente) => {
              resetCampos()
              setEstado({ etapa: 'tipo', ambiente })
            }}
          />
        )}

        {estado.etapa === 'tipo' && (
          <TelaTipo
            ambiente={estado.ambiente}
            onEscolher={(tipo) => {
              if (tipo === 'patrimonio') {
                setAbrirBemSelector(true)
              } else {
                setEstado({ etapa: 'iniciar', tipo, ambiente: estado.ambiente })
              }
            }}
          />
        )}

        {estado.etapa === 'iniciar' && (
          <TelaIniciar
            tipo={estado.tipo}
            ambiente={estado.ambiente}
            bem={estado.bem}
            descricao={descricao}
            setDescricao={setDescricao}
            subtipoPatrimonio={subtipoPatrimonio}
            setSubtipoPatrimonio={setSubtipoPatrimonio}
            subtipoCustom={subtipoCustom}
            setSubtipoCustom={setSubtipoCustom}
            foto={fotoAntes}
            setFoto={setFotoAntes}
            submitting={manutencao.iniciar.isPending}
            erro={erro}
            onIniciar={handleIniciar}
          />
        )}

        {estado.etapa === 'finalizar' && (
          <TelaFinalizar
            tipo={estado.tipo}
            ambiente={estado.ambiente}
            bem={estado.bem}
            foto={fotoDepois}
            setFoto={setFotoDepois}
            observacao={observacaoFinal}
            setObservacao={setObservacaoFinal}
            submitting={manutencao.finalizar.isPending}
            erro={erro}
            onFinalizar={handleFinalizar}
          />
        )}

        {estado.etapa === 'concluida' && (
          <TelaConcluida
            tipo={estado.tipo}
            onNovaManutencao={voltarAoInicio}
            voltarHref={`/${tenantSlug}/manutencao`}
          />
        )}
      </div>

      {abrirBemSelector && estado.etapa === 'tipo' && (
        <BemSelector
          ambienteNome={estado.ambiente.nome}
          blocoNome={estado.ambiente.blocoNome}
          onFechar={() => setAbrirBemSelector(false)}
          permitirSemSelecao={false}
          onSelecionar={(bem) => {
            setAbrirBemSelector(false)
            if (!bem) return
            // Re-checa o estado para garantir o ambiente (caso o usuário tenha voltado)
            setEstado((prev) => {
              if (prev.etapa !== 'tipo') return prev
              return {
                etapa: 'iniciar',
                tipo: 'patrimonio',
                ambiente: prev.ambiente,
                bem: {
                  trilogoAssetId: bem.id,
                  patrimony: bem.patrimony,
                  descricaoBem: bem.descricao,
                  assetTypeName: bem.assetTypeName,
                },
              }
            })
          }}
        />
      )}
    </div>
  )
}

// ── Telas ───────────────────────────────────────────────────────────────────

function TelaAmbientes({
  search, setSearch, blocos, carregando, onSelecionar,
}: {
  search: string
  setSearch: (v: string) => void
  blocos: { id: string; nome: string; ambientes: { id: string; nome: string }[] }[]
  carregando: boolean
  onSelecionar: (a: AmbienteSelecionado) => void
}) {
  const q = search.trim().toLowerCase()
  const blocosFiltrados = blocos
    .map((b) => ({
      ...b,
      ambientes: q
        ? b.ambientes.filter((amb) => amb.nome.toLowerCase().includes(q))
        : b.ambientes,
    }))
    .filter((b) => b.ambientes.length > 0)

  return (
    <>
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-dark mb-4">
          <Wrench className="w-8 h-8 text-white" />
        </div>
        <Text as="h1" variant="heading-lg" className="text-dark mb-1 block">
          Realizar Manutenção
        </Text>
        <Text variant="body-md" className="text-gray-300">
          Selecione o ambiente
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
          {carregando ? (
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
                      onClick={() => onSelecionar({ id: amb.id, nome: amb.nome, blocoNome: b.nome })}
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
  )
}

function TelaTipo({
  ambiente, onEscolher,
}: {
  ambiente: AmbienteSelecionado
  onEscolher: (tipo: TipoManutencao) => void
}) {
  const opcoes: { tipo: TipoManutencao; descricao: string }[] = [
    { tipo: 'eletrica',   descricao: 'Manutenção em pontos elétricos do ambiente' },
    { tipo: 'hidraulica', descricao: 'Manutenção em pontos hidráulicos do ambiente' },
    { tipo: 'patrimonio', descricao: 'Manutenção em bem patrimoniado deste ambiente' },
  ]

  return (
    <>
      <div className="mb-6 px-4 py-3 rounded-xl bg-white border border-gray-200 shadow-sm">
        <Text variant="caption" className="text-gray-300 uppercase tracking-wide font-semibold block">
          Ambiente selecionado
        </Text>
        <Text variant="body-md" className="text-dark block">
          {ambiente.nome}
          <span className="text-gray-300"> · {ambiente.blocoNome}</span>
        </Text>
      </div>

      <div className="text-center mb-6">
        <Text as="h2" variant="heading-md" className="text-dark mb-1 block">
          Tipo de manutenção
        </Text>
        <Text variant="body-sm" className="text-gray-300">
          O que será feito neste ambiente?
        </Text>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {opcoes.map(({ tipo, descricao }) => {
          const a = ACCENT[tipo]
          return (
            <button
              key={tipo}
              onClick={() => onEscolher(tipo)}
              className="group bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 p-6 flex flex-col text-left border-t-4"
              style={{ borderTopColor: a.bg }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ backgroundColor: a.bg }}
              >
                <a.Icon className="text-white w-6 h-6" />
              </div>
              <Text as="h2" variant="heading-sm" className="text-dark mb-1.5 block">{a.nome}</Text>
              <Text variant="body-sm" className="text-gray-300 block">{descricao}</Text>
            </button>
          )
        })}
      </div>
    </>
  )
}

function TelaIniciar({
  tipo, ambiente, bem, descricao, setDescricao,
  subtipoPatrimonio, setSubtipoPatrimonio, subtipoCustom, setSubtipoCustom,
  foto, setFoto, submitting, erro, onIniciar,
}: {
  tipo: TipoManutencao
  ambiente?: AmbienteSelecionado
  bem?: BemSelecionadoEstado
  descricao: string
  setDescricao: (v: string) => void
  subtipoPatrimonio: string
  setSubtipoPatrimonio: (v: string) => void
  subtipoCustom: string
  setSubtipoCustom: (v: string) => void
  foto: string | null
  setFoto: (v: string | null) => void
  submitting: boolean
  erro: string | null
  onIniciar: () => void
}) {
  const a = ACCENT[tipo]
  const sugestoesSubtipo = tipo === 'patrimonio' && bem ? getSugestoes(bem.assetTypeName) : []
  return (
    <Card shadow="md">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: a.bg }}>
          <a.Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <Text as="h2" variant="heading-sm" className="text-dark block">Iniciar manutenção</Text>
          <Text variant="body-sm" className="text-gray-300 block">Registre o estado antes</Text>
        </div>
      </div>

      {ambiente && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200">
          <Text variant="caption" className="text-gray-300 uppercase tracking-wide font-semibold block">
            Ambiente
          </Text>
          <Text variant="body-md" className="text-dark block">
            {ambiente.nome}
            <span className="text-gray-300"> · {ambiente.blocoNome}</span>
          </Text>
        </div>
      )}

      {bem && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-purple-50 border border-purple-200">
          <Text variant="caption" className="text-purple-600 uppercase tracking-wide font-semibold block">
            Patrimônio · {bem.patrimony}
          </Text>
          <Text variant="body-md" className="text-dark block">{bem.descricaoBem}</Text>
        </div>
      )}

      <div className="space-y-4">
        {tipo === 'patrimonio' && (
          <div>
            <Text variant="caption" className="text-gray-400 uppercase tracking-wide font-semibold block mb-1.5">
              Tipo de manutenção *
            </Text>
            <select
              value={subtipoPatrimonio}
              onChange={(e) => { setSubtipoPatrimonio(e.target.value); setSubtipoCustom('') }}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-sans text-dark focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
            >
              <option value="">Selecione o tipo...</option>
              {sugestoesSubtipo.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
              <option value="__outro__">Outro (digitar)</option>
            </select>
            {subtipoPatrimonio === '__outro__' && (
              <input
                type="text"
                value={subtipoCustom}
                onChange={(e) => setSubtipoCustom(e.target.value)}
                placeholder="Descreva o tipo de manutenção..."
                autoFocus
                className="mt-2 w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-sans text-dark focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white placeholder:text-gray-300"
              />
            )}
          </div>
        )}

        <div>
          <Text variant="caption" className="text-gray-400 uppercase tracking-wide font-semibold block mb-1.5">
            O que será feito
          </Text>
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Descreva o problema e o que será feito"
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-sans text-dark focus:outline-none focus:ring-2 focus:ring-red-base bg-white placeholder:text-gray-300 resize-none"
          />
        </div>

        <FotoCapture
          label="Foto do antes"
          hint="Obrigatória para iniciar"
          valor={foto}
          onChange={setFoto}
          accent="amber"
        />

        {erro && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-sm text-red-600 font-sans">{erro}</p>
          </div>
        )}

        <Button onClick={onIniciar} disabled={submitting} className="w-full">
          {submitting ? 'Iniciando...' : 'Iniciar manutenção'}
        </Button>
      </div>
    </Card>
  )
}

function TelaFinalizar({
  tipo, ambiente, bem, foto, setFoto, observacao, setObservacao, submitting, erro, onFinalizar,
}: {
  tipo: TipoManutencao
  ambiente?: AmbienteSelecionado
  bem?: BemSelecionadoEstado
  foto: string | null
  setFoto: (v: string | null) => void
  observacao: string
  setObservacao: (v: string) => void
  submitting: boolean
  erro: string | null
  onFinalizar: () => void
}) {
  const a = ACCENT[tipo]
  return (
    <Card shadow="md">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: a.bg }}>
          <a.Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <Text as="h2" variant="heading-sm" className="text-dark block">Finalizar manutenção</Text>
          <Text variant="body-sm" className="text-gray-300 block">Registre o estado depois</Text>
        </div>
      </div>

      {ambiente && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200">
          <Text variant="caption" className="text-gray-300 uppercase tracking-wide font-semibold block">
            Ambiente
          </Text>
          <Text variant="body-md" className="text-dark block">
            {ambiente.nome}
            <span className="text-gray-300"> · {ambiente.blocoNome}</span>
          </Text>
        </div>
      )}

      {bem && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-purple-50 border border-purple-200">
          <Text variant="caption" className="text-purple-600 uppercase tracking-wide font-semibold block">
            Patrimônio · {bem.patrimony}
          </Text>
          <Text variant="body-md" className="text-dark block">{bem.descricaoBem}</Text>
        </div>
      )}

      <div className="space-y-4">
        <FotoCapture
          label="Foto do depois"
          hint="Obrigatória para concluir"
          valor={foto}
          onChange={setFoto}
          accent="green"
        />

        <div>
          <Text variant="caption" className="text-gray-400 uppercase tracking-wide font-semibold block mb-1.5">
            Observação final (opcional)
          </Text>
          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Detalhes do que foi feito"
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-sans text-dark focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white placeholder:text-gray-300 resize-none"
          />
        </div>

        {erro && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-sm text-red-600 font-sans">{erro}</p>
          </div>
        )}

        <Button onClick={onFinalizar} disabled={submitting} variant="success" className="w-full">
          {submitting ? 'Finalizando...' : 'Finalizar manutenção'}
        </Button>
      </div>
    </Card>
  )
}

function TelaConcluida({
  tipo, onNovaManutencao, voltarHref,
}: {
  tipo: TipoManutencao
  onNovaManutencao: () => void
  voltarHref: string
}) {
  const a = ACCENT[tipo]
  return (
    <Card shadow="md" className="text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-100 mb-4">
        <CheckCircle className="w-8 h-8 text-emerald-600" />
      </div>
      <Text as="h2" variant="heading-md" className="text-dark mb-1 block">
        Manutenção concluída
      </Text>
      <Text variant="body-md" className={`${a.texto} block mb-6`}>{a.nome}</Text>

      <div className="space-y-2 max-w-xs mx-auto">
        <Button onClick={onNovaManutencao} className="w-full">
          Realizar outra manutenção
        </Button>
        <Link href={voltarHref} className="block">
          <Button variant="outline" className="w-full">
            Voltar ao painel
          </Button>
        </Link>
      </div>
    </Card>
  )
}
