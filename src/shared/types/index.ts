export type ShiftKind = 'work' | 'off' | 'extra' | 'vacation'
export type ExtraCompensation = 'pay' | 'day_off'
export type OffReason = 'weekend' | 'schedule' | 'personal' | 'compensatory'
export type ScheduleType = '5/2' | '2/2' | '1/3' | '3/3' | '4/2' | 'weekdays'
export type ThemeMode = 'light' | 'dark' | 'system'
export type DensityMode = 'comfortable' | 'compact'
export type UserRole = 'user' | 'premium' | 'admin' | 'owner'
export type ActiveTab = 'calendar' | 'earnings' | 'settings' | 'admin'

export interface WorkSnapshot {
  hours: number
  start: string
  end: string
}

export interface DayEntry {
  date: string
  kind: ShiftKind
  hours: number
  start?: string
  end?: string
  note?: string
  offReason?: OffReason
  extraCompensation?: ExtraCompensation
  restoredWork?: WorkSnapshot
}

export interface WorkSettings {
  payPerShift: number
  extraPay: number
  defaultStart: string
  defaultEnd: string
  monthlyHoursTarget: number
  scheduleType: ScheduleType
  weekendDays: number[]
  weekdays: number[]
  timezone: string
}

export interface AppSettings {
  theme: ThemeMode
  density: DensityMode
  accentColor: string
  blur: number
  showMonthSummary: boolean
}

export interface UserProfile {
  id: string
  name: string
  username: string
  avatarUrl?: string
  email?: string
  role: UserRole
}

export interface SessionState {
  mode: 'unknown' | 'guest' | 'account'
  userId?: string
  email?: string
}
