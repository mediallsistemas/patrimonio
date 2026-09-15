import { describe, expect, it } from 'vitest'

import { COLUNAS_AGENDAMENTOS_PDF, linhaAgendamentoPdf } from './pdf-export'

const base = {
  patrimony: 'PAT-001',
  descricaoBem: 'Ar-condicionado Split',
  ambiente: 'UTI 1',
  titulo: 'Preventiva',
  dataAgendada: '2026-09-10T12:00:00.000Z',
  dataRealizada: null,
  observacao: null,
  status: 'pendente',
  criadoPor: { nome: 'Maria' },
}

describe('linhaAgendamentoPdf', () => {
  it('pendente com data passada sai como Atrasado', () => {
    expect(linhaAgendamentoPdf(base, '2026-09-14').status).toBe('Atrasado')
  })

  it('pendente com data hoje ou futura sai como Agendado', () => {
    expect(linhaAgendamentoPdf(base, '2026-09-10').status).toBe('Agendado')
    expect(linhaAgendamentoPdf(base, '2026-09-01').status).toBe('Agendado')
  })

  it('realizado nunca sai como Atrasado e mostra a data de realização', () => {
    const linha = linhaAgendamentoPdf(
      { ...base, status: 'realizado', dataRealizada: '2026-09-12T12:00:00.000Z' },
      '2026-09-14',
    )
    expect(linha.status).toBe('Realizado')
    expect(linha.dataRealizada).toBe('12/09/2026')
  })

  it('preenche campos vazios com travessão e cobre todas as colunas', () => {
    const linha = linhaAgendamentoPdf(base, '2026-09-14')
    expect(linha.dataAgendada).toBe('10/09/2026')
    expect(linha.dataRealizada).toBe('—')
    expect(linha.observacao).toBe('—')
    expect(linha.responsavel).toBe('Maria')
    for (const coluna of COLUNAS_AGENDAMENTOS_PDF) {
      expect(linha).toHaveProperty(coluna.key)
    }
  })
})
