/**
 * Guarda/restaura a última rota acessada pelo usuário autenticado.
 * Usada para devolver o usuário à tela onde estava após um deslog
 * automático (inatividade) ou após limpar a sessão pela tela de erro.
 */

const LAST_ROUTE_KEY = 'aurea_last_route'

export const LAST_ROUTE_STORAGE_KEY = LAST_ROUTE_KEY

const isValidRoute = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.length > 0 &&
  value.startsWith('/') &&
  value !== '/' &&
  !value.startsWith('/login')

/** Grava a rota atual (sobrescreve a anterior). Ignora valores inválidos. */
export function saveLastRoute(pathname: string | null | undefined) {
  try {
    if (!isValidRoute(pathname)) return
    localStorage.setItem(LAST_ROUTE_KEY, pathname)
  } catch {
    // ignore — localStorage pode estar bloqueado
  }
}

/** Lê a rota salva, se válida. */
export function readLastRoute(): string | null {
  try {
    const stored = localStorage.getItem(LAST_ROUTE_KEY)
    return isValidRoute(stored) ? stored : null
  } catch {
    return null
  }
}

/** Lê a rota salva e já a remove (uso único, pós-login). */
export function consumeLastRoute(): string | null {
  const route = readLastRoute()
  if (route) {
    try {
      localStorage.removeItem(LAST_ROUTE_KEY)
    } catch {
      // ignore
    }
  }
  return route
}
