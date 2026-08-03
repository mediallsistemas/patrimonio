# Módulo `ocorrencias`

> Leitura isolada da foto (base64) de uma ocorrência de ronda, para lazy loading no client.

## Responsabilidade

Módulo mínimo, de leitura apenas. Existe para servir a foto de uma `OcorrenciaDetalhe` sob demanda: as listagens de rondas usam selects "light" **sem** a coluna `foto` (que pode ter até ~1,5 MB em base64), e o client busca a imagem só quando o card entra no viewport.

A **escrita** de `OcorrenciaDetalhe` não acontece aqui — é feita pelo módulo `rondas` (`registrarAmbiente` cria as ocorrências aninhadas via `createMany`). Este módulo cobre apenas a recuperação da foto.

## Arquivos

| Arquivo | Papel |
|---------|-------|
| `ocorrencias.service.ts` | Única função: buscar a coluna `foto` de uma ocorrência por `id` |

Não há `ocorrencias.types.ts` — o módulo não recebe body, apenas um `id` de rota.

## Funções públicas

| Função | Assinatura | Descrição |
|--------|-----------|-----------|
| `buscarFotoOcorrencia` | `(id: string): Promise<string \| null>` | `findUnique` em `OcorrenciaDetalhe` com `select: { foto: true }`; retorna `null` se não existe ou não tem foto |

## Modelos de banco

| Modelo | Tabela | Campos-chave | Índices |
|--------|--------|--------------|---------|
| `OcorrenciaDetalhe` | `ocorrencias_detalhe` | `id`, `registroId` (FK → `registros_ambientes`), `tipo`, `descricao`, `foto?` (base64), `trilogoChamado`, `bemPatrimony?`, `bemDescricao?` | `[registroId]` |

O modelo é criado/populado pelo módulo `rondas`; aqui só é lido.

## Rotas de API que usam este módulo

| Rota | Roles (verifyAuth) | O que faz |
|------|--------------------|-----------|
| `GET /api/ocorrencias/[id]/foto` | **nenhum — rota sem autenticação** | Retorna `{ foto }` ou `404 notFound('Ocorrência')` |

A rota não chama `verifyAuth`/`getSession` nem aplica filtro de tenant. Qualquer pessoa com o UUID da ocorrência consegue a foto (ver Observações).

## Consumo no client

- `src/services/rondas.service.ts` → `buscarFotoOcorrencia(ocorrenciaId)` chama `GET ocorrencias/${id}/foto` e retorna `{ foto: string | null }`.
- Componente `src/components/ui/ronda/FotoLazy.tsx`: usa IntersectionObserver para disparar a busca apenas quando a foto fica visível — padrão documentado no CLAUDE.md para fotos base64.
- Páginas de histórico (`/ocorrencias/historico`, admin de rondas) renderizam ocorrências vindas das listagens "light" (sem foto) e delegam a imagem ao `FotoLazy`.
- `src/lib/rondas-admin-utils.ts` (`desnormalizarOcorrencias`) achata as ocorrências das rondas para as telas de histórico — os campos vêm da listagem, não desta rota.

## Padrões aplicados

- **Helpers de resposta:** a rota usa `ok({ foto })`, `notFound('Ocorrência')`, `serverError('buscarFoto failed')` de `@/lib/api-response` — nunca `NextResponse.json` direto.
- **Tratamento de erro com prefixo do módulo:**

```ts
} catch (error) {
  console.error('[ocorrencias.service] buscarFotoOcorrencia:', error)
  throw error
}
```

- **Select mínimo:** `select: { foto: true }` — nunca carrega a linha inteira.
- **Foto base64 + lazy loading:** a foto só trafega quando o client pede explicitamente; o limite de tamanho (~1,5 MB, `z.string().max(2_000_000)`) é imposto na **gravação**, pelo `OcorrenciaDetalheSchema` do módulo `rondas`.

## Observações e cuidados

- **Divergência de segurança (a maior do módulo):** `GET /api/ocorrencias/[id]/foto` não tem guard de auth nem isolamento por tenant — viola as regras "Authentication on every protected route" e "Tenant isolation mandatory" do CLAUDE.md. A exposição é mitigada só pelo UUID não enumerável. O mesmo padrão se repete em `GET /api/ambientes/[id]/foto` (módulo `rodadas`).
- **Módulo de leitura:** não crie escrita de ocorrências aqui; o fluxo de criação pertence a `rondas` (`registrarAmbiente` + `OcorrenciaDetalheSchema` em `rondas.types.ts`).
- **`trilogoChamado`** é apenas um flag booleano gravado na criação — não há integração ativa com a API do Trilogo neste módulo.
- **`bemPatrimony`/`bemDescricao`** são snapshot em texto do bem selecionado na ronda (sem FK para tabelas de patrimônio) — se o bem mudar no Trilogo, o histórico não acompanha.
- A rota retorna `404` tanto para ocorrência inexistente quanto para ocorrência sem foto (`foto === null` cai no mesmo `notFound`).
