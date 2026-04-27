import { format, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Ronda } from '@/services/rondas.types'

export interface GrupoRonda {
  label: string
  rondas: Ronda[]
}

export interface OcorrenciaFlat {
  id: string
  tipo: string
  descricao: string
  foto: string | null
  trilogoChamado: boolean
  bemPatrimony: string | null
  bemDescricao: string | null
  ambienteNome: string
  ambienteId: string
  ambienteConcluidoEm: string
  rondaId: string
  rondaIniciadoEm: string
  tenantNome: string
  criadoPorNome: string | null
}

export function desnormalizarOcorrencias(rondas: Ronda[]): OcorrenciaFlat[] {
  const result: OcorrenciaFlat[] = []

  for (const ronda of rondas) {
    for (const amb of ronda.ambientes) {
      if (!amb.temOcorrencia) continue
      for (const oc of amb.ocorrencias) {
        result.push({
          id: oc.id,
          tipo: oc.tipo,
          descricao: oc.descricao,
          foto: oc.foto,
          trilogoChamado: oc.trilogoChamado,
          bemPatrimony: oc.bemPatrimony,
          bemDescricao: oc.bemDescricao,
          ambienteNome: amb.ambiente,
          ambienteId: amb.id,
          ambienteConcluidoEm: amb.concluidoEm,
          rondaId: ronda.id,
          rondaIniciadoEm: ronda.iniciadoEm,
          tenantNome: ronda.tenant?.nome ?? '—',
          criadoPorNome: ronda.criadoPor?.nome ?? null,
        })
      }
    }
  }

  return result
}

export function agruparPorData(rondas: Ronda[]): GrupoRonda[] {
  const hoje = new Date()
  const ontem = new Date(hoje)
  ontem.setDate(ontem.getDate() - 1)

  const buckets = new Map<string, Ronda[]>()

  for (const r of rondas) {
    const d = new Date(r.iniciadoEm)
    let key: string
    if (isSameDay(d, hoje)) key = 'Hoje'
    else if (isSameDay(d, ontem)) key = 'Ontem'
    else key = format(d, 'dd/MM/yyyy', { locale: ptBR })

    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key)!.push(r)
  }

  return Array.from(buckets.entries()).map(([label, rondas]) => ({ label, rondas }))
}
