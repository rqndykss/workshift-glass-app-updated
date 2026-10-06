'use client'

import { useMemo } from 'react'
import { format, subMonths } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Download, Gift } from 'lucide-react'
import { useShiftStore } from '@/store/useShiftStore'
import { calculateCompOffBalance, calculateMonth } from '@/shared/lib/calculations'

export function EarningsView() {
  const entries = useShiftStore((s) => s.entries)
  const settings = useShiftStore((s) => s.settings)
  const data = useMemo(() => Array.from({ length: 6 }, (_, index) => {
    const date = subMonths(new Date(), 5 - index)
    const prefix = format(date, 'yyyy-MM')
    const monthEntries = Object.values(entries).filter((e) => e.date.startsWith(prefix))
    const stats = calculateMonth(monthEntries, settings.payPerShift, settings.extraPay)
    return { label: format(date, 'LLL', { locale: ru }).replace('.', ''), ...stats }
  }), [entries, settings.payPerShift, settings.extraPay])
  const max = Math.max(...data.map((d) => d.income), 1)
  const comp = calculateCompOffBalance(entries)

  const exportCsv = () => {
    const lines = ['Дата,Тип,Часы,Начало,Конец,Компенсация,Заметка', ...Object.values(entries).sort((a,b) => a.date.localeCompare(b.date)).map((e) => [e.date, e.kind, e.hours, e.start ?? '', e.end ?? '', e.extraCompensation ?? '', (e.note ?? '').replaceAll(',', ' ')].join(','))]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'календарь-смен.csv'; a.click(); URL.revokeObjectURL(url)
  }

  return <section className="min-w-0">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><div className="text-sm text-muted">Календарь · аналитика</div><h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">Заработок</h1></div><button onClick={exportCsv} className="glass flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold"><Download className="h-4 w-4" />Экспорт</button></div>
    <div className="mt-5 grid gap-4 lg:grid-cols-[1.5fr_.9fr]">
      <div className="glass rounded-[28px] p-5 md:p-7"><div className="flex items-end justify-between gap-4"><div><div className="text-sm text-muted">Динамика за 6 месяцев</div><div className="mt-1 text-3xl font-semibold">{Math.round(data.reduce((s, d) => s + d.income, 0)).toLocaleString('ru-RU')} ₽</div></div><div className="text-right text-xs text-muted">смена {settings.payPerShift.toLocaleString('ru-RU')} ₽ · доп {settings.extraPay.toLocaleString('ru-RU')} ₽</div></div>
        <div className="mt-8 flex h-56 items-end gap-2 sm:h-64 sm:gap-4">{data.map((item) => <div key={item.label} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-2"><div className="relative flex-1"><div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-black/[.05] dark:bg-white/[.06]" style={{ height: `${Math.max(8, (item.income / max) * 100)}%` }} /><div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-[var(--accent)]/70" style={{ height: `${Math.max(4, (item.income / max) * 84)}%` }} /></div><div className="truncate text-center text-[10px] font-medium text-muted sm:text-xs">{item.label}</div></div>)}</div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1"><Card title="Средняя выплата" value={`${Math.round(data.reduce((s, d) => s + d.income, 0) / data.length).toLocaleString('ru-RU')} ₽`} /><Card title="Часов за период" value={`${data.reduce((s, d) => s + d.hours, 0).toFixed(1)} ч`} /><Card title="Отгулы сейчас" value={`${comp.balance} шт.`} icon={<Gift className="h-4 w-4" />} /></div>
    </div>
  </section>
}
function Card({ title, value, icon }: { title: string; value: string; icon?: React.ReactNode }) { return <div className="glass rounded-[28px] p-5"><div className="flex items-center gap-2 text-sm text-muted">{icon}{title}</div><div className="mt-2 text-3xl font-semibold">{value}</div></div> }
