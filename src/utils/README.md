# `src/utils` — Funções utilitárias puras

Sem I/O de rede, sem Prisma. `format.ts` e `moeda.ts` são puros; `foto.ts` e
`pdf-export.ts` dependem de APIs de browser (canvas / download) — usar apenas em
código client.

## `format.ts` — CPF

```ts
validarCPF(cpf: string): boolean          // 11 dígitos + dígitos verificadores; rejeita repetidos
formatarCPF(cpf: string): string          // máscara progressiva p/ digitação (000.000.000-00)
formatarCPFDisplay(cpf: string): string   // máscara de exibição (exige 11 dígitos)
```

## `foto.ts` — compressão de imagem para base64

```ts
arquivoParaBase64Comprimido(file: File): Promise<string>
```

Redimensiona para no máximo 1280px no maior lado e devolve data URL JPEG
(qualidade 0.7). Mesmo algoritmo de `useRondaBase.handleFoto`, extraído para os
fluxos de manutenção/chamados. É o passo que garante fotos abaixo do teto de
~1.5MB validado pelo Zod (`.max(2_000_000)`).

## `moeda.ts` — dinheiro em centavos

Valores monetários no domínio são sempre **centavos (int)**. Único ponto de
conversão/formatação BRL:

```ts
formatarBRL(centavos: number): string                              // R$ 1.234,56
centavosParaReais(centavos: number | null | undefined): string     // 12345 → "123,45" (p/ inputs)
reaisParaCentavos(texto: string): number | null                    // "1.234,56" → 123456; inválido/negativo → null
```

## `pdf-export.ts` — exportação de tabelas em PDF (jsPDF + autotable)

```ts
interface ColunaPdf { header: string; key: string }
interface ExportarTabelaPdfInput { titulo, subtitulo?, colunas, linhas, nomeArquivo }

exportarTabelaPdf(input: ExportarTabelaPdfInput): void   // gera PDF landscape e dispara download
```

Presets por domínio (colunas + mapeador de linha):

```ts
COLUNAS_RONDAS_PDF / COLUNAS_RONDAS_ADMIN_PDF            // admin = + coluna Unidade
linhaRondaPdf(r): Record<string, string | number>

COLUNAS_MANUTENCOES_PDF / COLUNAS_MANUTENCOES_ADMIN_PDF  // admin = + coluna Unidade
linhaManutencaoPdf(m): Record<string, string | number>   // labels: Elétrica/Hidráulica/Predial/Patrimônio

COLUNAS_INSPECOES_PDF
linhaRodadaPdf(r): Record<string, string | number>
```

Os mapeadores calculam duração em minutos (`finalizadoEm - iniciadoEm`) e status
("Em andamento" / "Com ocorrências" / "Conforme"). Consumidos pelas páginas de
histórico junto com `components/ui/ExportarPdfButton`.
