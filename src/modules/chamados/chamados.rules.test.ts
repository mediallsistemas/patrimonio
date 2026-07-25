import { describe, it, expect } from 'vitest'

import {
  ehAdmin,
  podeEscrever,
  podeCriar,
  podeAtribuir,
  podeCancelar,
  podeEditarFiscal,
  transicaoValida,
  estaAtrasado,
  sanitizarParaRole,
} from './chamados.rules'
import type { StatusChamado } from './chamados.types'

describe('chamados.rules — permissões por role', () => {
  it('admin: tenant_admin e super_admin', () => {
    expect(ehAdmin('tenant_admin')).toBe(true)
    expect(ehAdmin('super_admin')).toBe(true)
    expect(ehAdmin('operator')).toBe(false)
    expect(ehAdmin('operator_patrimonio')).toBe(false)
    expect(ehAdmin('viewer')).toBe(false)
  })

  it('viewer nunca escreve', () => {
    expect(podeEscrever('viewer')).toBe(false)
    expect(podeAtribuir('viewer')).toBe(false)
    expect(podeCancelar('viewer')).toBe(false)
    expect(podeEditarFiscal('viewer')).toBe(false)
  })

  it('operadores escrevem mas não atribuem/cancelam/editam fiscal', () => {
    for (const role of ['operator', 'operator_patrimonio'] as const) {
      expect(podeEscrever(role)).toBe(true)
      expect(podeAtribuir(role)).toBe(false)
      expect(podeCancelar(role)).toBe(false)
      expect(podeEditarFiscal(role)).toBe(false)
    }
  })

  it('admins têm todas as permissões', () => {
    for (const role of ['tenant_admin', 'super_admin'] as const) {
      expect(podeEscrever(role)).toBe(true)
      expect(podeAtribuir(role)).toBe(true)
      expect(podeCancelar(role)).toBe(true)
      expect(podeEditarFiscal(role)).toBe(true)
    }
  })

  it('criar chamado: admins e operator_patrimonio sim; operator não', () => {
    expect(podeCriar('super_admin')).toBe(true)
    expect(podeCriar('tenant_admin')).toBe(true)
    expect(podeCriar('operator_patrimonio')).toBe(true)
    // operator opera (assume/finaliza) mas NÃO abre chamado
    expect(podeCriar('operator')).toBe(false)
    expect(podeCriar('viewer')).toBe(false)
    expect(podeCriar('operator_forms')).toBe(false)
  })

  it('operator escreve (opera) mas não cria — as duas permissões são distintas', () => {
    expect(podeEscrever('operator')).toBe(true)
    expect(podeCriar('operator')).toBe(false)
  })
})

describe('chamados.rules — transições de status', () => {
  it('aberto pode ir para em_execucao, finalizado e cancelado', () => {
    expect(transicaoValida('aberto', 'em_execucao')).toBe(true)
    expect(transicaoValida('aberto', 'finalizado')).toBe(true)
    expect(transicaoValida('aberto', 'cancelado')).toBe(true)
  })

  it('em_execucao pode ir para finalizado e cancelado, não volta para aberto', () => {
    expect(transicaoValida('em_execucao', 'finalizado')).toBe(true)
    expect(transicaoValida('em_execucao', 'cancelado')).toBe(true)
    expect(transicaoValida('em_execucao', 'aberto')).toBe(false)
  })

  it('finalizado e cancelado são terminais', () => {
    const destinos: StatusChamado[] = ['aberto', 'em_execucao', 'finalizado', 'cancelado']
    for (const para of destinos) {
      expect(transicaoValida('finalizado', para)).toBe(false)
      expect(transicaoValida('cancelado', para)).toBe(false)
    }
  })
})

describe('chamados.rules — atraso derivado', () => {
  const agora = new Date('2026-07-22T12:00:00Z')
  const ontem = new Date('2026-07-21T12:00:00Z')
  const amanha = new Date('2026-07-23T12:00:00Z')

  it('aberto/em_execucao com prazo vencido está atrasado', () => {
    expect(estaAtrasado({ status: 'aberto', prazo: ontem }, agora)).toBe(true)
    expect(estaAtrasado({ status: 'em_execucao', prazo: ontem }, agora)).toBe(true)
  })

  it('prazo futuro nunca está atrasado', () => {
    expect(estaAtrasado({ status: 'aberto', prazo: amanha }, agora)).toBe(false)
    expect(estaAtrasado({ status: 'em_execucao', prazo: amanha }, agora)).toBe(false)
  })

  it('finalizado/cancelado nunca estão atrasados, mesmo com prazo vencido', () => {
    expect(estaAtrasado({ status: 'finalizado', prazo: ontem }, agora)).toBe(false)
    expect(estaAtrasado({ status: 'cancelado', prazo: ontem }, agora)).toBe(false)
  })

  it('exatamente no prazo não está atrasado (limite)', () => {
    expect(estaAtrasado({ status: 'aberto', prazo: agora }, agora)).toBe(false)
  })
})

describe('chamados.rules — sanitização de campos fiscais', () => {
  const chamado = {
    id: 'x',
    titulo: 'Trocar lâmpada',
    fornecedor: 'MEGA',
    numeroOrdemCompra: 'OC-123',
    valorGastoCentavos: 15000,
  }

  it('admin vê os campos fiscais', () => {
    for (const role of ['tenant_admin', 'super_admin'] as const) {
      const r = sanitizarParaRole(chamado, role)
      expect(r).toHaveProperty('fornecedor', 'MEGA')
      expect(r).toHaveProperty('valorGastoCentavos', 15000)
    }
  })

  it('não-admin NUNCA recebe campos fiscais', () => {
    for (const role of ['operator', 'operator_patrimonio', 'operator_forms', 'viewer'] as const) {
      const r = sanitizarParaRole(chamado, role)
      expect(r).not.toHaveProperty('fornecedor')
      expect(r).not.toHaveProperty('numeroOrdemCompra')
      expect(r).not.toHaveProperty('valorGastoCentavos')
      // demais campos preservados
      expect(r).toHaveProperty('titulo', 'Trocar lâmpada')
    }
  })
})
