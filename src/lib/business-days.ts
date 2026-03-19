import { isWeekend, addDays, startOfDay, isAfter } from 'date-fns'

/**
 * Returns the next business day after a given date.
 */
export function getNextBusinessDay(date: Date): Date {
  let nextDay = addDays(date, 1)
  while (isWeekend(nextDay)) {
    nextDay = addDays(nextDay, 1)
  }
  return nextDay
}

/**
 * Checks if a pending schedule has expired based on its activity date.
 * Expiration is defined as being past the end of the next business day.
 * @param activityDateStr The activity date string in 'YYYY-MM-DD' format.
 * @returns boolean indicating if the confirmation window has passed.
 */
export function isExpiredPendente(activityDateStr: string): boolean {
  const actDate = startOfDay(new Date(activityDateStr + 'T00:00:00'))
  const deadlineDate = startOfDay(getNextBusinessDay(actDate))
  const today = startOfDay(new Date())

  // If today is strictly after the deadline date, it's expired.
  return isAfter(today, deadlineDate)
}
