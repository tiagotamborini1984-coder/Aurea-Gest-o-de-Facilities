import { differenceInDays, isBefore, startOfDay } from 'date-fns'
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

export interface SectorDocument {
  id: string
  client_id: string
  plant_id: string
  name: string
  document_type: string
  expiration_date: string
  alert_lead_days: number
  file_url: string | null
  created_at: string
}

export function getDocumentStatus(doc: SectorDocument) {
  const today = startOfDay(new Date())
  const expDate = startOfDay(new Date(doc.expiration_date + 'T00:00:00'))

  if (isBefore(expDate, today)) {
    return {
      id: 'vencido',
      label: 'Vencido',
      color: 'bg-red-500 hover:bg-red-600 text-white',
      icon: XCircle,
    }
  }

  const diffDays = differenceInDays(expDate, today)
  if (diffDays <= doc.alert_lead_days) {
    return {
      id: 'atencao',
      label: 'Atenção',
      color: 'bg-amber-500 hover:bg-amber-600 text-white',
      icon: AlertTriangle,
    }
  }

  return {
    id: 'em-dia',
    label: 'Em Dia',
    color: 'bg-green-500 hover:bg-green-600 text-white',
    icon: CheckCircle,
  }
}
