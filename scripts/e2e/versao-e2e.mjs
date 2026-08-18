// e2e da checagem de versão do build (auto-atualização do client):
// GET /api/versao é público (liberado no middleware), devolve { data: { sha } }
// e é estável entre chamadas — é o que o VersaoWatcher usa para decidir
// recarregar a página quando um deploy novo entra no ar.
//
// Pré-requisito: dev server de pé (ver scripts/e2e/README.md).

const BASE = process.env.E2E_BASE ?? 'http://localhost:3999'

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

async function getVersao() {
  const res = await fetch(`${BASE}/api/versao`, { redirect: 'manual' })
  let json = null
  try { json = await res.json() } catch { /* HTML de redirect etc. */ }
  return { status: res.status, json }
}

async function main() {
  console.log(`e2e versao — base ${BASE}`)

  const r1 = await getVersao()
  check('GET /api/versao sem auth responde 200 (não redireciona p/ login)', r1.status === 200, r1)
  check('resposta é JSON no shape { data: { sha } }', typeof r1.json?.data?.sha === 'string' && r1.json.data.sha.length > 0, r1.json)

  const r2 = await getVersao()
  check('sha é estável entre chamadas do mesmo deploy', r1.json?.data?.sha === r2.json?.data?.sha, { r1: r1.json, r2: r2.json })

  console.log(`\n${passed} passaram, ${failed} falharam`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
