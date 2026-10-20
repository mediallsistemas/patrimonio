# `src/utils` — Funções utilitárias puras

Sem I/O de rede, sem Prisma. `format.ts`, `moeda.ts` e `cilindros.ts` são puros;
`foto.ts` e `pdf-export.ts` dependem de APIs de browser (canvas / download) —
usar apenas em código client.

## `cilindros.ts` — abastecimento da inspeção de gases

Opções de tamanho e regras da tela de abastecimento (testes em `cilindros.test.ts`):

```ts
OPCOES_CILINDRO                                  // 'P7','P10','P45','P50','1 m³','3 m³','7 m³','10 m³'
OPCAO_OUTRO                                      // 'outro' → capacidade digitada em m³
cilindroVazio(): CilindroDraft                   // { opcao, outroM3, quantidade } da linha em edição
lerM3(texto): number | null                      // "2,5" ou "2.5" → 2.5; vazio/zero/negativo → null
tamanhoDoCilindro(c): string | null              // 'P10', '3 m³', ou "2,5 m³" para "Outro"
cilindrosDoDraft(estado): CilindroDraft[]        // lista do draft; drafts antigos (um tamanho) convertidos
validarCilindros(cilindros): Record<string,string> // cilindro_<i>_tamanho / cilindro_<i>_quantidade
cilindrosParaEnviar(cilindros): CilindroAbastecido[] // só as linhas completas, { tamanho, quantidade }
descreverCilindros(cilindros): string            // "4× 3 m³ · 2× P10"
```

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

O subtítulo quebra em várias linhas quando não cabe na largura da página (ex.: lista
de filtros aplicados) e a tabela desce junto; com uma linha, o layout é o de sempre.

Presets por domínio (colunas + mapeador de linha):

```ts
COLUNAS_RONDAS_PDF / COLUNAS_RONDAS_ADMIN_PDF            // admin = + coluna Unidade
linhaRondaPdf(r): Record<string, string | number>

COLUNAS_MANUTENCOES_PDF / COLUNAS_MANUTENCOES_ADMIN_PDF  // admin = + coluna Unidade
linhaManutencaoPdf(m): Record<string, string | number>   // labels: Elétrica/Hidráulica/Predial/Patrimônio

COLUNAS_INSPECOES_PDF
linhaRodadaPdf(r): Record<string, string | number>

COLUNAS_AGENDAMENTOS_PDF                                  // relatório de agendamentos (admin/bens)
linhaAgendamentoPdf(ag, hojeStr?): Record<string, string | number>  // situação via agendamentos.rules
```

Os mapeadores calculam duração em minutos (`finalizadoEm - iniciadoEm`) e status
("Em andamento" / "Com ocorrências" / "Conforme"). Consumidos pelas páginas de
histórico junto com `components/ui/ExportarPdfButton`.
