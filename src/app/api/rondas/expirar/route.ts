import { NextResponse } from 'next/server'
import { expirarRondasAbertas } from '@/modules/rondas/rondas.service'
import { timingSafeEqual } from '@/lib/crypto-utils'

const CRON_SECRET = process.env.CRON_SECRET ?? ''

export async function POST(req: Request): Promise<Response> {
  const secret = req.headers.get('x-cron-secret') ?? ''
  if (!CRON_SECRET || !timingSafeEqual(secret, CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { expiradas } = await expirarRondasAbertas()
    console.log(`[rondas/expirar] ${expiradas} ronda(s) expirada(s)`)
    return NextResponse.json({ expiradas })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
