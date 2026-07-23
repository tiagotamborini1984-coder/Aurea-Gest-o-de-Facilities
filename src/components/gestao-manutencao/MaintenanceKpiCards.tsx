import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase/client'
import { AlertCircle, Target, Clock, Wrench } from 'lucide-react'

interface KpiData {
  sla_adherence: number | null
  tma_minutes: number | null
  proactive_percentage: number | null
  reactive_percentage: number | null
}

function formatTMA(minutes: number | null): string {
  if (minutes === null || minutes === undefined) return '—'
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  return `${hours}h ${mins}m`
}

function formatPct(val: number | null | undefined): string {
  if (val === null || val === undefined) return '—'
  return `${val.toFixed(1)}%`
}

export function MaintenanceKpiCards({
  selectedPlant,
  dateStart,
  dateEnd,
}: {
  selectedPlant: string
  dateStart: string
  dateEnd: string
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [kpi, setKpi] = useState<KpiData | null>(null)

  useEffect(() => {
    let cancelled = false
    const fetchKpis = async () => {
      setLoading(true)
      setError(false)
      const { data, error: err } = await supabase.rpc('get_maintenance_kpis', {
        p_client_id: null,
        p_plant_id: selectedPlant === 'all' ? null : selectedPlant,
        p_date_start: dateStart,
        p_date_end: dateEnd,
      })
      if (cancelled) return
      if (err) {
        setError(true)
        setKpi(null)
      } else {
        setKpi(data as KpiData)
      }
      setLoading(false)
    }
    fetchKpis()
    return () => {
      cancelled = true
    }
  }, [selectedPlant, dateStart, dateEnd])

  const errorContent = (
    <div className="flex items-center gap-2 text-red-500 text-sm">
      <AlertCircle className="h-4 w-4" />
      Erro ao carregar
    </div>
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="shadow-sm border-l-4 border-l-indigo-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <Target className="h-4 w-4 text-indigo-500" />
            Aderência ao SLA
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-9 w-28" />
          ) : error ? (
            errorContent
          ) : (
            <div className="text-3xl font-bold text-gray-900">{formatPct(kpi?.sla_adherence)}</div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm border-l-4 border-l-blue-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500" />
            TMA – Tempo Médio de Atendimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-9 w-28" />
          ) : error ? (
            errorContent
          ) : (
            <div className="text-3xl font-bold text-gray-900">
              {formatTMA(kpi?.tma_minutes ?? null)}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm border-l-4 border-l-purple-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <Wrench className="h-4 w-4 text-purple-500" />
            Reparo Pró-ativo vs Reativo
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-9 w-48" />
          ) : error ? (
            errorContent
          ) : kpi?.proactive_percentage !== null && kpi?.proactive_percentage !== undefined ? (
            <div className="flex flex-col gap-1">
              <div className="text-lg font-bold text-gray-900">
                <span className="text-green-600">
                  Proativo: {kpi.proactive_percentage.toFixed(1)}%
                </span>
              </div>
              <div className="text-lg font-bold text-gray-900">
                <span className="text-red-500">
                  Reativo: {kpi.reactive_percentage?.toFixed(1)}%
                </span>
              </div>
            </div>
          ) : (
            <div className="text-3xl font-bold text-gray-900">—</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
