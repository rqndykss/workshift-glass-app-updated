'use client'

import { create } from 'zustand'
import { format, parseISO } from 'date-fns'
import { persist } from 'zustand/middleware'
import type { AppSettings, DayEntry, SessionState, UserProfile, WorkSettings } from '@/shared/types'
import { generateMonthEntries } from '@/shared/lib/schedule'
import { supabase } from '@/shared/lib/supabase/browser'
import { appSettingsFromRow, entryFromRow, profileFromRow, workSettingsFromRow } from '@/shared/lib/supabase/db'

const defaultProfile = (): UserProfile => ({ id: '', name: 'Гость', username: '@guest', role: 'user' })
const defaultWorkSettings = (): WorkSettings => ({
  payPerShift: 4200,
  extraPay: 3500,
  defaultStart: '09:00',
  defaultEnd: '18:00',
  monthlyHoursTarget: 160,
  scheduleType: '5/2',
  weekendDays: [5, 6],
  weekdays: [0, 1, 2, 3, 4],
  timezone: 'Europe/Moscow',
})
const defaultAppSettings = (): AppSettings => ({
  theme: 'system',
  density: 'comfortable',
  accentColor: '#D9534F',
  blur: 24,
  showMonthSummary: true,
})

function seedEntries(settings = defaultWorkSettings()) {
  return generateMonthEntries(new Date(), settings)
}

interface ShiftStore {
  session: SessionState
  hydrated: boolean
  activeTab: 'calendar' | 'earnings' | 'settings' | 'admin'
  calendarPanelOpen: boolean
  selectedDate: string | null
  month: string
  profile: UserProfile
  settings: WorkSettings
  appSettings: AppSettings
  entries: Record<string, DayEntry>
  setSession: (session: SessionState) => void
  startGuest: () => void
  hydrateAccount: (userId: string, email?: string) => Promise<void>
  logout: () => Promise<void>
  setActiveTab: (tab: ShiftStore['activeTab']) => void
  setCalendarPanelOpen: (open: boolean) => void
  setSelectedDate: (date: string | null) => void
  setMonth: (date: Date) => void
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>
  updateSettings: (patch: Partial<WorkSettings>) => Promise<void>
  updateAppSettings: (patch: Partial<AppSettings>) => Promise<void>
  upsertDay: (entry: DayEntry) => Promise<void>
  seedCurrentMonth: () => Promise<void>
}

async function persistProfile(userId: string, profile: UserProfile) {
  if (!supabase) return
  await supabase.from('profiles').update({
    display_name: profile.name,
    username: profile.username.replace(/^@/, '').trim().toLowerCase(),
    avatar_url: profile.avatarUrl ?? null,
  }).eq('id', userId)
}

export const useShiftStore = create<ShiftStore>()(persist((set, get) => ({
  session: { mode: 'unknown' },
  hydrated: false,
  activeTab: 'calendar',
  calendarPanelOpen: false,
  selectedDate: null,
  month: format(new Date(), 'yyyy-MM-dd'),
  profile: defaultProfile(),
  settings: defaultWorkSettings(),
  appSettings: defaultAppSettings(),
  entries: seedEntries(),

  setSession: (session) => set({ session }),

  startGuest: () => {
    const settings = defaultWorkSettings()
    set({
      session: { mode: 'guest' }, hydrated: true, profile: defaultProfile(), settings,
      appSettings: defaultAppSettings(), entries: seedEntries(settings), activeTab: 'calendar',
    })
  },

  hydrateAccount: async (userId, email) => {
    if (!supabase) return
    const [profileRes, workRes, appRes, entriesRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('work_settings').select('*').eq('user_id', userId).single(),
      supabase.from('app_settings').select('*').eq('user_id', userId).single(),
      supabase.from('day_entries').select('*').eq('user_id', userId),
    ])

    const settings = workSettingsFromRow(workRes.data)
    const generated = seedEntries(settings)
    const entries = { ...generated }
    for (const row of entriesRes.data ?? []) entries[entryFromRow(row).date] = entryFromRow(row)

    if (!profileRes.data) {
      await supabase.from('profiles').upsert({
        id: userId,
        display_name: 'Пользователь',
        username: `user_${userId.slice(0, 8)}`,
      })
    }

    set({
      session: { mode: 'account', userId, email },
      hydrated: true,
      profile: profileRes.data ? profileFromRow(profileRes.data, email) : { ...defaultProfile(), id: userId, email },
      settings,
      appSettings: appSettingsFromRow(appRes.data),
      entries,
      activeTab: 'calendar',
    })
  },

  logout: async () => {
    if (supabase) await supabase.auth.signOut()
    set({ session: { mode: 'unknown' }, hydrated: false, profile: defaultProfile(), settings: defaultWorkSettings(), appSettings: defaultAppSettings(), entries: seedEntries(), activeTab: 'calendar' })
  },

  setActiveTab: (activeTab) => set({ activeTab }),
  setCalendarPanelOpen: (calendarPanelOpen) => set({ calendarPanelOpen }),
  setSelectedDate: (selectedDate) => set({ selectedDate }),
  setMonth: (date) => set({ month: format(date, 'yyyy-MM-dd') }),

  updateProfile: async (patch) => {
    const next = { ...get().profile, ...patch }
    set({ profile: next })
    if (get().session.mode === 'account' && get().session.userId) await persistProfile(get().session.userId!, next)
  },

  updateSettings: async (patch) => {
    const next = { ...get().settings, ...patch }
    set({ settings: next })
    if (get().session.mode === 'account' && get().session.userId && supabase) {
      await supabase.from('work_settings').upsert({
        user_id: get().session.userId!,
        pay_per_shift: next.payPerShift,
        extra_pay: next.extraPay,
        default_start: next.defaultStart,
        default_end: next.defaultEnd,
        monthly_hours_target: next.monthlyHoursTarget,
        schedule_type: next.scheduleType,
        weekend_days: next.weekendDays,
        weekdays: next.weekdays,
        timezone: next.timezone,
      }, { onConflict: 'user_id' })
    }
  },

  updateAppSettings: async (patch) => {
    const next = { ...get().appSettings, ...patch }
    set({ appSettings: next })
    if (get().session.mode === 'account' && get().session.userId && supabase) {
      await supabase.from('app_settings').upsert({
        user_id: get().session.userId!, theme: next.theme, density: next.density,
        accent_color: next.accentColor, blur: next.blur, show_month_summary: next.showMonthSummary,
      }, { onConflict: 'user_id' })
    }
  },

  upsertDay: async (entry) => {
    const next = { ...get().entries, [entry.date]: entry }
    set({ entries: next })
    if (get().session.mode === 'account' && get().session.userId && supabase) {
      await supabase.from('day_entries').upsert({
        user_id: get().session.userId!, date: entry.date, kind: entry.kind, hours: entry.hours,
        start_time: entry.start ?? null, end_time: entry.end ?? null, note: entry.note ?? null,
        off_reason: entry.offReason ?? null, extra_compensation: entry.extraCompensation ?? null,
        restored_work: entry.restoredWork ?? null,
      }, { onConflict: 'user_id,date' })
    }
  },

  seedCurrentMonth: async () => {
    const generated = generateMonthEntries(parseISO(get().month), get().settings)
    for (const entry of Object.values(generated)) await get().upsertDay(entry)
  },
}), {
  name: 'work-calendar-guest-v2',
  partialize: (state) => state.session.mode === 'guest'
    ? { session: { mode: 'guest' }, profile: state.profile, settings: state.settings, appSettings: state.appSettings, entries: state.entries, month: state.month }
    : { session: { mode: 'unknown' }, appSettings: state.appSettings },
}))
