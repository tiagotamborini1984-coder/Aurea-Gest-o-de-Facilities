import { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react'

interface PlantRankingEntry {
  id: string
  name: string
  code?: string | null
  city?: string | null
  value: number
}

interface PlantRankingCardProps {
  title: string
  icon: ReactNode
  accentColor: string
  data: PlantRankingEntry[]
  loading: boolean
  error: string | null
  onRetry: () => void
  formatValue?: (value: number) => string
  valueLabel: string
  emptyMessage: string
}

export function PlantRankingCard({
  title,
  icon,
  accentColor,
  data,
  loading,
  error,
  onRetry,
  formatValue,
  valueLabel,
  emptyMessage,
}: PlantRankingCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-10 gap-3">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: accentColor }} />
            <span className="text-sm text-slate-500">Carregando...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
            <div className="p-2 bg-red-100 text-red-600 rounded-full">
              <AlertCircle className="w-6 h-6" />
            </div>
            <p className="text-sm text-red-600">{error}</p>
            <Button onClick={onRetry} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar novamente
            </Button>
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-10 text-slate-500">{emptyMessage}</div>
        ) : (
          <div className="space-y-2 max-h-[350px] overflow-auto">
            {data.map((p, index) => (
              <div
                key={p.id}
                className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100 hover:bg-slate-100/70 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-white shrink-0"
                    style={{ backgroundColor: accentColor }}
                  >
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-500">
                      {p.code ? p.code : ''}
                      {p.city ? `${p.code ? ' · ' : ''}${p.city}` : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-800">
                    {formatValue ? formatValue(p.value) : p.value}
                  </p>
                  <p className="text-xs text-slate-500">{valueLabel}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
