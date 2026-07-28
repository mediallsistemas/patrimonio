/**
 * Recorte por unidade dos dados do Trílogo.
 *
 * A instância do Trílogo é compartilhada entre os hospitais: uma empresa
 * (companyId) agrupa vários deles, e o que distingue um do outro é o endereço
 * do departamento — `Mediall Brasil - RONDÔNIA > MACHADINHO DO OESTE > HMMD >
 * Sala de patrimônio`. O código do projeto (HMMD) é um segmento desse caminho.
 *
 * Vive num módulo próprio porque a mesma regra decide duas coisas diferentes:
 * de quem é um ticket na importação (chamados-trilogo) e o que um usuário pode
 * ver (rotas /api/trilogo e sincronização de ambientes). Eram implementações
 * separadas, e divergir aqui significa alguém ver bem de outro hospital.
 */

export interface VinculoTrilogo {
  trilogoCompanyId: number
  trilogoProjectName: string | null
  /** Identificadores do tenant, usados quando não há projeto configurado. */
  slug?: string | null
  nome?: string | null
}

/** Palavras com 3+ caracteres. Corta "de", "do", "da" sem lista de stopwords. */
export function tokensDe(texto: string): string[] {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter((t) => t.length >= 3)
}

/** O `trilogoProjectName` aparece no endereço? Evidência forte. */
export function casaPorProjeto(vinculo: VinculoTrilogo, enderecoMaiusculo: string): boolean {
  if (!vinculo.trilogoProjectName) return false
  return enderecoMaiusculo.includes(vinculo.trilogoProjectName.toUpperCase())
}

/**
 * O nome ou o slug do tenant aparece no endereço?
 *
 * Exige TODAS as palavras do candidato como palavra inteira: palavra inteira
 * porque "PG" dentro de "HRPG" casaria o hospital errado, e todas as palavras
 * porque "Hospital Regional" sozinho casaria com qualquer hospital regional da
 * mesma empresa.
 */
export function casaPorNome(vinculo: VinculoTrilogo, palavrasEndereco: Set<string>): boolean {
  for (const candidato of [vinculo.slug, vinculo.nome]) {
    const palavras = tokensDe(candidato ?? '')
    if (palavras.length > 0 && palavras.every((p) => palavrasEndereco.has(p))) return true
  }
  return false
}

/**
 * Um registro do Trílogo (ticket ou bem) pertence a este tenant?
 *
 * Fecha quando nada identifica a unidade. A versão anterior desta regra, espalhada
 * pelas rotas, fazia `if (!projectName) return true`: um tenant sem projeto
 * configurado enxergava TODOS os bens da empresa, inclusive de hospitais que nem
 * são clientes. Hoje todos os tenants têm projeto, então fechar não muda nada na
 * prática — muda o que acontece quando alguém cadastrar o próximo sem preencher.
 */
export function pertenceAoTenant(
  registro: { companyId?: unknown; departmentFullAddress?: unknown },
  vinculo: VinculoTrilogo,
): boolean {
  if (Number(registro.companyId) !== vinculo.trilogoCompanyId) return false

  const endereco = String(registro.departmentFullAddress ?? '').toUpperCase()

  // Projeto configurado é a palavra final: se ele não casa, o registro não é
  // desta unidade — ponto. Cair no nome como segunda chance ALARGA em vez de
  // restringir, e o alargamento é silencioso. Conferido contra os 12.410 bens
  // de produção: o tenant da Sede tem slug 'mediall-goiania', cujas palavras
  // (MEDIALL, GOIANIA) aparecem no endereço de TODO bem da empresa. Sem esta
  // precedência ele passaria de 894 para 1.773 bens visíveis.
  if (vinculo.trilogoProjectName) return casaPorProjeto(vinculo, endereco)

  return casaPorNome(vinculo, new Set(tokensDe(endereco)))
}

/** Versão para uma lista de vínculos — o registro serve se casar com algum. */
export function visivelPara(
  registro: { companyId?: unknown; departmentFullAddress?: unknown },
  vinculos: VinculoTrilogo[],
): boolean {
  return vinculos.some((v) => pertenceAoTenant(registro, v))
}
