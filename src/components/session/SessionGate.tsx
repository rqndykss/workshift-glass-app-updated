'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { UserRound, Sparkles } from 'lucide-react'
import { supabase } from '@/shared/lib/supabase/browser'
import { useShiftStore } from '@/store/useShiftStore'
import { AuthModal } from '@/features/auth/AuthModal'

export function SessionGate({ children }: { children: React.ReactNode }) {
  const session = useShiftStore((s) => s.session)
  const hydrated = useShiftStore((s) => s.hydrated)
  const startGuest = useShiftStore((s) => s.startGuest)
  const hydrateAccount = useShiftStore((s) => s.hydrateAccount)
  const setSession = useShiftStore((s) => s.setSession)
  const [authOpen, setAuthOpen] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let active = true
    const init = async () => {
      if (!supabase) { setChecking(false); return }
      const { data } = await supabase.auth.getSession()
      if (!active) return
      if (data.session?.user) await hydrateAccount(data.session.user.id, data.session.user.email ?? undefined)
      setChecking(false)
    }
    void init()
    if (!supabase) return () => { active = false }
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!active) return
      if (next?.user) void hydrateAccount(next.user.id, next.user.email ?? undefined)
      else if (session.mode === 'account') setSession({ mode: 'unknown' })
    })
    return () => { active = false; listener.subscription.unsubscribe() }
  }, [])

  if (checking || (session.mode === 'account' && !hydrated)) {
    return <div className="grid min-h-screen place-items-center p-6"><div className="glass rounded-3xl px-6 py-4 text-sm text-muted">Загрузка…</div></div>
  }

  if (session.mode === 'unknown') {
    return (
      <div className="grid min-h-screen place-items-center p-5">
        <motion.div initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass w-full max-w-[520px] rounded-[32px] p-6 sm:p-8">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[var(--accent)] text-white"><Sparkles className="h-6 w-6" /></div>
          <h1 className="mt-5 text-center text-3xl font-semibold tracking-tight">Календарь смен</h1>
          <p className="mx-auto mt-2 max-w-sm text-center text-sm leading-6 text-muted">Сохраняйте смены, часы и заработок в аккаунте — или зайдите как гость, ничего не создавая.</p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <button onClick={() => setAuthOpen(true)} className="rounded-2xl bg-[var(--ink)] px-4 py-3.5 text-sm font-semibold text-white">Войти / зарегистрироваться</button>
            <button onClick={startGuest} className="rounded-2xl bg-[var(--surface-strong)] px-4 py-3.5 text-sm font-semibold shadow-soft">Продолжить как гость</button>
          </div>
          {!supabase && <div className="mt-4 rounded-2xl bg-[var(--warning-soft)] p-3 text-xs leading-5 text-muted">Для аккаунтов подключите Supabase и добавьте переменные из `.env.local`. Гостевой режим уже работает.</div>}
        </motion.div>
        <AnimatePresence>{authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}</AnimatePresence>
      </div>
    )
  }

  return <>{children}</>
}
