import { NextResponse } from 'next/server'
import { expirarRondasAbertas } from '@/modules/rondas/rondas.service'

export async function POST(req: Request): Promise<Response> {
  const secret = req.headers.get('x-cron-secret')
  if (!secret || secret !== process.env.CRON_SECRET) {
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
