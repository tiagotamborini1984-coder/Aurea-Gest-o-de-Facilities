/**
 * Máscara do Centro de Custo pagador (formato 1111aaa):
 * 4 dígitos numéricos + 3 letras (minúsculas convertidas para maiúsculas).
 * Qualquer caractere fora do padrão é simplesmente rejeitado (não aparece no input).
 */

/** Padrão final aceito: exatamente 4 números seguidos de 3 letras */
export const COST_CENTER_TEXT_PATTERN = /^[0-9]{4}[A-Za-z]{3}$/

/**
 * Sanitiza um valor para permitir apenas dígitos nas 4 primeiras posições
 * e letras (convertidas para maiúsculas) nas 3 últimas. Ignora o restante.
 */
export function maskCostCenterPagador(raw: string): string {
  const digits = (raw || '').replace(/[^0-9]/g, '').slice(0, 4)
  const letters = (raw || '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 3)
  return digits + letters
}

/** Valida o valor final (defesa extra além da máscara, antes de salvar). */
export function isValidCostCenterPagador(value: string): boolean {
  return COST_CENTER_TEXT_PATTERN.test(value || '')
}
