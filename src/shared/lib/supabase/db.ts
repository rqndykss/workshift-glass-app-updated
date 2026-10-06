import type { AppSettings, DayEntry, UserProfile, WorkSettings } from '@/shared/types'

export function profileFromRow(row: any, email?: string): UserProfile {
  return {
    id: row.id,
    name: row.display_name ?? 'Пользователь',
    username: row.username ? `@${String(row.username).replace(/^@/, '')}` : '@user',
    avatarUrl: row.avatar_url ?? undefined,
    email,
    role: row.role ?? 'user',
  }
}

export function workSettingsFromRow(row: any): WorkSettings {
  return {
    payPerShift: Number(row?.pay_per_shift ?? 4200),
    extraPay: Number(row?.extra_pay ?? 3500),
    defaultStart: row?.default_start ?? '09:00',
    defaultEnd: row?.default_end ?? '18:00',
    monthlyHoursTarget: Number(row?.monthly_hours_target ?? 160),
    scheduleType: row?.schedule_type ?? '5/2',
    weekendDays: Array.isArray(row?.weekend_days) ? row.weekend_days.map(Number) : [5, 6],
    weekdays: Array.isArray(row?.weekdays) ? row.weekdays.map(Number) : [0, 1, 2, 3, 4],
    timezone: row?.timezone ?? 'Europe/Moscow',
  }
}

export function appSettingsFromRow(row: any): AppSettings {
  return {
    theme: row?.theme ?? 'system',
    density: row?.density ?? 'comfortable',
    accentColor: row?.accent_color ?? '#D9534F',
    blur: Number(row?.blur ?? 24),
    showMonthSummary: row?.show_month_summary ?? true,
  }
}

export function entryFromRow(row: any): DayEntry {
  return {
    date: row.date,
    kind: row.kind,
    hours: Number(row.hours ?? 0),
    start: row.start_time ?? undefined,
    end: row.end_time ?? undefined,
    note: row.note ?? undefined,
    offReason: row.off_reason ?? undefined,
    extraCompensation: row.extra_compensation ?? undefined,
    restoredWork: row.restored_work ?? undefined,
  }
}
