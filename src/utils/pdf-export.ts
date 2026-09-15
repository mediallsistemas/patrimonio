import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'

import { SITUACAO_AGENDAMENTO_LABEL, hojeIso, situacaoAgendamento } from '@/modules/agendamentos/agendamentos.rules'

export interface ColunaPdf {
  header: string
  key: string
}

export interface ExportarTabelaPdfInput {
  titulo: string
  subtitulo?: string
  colunas: ColunaPdf[]
  linhas: Record<string, string | number>[]
  nomeArquivo: string
}

export function exportarTabelaPdf({
  titulo,
  subtitulo,
  colunas,
  linhas,
  nomeArquivo,
}: ExportarTabelaPdfInput): void {
  const doc = new jsPDF({ orientation: 'landscape' })

  doc.setFontSize(14)
  doc.text(titulo, 14, 15)

  // Subtítulo quebra em linhas quando não cabe (ex.: lista de filtros aplicados);
  // com uma linha só, o layout é o mesmo de sempre.
  let startY = 22
  if (subtitulo) {
    doc.setFontSize(10)
    doc.setTextColor(120)
    const linhasSubtitulo: string[] = doc.splitTextToSize(subtitulo, doc.internal.pageSize.getWidth() - 28)
    doc.text(linhasSubtitulo, 14, 21)
    startY = 26 + (linhasSubtitulo.length - 1) * 5
  }

  autoTable(doc, {
    startY,
    head: [colunas.map((c) => c.header)],
    body: linhas.map((linha) => colunas.map((c) => String(linha[c.key] ?? '—'))),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [79, 70, 229] },
    alternateRowStyles: { fillColor: [248, 249, 251] },
  })

  doc.save(nomeArquivo)
}

// ── Rondas ────────────────────────────────────────────────────────────────────

export const COLUNAS_RONDAS_PDF: ColunaPdf[] = [
  { header: 'Data/Hora', key: 'dataHora' },
  { header: 'Duração', key: 'duracao' },
  { header: 'Ambientes', key: 'ambientes' },
  { header: 'Ocorrências', key: 'ocorrencias' },
  { header: 'Responsável', key: 'responsavel' },
  { header: 'Status', key: 'status' },
]

export const COLUNAS_RONDAS_ADMIN_PDF: ColunaPdf[] = [
  { header: 'Unidade', key: 'unidade' },
  ...COLUNAS_RONDAS_PDF,
]

interface RondaParaPdf {
  iniciadoEm: string
  finalizadoEm: string | null
  ambientes: { temOcorrencia: boolean }[]
  criadoPor?: { nome: string }
  tenant?: { nome: string }
}

export function linhaRondaPdf(r: RondaParaPdf): Record<string, string | number> {
  const emAndamento = r.finalizadoEm === null
  const totalOcs = r.ambientes.filter((a) => a.temOcorrencia).length
  const duracao = !emAndamento && r.finalizadoEm
    ? Math.round((new Date(r.finalizadoEm).getTime() - new Date(r.iniciadoEm).getTime()) / 60000)
    : null

  return {
    unidade: r.tenant?.nome ?? '—',
    dataHora: format(new Date(r.iniciadoEm), 'dd/MM/yyyy HH:mm'),
    duracao: duracao !== null ? `${duracao} min` : '—',
    ambientes: r.ambientes.length,
    ocorrencias: totalOcs,
    responsavel: r.criadoPor?.nome ?? '—',
    status: emAndamento ? 'Em andamento' : totalOcs > 0 ? 'Com ocorrências' : 'Conforme',
  }
}

// ── Manutenções ──────────────────────────────────────────────────────────────

export const COLUNAS_MANUTENCOES_PDF: ColunaPdf[] = [
  { header: 'Tipo', key: 'tipo' },
  { header: 'Local/Bem', key: 'local' },
  { header: 'Data/Hora', key: 'dataHora' },
  { header: 'Duração', key: 'duracao' },
  { header: 'Responsável', key: 'responsavel' },
  { header: 'Status', key: 'status' },
]

const TIPO_MANUTENCAO_LABEL: Record<string, string> = {
  eletrica: 'Elétrica',
  hidraulica: 'Hidráulica',
  predial: 'Predial',
  patrimonio: 'Patrimônio',
}

interface ManutencaoParaPdf {
  tipo: string
  /** Preenchido só no relatório cross-tenant do admin. */
  tenant?: { nome: string }
  status: string
  ambienteNomeSnapshot: string | null
  patrimony: string | null
  descricaoBemSnapshot: string | null
  iniciadaEm: string
  finalizadaEm: string | null
  criadoPor: { nome: string }
}

export function linhaManutencaoPdf(m: ManutencaoParaPdf): Record<string, string | number> {
  const emAndamento = m.status === 'em_andamento'
  const duracao = !emAndamento && m.finalizadaEm
    ? Math.round((new Date(m.finalizadaEm).getTime() - new Date(m.iniciadaEm).getTime()) / 60000)
    : null
  const local = m.tipo === 'patrimonio'
    ? (m.descricaoBemSnapshot ?? m.patrimony ?? 'Bem')
    : (m.ambienteNomeSnapshot ?? 'Ambiente')

  return {
    // A coluna Unidade só existe em COLUNAS_MANUTENCOES_ADMIN_PDF; nas demais a
    // chave sobra e é ignorada pelo gerador, que monta a linha pelas colunas.
    unidade: m.tenant?.nome ?? '—',
    tipo: TIPO_MANUTENCAO_LABEL[m.tipo] ?? m.tipo,
    local,
    dataHora: format(new Date(m.iniciadaEm), 'dd/MM/yyyy HH:mm'),
    duracao: duracao !== null ? `${duracao} min` : '—',
    responsavel: m.criadoPor.nome,
    status: emAndamento ? 'Em andamento' : 'Concluída',
  }
}

// Mesmo relatório, com a unidade na frente — o painel do admin atravessa tenants.
export const COLUNAS_MANUTENCOES_ADMIN_PDF: ColunaPdf[] = [
  { header: 'Unidade', key: 'unidade' },
  ...COLUNAS_MANUTENCOES_PDF,
]

// ── Agendamentos de manutenção ───────────────────────────────────────────────

export const COLUNAS_AGENDAMENTOS_PDF: ColunaPdf[] = [
  { header: 'Data agendada', key: 'dataAgendada' },
  { header: 'Patrimônio', key: 'patrimonio' },
  { header: 'Bem', key: 'bem' },
  { header: 'Ambiente', key: 'ambiente' },
  { header: 'Título', key: 'titulo' },
  { header: 'Status', key: 'status' },
  { header: 'Realizado em', key: 'dataRealizada' },
  { header: 'Agendado por', key: 'responsavel' },
  { header: 'Observação', key: 'observacao' },
]

interface AgendamentoParaPdf {
  patrimony: string
  descricaoBem: string
  ambiente: string
  titulo: string
  dataAgendada: string
  dataRealizada: string | null
  observacao: string | null
  status: string
  criadoPor: { nome: string }
}

/** `hojeStr` (yyyy-MM-dd) define o atraso — ver `situacaoAgendamento`. */
export function linhaAgendamentoPdf(
  ag: AgendamentoParaPdf,
  hojeStr: string = hojeIso(),
): Record<string, string | number> {
  return {
    dataAgendada: format(new Date(ag.dataAgendada), 'dd/MM/yyyy'),
    patrimonio: ag.patrimony,
    bem: ag.descricaoBem,
    ambiente: ag.ambiente,
    titulo: ag.titulo,
    status: SITUACAO_AGENDAMENTO_LABEL[situacaoAgendamento(ag, hojeStr)],
    dataRealizada: ag.dataRealizada ? format(new Date(ag.dataRealizada), 'dd/MM/yyyy') : '—',
    responsavel: ag.criadoPor.nome,
    observacao: ag.observacao || '—',
  }
}

// ── Inspeções de gases ───────────────────────────────────────────────────────

export const COLUNAS_INSPECOES_PDF: ColunaPdf[] = [
  { header: 'Data/Hora', key: 'dataHora' },
  { header: 'Duração', key: 'duracao' },
  { header: 'Ambientes', key: 'ambientes' },
  { header: 'Ocorrências', key: 'ocorrencias' },
  { header: 'Status', key: 'status' },
]

interface RodadaParaPdf {
  iniciadoEm: string
  finalizadoEm: string | null
  ambientes: { temAlteracao: boolean }[]
}

export function linhaRodadaPdf(r: RodadaParaPdf): Record<string, string | number> {
  const totalOcs = r.ambientes.filter((a) => a.temAlteracao).length
  const duracao = r.finalizadoEm
    ? Math.round((new Date(r.finalizadoEm).getTime() - new Date(r.iniciadoEm).getTime()) / 60000)
    : null

  return {
    dataHora: format(new Date(r.iniciadoEm), 'dd/MM/yyyy HH:mm'),
    duracao: duracao !== null ? `${duracao} min` : '—',
    ambientes: r.ambientes.length,
    ocorrencias: totalOcs,
    status: totalOcs > 0 ? 'Com ocorrências' : 'Normal',
  }
}
