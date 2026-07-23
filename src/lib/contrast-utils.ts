export function parseHex(hex: string): [number, number, number] | null {
  if (!hex) return null
  let h = hex.replace(/^#/, '').trim()
  if (h.length === 3)
    h = h
      .split('')
      .map((c) => c + c)
      .join('')
  if (h.length !== 6) return null
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null
  return [r, g, b]
}

export function relativeLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(hex1: string, hex2: string): number {
  const rgb1 = parseHex(hex1)
  const rgb2 = parseHex(hex2)
  if (!rgb1 || !rgb2) return 0
  const l1 = relativeLuminance(rgb1)
  const l2 = relativeLuminance(rgb2)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

export function meetsAA(foreground: string, background: string, isLarge = false): boolean {
  const ratio = contrastRatio(foreground, background)
  return isLarge ? ratio >= 3 : ratio >= 4.5
}

export function darkenHex(hex: string, amount = 0.15): string {
  const rgb = parseHex(hex)
  if (!rgb) return hex
  const darkened = rgb.map((c) => Math.max(0, Math.round(c * (1 - amount))))
  return '#' + darkened.map((c) => c.toString(16).padStart(2, '0')).join('')
}

const FALLBACK_PRIMARY = '#1e3a8a'
const FALLBACK_SECONDARY = '#1f2937'
const WHITE = '#ffffff'

export interface AccessibleColors {
  primary: string
  secondary: string
  primaryHover: string
  primaryContrast: string
}

export function getAccessibleColors(
  primary: string | null | undefined,
  secondary: string | null | undefined,
): AccessibleColors {
  let safePrimary = primary && parseHex(primary) ? primary! : FALLBACK_PRIMARY
  if (!meetsAA(safePrimary, WHITE, true)) {
    safePrimary = FALLBACK_PRIMARY
  }

  let safeSecondary = secondary && parseHex(secondary) ? secondary! : FALLBACK_SECONDARY
  if (!meetsAA(safeSecondary, WHITE, true)) {
    safeSecondary = FALLBACK_SECONDARY
  }

  const primaryHover = darkenHex(safePrimary, 0.15)
  const primaryContrast = meetsAA(WHITE, safePrimary) ? WHITE : FALLBACK_SECONDARY

  return { primary: safePrimary, secondary: safeSecondary, primaryHover, primaryContrast }
}
