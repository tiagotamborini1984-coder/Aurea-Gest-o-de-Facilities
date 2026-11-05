/**
 * Utilitários para geração e hash de Chaves de API para Horas Extras.
 */

export async function sha256Hex(str: string): Promise<string> {
  const enc = new TextEncoder().encode(str)
  const buf = await crypto.subtle.digest('SHA-256', enc)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Gera uma chave segura de 32 bytes (256 bits) em formato hexadecimal com prefixo.
 * Formato: `ahe_live_<64 caracteres hex>`
 */
export function generateRawApiKey(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return `ahe_live_${hex}`
}
