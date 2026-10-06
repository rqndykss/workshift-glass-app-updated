import { addDays, endOfMonth, format, getDate, getDay, startOfMonth } from 'date-fns'
import { ru } from 'date-fns/locale'

export const ruWeekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

export function getCalendarDays(month: Date) {
  const start = startOfMonth(month)
  const end = endOfMonth(month)
  const leading = (getDay(start) + 6) % 7
  const total = leading + getDate(end)
  const cells = Math.ceil(total / 7) * 7
  return Array.from({ length: cells }, (_, index) => addDays(start, index - leading))
}

export function keyForDate(date: Date) {
  return format(date, 'yyyy-MM-dd')
}

export function monthLabel(date: Date) {
  return format(date, 'LLLL yyyy', { locale: ru }).replace(/^./, (c) => c.toUpperCase())
}

export function longDateLabel(date: Date) {
  return format(date, 'd MMMM yyyy', { locale: ru })
}

export function hoursBetween(start: string, end: string) {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let minutes = eh * 60 + em - (sh * 60 + sm)
  if (minutes < 0) minutes += 24 * 60
  return Math.round((minutes / 60) * 10) / 10
}
