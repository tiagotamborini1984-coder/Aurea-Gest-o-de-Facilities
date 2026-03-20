import { differenceInMinutes } from 'date-fns'

export function calculateSLA(task: any, currentStatus?: any) {
  if (!task || !currentStatus)
    return { text: '-', color: 'bg-slate-100 text-slate-600', percentage: 0, isLate: false }

  if (currentStatus.is_terminal) {
    return {
      text: 'Finalizado',
      color: 'bg-slate-100 text-slate-600 border-slate-200',
      percentage: 0,
      isLate: false,
    }
  }

  if (currentStatus.freeze_sla) {
    return {
      text: 'Pausado',
      color: 'bg-slate-200 text-slate-700 border-slate-300',
      percentage: 0,
      isLate: false,
    }
  }

  const slaDays = currentStatus.sla_days || 0
  if (slaDays <= 0)
    return { text: 'N/A', color: 'bg-slate-100 text-slate-600', percentage: 0, isLate: false }

  const start = new Date(task.status_updated_at || task.created_at)
  const end = task.closed_at ? new Date(task.closed_at) : new Date()

  let elapsedMins = differenceInMinutes(end, start)
  if (elapsedMins < 0) elapsedMins = 0

  const slaMins = slaDays * 24 * 60

  const percentage = (elapsedMins / slaMins) * 100
  let color = 'bg-green-100 text-green-800 border-green-200'

  if (percentage >= 100) {
    color = 'bg-red-100 text-red-800 border-red-300 shadow-sm'
  } else if (percentage >= 80) {
    color = 'bg-amber-100 text-amber-800 border-amber-300'
  }

  const remainingMins = slaMins - elapsedMins
  const absMins = Math.abs(remainingMins)
  const days = Math.floor(absMins / (24 * 60))
  const hours = Math.floor((absMins % (24 * 60)) / 60)

  let timeText = ''
  if (days > 0) {
    timeText = `${days}d ${hours}h`
  } else {
    timeText = `${hours}h ${absMins % 60}m`
  }

  const isLate = remainingMins < 0
  const text = isLate ? `Atrasado ${timeText}` : `${timeText} restantes`

  return { text, color, percentage, isLate }
}
