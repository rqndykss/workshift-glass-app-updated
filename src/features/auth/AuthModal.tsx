'use client'

import { FormEvent, useState } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { supabase } from '@/shared/lib/supabase/browser'
import { useShiftStore } from '@/store/useShiftStore'

export function AuthModal({ onClose }: { onClose: () => void }) {
  const hydrateAccount = useShiftStore((state) => state.hydrateAccount)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(''); setMessage('')
    if (!supabase) { setError('Supabase ещё не подключён.'); return }
    setBusy(true)
    try {
      if (mode === 'register') {
        const cleanUsername = username.replace(/^@/, '').trim().toLowerCase()
        if (!cleanUsername) throw new Error('Введите username.')
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: identifier.trim(), password,
          options: { data: { display_name: name.trim() || 'Пользователь', username: cleanUsername } },
        })
        if (signUpError) throw signUpError
        if (data.session?.user) {
          await hydrateAccount(data.session.user.id, data.session.user.email ?? undefined)
          onClose()
        } else {
          setMessage('Аккаунт создан. Проверьте почту, если в проекте включено подтверждение email.')
        }
      } else {
        let email = identifier.trim()
        if (!email.includes('@')) {
          const { data: rpcData, error: rpcError } = await supabase.rpc('email_for_username', { p_username: email.replace(/^@/, '').toLowerCase() })
          if (rpcError || !rpcData) throw new Error('Логин не найден.')
          email = String(rpcData)
        }
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError || !data.user) throw signInError ?? new Error('Не удалось войти.')
        await hydrateAccount(data.user.id, data.user.email ?? undefined)
        onClose()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось выполнить операцию.')
    } finally { setBusy(false) }
  }

  return (
    <motion.div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/20 p-2 backdrop-blur-md md:items-center md:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.form onSubmit={submit} initial={{ y: 70, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 70, opacity: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 17 }} className="glass-strong w-full max-w-[480px] rounded-[30px] p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div><div className="text-2xl font-semibold">{mode === 'login' ? 'Вход' : 'Новый аккаунт'}</div><div className="mt-1 text-sm text-muted">Данные календаря будут привязаны к вашему аккаунту.</div></div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--surface)]"><X className="h-5 w-5" /></button>
        </div>
        {mode === 'register' && <><label className="mt-5 block text-sm font-medium">Имя<input value={name} onChange={(e) => setName(e.target.value)} className="soft-control mt-2 w-full rounded-2xl px-4 py-3" placeholder="Алексей" /></label><label className="mt-4 block text-sm font-medium">Username<input value={username} onChange={(e) => setUsername(e.target.value)} className="soft-control mt-2 w-full rounded-2xl px-4 py-3" placeholder="rqndykss" /></label></>}
        <label className="mt-5 block text-sm font-medium">{mode === 'login' ? 'Email или username' : 'Email'}<input type={mode === 'login' ? 'text' : 'email'} value={identifier} onChange={(e) => setIdentifier(e.target.value)} className="soft-control mt-2 w-full rounded-2xl px-4 py-3" placeholder={mode === 'login' ? 'you@example.com или @username' : 'you@example.com'} required /></label>
        <label className="mt-4 block text-sm font-medium">Пароль<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="soft-control mt-2 w-full rounded-2xl px-4 py-3" placeholder="••••••••" minLength={6} required /></label>
        {error && <div className="mt-4 rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--accent)]">{error}</div>}
        {message && <div className="mt-4 rounded-2xl bg-[var(--surface)] px-4 py-3 text-sm text-muted">{message}</div>}
        <button disabled={busy} className="mt-6 w-full rounded-2xl bg-[var(--ink)] px-4 py-3.5 text-sm font-semibold text-[var(--ink-on)] disabled:opacity-60">{busy ? 'Подождите…' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}</button>
        <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setMessage('') }} className="mt-3 w-full text-sm text-muted hover:text-[var(--ink)]">{mode === 'login' ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}</button>
      </motion.form>
    </motion.div>
  )
}
