'use client'

import { useMemo, useState } from 'react'
import { addMonths, format, isSameMonth, isToday, parseISO, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight, Clock3, WalletCards, Settings2, Gift, Umbrella, CalendarDays, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useShiftStore } from '@/store/useShiftStore'
import { calculateCompOffBalance, calculateMonth } from '@/shared/lib/calculations'
import { generateMonthEntries } from '@/shared/lib/schedule'
import { getCalendarDays, keyForDate, longDateLabel, monthLabel, ruWeekdays, hoursBetween } from '@/shared/lib/date'
import { cn } from '@/shared/lib/cn'
import type { DayEntry, ShiftKind, ExtraCompensation, OffReason } from '@/shared/types'

const labels: Record<ShiftKind, string> = { work: 'Смена', off: 'Выходной', extra: 'Доп. смена', vacation: 'Отпуск' }
const colors: Record<ShiftKind, string> = {
  work: 'day-work', off: 'day-off', extra: 'day-extra', vacation: 'day-vacation',
}

export function CalendarView() {
  const monthString = useShiftStore((s) => s.month)
  const setMonth = useShiftStore((s) => s.setMonth)
  const entries = useShiftStore((s) => s.entries)
  const settings = useShiftStore((s) => s.settings)
  const calendarPanelOpen = useShiftStore((s) => s.calendarPanelOpen)
  const setCalendarPanelOpen = useShiftStore((s) => s.setCalendarPanelOpen)
  const selectedDate = useShiftStore((s) => s.selectedDate)
  const setSelectedDate = useShiftStore((s) => s.setSelectedDate)
  const upsertDay = useShiftStore((s) => s.upsertDay)
  const updateSettings = useShiftStore((s) => s.updateSettings)
  const [draftKind, setDraftKind] = useState<ShiftKind>('work')
  const [draftHours, setDraftHours] = useState(8)
  const [draftStart, setDraftStart] = useState(settings.defaultStart)
  const [draftEnd, setDraftEnd] = useState(settings.defaultEnd)
  const [draftExtra, setDraftExtra] = useState<ExtraCompensation>('pay')
  const [draftOffReason, setDraftOffReason] = useState<OffReason>('personal')
  const [draftNote, setDraftNote] = useState('')

  const month = parseISO(monthString)
  const days = useMemo(() => getCalendarDays(month), [month])
  const monthEntries = Object.values(entries).filter((entry) => entry.date.startsWith(format(month, 'yyyy-MM')))
  const stats = calculateMonth(monthEntries, settings.payPerShift, settings.extraPay)
  const comp = calculateCompOffBalance(entries)

  const openDay = (date: Date) => {
    const key = keyForDate(date)
    const entry = entries[key]
    setSelectedDate(key)
    setDraftKind(entry?.kind ?? 'work')
    setDraftHours(entry?.hours || entry?.restoredWork?.hours || hoursBetween(settings.defaultStart, settings.defaultEnd))
    setDraftStart(entry?.start ?? entry?.restoredWork?.start ?? settings.defaultStart)
    setDraftEnd(entry?.end ?? entry?.restoredWork?.end ?? settings.defaultEnd)
    setDraftExtra(entry?.extraCompensation ?? 'pay')
    setDraftOffReason(entry?.offReason ?? 'personal')
    setDraftNote(entry?.note ?? '')
  }

  const saveDay = async () => {
    if (!selectedDate) return
    const previous = entries[selectedDate]
    const preserved = previous?.restoredWork ?? ((previous?.kind === 'work' || previous?.kind === 'extra') ? { hours: previous.hours, start: previous.start ?? settings.defaultStart, end: previous.end ?? settings.defaultEnd } : undefined)
    const isNonWorking = draftKind === 'off' || draftKind === 'vacation'
    const workData = preserved ?? { hours: draftHours, start: draftStart, end: draftEnd }
    const entry: DayEntry = {
      date: selectedDate,
      kind: draftKind,
      hours: isNonWorking ? 0 : draftHours,
      start: isNonWorking ? undefined : draftStart,
      end: isNonWorking ? undefined : draftEnd,
      note: draftNote || undefined,
      offReason: draftKind === 'off' ? draftOffReason : undefined,
      extraCompensation: draftKind === 'extra' ? draftExtra : undefined,
      restoredWork: isNonWorking ? workData : undefined,
    }
    if ((draftKind === 'work' || draftKind === 'extra') && preserved && draftHours === (previous?.hours ?? 0)) {
      entry.hours = workData.hours; entry.start = workData.start; entry.end = workData.end
    }
    await upsertDay(entry)
    setSelectedDate(null)
  }

  const applySchedule = async () => {
    const generated = generateMonthEntries(month, settings)
    for (const entry of Object.values(generated)) await upsertDay(entry)
    setCalendarPanelOpen(false)
  }

  return <section className="min-w-0">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0"><div className="text-sm text-muted">Календарь</div><h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">{monthLabel(month)}</h1></div>
      <div className="flex w-full flex-wrap gap-2 lg:w-auto">
        <button onClick={() => setMonth(subMonths(month, 1))} className="glass grid h-11 w-11 place-items-center rounded-2xl"><ChevronLeft className="h-5 w-5" /></button>
        <button onClick={() => setMonth(new Date())} className="glass rounded-2xl px-4 text-sm font-semibold">Сегодня</button>
        <button onClick={() => setMonth(addMonths(month, 1))} className="glass grid h-11 w-11 place-items-center rounded-2xl"><ChevronRight className="h-5 w-5" /></button>
        <button onClick={() => setCalendarPanelOpen(true)} className="glass ml-auto grid h-11 w-11 place-items-center rounded-2xl lg:ml-0"><Settings2 className="h-5 w-5" /></button>
      </div>
    </div>

    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Summary label="Смены" value={`${stats.shifts}`} icon={<Clock3 className="h-4 w-4" />} />
      <Summary label="Часы" value={`${stats.hours.toFixed(1)} ч`} icon={<CalendarDays className="h-4 w-4" />} />
      <Summary label="Заработок" value={`${Math.round(stats.income).toLocaleString('ru-RU')} ₽`} icon={<WalletCards className="h-4 w-4" />} />
      <Summary label="Отгулы" value={`${comp.balance} шт.`} icon={<Gift className="h-4 w-4" />} hint={`Начислено ${comp.accrued} · использовано ${comp.used}`} />
    </div>

    <div className="mt-4 glass overflow-hidden rounded-[28px] p-2 sm:p-3 md:p-5">
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wider text-muted sm:text-xs">{ruWeekdays.map((day) => <div key={day} className="px-0 py-2 sm:px-1">{day}</div>)}</div>
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {days.map((date) => {
          const key = keyForDate(date)
          const entry = entries[key]
          const outside = !isSameMonth(date, month)
          const today = isToday(date)
          const colorClass = entry ? colors[entry.kind] : ''
          return <motion.button key={key} layout whileTap={{ scale: 0.985 }} onClick={() => openDay(date)} className={cn('min-w-0 rounded-[16px] border p-1.5 text-left transition sm:min-h-[92px] sm:rounded-2xl sm:p-2 md:min-h-[116px]', outside ? 'opacity-25' : 'border-[var(--line)]', colorClass, today && 'ring-2 ring-[var(--accent)]/30')}>
            <div className="flex items-start justify-between gap-1"><span className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-semibold sm:h-7 sm:w-7 sm:text-xs', today ? 'bg-[var(--ink)] text-[var(--ink-on)]' : 'bg-black/[.04] dark:bg-white/[.06]')}>{format(date, 'd')}</span>{entry?.hours ? <span className="hidden text-[10px] text-muted sm:block">{entry.hours}ч</span> : null}</div>
            {entry && !outside && <div className="mt-2 sm:mt-4"><span className="inline-flex max-w-full items-center rounded-full px-2 py-1 text-[9px] font-semibold sm:text-[11px]">{labels[entry.kind]}</span>{entry.kind === 'extra' && <span className="mt-1 block text-[9px] text-muted sm:text-[10px]">{entry.extraCompensation === 'day_off' ? '→ отгул' : `+${settings.extraPay.toLocaleString('ru-RU')} ₽`}</span>}{(entry.start && entry.end && entry.kind !== 'off') && <div className="mt-1 hidden text-[10px] text-muted sm:block">{entry.start} — {entry.end}</div>}</div>}
          </motion.button>
        })}
      </div>
      <Legend />
    </div>

    <AnimatePresence>
      {calendarPanelOpen && <CalendarSettings onClose={() => setCalendarPanelOpen(false)} settings={settings} updateSettings={updateSettings} applySchedule={applySchedule} />}
      {selectedDate && <DayEditor selectedDate={selectedDate} onClose={() => setSelectedDate(null)} draftKind={draftKind} setDraftKind={setDraftKind} draftHours={draftHours} setDraftHours={setDraftHours} draftStart={draftStart} setDraftStart={setDraftStart} draftEnd={draftEnd} setDraftEnd={setDraftEnd} draftExtra={draftExtra} setDraftExtra={setDraftExtra} draftOffReason={draftOffReason} setDraftOffReason={setDraftOffReason} draftNote={draftNote} setDraftNote={setDraftNote} onSave={saveDay} compBalance={comp.balance} settings={settings} />}
    </AnimatePresence>
  </section>
}

function Summary({ label, value, icon, hint }: { label: string; value: string; icon: React.ReactNode; hint?: string }) { return <div className="glass rounded-[22px] p-4"><div className="flex items-center gap-2 text-xs font-medium text-muted">{icon}{label}</div><div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>{hint && <div className="mt-1 text-[11px] text-muted">{hint}</div>}</div> }
function Legend() { return <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-muted"><LegendItem cls="bg-[var(--work-bg)] text-[var(--work-text)]" text="Смена" /><LegendItem cls="bg-[var(--extra-bg)] text-[var(--extra-text)]" text="Доп. смена" /><LegendItem cls="bg-[var(--vacation-bg)] text-[var(--vacation-text)]" text="Отпуск" /><LegendItem cls="bg-[var(--off-bg)] text-[var(--off-text)]" text="Выходной" /></div> }
function LegendItem({ cls, text }: { cls: string; text: string }) { return <span className={cn('rounded-full px-2.5 py-1', cls)}>{text}</span> }

function CalendarSettings({ onClose, settings, updateSettings, applySchedule }: { onClose: () => void; settings: any; updateSettings: (p: any) => Promise<void>; applySchedule: () => Promise<void> }) {
  const days = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']
  return <Sheet title="Настройки календаря" onClose={onClose}>
    <div className="grid gap-4 sm:grid-cols-2">
      <Select label="График" value={settings.scheduleType} onChange={(v) => void updateSettings({ scheduleType: v })} options={[['5/2','5 / 2'],['2/2','2 / 2'],['1/3','1 / 3'],['3/3','3 / 3'],['4/2','4 / 2'],['weekdays','По дням недели']]} />
      <NumberField label="Цена обычной смены" value={settings.payPerShift} onChange={(v) => void updateSettings({ payPerShift: v })} suffix="₽" />
      <NumberField label="Доп. смена деньгами" value={settings.extraPay} onChange={(v) => void updateSettings({ extraPay: v })} suffix="₽" />
      <NumberField label="План часов в месяц" value={settings.monthlyHoursTarget} onChange={(v) => void updateSettings({ monthlyHoursTarget: v })} suffix="ч" />
      <TimeField label="Обычно с" value={settings.defaultStart} onChange={(v) => void updateSettings({ defaultStart: v })} />
      <TimeField label="Обычно до" value={settings.defaultEnd} onChange={(v) => void updateSettings({ defaultEnd: v })} />
    </div>
    <div className="mt-5 rounded-2xl bg-[var(--surface)] p-4"><div className="text-sm font-semibold">Выходные дни</div><div className="mt-1 text-xs text-muted">Можно выбрать любые дни недели. Для графика 5/2 они станут двумя днями отдыха.</div><div className="mt-3 grid grid-cols-7 gap-1.5">{days.map((day, index) => { const checked = settings.weekendDays.includes(index); return <button key={day} onClick={() => { const next = checked ? settings.weekendDays.filter((d: number) => d !== index) : [...settings.weekendDays, index].sort(); if (settings.scheduleType === '5/2' && next.length > 2) return; void updateSettings({ weekendDays: next }) }} className={cn('rounded-xl px-2 py-2 text-xs font-semibold', checked ? 'bg-[var(--ink)] text-[var(--ink-on)]' : 'bg-[var(--surface-strong)] text-muted')}>{day}</button> })}</div></div>
    {settings.scheduleType === 'weekdays' && <div className="mt-4 rounded-2xl bg-[var(--surface)] p-4"><div className="text-sm font-semibold">Рабочие дни недели</div><div className="mt-3 grid grid-cols-7 gap-1.5">{days.map((day, index) => { const checked = settings.weekdays.includes(index); return <button key={day} onClick={() => { const next = checked ? settings.weekdays.filter((d: number) => d !== index) : [...settings.weekdays, index].sort(); void updateSettings({ weekdays: next }) }} className={cn('rounded-xl px-2 py-2 text-xs font-semibold', checked ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface-strong)] text-muted')}>{day}</button> })}</div></div>}
    <button onClick={applySchedule} className="mt-5 w-full rounded-2xl bg-[var(--ink)] px-4 py-3.5 text-sm font-semibold text-[var(--ink-on)]">Применить график к месяцу</button>
  </Sheet>
}

function DayEditor({ selectedDate, onClose, draftKind, setDraftKind, draftHours, setDraftHours, draftStart, setDraftStart, draftEnd, setDraftEnd, draftExtra, setDraftExtra, draftOffReason, setDraftOffReason, draftNote, setDraftNote, onSave, compBalance, settings }: any) {
  const kinds: ShiftKind[] = ['work','off','extra','vacation']
  return <Sheet title="День" onClose={onClose} subtitle={longDateLabel(parseISO(selectedDate))}>
    <div className="grid grid-cols-2 gap-2">{kinds.map((kind) => <button key={kind} onClick={() => setDraftKind(kind)} className={cn('rounded-2xl px-4 py-3 text-left text-sm font-semibold', colors[kind], draftKind === kind && 'ring-2 ring-[var(--accent)]/35')}>{labels[kind]}</button>)}</div>
    {draftKind === 'off' && <div className="mt-4 rounded-2xl bg-[var(--surface)] p-4"><div className="text-sm font-semibold">Тип выходного</div><div className="mt-2 flex flex-wrap gap-2">{([['weekend','Выходной по графику'],['schedule','Выходной по циклу'],['personal','Личный'],['compensatory','Отгул']] as [OffReason,string][]).map(([key, label]) => <button key={key} disabled={key === 'compensatory' && compBalance <= 0} onClick={() => setDraftOffReason(key)} className={cn('rounded-full px-3 py-2 text-xs font-semibold', draftOffReason === key ? 'bg-[var(--ink)] text-[var(--ink-on)]' : 'bg-[var(--surface-strong)] text-muted', key === 'compensatory' && compBalance <= 0 && 'cursor-not-allowed opacity-40')}>{label}</button>)}</div>{draftOffReason === 'compensatory' && <div className="mt-2 text-xs text-muted">Осталось отгулов: {compBalance}</div>}</div>}
    {draftKind === 'extra' && <div className="mt-4 rounded-2xl bg-[var(--surface)] p-4"><div className="text-sm font-semibold">Компенсация доп. смены</div><div className="mt-2 grid grid-cols-2 gap-2"><button onClick={() => setDraftExtra('pay')} className={cn('rounded-2xl px-4 py-3 text-sm font-semibold', draftExtra === 'pay' ? 'bg-[var(--extra-bg)] text-[var(--extra-text)]' : 'bg-[var(--surface-strong)]')}>+{settings.extraPay.toLocaleString('ru-RU')} ₽</button><button onClick={() => setDraftExtra('day_off')} className={cn('rounded-2xl px-4 py-3 text-sm font-semibold', draftExtra === 'day_off' ? 'bg-[var(--extra-bg)] text-[var(--extra-text)]' : 'bg-[var(--surface-strong)]')}>1 отгул</button></div></div>}
    {draftKind !== 'off' && draftKind !== 'vacation' && <div className="mt-4 grid grid-cols-2 gap-3"><TimeField label="Начало" value={draftStart} onChange={(v) => { setDraftStart(v); setDraftHours(hoursBetween(v, draftEnd)) }} /><TimeField label="Конец" value={draftEnd} onChange={(v) => { setDraftEnd(v); setDraftHours(hoursBetween(draftStart, v)) }} /></div>}
    {draftKind !== 'off' && draftKind !== 'vacation' && <NumberField label="Фактически отработано" value={draftHours} onChange={setDraftHours} suffix="ч" />}
    <label className="mt-4 block text-sm font-medium">Заметка<textarea value={draftNote} onChange={(e) => setDraftNote(e.target.value)} rows={3} className="soft-control mt-2 w-full resize-none rounded-2xl px-4 py-3" placeholder="Например: ушёл раньше" /></label>
    <div className="mt-5 flex gap-2"><button onClick={onClose} className="w-1/3 rounded-2xl bg-[var(--surface)] px-4 py-3.5 text-sm font-semibold">Отмена</button><button onClick={onSave} className="w-2/3 rounded-2xl bg-[var(--ink)] px-4 py-3.5 text-sm font-semibold text-[var(--ink-on)]">Сохранить</button></div>
  </Sheet>
}

function Sheet({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) { return <motion.div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/25 p-2 backdrop-blur-md md:items-center md:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.div initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }} transition={{ type: 'spring', stiffness: 400, damping: 18 }} className="glass-strong max-h-[92vh] w-full max-w-[620px] overflow-y-auto rounded-[30px] p-5 sm:p-7"><div className="flex items-start justify-between gap-4"><div><div className="text-2xl font-semibold">{title}</div>{subtitle && <div className="mt-1 text-sm text-muted">{subtitle}</div>}</div><button onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--surface)]"><X className="h-5 w-5" /></button></div><div className="mt-6">{children}</div></motion.div></motion.div> }
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[][] }) { return <label className="block text-sm font-medium">{label}<select value={value} onChange={(e) => onChange(e.target.value)} className="soft-control mt-2 w-full rounded-2xl px-3 py-3">{options.map(([v,t]) => <option key={v} value={v}>{t}</option>)}</select></label> }
function NumberField({ label, value, onChange, suffix }: { label: string; value: number; onChange: (v: number) => void; suffix?: string }) { return <label className="mt-4 block text-sm font-medium">{label}<div className="relative mt-2"><input type="number" min={0} step={0.5} value={value} onChange={(e) => onChange(Number(e.target.value))} className="soft-control w-full rounded-2xl px-4 py-3 pr-12" />{suffix && <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted">{suffix}</span>}</div></label> }
function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) { return <label className="block text-sm font-medium">{label}<input type="time" value={value} onChange={(e) => onChange(e.target.value)} className="soft-control mt-2 w-full rounded-2xl px-3 py-3" /></label> }
