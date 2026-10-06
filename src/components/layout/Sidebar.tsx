'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarDays, ChartNoAxesCombined, Settings2, ShieldCheck, ChevronDown, LogOut } from 'lucide-react'
import { useShiftStore } from '@/store/useShiftStore'
import { cn } from '@/shared/lib/cn'
import type { ActiveTab } from '@/shared/types'

export function Sidebar() {
  const { activeTab, setActiveTab, profile, logout, session } = useShiftStore()
  const [calendarOpen, setCalendarOpen] = useState(true)
  const admin = profile.role === 'admin' || profile.role === 'owner'

  const item = (id: ActiveTab, label: string, Icon: typeof CalendarDays) => {
    const active = id === activeTab
    return (
      <button key={id} onClick={() => setActiveTab(id)} className={cn('relative flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition', active ? 'text-[var(--ink)]' : 'text-muted hover:text-[var(--ink)]')}>
        {active && <motion.div layoutId="side-active" className="absolute inset-0 rounded-2xl bg-[var(--surface-strong)] shadow-soft" transition={{ type: 'spring', stiffness: 400, damping: 20 }} />}
        <Icon className="relative z-10 h-[18px] w-[18px]" />
        <span className="relative z-10">{label}</span>
      </button>
    )
  }

  return (
    <aside className="fixed left-0 top-0 z-30 hidden h-screen w-[250px] p-4 md:block">
      <div className="glass flex h-full flex-col rounded-[28px] p-3">
        <div className="px-3 pb-5 pt-3 text-base font-semibold">Навигация</div>
        <nav className="flex-1 space-y-1">
          <button onClick={() => setCalendarOpen((v) => !v)} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-muted hover:text-[var(--ink)]">
            <CalendarDays className="h-[18px] w-[18px]" /><span>Календарь</span><ChevronDown className={cn('ml-auto h-4 w-4 transition', calendarOpen && 'rotate-180')} />
          </button>
          {calendarOpen && <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="ml-4 space-y-1 border-l border-black/5 pl-2 dark:border-white/10">
            <button onClick={() => setActiveTab('calendar')} className={cn('w-full rounded-xl px-3 py-2 text-left text-sm', activeTab === 'calendar' ? 'bg-[var(--surface-strong)] font-semibold' : 'text-muted')}>Смены</button>
            <button onClick={() => setActiveTab('earnings')} className={cn('w-full rounded-xl px-3 py-2 text-left text-sm', activeTab === 'earnings' ? 'bg-[var(--surface-strong)] font-semibold' : 'text-muted')}>Заработок</button>
          </motion.div>}
          {item('settings', 'Настройки приложения', Settings2)}
          {admin && item('admin', 'Администрирование', ShieldCheck)}
        </nav>

        <div className="space-y-2 border-t border-black/5 pt-3 dark:border-white/10">
          <div className="flex items-center gap-3 rounded-2xl bg-[var(--surface)] p-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--surface-strong)] text-xs font-semibold">
              {profile.avatarUrl ? <img src={profile.avatarUrl} alt="Аватар" className="h-full w-full object-cover" /> : profile.name.slice(0, 1)}
            </div>
            <div className="min-w-0"><div className="truncate text-sm font-semibold">{profile.name}</div><div className="truncate text-xs text-muted">{profile.username}{profile.role !== 'user' ? ` · ${profile.role}` : ''}</div></div>
          </div>
          <button onClick={() => void logout()} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-muted hover:bg-[var(--surface)] hover:text-[var(--ink)]"><LogOut className="h-4 w-4" />{session.mode === 'guest' ? 'Выйти из гостя' : 'Выйти из аккаунта'}</button>
        </div>
      </div>
    </aside>
  )
}
