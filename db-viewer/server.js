const express = require('express')
const { Pool } = require('pg')
const path = require('path')

const app = express()
const PORT = 4321

const pool = new Pool({
  connectionString: 'postgresql://postgres:MediallMkt2026@dbpgpesquisamkt.ce6ipyxrb0gc.sa-east-1.rds.amazonaws.com:5432/Multi_UnidadesDB',
  ssl: { rejectUnauthorized: false }
})

app.use(express.static(path.join(__dirname, 'public')))

// Overview stats
app.get('/api/stats', async (req, res) => {
  try {
    const queries = [
      pool.query('SELECT COUNT(*) FROM tenants'),
      pool.query('SELECT COUNT(*) FROM usuarios'),
      pool.query('SELECT COUNT(*) FROM pessoas'),
      pool.query('SELECT COUNT(*) FROM rodadas'),
      pool.query('SELECT COUNT(*) FROM rondas_ocorrencias'),
      pool.query('SELECT COUNT(*) FROM agendamentos_manutencao'),
      pool.query('SELECT COUNT(*) FROM respostas_formulario WHERE "deletadoEm" IS NULL'),
      pool.query('SELECT COUNT(*) FROM templates_formulario'),
      pool.query('SELECT COUNT(*) FROM movimentacoes'),
      pool.query('SELECT COUNT(*) FROM ambientes_tenant'),
    ]
    const results = await Promise.all(queries)
    res.json({
      tenants: parseInt(results[0].rows[0].count),
      usuarios: parseInt(results[1].rows[0].count),
      pessoas: parseInt(results[2].rows[0].count),
      rodadas: parseInt(results[3].rows[0].count),
      rondasOcorrencias: parseInt(results[4].rows[0].count),
      agendamentos: parseInt(results[5].rows[0].count),
      respostasFormulario: parseInt(results[6].rows[0].count),
      templatesFormulario: parseInt(results[7].rows[0].count),
      movimentacoes: parseInt(results[8].rows[0].count),
      ambientesTenant: parseInt(results[9].rows[0].count),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Tenants list
app.get('/api/tenants', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        t.id, t.slug, t.nome, t.ativo, t."criadoEm", t."logoUrl",
        t."trilogoCompanyId", t."trilogoProjectName", t."feedbackForms",
        COUNT(DISTINCT u.id) AS total_usuarios,
        COUNT(DISTINCT p.id) AS total_pessoas,
        COUNT(DISTINCT r.id) AS total_rodadas,
        COUNT(DISTINCT ro.id) AS total_rondas_ocorrencias
      FROM tenants t
      LEFT JOIN usuarios u ON u."tenantId" = t.id
      LEFT JOIN pessoas p ON p."tenantId" = t.id
      LEFT JOIN rodadas r ON r."tenantId" = t.id
      LEFT JOIN rondas_ocorrencias ro ON ro."tenantId" = t.id
      GROUP BY t.id
      ORDER BY t."criadoEm" DESC
    `)
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Users list with tenant name
app.get('/api/usuarios', async (req, res) => {
  try {
    const { tenantId } = req.query
    const where = tenantId ? `WHERE u."tenantId" = $1` : ''
    const params = tenantId ? [tenantId] : []
    const result = await pool.query(`
      SELECT
        u.id, u.email, u.username, u.nome, u.role, u.ativo,
        u."mustChangePassword", u."criadoEm",
        t.nome AS tenant_nome, t.slug AS tenant_slug
      FROM usuarios u
      LEFT JOIN tenants t ON t.id = u."tenantId"
      ${where}
      ORDER BY u."criadoEm" DESC
      LIMIT 200
    `, params)
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Rodadas (gas inspections) with tenant
app.get('/api/rodadas', async (req, res) => {
  try {
    const { tenantId } = req.query
    const where = tenantId ? `WHERE r."tenantId" = $1` : ''
    const params = tenantId ? [tenantId] : []
    const result = await pool.query(`
      SELECT
        r.id, r."iniciadoEm", r."finalizadoEm",
        t.nome AS tenant_nome,
        u.nome AS criado_por,
        COUNT(ai.id) AS total_ambientes
      FROM rodadas r
      LEFT JOIN tenants t ON t.id = r."tenantId"
      LEFT JOIN usuarios u ON u.id = r."criadoPorId"
      LEFT JOIN ambientes_inspecionados ai ON ai."rodadaId" = r.id
      ${where}
      GROUP BY r.id, t.nome, u.nome
      ORDER BY r."iniciadoEm" DESC
      LIMIT 100
    `, params)
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Rondas ocorrências
app.get('/api/rondas', async (req, res) => {
  try {
    const { tenantId } = req.query
    const where = tenantId ? `WHERE ro."tenantId" = $1` : ''
    const params = tenantId ? [tenantId] : []
    const result = await pool.query(`
      SELECT
        ro.id, ro."iniciadoEm", ro."finalizadoEm",
        t.nome AS tenant_nome,
        u.nome AS criado_por,
        COUNT(ra.id) AS total_ambientes,
        COUNT(od.id) AS total_ocorrencias
      FROM rondas_ocorrencias ro
      LEFT JOIN tenants t ON t.id = ro."tenantId"
      LEFT JOIN usuarios u ON u.id = ro."criadoPorId"
      LEFT JOIN registros_ambientes ra ON ra."rondaId" = ro.id
      LEFT JOIN ocorrencias_detalhe od ON od."registroId" = ra.id
      ${where}
      GROUP BY ro.id, t.nome, u.nome
      ORDER BY ro."iniciadoEm" DESC
      LIMIT 100
    `, params)
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Agendamentos de manutenção
app.get('/api/agendamentos', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        a.id, a.titulo, a.patrimony, a."descricaoBem", a."companyName",
        a.ambiente, a."dataAgendada", a."dataRealizada", a.status,
        a."criadoEm", a.observacao,
        u.nome AS criado_por
      FROM agendamentos_manutencao a
      LEFT JOIN usuarios u ON u.id = a."criadoPorId"
      ORDER BY a."dataAgendada" DESC
      LIMIT 100
    `)
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Respostas formulário
app.get('/api/respostas', async (req, res) => {
  try {
    const { tenantId } = req.query
    const where = tenantId
      ? `WHERE rf."tenantId" = $1 AND rf."deletadoEm" IS NULL`
      : `WHERE rf."deletadoEm" IS NULL`
    const params = tenantId ? [tenantId] : []
    const result = await pool.query(`
      SELECT
        rf.id, rf."nomePaciente", rf.cpf, rf.idade, rf.genero,
        rf."dataInternacao", rf."dataAlta", rf.setor, rf."criadoEm",
        rf.comentarios,
        t.nome AS tenant_nome,
        tf.nome AS template_nome
      FROM respostas_formulario rf
      LEFT JOIN tenants t ON t.id = rf."tenantId"
      LEFT JOIN templates_formulario tf ON tf.id = rf."templateId"
      ${where}
      ORDER BY rf."criadoEm" DESC
      LIMIT 100
    `, params)
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Ambientes por tenant
app.get('/api/ambientes', async (req, res) => {
  try {
    const { tenantId } = req.query
    const where = tenantId ? `WHERE at2."tenantId" = $1` : ''
    const params = tenantId ? [tenantId] : []
    const result = await pool.query(`
      SELECT
        at2.id, at2.nome, at2.tipo, at2.ativo, at2.ordem,
        bt.nome AS bloco_nome,
        t.nome AS tenant_nome
      FROM ambientes_tenant at2
      LEFT JOIN blocos_tenant bt ON bt.id = at2."blocoId"
      LEFT JOIN tenants t ON t.id = at2."tenantId"
      ${where}
      ORDER BY t.nome, bt.nome, at2.ordem
    `, params)
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.listen(PORT, () => {
  console.log(`DB Viewer running at http://localhost:${PORT}`)
})
