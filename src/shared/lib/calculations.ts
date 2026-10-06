import type { DayEntry } from '@/shared/types'

export function calculateCompOffBalance(entries: Record<string, DayEntry>) {
  const accrued = Object.values(entries).filter((e) => e.kind === 'extra' && e.extraCompensation === 'day_off').length
  const used = Object.values(entries).filter((e) => e.kind === 'off' && e.offReason === 'compensatory').length
  return { accrued, used, balance: Math.max(0, accrued - used) }
}

export function calculateMonth(entries: DayEntry[], payPerShift: number, extraPay: number) {
  const work = entries.filter((e) => e.kind === 'work')
  const extraPaid = entries.filter((e) => e.kind === 'extra' && e.extraCompensation !== 'day_off')
  const hours = entries.reduce((sum, e) => sum + e.hours, 0)
  const income = work.length * payPerShift + extraPaid.length * extraPay
  return { shifts: work.length + entries.filter((e) => e.kind === 'extra').length, hours, income }
}
