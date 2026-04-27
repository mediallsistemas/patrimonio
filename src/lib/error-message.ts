const HTTP_MESSAGES: Record<number, string> = {
  400: 'Dados inválidos. Verifique as informações e tente novamente.',
  401: 'Sessão expirada. Faça login novamente.',
  403: 'Você não tem permissão para realizar esta ação.',
  404: 'Registro não encontrado.',
  409: 'Conflito: este registro já existe.',
  413: 'Arquivo muito grande. Tente com uma imagem menor.',
  429: 'Muitas tentativas. Aguarde um momento e tente novamente.',
  500: 'Erro no servidor. Tente novamente em instantes.',
  503: 'Serviço temporariamente indisponível. Tente novamente.',
}

export function toUserMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return HTTP_MESSAGES[error.status] ?? 'Ocorreu um erro inesperado. Tente novamente.'
  }
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return 'Sem conexão com o servidor. Verifique sua internet.'
  }
  if (error instanceof Error && error.message) {
    const match = error.message.match(/^HTTP (\d+)$/)
    if (match) {
      const status = Number(match[1])
      return HTTP_MESSAGES[status] ?? 'Ocorreu um erro inesperado. Tente novamente.'
    }
  }
  return 'Ocorreu um erro inesperado. Tente novamente.'
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
