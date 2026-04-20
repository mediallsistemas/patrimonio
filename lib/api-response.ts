import { NextResponse } from 'next/server'

export const ok = <T>(data: T, message?: string) =>
  NextResponse.json({ data, message }, { status: 200 })

export const created = <T>(data: T) =>
  NextResponse.json({ data }, { status: 201 })

export const noContent = () =>
  new NextResponse(null, { status: 204 })

export const badRequest = (error: unknown) =>
  NextResponse.json({ error }, { status: 400 })

export const conflict = (error: string) =>
  NextResponse.json({ error }, { status: 409 })

export const unauthorized = () =>
  NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

export const forbidden = () =>
  NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

export const notFound = (resource = 'Recurso') =>
  NextResponse.json({ error: `${resource} não encontrado` }, { status: 404 })

export const serverError = (error: unknown) => {
  // Log the real error server-side only — never expose internals to the client
  const message = error instanceof Error ? error.message : String(error)
  console.error('[server-error]', message)
  return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
}
