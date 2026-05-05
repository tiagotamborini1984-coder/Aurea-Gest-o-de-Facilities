import { differenceInSeconds } from 'date-fns'

export function getBusinessSeconds(start: Date, end: Date, nonWorkingDays: string[]) {
  let isNegative = false
  let s = start
  let e = end
  if (start > end) {
    isNegative = true
    s = end
    e = start
  }

  let totalSeconds = 0
  let current = new Date(s)

  while (current < e) {
    const nextDay = new Date(current)
    nextDay.setHours(24, 0, 0, 0)

    let chunkEnd = nextDay < e ? nextDay : e

    const dayOfWeek = current.getDay()
    const year = current.getFullYear()
    const month = String(current.getMonth() + 1).padStart(2, '0')
    const day = String(current.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`

    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const isHoliday = nonWorkingDays.includes(dateStr)

    if (!isWeekend && !isHoliday) {
      totalSeconds += differenceInSeconds(chunkEnd, current)
    }

    current = chunkEnd
  }

  return isNegative ? -totalSeconds : totalSeconds
}

export function calculateSLA(task: any, currentStatus?: any, nonWorkingDays: string[] = []) {
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

  if (currentStatus.ignore_sla) {
    return {
      text: 'Sem SLA',
      color: 'bg-slate-100 text-slate-500 border-slate-200',
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
    remainingSecs = getBusinessSeconds(end, due, nonWorkingDays)
    const totalDuration = getBusinessSeconds(new Date(task.created_at), due, nonWorkingDays)
    slaSecs = totalDuration > 0 ? totalDuration : 86400
    elapsedSecs = totalDuration - remainingSecs
    if (elapsedSecs < 0) elapsedSecs = 0
  } else {
    const slaDays = currentStatus.sla_days || 0
    if (slaDays <= 0)
      return { text: 'N/A', color: 'bg-slate-100 text-slate-600', percentage: 0, isLate: false }
    slaSecs = slaDays * 24 * 60 * 60
    elapsedSecs = getBusinessSeconds(start, end, nonWorkingDays)
    if (elapsedSecs < 0) elapsedSecs = 0
    remainingSecs = slaSecs - elapsedSecs
  }

  let percentage = slaSecs > 0 ? (elapsedSecs / slaSecs) * 100 : 100
  let color = 'bg-green-100 text-green-800 border-green-200'

  const isLate = remainingSecs < 0

  if (isLate || percentage >= 100) {
    color = 'bg-red-100 text-red-800 border-red-300 shadow-sm'
    percentage = 100
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

  const text = isLate ? `-${timeText}` : timeText

  return { text, color, percentage, isLate }
}
