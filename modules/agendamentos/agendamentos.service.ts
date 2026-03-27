import { prisma } from '@/lib/db'
import type { CreateAgendamentoInput, UpdateAgendamentoInput } from './agendamentos.types'

export async function listarAgendamentos() {
  try {
    return await prisma.agendamentoManutencao.findMany({
      where: { status: { not: 'cancelado' } },
      orderBy: { dataAgendada: 'asc' },
    })
  } catch (error) {
    console.error('[agendamentos.service] listarAgendamentos:', error)
    throw error
  }
}

export async function buscarAgendamento(id: string) {
  try {
    return await prisma.agendamentoManutencao.findUnique({ where: { id } })
  } catch (error) {
    console.error('[agendamentos.service] buscarAgendamento:', error)
    throw error
  }
}

export async function criarAgendamento(input: CreateAgendamentoInput, criadoPorId: string) {
  try {
    return await prisma.agendamentoManutencao.create({
      data: {
        trilogoAssetId: input.trilogoAssetId,
        patrimony: input.patrimony,
        descricaoBem: input.descricaoBem,
        companyId: input.companyId,
        companyName: input.companyName,
        ambiente: input.ambiente,
        dataAgendada: new Date(input.dataAgendada),
        titulo: input.titulo,
        observacao: input.observacao ?? null,
        criadoPorId,
      },
    })
  } catch (error) {
    console.error('[agendamentos.service] criarAgendamento:', error)
    throw error
  }
}

export async function atualizarStatusAgendamento(
  id: string,
  input: UpdateAgendamentoInput,
  atualizadoPorId: string,
) {
  try {
    return await prisma.agendamentoManutencao.update({
      where: { id },
      data: {
        status: input.status,
        atualizadoPorId,
        ...(input.dataRealizada ? { dataRealizada: new Date(input.dataRealizada) } : {}),
      },
    })
  } catch (error) {
    console.error('[agendamentos.service] atualizarStatusAgendamento:', error)
    throw error
  }
}
