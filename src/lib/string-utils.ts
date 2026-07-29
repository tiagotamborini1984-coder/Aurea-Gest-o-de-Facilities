export function normalizeString(str: string | null | undefined): string {
  if (!str) return ''
  return str
    .replace(/[\u200B\u200C\u200D\u200E\u200F\uFEFF\u00AD]/g, '')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u00A0\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]/g, ' ')
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
