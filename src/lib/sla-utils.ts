import { differenceInMinutes } from 'date-fns'

export function calculateSLA(task: any, taskType: any, currentStatus?: any) {
  if (!task || !taskType) return { text: '-', color: 'bg-slate-100 text-slate-600', percentage: 0 }

  const start = new Date(task.created_at)
  const end = task.closed_at ? new Date(task.closed_at) : new Date()

  let elapsedMins = differenceInMinutes(end, start) - (task.frozen_time_minutes || 0)

  // Subtract time spent in current frozen status
  if (currentStatus?.freeze_sla && !task.closed_at) {
    elapsedMins -= differenceInMinutes(end, new Date(task.status_updated_at || task.created_at))
  }

  if (elapsedMins < 0) elapsedMins = 0

  const slaMins = (taskType.sla_hours || 0) * 24 * 60

  if (slaMins <= 0) return { text: 'N/A', color: 'bg-slate-100 text-slate-600', percentage: 0 }

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

  if (currentStatus?.freeze_sla && !task.closed_at) {
    return {
      text: `Pausado (${timeText} rest.)`,
      color: 'bg-slate-200 text-slate-700 border-slate-300',
      percentage,
    }
  }

  const text = remainingMins < 0 ? `Atrasado ${timeText}` : `${timeText} restantes`

  if (task.closed_at) {
    return {
      text: remainingMins < 0 ? `Fechado c/ Atraso` : `No Prazo`,
      color:
        remainingMins < 0
          ? 'bg-red-100 text-red-800 border-red-200'
          : 'bg-green-100 text-green-800 border-green-200',
      percentage,
    }
  }

  return { text, color, percentage }
}
