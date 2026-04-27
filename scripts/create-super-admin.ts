/**
 * Script pontual: cria super admin Paulo Avanyer no Autenticacao_DB.
 * Executar: npx ts-node scripts/create-super-admin.ts
 */
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'

const pool = new Pool({
  connectionString:
    'postgresql://postgres:MediallMkt2026@dbpgpesquisamkt.ce6ipyxrb0gc.sa-east-1.rds.amazonaws.com:5432/Autenticacao_DB?sslmode=require',
  ssl: { rejectUnauthorized: false },
})

async function main() {
  const senhaHash = await bcrypt.hash('12345678', 10)
  const id = randomUUID()

  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO usuarios (id, tenant_id, email, username, senha_hash, nome, role, sistemas, ativo, must_change_password, criado_em, atualizado_em)
     VALUES ($1, NULL, $2, $3, $4, $5, 'super_admin', ARRAY['linensistem'], true, true, NOW(), NOW())
     ON CONFLICT (email) DO UPDATE
       SET senha_hash         = EXCLUDED.senha_hash,
           must_change_password = true,
           atualizado_em      = NOW()
     RETURNING id`,
    [id, 'paulo.avanyer@linensistem', 'paulo.avanyer', senhaHash, 'Paulo Avanyer'],
  )

  console.log('✓ Super admin criado/atualizado. ID:', rows[0].id)
  await pool.end()
}

main().catch((err) => {
  console.error('Erro:', err)
  process.exit(1)
})
