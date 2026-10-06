'use client'

import { ReactNode, useEffect, useState } from 'react'
import { Menu, Moon, Sun } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'
import { useShiftStore } from '@/store/useShiftStore'
import { cn } from '@/shared/lib/cn'

export function Layout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const profile = useShiftStore((state) => state.profile)
  const appSettings = useShiftStore((state) => state.appSettings)
  const updateAppSettings = useShiftStore((state) => state.updateAppSettings)

  useEffect(() => {
    const root = document.documentElement
    const dark = appSettings.theme === 'dark' || (appSettings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    root.classList.toggle('dark', dark)
    root.style.setProperty('--accent', appSettings.accentColor)
    root.style.setProperty('--blur', `${appSettings.blur}px`)
  }, [appSettings])

  return <div className={cn('min-h-screen px-3 pb-6 md:px-6 md:pl-[270px]', appSettings.density === 'compact' && 'density-compact')}>
    <Sidebar />
    <header className="sticky top-0 z-20 mx-auto flex max-w-[1500px] items-center justify-between gap-3 py-3 md:py-5">
      <button onClick={() => setMobileOpen(true)} className="glass grid h-11 w-11 shrink-0 place-items-center rounded-2xl md:hidden"><Menu className="h-5 w-5" /></button>
      <div className="hidden md:block" />
      <div className="ml-auto flex items-center gap-2">
        <button title="Переключить тему" onClick={() => void updateAppSettings({ theme: appSettings.theme === 'dark' ? 'light' : 'dark' })} className="glass grid h-11 w-11 place-items-center rounded-2xl">{appSettings.theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}</button>
        <button onClick={() => void updateAppSettings({ theme: 'system' })} className="glass flex min-w-0 items-center gap-3 rounded-full px-2.5 py-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--surface-strong)] text-xs font-semibold">{profile.avatarUrl ? <img src={profile.avatarUrl} alt="Аватар" className="h-full w-full object-cover" /> : profile.name.slice(0, 1)}</div>
          <span className="hidden max-w-[150px] truncate text-sm font-medium sm:block">{profile.username}</span>
        </button>
      </div>
    </header>
    <main className="mx-auto max-w-[1500px]">{children}</main>
    <AnimatePresence>{mobileOpen && <MobileNav onClose={() => setMobileOpen(false)} />}</AnimatePresence>
  </div>
}
