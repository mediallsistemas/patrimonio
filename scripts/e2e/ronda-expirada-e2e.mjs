// e2e do fix "ronda expirou em loop": uma ronda aberta órfã (draft descartado)
// bloqueava POST /api/rondas com 409, que o client exibia como "Esta ronda
// expirou. Inicie uma nova ronda." — em loop, sem saída. Depois do fix,
// criar uma ronda encerra as abertas do próprio usuário (apaga as vazias,
// finaliza as com registros) e nunca devolve 409.
//
// Pré-requisito: bancos e2e semeados e dev server apontando para eles
// (ver scripts/e2e/README.md):
//   node scripts/e2e/setup-e2e.mjs
//   DATABASE_URL=<Patrimonio_e2e> AUTH_DATABASE_URL=<Autenticacao_e2e> npx next dev -p 3999
//   node scripts/e2e/ronda-expirada-e2e.mjs
//
// Credenciais fixas do e2e — só existem nos bancos *_e2e, não são segredos.

const BASE = process.env.E2E_BASE ?? 'http://localhost:3999'
const OPERADOR = {
  username: process.env.E2E_USER ?? 'e2e.operador',
  senha: process.env.E2E_SENHA ?? 'e2e-senha-operador',
}

let passed = 0
let failed = 0

function check(nome, cond, extra) {
  if (cond) {
    passed++
    console.log(`  ✓ ${nome}`)
  } else {
    failed++
    console.error(`  ✗ ${nome}${extra ? ` — ${JSON.stringify(extra)}` : ''}`)
  }
}

async function api(method, path, { token, body } = {}) {
  const res = await fetch(`${BASE}/api/${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  let json = null
  try { json = await res.json() } catch { /* 204 etc. */ }
  return { status: res.status, json }
}

const REGISTRO_SIMPLES = (ambiente) => ({
  tipoRegistro: 'ocorrencia',
  ambiente,
  temOcorrencia: false,
})

async function main() {
  console.log(`e2e ronda-expirada — base ${BASE}`)

  // ── login (Bearer) ─────────────────────────────────────────────────────────
  const login = await api('POST', 'auth/login', { body: OPERADOR })
  const token = login.json?.accessToken
  check('login do operador devolve accessToken', login.status === 200 && Boolean(token), login)
  if (!token) process.exit(1)

  // Começa limpo: sem draft pendente
  await api('DELETE', 'rondas/draft', { token })

  const listar = async () => {
    const r = await api('GET', 'rondas', { token })
    return Array.isArray(r.json?.data) ? r.json.data : []
  }

  // ── Cenário A: ronda órfã COM registros (o loop reportado) ────────────────
  console.log('Cenário A — ronda aberta com registros, draft descartado:')
  const a1 = await api('POST', 'rondas', { token })
  const rondaA = a1.json?.data?.id
  check('cria ronda A', a1.status === 201 && Boolean(rondaA), a1)

  const reg = await api('POST', `rondas/${rondaA}/ambientes`, {
    token,
    body: REGISTRO_SIMPLES('Recepção E2E'),
  })
  check('registra ambiente na ronda A', reg.status === 201, reg)

  // draft descartado (o caminho que deixava a ronda A inalcançável)
  await api('DELETE', 'rondas/draft', { token })

  const a2 = await api('POST', 'rondas', { token })
  const rondaB = a2.json?.data?.id
  check('iniciar nova ronda NÃO devolve mais 409', a2.status === 201 && Boolean(rondaB), a2)

  let rondas = await listar()
  const rowA = rondas.find((r) => r.id === rondaA)
  check('ronda A preservada no histórico', Boolean(rowA), { rondaA })
  check('ronda A foi finalizada automaticamente', Boolean(rowA?.finalizadoEm), rowA)
  check('ronda A mantém o registro de ambiente', rowA?.ambientes?.length === 1, rowA?.ambientes)

  // ── Cenário B: ronda órfã VAZIA é apagada, não vira lixo no histórico ─────
  console.log('Cenário B — ronda aberta vazia:')
  const b1 = await api('POST', 'rondas', { token })
  const rondaC = b1.json?.data?.id
  check('cria ronda C com a B (vazia) ainda aberta', b1.status === 201 && Boolean(rondaC), b1)

  rondas = await listar()
  check('ronda B vazia foi apagada do histórico', !rondas.some((r) => r.id === rondaB), { rondaB })

  // ── Regressão: fluxo normal continua íntegro ──────────────────────────────
  console.log('Regressão — fluxo normal:')
  const regC = await api('POST', `rondas/${rondaC}/ambientes`, {
    token,
    body: REGISTRO_SIMPLES('Posto E2E'),
  })
  check('registra ambiente na ronda C', regC.status === 201, regC)

  const fim = await api('PATCH', `rondas/${rondaC}`, { token })
  check('finaliza ronda C', fim.status === 200, fim)

  const regDepois = await api('POST', `rondas/${rondaC}/ambientes`, {
    token,
    body: REGISTRO_SIMPLES('Recepção E2E'),
  })
  check('registrar em ronda finalizada segue 409 (self-heal do client)', regDepois.status === 409, regDepois)

  const semAuth = await api('POST', 'rondas', {})
  check('criar ronda sem auth → 401', semAuth.status === 401, semAuth)

  console.log(`\n${passed} passaram, ${failed} falharam`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
