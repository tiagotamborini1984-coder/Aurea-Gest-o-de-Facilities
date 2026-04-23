export const GLOBAL_CHART_COLORS = [
  '#4d7c0f', // Verde Musgo
  '#0e7490', // Azul Petróleo
  '#f97316', // Laranja
  '#d4af37', // Dourado
  '#8b0000', // Vermelho Escuro
  '#008080', // Teal
  '#4b0082', // Indigo
  '#2e8b57', // Sea Green
]

export function hexToHsl(hex: string): string {
  hex = hex.replace(/^#/, '')
  if (hex.length === 3)
    hex = hex
      .split('')
      .map((x) => x + x)
      .join('')
  const r = parseInt(hex.substring(0, 2), 16) / 255
  const g = parseInt(hex.substring(2, 4), 16) / 255
  const b = parseInt(hex.substring(4, 6), 16) / 255
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b)
  let h = 0,
    s = 0,
    l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}
