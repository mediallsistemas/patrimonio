# Módulo `trilogo`

> Regras puras de escopo por unidade para dados do Trílogo: decide se um bem/ticket pertence a um tenant a partir de `companyId` + endereço do departamento.

## Responsabilidade

A instância do Trílogo é compartilhada entre hospitais: uma empresa (`companyId`) agrupa vários, e o que
distingue um do outro é o `departmentFullAddress` (ex.: `Mediall Brasil - RONDÔNIA > MACHADINHO DO OESTE >
HMMD > Sala de patrimônio`). Este módulo centraliza a regra de casamento unidade × registro, usada em duas
decisões que precisam coincidir: **o que um usuário pode ver** (rotas `/api/trilogo/*`, sincronização de
ambientes) e **de quem é um ticket na importação de chamados** (`chamados-trilogo.ts`). Eram implementações
separadas nas rotas; divergir significa alguém ver (ou receber) bem de outro hospital.

## Arquivos

| Arquivo | Papel |
|---|---|
| `escopo.ts` | Funções puras de casamento (sem I/O, sem Prisma, sem fetch) |
| `escopo.test.ts` | Testes com vínculos reais de produção (caso Amapá: 3 hospitais no mesmo `companyId` 168) |

## Funções públicas

| Função | Assinatura real | Descrição |
|---|---|---|
| `tokensDe` | `tokensDe(texto: string): string[]` | Palavras com 3+ caracteres, sem acento, maiúsculas — corta "de/do/da" sem lista de stopwords |
| `casaPorProjeto` | `casaPorProjeto(vinculo: VinculoTrilogo, enderecoMaiusculo: string): boolean` | O `trilogoProjectName` aparece no endereço? Evidência forte (comparação por trecho, `includes`) |
| `casaPorNome` | `casaPorNome(vinculo: VinculoTrilogo, palavrasEndereco: Set<string>): boolean` | Nome ou slug do tenant no endereço — exige **todas** as palavras do candidato como **palavra inteira** |
| `pertenceAoTenant` | `pertenceAoTenant(registro: { companyId?: unknown; departmentFullAddress?: unknown }, vinculo: VinculoTrilogo): boolean` | Registro pertence ao tenant? `companyId` deve bater; com projeto configurado, **só** o projeto decide; sem projeto, cai no nome; nada identificando → **fecha** |
| `visivelPara` | `visivelPara(registro, vinculos: VinculoTrilogo[]): boolean` | Versão para lista de vínculos (sessões multi-unidade) — serve se casar com algum |

```ts
export interface VinculoTrilogo {
  trilogoCompanyId: number
  trilogoProjectName: string | null
  slug?: string | null   // usados quando não há projeto configurado
  nome?: string | null
}
```

## Regras de negócio (extraídas do código e dos testes)

- **`companyId` igual não é a mesma unidade** — o ponto central do módulo (Amapá: HRPG, UEI e UPA Zona Sul dividem o `companyId` 168 e não se enxergam).
- **Projeto configurado é a palavra final**: se `trilogoProjectName` não casa, o registro não é da unidade — o nome NÃO serve de segunda chance. Caso real testado: a Sede tem slug `mediall-goiania`, e MEDIALL/GOIANIA aparecem no endereço de todo bem da empresa; sem essa precedência ela passaria de 894 para 1.773 bens visíveis.
- **Sem projeto e sem nome no endereço, fecha.** A versão anterior (espalhada nas rotas) fazia `if (!projectName) return true` — tenant sem projeto enxergava a empresa inteira.
- `casaPorNome` exige palavra inteira ("PG" não casa dentro de "HRPG") e todas as palavras ("Hospital Regional" sozinho casaria qualquer hospital regional da empresa). Acentos são ignorados.
- Endereço ausente não é passe livre; `companyId` como string ainda casa (a API varia o tipo).

## Modelos de banco

Nenhum — módulo 100% puro. Os vínculos (`trilogoCompanyId`, `trilogoProjectName`) vêm de `Tenant` e são
montados pelos chamadores.

## Rotas de API que usam este módulo

| Método + caminho | Roles (guard real) | Uso do módulo |
|---|---|---|
| `GET /api/trilogo?startDate=&endDate=` | `super_admin, tenant_admin, admin_multi, operator_patrimonio, viewer` (`verifyAuth`) | Lista tickets do Trílogo (`/ticket`) filtrados por `visivelPara(t, vinculos)` — vínculos das unidades de `allowedTenantIds(session)`; `super_admin` sem recorte |
| `GET /api/trilogo/assets` | mesmos roles | Lista bens (`/asset`) filtrados por `visivelPara` — antes o admin do HRPG via os bens da UEI/UPA por filtrar só por empresa; `admin_multi/viewer` valida `companyId` pedido contra suas unidades; `only=empresas` é exclusivo de `super_admin` |
| `GET/POST /api/cron/sync-trilogo` | `Bearer <CRON_SECRET>` | Via `ambientes.service.sincronizarTenant` (`pertenceAoTenant`) e `chamados-sync.service` (`resolverTenant` usa `casaPorProjeto`/`casaPorNome`/`tokensDe`) |

## Consumo no client

Nenhum direto — módulo server-side, consumido por rotas e por outros módulos:
- `src/modules/chamados/chamados-trilogo.ts` (`resolverTenant` — de quem é o ticket importado)
- `src/modules/ambientes/ambientes.service.ts` (sincronização de blocos/ambientes por tenant)
- `src/app/api/trilogo/route.ts` e `src/app/api/trilogo/assets/route.ts`

O client chega aos dados via `src/services/trilogo.service.ts` (`buscarEmpresas`, `buscarProjetos`, `buscarAssets`),
que só chama as rotas acima.

## Padrões aplicados

- Regra de segurança como função pura testável, compartilhada entre leitura e importação:

```ts
// Projeto configurado é a palavra final — nome não é segunda chance
if (vinculo.trilogoProjectName) return casaPorProjeto(vinculo, endereco)
return casaPorNome(vinculo, new Set(tokensDe(endereco)))
```

- Testes com dados reais de produção (12.410 bens conferidos) em vez de fixtures inventadas.
- Default fechado: ausência de evidência nega acesso.

## Observações e cuidados

- **`bens.service.ts` (módulo `bens`) NÃO usa este módulo**: `fetchBensParaUnidade` ainda filtra só por `companyId` + `projectName` via `includes`, com `if (!projectName) return true` — exatamente o comportamento aberto que `escopo.ts` fechou. Divergência real entre `/api/me/bens/buscar`//`/api/rondas/bens-tenant` (via `bens.service`) e `/api/trilogo/assets` (via este módulo).
- A comparação por trecho de `casaPorProjeto` (`includes`) é intencional — é a mesma usada em `/api/trilogo` e na sincronização de ambientes; mudar aqui divergiria das telas que já filtram assim.
- Hoje todos os tenants têm projeto configurado; o caminho por nome/empresa existe para o próximo tenant cadastrado sem preencher — e para a resolução de tickets na importação.
