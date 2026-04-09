// Auth tables (tenants, usuarios) live in the same DB as the operational tables.
// This file exists so auth-specific code can import prismaAuth without coupling
// to the main prisma client directly — ready for Phase 3 (DB separation).
export { prisma as prismaAuth } from './db'
