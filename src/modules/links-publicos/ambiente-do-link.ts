/**
 * Qual ambiente do Trílogo um QR code impresso representa hoje.
 *
 * O link público guarda o NOME do ambiente (`links_publicos_bens.ambiente`), e
 * o Trílogo não expõe id de departamento no bem — só o endereço em texto
 * (`Empresa > Cidade > PROJETO > Bloco > Ambiente`). Quando alguém renomeia o
 * ambiente no Trílogo, o QR já colado na porta passava a abrir vazio, sem
 * nenhum aviso. Em 20/10/2026 eram 33 de 383 QR codes.
 *
 * Quando o nome gravado não casa mais, a resolução tenta, nesta ordem:
 *   1. grafia      — mesmo nome a menos de acento, caixa e pontuação
 *                    ("DML PEDIATRIA" → "DML-PEDIATRIA");
 *   2. subdividido — o ambiente virou bloco com sub-ambientes
 *                    ("HRPG > LOGISTICA" → "HRPG > LOGISTICA > VINDO DA MATRIZ");
 *   3. renomeado   — um único ambiente do projeto contém o nome antigo inteiro
 *                    ("RECUPERAÇÃO PÓS ANESTÉSICA" → "RPA - RECUPERAÇÃO PÓS ANESTÉSICA").
 * Fora disso, 'nao-encontrado' (com os candidatos, quando a dúvida é entre
 * vários): melhor dizer que o ambiente sumiu do que mostrar bens de outra sala.
 *
 * Funções puras — sem fetch, sem Prisma.
 */

export interface BemComEndereco {
  departmentFullAddress?: string | null
}

export type TipoResolucao = 'exato' | 'grafia' | 'subdividido' | 'renomeado' | 'nao-encontrado'

export interface ResolucaoAmbiente<T> {
  tipo: TipoResolucao
  bens: T[]
  /** Nomes atuais no Trílogo dos ambientes de onde vieram os bens. */
  ambientesAtuais: string[]
  /** Só em 'nao-encontrado': ambientes do projeto que contêm o nome antigo. */
  candidatos: string[]
}

/** Sem acento, maiúsculo, pontuação vira espaço, espaços colapsados. */
export function normalizarNome(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
}

/**
 * Mesma leitura do endereço que o admin usa ao gerar o QR (`parseEndereco` em
 * `app/admin/bens/bens.types.ts`): projeto = 3º segmento, ambiente = 5º, ou o
 * 4º quando o endereço só tem quatro níveis.
 */
export function lerEndereco(enderecoCompleto: string | null | undefined) {
  const partes = String(enderecoCompleto ?? '')
    .split('>')
    .map((s) => s.trim())
    .filter(Boolean)
  return {
    projeto: partes[2] ?? '',
    bloco: partes[3] ?? '',
    ambiente: partes[4] ?? partes[3] ?? '',
    niveis: partes.length,
  }
}

/** O trecho aparece no texto como palavras inteiras ("SALA 1" não casa em "SALA 10"). */
function contemPalavras(texto: string, trecho: string): boolean {
  return ` ${texto} `.includes(` ${trecho} `)
}

function distintos(nomes: string[]): string[] {
  return [...new Set(nomes)].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

export function resolverAmbienteDoLink<T extends BemComEndereco>(
  link: { projeto: string; ambiente: string },
  bens: T[],
): ResolucaoAmbiente<T> {
  const doProjeto = bens
    .map((bem) => ({ bem, end: lerEndereco(bem.departmentFullAddress) }))
    .filter(({ end }) => end.projeto === link.projeto)

  const resultado = (
    tipo: TipoResolucao,
    escolhidos: typeof doProjeto,
    nomesAtuais: string[],
  ): ResolucaoAmbiente<T> => ({
    tipo,
    bens: escolhidos.map(({ bem }) => bem),
    ambientesAtuais: distintos(nomesAtuais),
    candidatos: [],
  })
  const naoEncontrado = (candidatos: string[] = []): ResolucaoAmbiente<T> => ({
    tipo: 'nao-encontrado',
    bens: [],
    ambientesAtuais: [],
    candidatos: distintos(candidatos),
  })

  const exatos = doProjeto.filter(({ end }) => end.ambiente === link.ambiente)
  if (exatos.length > 0) return resultado('exato', exatos, [link.ambiente])

  const alvo = normalizarNome(link.ambiente)
  if (!alvo) return naoEncontrado()

  const mesmaGrafia = doProjeto.filter(({ end }) => normalizarNome(end.ambiente) === alvo)
  if (mesmaGrafia.length > 0) {
    return resultado('grafia', mesmaGrafia, mesmaGrafia.map(({ end }) => end.ambiente))
  }

  // Só endereços com 5+ níveis têm bloco de verdade; com 4, o 4º segmento é o
  // próprio ambiente e já teria casado acima.
  const viraramBloco = doProjeto.filter(
    ({ end }) => end.niveis >= 5 && normalizarNome(end.bloco) === alvo,
  )
  if (viraramBloco.length > 0) {
    return resultado('subdividido', viraramBloco, viraramBloco.map(({ end }) => end.ambiente))
  }

  // Nome de uma palavra só ("UTI") contido em outro ("UTI NEONATAL") é
  // coincidência demais para seguir sozinho.
  if (alvo.split(' ').length < 2) return naoEncontrado()

  const porNome = new Map<string, typeof doProjeto>()
  for (const item of doProjeto) {
    const nome = normalizarNome(item.end.ambiente)
    if (!contemPalavras(nome, alvo)) continue
    porNome.set(nome, [...(porNome.get(nome) ?? []), item])
  }
  if (porNome.size === 1) {
    const [unico] = [...porNome.values()]
    return resultado('renomeado', unico, unico.map(({ end }) => end.ambiente))
  }

  return naoEncontrado(
    [...porNome.values()].flatMap((itens) => itens.map(({ end }) => end.ambiente)),
  )
}
