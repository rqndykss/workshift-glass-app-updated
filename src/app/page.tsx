'use client'

import { Layout } from '@/components/layout/Layout'
import { SessionGate } from '@/components/session/SessionGate'
import { CalendarView } from '@/features/calendar/CalendarView'
import { EarningsView } from '@/features/earnings/EarningsView'
import { SettingsView } from '@/features/settings/SettingsView'
import { AdminView } from '@/features/admin/AdminView'
import { useShiftStore } from '@/store/useShiftStore'

export default function HomePage() {
  const activeTab = useShiftStore((state) => state.activeTab)
  return <SessionGate><Layout>{activeTab === 'calendar' && <CalendarView />}{activeTab === 'earnings' && <EarningsView />}{activeTab === 'settings' && <SettingsView />}{activeTab === 'admin' && <AdminView />}</Layout></SessionGate>
}
