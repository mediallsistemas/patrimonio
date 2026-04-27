import { PrismaClient } from '@prisma/client'

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

export const prisma = global.__prisma ?? new PrismaClient()

// Cache singleton em todos os ambientes: evita múltiplas instâncias
// em hot-reload (dev) e recargas de módulo (prod/PM2)
global.__prisma = prisma
