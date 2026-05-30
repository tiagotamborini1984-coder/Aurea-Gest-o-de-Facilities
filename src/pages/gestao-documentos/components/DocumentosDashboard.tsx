import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import { Database } from '@/lib/supabase/types'

type SectorDocument = Database['public']['Tables']['sector_documents']['Row']

export function DocumentosDashboard({ data }: { data: SectorDocument[] }) {
  const stats = useMemo(() => {
    let emDia = 0
    let atencao = 0
    let vencidos = 0

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    data.forEach((doc) => {
      if (!doc.expiration_date) return
      const expDate = new Date(doc.expiration_date + 'T00:00:00')
      const diffTime = expDate.getTime() - today.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      if (diffDays < 0) {
        vencidos++
      } else if (diffDays <= (doc.alert_lead_days || 0)) {
        atencao++
      } else {
        emDia++
      }
    })

    return {
      total: data.length,
      emDia,
      atencao,
      vencidos,
    }
  }, [data])

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="border-l-4 border-l-slate-500 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Documentos</CardTitle>
          <FileText className="h-4 w-4 text-slate-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
        </CardContent>
      </Card>
      <Card className="border-l-4 border-l-green-500 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Em Dia</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{stats.emDia}</div>
        </CardContent>
      </Card>
      <Card className="border-l-4 border-l-amber-500 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Atenção</CardTitle>
          <AlertTriangle className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-500">{stats.atencao}</div>
        </CardContent>
      </Card>
      <Card className="border-l-4 border-l-red-500 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Vencidos</CardTitle>
          <XCircle className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{stats.vencidos}</div>
        </CardContent>
      </Card>
    </div>
  )
}
