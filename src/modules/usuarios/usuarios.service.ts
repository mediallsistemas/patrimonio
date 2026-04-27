import { authPool } from '@/lib/db-auth'
import { hashPassword } from '@/lib/auth'
import type { CreateUsuarioInput, UpdateUsuarioInput } from './usuarios.types'

interface UsuarioRow {
  id: string
  email: string
  nome: string
  role: string
  ativo: boolean
  criadoEm: Date
  tenantId: string | null
  tenant: { slug: string; nome: string; id: string } | null
}

const USUARIO_SQL = `
  SELECT u.id, u.email, u.nome, u.role, u.ativo, u."criadoEm", u."tenantId",
         CASE WHEN t.id IS NOT NULL
              THEN json_build_object('id', t.id, 'slug', t.slug, 'nome', t.nome)
              ELSE NULL END AS tenant
  FROM usuarios u
  LEFT JOIN tenants t ON t.id = u."tenantId"
  WHERE 'linensistem' = ANY(u.sistemas)
`

export async function listarUsuarios(): Promise<UsuarioRow[]> {
  try {
    const result = await authPool.query<UsuarioRow>(`${USUARIO_SQL} ORDER BY u."criadoEm" ASC`)
    return result.rows
  } catch (error) {
    console.error('[usuarios.service] listarUsuarios:', error)
    throw error
  }
}

export async function listarUsuariosPorTenant(tenantId: string): Promise<UsuarioRow[]> {
  try {
    const result = await authPool.query<UsuarioRow>(
      `${USUARIO_SQL} AND u."tenantId" = $1 ORDER BY u."criadoEm" ASC`,
      [tenantId],
    )
    return result.rows
  } catch (error) {
    console.error('[usuarios.service] listarUsuariosPorTenant:', error)
    throw error
  }
}

export async function buscarUsuario(id: string): Promise<UsuarioRow | null> {
  try {
    const result = await authPool.query<UsuarioRow>(
      `${USUARIO_SQL} AND u.id = $1 LIMIT 1`,
      [id],
    )
    return result.rows[0] ?? null
  } catch (error) {
    console.error('[usuarios.service] buscarUsuario:', error)
    throw error
  }
}

export async function criarUsuario(input: CreateUsuarioInput): Promise<UsuarioRow> {
  try {
    const username = input.username.trim().toLowerCase()
    const email = `${username}@sistema.local`
    const senhaHash = await hashPassword(input.senha)
    const tenantId = input.tenantId ?? null
    const nome = input.nome.trim()

    const result = await authPool.query<UsuarioRow>(
      `INSERT INTO usuarios (id, email, username, nome, "senhaHash", role, "tenantId", sistemas, ativo, "mustChangePassword", "criadoEm", "atualizadoEm")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, ARRAY['linensistem'], true, false, NOW(), NOW())
       ON CONFLICT (email) DO UPDATE SET username = EXCLUDED.username, "atualizadoEm" = NOW()
       RETURNING id, email, nome, role, ativo, "criadoEm", "tenantId", NULL::json AS tenant`,
      [email, username, nome, senhaHash, input.role, tenantId],
    )
    return result.rows[0]
  } catch (error) {
    console.error('[usuarios.service] criarUsuario:', error)
    throw error
  }
}

export async function atualizarUsuario(id: string, input: UpdateUsuarioInput): Promise<UsuarioRow | null> {
  try {
    const fields: string[] = []
    const values: unknown[] = []
    let idx = 1

    if (input.nome !== undefined) { fields.push(`nome = $${idx++}`); values.push(input.nome.trim()) }
    if (input.ativo !== undefined) { fields.push(`ativo = $${idx++}`); values.push(input.ativo) }
    if (input.role !== undefined) { fields.push(`role = $${idx++}`); values.push(input.role) }

    if (fields.length === 0) return buscarUsuario(id)

    values.push(id)
    await authPool.query(
      `UPDATE usuarios SET ${fields.join(', ')}, "atualizadoEm" = NOW() WHERE id = $${idx}`,
      values,
    )
    return buscarUsuario(id)
  } catch (error) {
    console.error('[usuarios.service] atualizarUsuario:', error)
    throw error
  }
}

export async function deletarUsuario(id: string): Promise<void> {
  try {
    await authPool.query(`DELETE FROM usuarios WHERE id = $1`, [id])
  } catch (error) {
    console.error('[usuarios.service] deletarUsuario:', error)
    throw error
  }
}

export async function resetSenhaUsuario(id: string): Promise<{ novaSenha: string }> {
  try {
    const novaSenha = String(Math.floor(10000000 + Math.random() * 90000000))
    const senhaHash = await hashPassword(novaSenha)
    await authPool.query(
      `UPDATE usuarios SET "senhaHash" = $1, "mustChangePassword" = true WHERE id = $2`,
      [senhaHash, id],
    )
    return { novaSenha }
  } catch (error) {
    console.error('[usuarios.service] resetSenhaUsuario:', error)
    throw error
  }
}
