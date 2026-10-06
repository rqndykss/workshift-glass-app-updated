import { format, getDay, getDaysInMonth, startOfMonth } from 'date-fns'
import type { DayEntry, ScheduleType, WorkSettings } from '@/shared/types'

export function isWorkingDay(dayIndex: number, dayOfWeek: number, settings: WorkSettings) {
  const normalizedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  if (settings.scheduleType === 'weekdays') return settings.weekdays.includes(normalizedDay)
  if (settings.scheduleType === '5/2') return !settings.weekendDays.includes(normalizedDay)

  const cycles: Record<Exclude<ScheduleType, '5/2' | 'weekdays'>, string> = {
    '2/2': '1100',
    '1/3': '1000',
    '3/3': '111000',
    '4/2': '111100',
  }
  const pattern = cycles[settings.scheduleType]
  return pattern[dayIndex % pattern.length] === '1'
}

export function generateMonthEntries(month: Date, settings: WorkSettings): Record<string, DayEntry> {
  const result: Record<string, DayEntry> = {}
  const days = getDaysInMonth(month)
  const start = startOfMonth(month)

  for (let index = 0; index < days; index += 1) {
    const date = new Date(start)
    date.setDate(index + 1)
    const key = format(date, 'yyyy-MM-dd')
    const dayOfWeek = getDay(date)
    const normalizedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const working = isWorkingDay(index, dayOfWeek, settings)
    result[key] = working
      ? { date: key, kind: 'work', hours: 8, start: settings.defaultStart, end: settings.defaultEnd }
      : {
          date: key,
          kind: 'off',
          hours: 0,
          offReason: settings.scheduleType === '5/2' && settings.weekendDays.includes(normalizedDay) ? 'weekend' : 'schedule',
        }
  }
  return result
}
