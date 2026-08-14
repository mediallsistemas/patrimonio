'use client'

import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Upload, Download, Trash2, Paperclip, FileText, ImageIcon, Loader2 } from 'lucide-react'
import * as anexosService from '@/services/anexos-bens.service'
import {
  ACCEPT_ANEXO,
  MAX_ARQUIVO_BYTES,
  MAX_TOTAL_POR_BEM_BYTES,
  ROTULO_MIME,
  ehMimePermitido,
  formatarBytes,
} from '@/modules/anexos-bens/anexos-bens.types'
import type { AnexoBem } from '@/services/anexos-bens.service'
import type { Asset } from '../bens.types'

interface Props {
  asset: Asset
  anexos: AnexoBem[]
  onClose: () => void
}

// data:...;base64,XXXX → XXXX
function lerArquivoBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result ?? '')
      const virgula = result.indexOf(',')
      resolve(virgula >= 0 ? result.slice(virgula + 1) : result)
    }
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo'))
    reader.readAsDataURL(file)
  })
}

// O 413 vem da plataforma (corpo acima do teto de request), antes da rota, e
// chega sem JSON — o wrapper de api transforma em "HTTP 413". Sem isto o
// usuário veria um código solto no lugar do motivo.
function mensagemDeErro(e: unknown): string {
  const bruto = e instanceof Error ? e.message : ''
  if (bruto.includes('413')) {
    return `Arquivo grande demais para o envio. O limite é ${formatarBytes(MAX_ARQUIVO_BYTES)} por anexo.`
  }
  return bruto || 'Falha ao processar o anexo.'
}

function baixarBase64(nome: string, mimeType: string, base64: string) {
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  const url = URL.createObjectURL(new Blob([bytes], { type: mimeType }))
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function ModalAnexos({ asset, anexos, onClose }: Props) {
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)

  const [arquivo, setArquivo] = useState<File | null>(null)
  const [descricao, setDescricao] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState<string | null>(null)
  const [baixando, setBaixando] = useState<string | null>(null)

  const usados = anexos.reduce((soma, a) => soma + a.tamanhoBytes, 0)
  const livre = Math.max(0, MAX_TOTAL_POR_BEM_BYTES - usados)
  const percentual = Math.min(100, (usados / MAX_TOTAL_POR_BEM_BYTES) * 100)

  function invalidar() {
    queryClient.invalidateQueries({ queryKey: ['anexos-bens'] })
  }

  const upload = useMutation({
    mutationFn: async () => {
      if (!arquivo) throw new Error('Selecione um arquivo')
      const mimeType = arquivo.type
      if (!ehMimePermitido(mimeType)) throw new Error('Tipo de arquivo não permitido')
      const conteudo = await lerArquivoBase64(arquivo)
      return anexosService.criar({
        trilogoAssetId: asset.id,
        patrimony: asset.patrimony,
        companyId: asset.companyId,
        nome: arquivo.name.slice(0, 180),
        mimeType,
        descricao: descricao.trim() || undefined,
        conteudo,
      })
    },
    onSuccess: () => {
      setArquivo(null)
      setDescricao('')
      setErro(null)
      if (inputRef.current) inputRef.current.value = ''
      invalidar()
    },
    onError: (e: unknown) => setErro(mensagemDeErro(e)),
  })

  const remocao = useMutation({
    mutationFn: (id: string) => anexosService.remover(id),
    onSuccess: () => { setConfirmando(null); invalidar() },
    onError: (e: unknown) => { setConfirmando(null); setErro(mensagemDeErro(e)) },
  })

  function selecionar(file: File | null) {
    setErro(null)
    if (!file) { setArquivo(null); return }
    if (!ehMimePermitido(file.type)) {
      setArquivo(null)
      setErro('Tipo de arquivo não permitido. Use imagem, PDF, Word, Excel, TXT ou CSV.')
      return
    }
    // Validação idêntica à do servidor, aqui só para não gastar o upload.
    if (file.size > MAX_ARQUIVO_BYTES) {
      setArquivo(null)
      setErro(`Arquivo de ${formatarBytes(file.size)} — o limite é ${formatarBytes(MAX_ARQUIVO_BYTES)} por anexo.`)
      return
    }
    if (file.size > livre) {
      setArquivo(null)
      setErro(`Espaço insuficiente neste bem. Livre: ${formatarBytes(livre)}.`)
      return
    }
    setArquivo(file)
  }

  async function baixar(anexo: AnexoBem) {
    setErro(null)
    setBaixando(anexo.id)
    try {
      const completo = await anexosService.buscarConteudo(anexo.id)
      baixarBase64(completo.nome, completo.mimeType, completo.conteudo)
    } catch {
      setErro('Não foi possível baixar o anexo.')
    } finally {
      setBaixando(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
          <div className="min-w-0">
            <h2 className="font-semibold text-gray-800">Anexos do bem</h2>
            <p className="text-xs text-gray-500 truncate">
              <span className="font-mono text-purple-600">{asset.patrimony}</span> · {asset.description}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0 ml-3">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto">

          {/* Cota do bem */}
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{anexos.length} anexo(s) · {formatarBytes(usados)} usados</span>
              <span>Limite {formatarBytes(MAX_TOTAL_POR_BEM_BYTES)} por bem</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${percentual > 90 ? 'bg-red-400' : 'bg-purple-500'}`}
                style={{ width: `${percentual}%` }}
              />
            </div>
          </div>

          {/* Envio */}
          <div className="border border-dashed border-gray-200 rounded-xl p-4 space-y-3">
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT_ANEXO}
              onChange={e => selecionar(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-600 hover:file:bg-purple-100"
            />
            <input
              type="text"
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              maxLength={500}
              placeholder="Descrição (opcional) — ex.: nota fiscal, manual, laudo"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-gray-400">
                Até {formatarBytes(MAX_ARQUIVO_BYTES)} por arquivo · imagem, PDF, Word, Excel, TXT ou CSV
              </p>
              <button
                onClick={() => upload.mutate()}
                disabled={!arquivo || upload.isPending}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-40 whitespace-nowrap"
              >
                {upload.isPending ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {upload.isPending ? 'Enviando...' : 'Anexar'}
              </button>
            </div>
            {arquivo && (
              <p className="text-xs text-gray-500 truncate">
                Selecionado: <span className="text-gray-700">{arquivo.name}</span> ({formatarBytes(arquivo.size)})
              </p>
            )}
          </div>

          {erro && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{erro}</p>
          )}

          {/* Lista */}
          {anexos.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Paperclip size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum anexo neste bem.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {anexos.map(anexo => (
                <li key={anexo.id} className="flex items-center gap-3 border border-gray-100 rounded-xl px-3 py-2.5">
                  <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 text-gray-400">
                    {anexo.mimeType.startsWith('image/') ? <ImageIcon size={16} /> : <FileText size={16} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 truncate">{anexo.nome}</p>
                    {anexo.descricao && <p className="text-xs text-gray-500 truncate">{anexo.descricao}</p>}
                    <p className="text-xs text-gray-400">
                      {ROTULO_MIME[anexo.mimeType] ?? 'Arquivo'} · {formatarBytes(anexo.tamanhoBytes)} ·{' '}
                      {new Date(anexo.criadoEm).toLocaleDateString('pt-BR')} · {anexo.criadoPor.nome}
                    </p>
                  </div>
                  <button
                    onClick={() => baixar(anexo)}
                    disabled={baixando === anexo.id}
                    title="Baixar"
                    className="p-2 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors disabled:opacity-40"
                  >
                    {baixando === anexo.id ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                  </button>
                  {confirmando === anexo.id ? (
                    <button
                      onClick={() => remocao.mutate(anexo.id)}
                      disabled={remocao.isPending}
                      className="px-2 py-1.5 rounded-lg text-xs font-medium text-white bg-red-500 hover:bg-red-600 transition-colors whitespace-nowrap disabled:opacity-40"
                    >
                      Confirmar
                    </button>
                  ) : (
                    <button
                      onClick={() => { setErro(null); setConfirmando(anexo.id) }}
                      title="Remover"
                      className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
