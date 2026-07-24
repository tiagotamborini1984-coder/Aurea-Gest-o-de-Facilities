import { cn } from '@/lib/utils'

interface GaugeChartProps {
  value: number | null
  label: string
  description?: string
  loading?: boolean
}

function getColorForValue(value: number): string {
  if (value >= 80) return '#10b981'
  if (value >= 50) return '#f59e0b'
  return '#ef4444'
}

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const rad = (angle * Math.PI) / 180
  return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) }
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, startAngle)
  const end = polarToCartesian(cx, cy, r, endAngle)
  const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0
  const sweep = endAngle > startAngle ? 1 : 0
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} ${sweep} ${end.x} ${end.y}`
}

export function GaugeChart({ value, label, description, loading }: GaugeChartProps) {
  const cx = 100
  const cy = 100
  const r = 75
  const strokeWidth = 16

  const clampedValue = value !== null ? Math.min(Math.max(value, 0), 100) : 0
  const valueAngle = -90 + (clampedValue / 100) * 180
  const color = value !== null ? getColorForValue(value) : '#e5e7eb'

  const redEnd = -90 + (50 / 100) * 180
  const yellowEnd = -90 + (80 / 100) * 180

  return (
    <div className="flex flex-col items-center w-full">
      <svg viewBox="0 0 200 120" className="w-full max-w-[240px]">
        <path
          d={arcPath(cx, cy, r, -90, redEnd)}
          fill="none"
          stroke="#fecaca"
          strokeWidth={strokeWidth}
        />
        <path
          d={arcPath(cx, cy, r, redEnd, yellowEnd)}
          fill="none"
          stroke="#fef3c7"
          strokeWidth={strokeWidth}
        />
        <path
          d={arcPath(cx, cy, r, yellowEnd, 90)}
          fill="none"
          stroke="#d1fae5"
          strokeWidth={strokeWidth}
        />

        {value !== null && value > 0 && (
          <path
            d={arcPath(cx, cy, r, -90, valueAngle)}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        )}

        <text
          x={cx}
          y={cy - 12}
          textAnchor="middle"
          style={{ fontSize: 30, fontWeight: 700 }}
          fill="#111827"
        >
          {loading ? '...' : value !== null ? `${value.toFixed(0)}%` : '—'}
        </text>

        <text x={cx} y={cy + 10} textAnchor="middle" style={{ fontSize: 10 }} fill="#6b7280">
          {label}
        </text>
      </svg>

      <div className="flex items-center gap-3 mt-2 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-400" />
          <span className="text-gray-500">&lt;50%</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-gray-500">50-80%</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-gray-500">≥80%</span>
        </span>
      </div>

      {description && (
        <p className="text-xs text-gray-500 text-center mt-2 max-w-[220px]">{description}</p>
      )}
    </div>
  )
}
