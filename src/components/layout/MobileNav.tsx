'use client'

import { motion } from 'framer-motion'
import { X, CalendarDays, ChartNoAxesCombined, Settings2, ShieldCheck } from 'lucide-react'
import type { ActiveTab } from '@/shared/types'
import { useShiftStore } from '@/store/useShiftStore'

export function MobileNav({ onClose }: { onClose: () => void }) {
  const setActiveTab = useShiftStore((state) => state.setActiveTab)
  const role = useShiftStore((s) => s.profile.role)
  const items: Array<{ id: ActiveTab; label: string; icon: typeof CalendarDays }> = [
    { id: 'calendar', label: 'Календарь', icon: CalendarDays },
    { id: 'earnings', label: 'Заработок', icon: ChartNoAxesCombined },
    { id: 'settings', label: 'Настройки', icon: Settings2 },
    ...((role === 'admin' || role === 'owner') ? [{ id: 'admin' as const, label: 'Администрирование', icon: ShieldCheck }] : []),
  ]
  return <motion.div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-md md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <motion.aside initial={{ x: -40 }} animate={{ x: 0 }} exit={{ x: -40 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }} className="glass h-full w-[86vw] max-w-[340px] rounded-r-[30px] p-4">
      <div className="flex items-center justify-between px-2"><div className="text-lg font-semibold">Разделы</div><button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-[var(--surface)]"><X className="h-5 w-5" /></button></div>
      <div className="mt-6 space-y-2">{items.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => { setActiveTab(id); onClose() }} className="flex w-full items-center gap-3 rounded-2xl bg-[var(--surface)] px-4 py-3.5 text-left text-sm font-medium"><Icon className="h-5 w-5" />{label}</button>)}</div>
    </motion.aside>
  </motion.div>
}
