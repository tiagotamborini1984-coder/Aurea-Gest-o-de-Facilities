import { differenceInSeconds } from 'date-fns'

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

  let slaSecs = 0
  let elapsedSecs = 0
  let remainingSecs = 0

  const start = new Date(task.status_updated_at || task.created_at)
  const end = task.closed_at ? new Date(task.closed_at) : new Date()

  if (task.due_date) {
    const due = new Date(task.due_date)
    remainingSecs = differenceInSeconds(due, end)
    const totalDuration = differenceInSeconds(due, new Date(task.created_at))
    slaSecs = totalDuration > 0 ? totalDuration : 86400 // fallback to 1 day if invalid
    elapsedSecs = totalDuration - remainingSecs
    if (elapsedSecs < 0) elapsedSecs = 0
  } else {
    const slaDays = currentStatus.sla_days || 0
    if (slaDays <= 0)
      return { text: 'N/A', color: 'bg-slate-100 text-slate-600', percentage: 0, isLate: false }
    slaSecs = slaDays * 24 * 60 * 60
    elapsedSecs = differenceInSeconds(end, start)
    if (elapsedSecs < 0) elapsedSecs = 0
    remainingSecs = slaSecs - elapsedSecs
  }

  const percentage = slaSecs > 0 ? (elapsedSecs / slaSecs) * 100 : 100
  let color = 'bg-green-100 text-green-800 border-green-200'

  if (percentage >= 100) {
    color = 'bg-red-100 text-red-800 border-red-300 shadow-sm'
  } else if (percentage >= 80) {
    color = 'bg-amber-100 text-amber-800 border-amber-300'
  }

  const absSecs = Math.abs(remainingSecs)
  const days = Math.floor(absSecs / (24 * 3600))
  const hours = Math.floor((absSecs % (24 * 3600)) / 3600)
  const minutes = Math.floor((absSecs % 3600) / 60)
  const seconds = absSecs % 60

  const pad = (n: number) => n.toString().padStart(2, '0')

  let timeText = ''
  if (days > 0) {
    timeText = `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  } else {
    timeText = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  }

  const isLate = remainingSecs < 0
  const text = isLate ? `-${timeText}` : timeText

  return { text, color, percentage, isLate }
}
