export function normalizeString(str: string | null | undefined): string {
  if (!str) return ''
  return str
    .replace(/[\u200B\u200C\u200D\u200E\u200F\uFEFF\u00AD]/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeMatch(
  value: string | null | undefined,
  target: string | null | undefined,
): boolean {
  return normalizeString(value) === normalizeString(target)
}

export function normalizeIncludes(
  haystack: string | null | undefined,
  needle: string | null | undefined,
): boolean {
  const n = normalizeString(needle)
  if (!n) return true
  return normalizeString(haystack).includes(n)
}
