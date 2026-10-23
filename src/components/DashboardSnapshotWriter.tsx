import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'

// Grava as métricas do Dashboard do Gestor (Gestão de Terceiros) como snapshot
// para a Facilita ler — o número respondido por ela é o mesmo que o gestor vê.
// Escrita silenciosa: falha não afeta o dashboard.
export default function DashboardSnapshotWriter({
  metrics,
  plantStats,
  dateFrom,
  dateTo,
  activeTab,
  clientId,
}: any) {
  const lastRef = useRef('')

  useEffect(() => {
    if (!metrics || !clientId || activeTab !== 'colaboradores') return

    const payload = {
      absenteismo: Number(metrics.absenteismo) || 0,
      presente: metrics.presente,
      ausente: metrics.ausente,
      lancado: metrics.lancado,
      contratado: metrics.contratado,
      todayDateStr: metrics.todayDateStr,
      todayPresente: metrics.todayPresente,
      todayAusente: metrics.todayAusente,
      todayContratado: metrics.todayContratado,
      validDatesCount: metrics.validDatesCount,
      excludedDaysCount: metrics.excludedDaysCount,
      plantStats: (plantStats || []).map((p: any) => ({
        name: p.name,
        absenteismo: p.absenteismo,
        presentes: p.presentes,
        ausentes: p.ausentes,
        contratado: p.contratado,
      })),
    }

    const key = JSON.stringify([payload, dateFrom, dateTo])
    if (key === lastRef.current) return
    lastRef.current = key

    const save = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        if (!token) return
        await supabase.from('facilita_dashboard_snapshot').insert({
          client_id: clientId,
          source: 'dashboard_gestor',
          period_start: dateFrom,
          period_end: dateTo,
          metrics: payload,
        })
        // poda: mantém só as 20 leituras mais recentes do client
        const { data: olds } = await supabase
          .from('facilita_dashboard_snapshot')
          .select('id')
          .eq('client_id', clientId)
          .eq('source', 'dashboard_gestor')
          .order('computed_at', { ascending: false })
          .range(20, 100)
        if (olds && olds.length) {
          await supabase
            .from('facilita_dashboard_snapshot')
            .delete()
            .in(
              'id',
              olds.map((o: any) => o.id),
            )
        }
      } catch {
        // silencioso — snapshot é otimização
      }
    }
    save()
  }, [metrics, plantStats, dateFrom, dateTo, activeTab, clientId])

  return null
}
