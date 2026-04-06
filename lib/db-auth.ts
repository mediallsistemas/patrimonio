import { PrismaClient } from '@prisma/client'

declare global {
  // eslint-disable-next-line no-var
  var __prismaAuth: PrismaClient | undefined
}

// Cliente dedicado ao banco de autenticação centralizado (Multi_UnidadesDB).
// Usado exclusivamente por modules/auth/auth.service.ts — nunca para dados operacionais.
export const prismaAuth = global.__prismaAuth ?? new PrismaClient({
  datasources: {
    db: { url: process.env.AUTH_DATABASE_URL },
  },
})

global.__prismaAuth = prismaAuth
