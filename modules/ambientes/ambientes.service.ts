import { prisma } from '@/lib/db'
import type { CreateAmbienteInput } from './ambientes.types'

export async function listarAmbientes(tenantId: string) {
  try {
    return await prisma.ambienteTenant.findMany({
      where: { tenantId, ativo: true },
      orderBy: [{ ordem: 'asc' }, { nome: 'asc' }],
      select: { id: true, nome: true, ordem: true, tipo: true },
    })
  } catch (error) {
    console.error('[ambientes.service] listarAmbientes:', error)
    throw error
  }
}

export async function criarAmbiente(tenantId: string, input: CreateAmbienteInput) {
  try {
    return await prisma.ambienteTenant.create({
      data: {
        tenantId,
        nome: input.nome,
        ordem: input.ordem ?? 0,
        tipo: input.tipo,
      },
    })
  } catch (error) {
    console.error('[ambientes.service] criarAmbiente:', error)
    throw error
  }
}
