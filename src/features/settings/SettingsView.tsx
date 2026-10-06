'use client'

import { ChangeEvent, useState } from 'react'
import { LogOut, Palette, UserRound, Shield, Save } from 'lucide-react'
import { useShiftStore } from '@/store/useShiftStore'
import { supabase } from '@/shared/lib/supabase/browser'
import type { ThemeMode, DensityMode } from '@/shared/types'

export function SettingsView() {
  const profile = useShiftStore((s) => s.profile)
  const appSettings = useShiftStore((s) => s.appSettings)
  const updateProfile = useShiftStore((s) => s.updateProfile)
  const updateAppSettings = useShiftStore((s) => s.updateAppSettings)
  const logout = useShiftStore((s) => s.logout)
  const session = useShiftStore((s) => s.session)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const avatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (session.mode === 'account' && session.userId && supabase) {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${session.userId}/avatar.${ext}`
      const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type })
      if (!error) {
        const { data } = supabase.storage.from('avatars').getPublicUrl(path)
        await updateProfile({ avatarUrl: `${data.publicUrl}?t=${Date.now()}` })
      }
    } else {
      const reader = new FileReader(); reader.onload = () => void updateProfile({ avatarUrl: String(reader.result) }); reader.readAsDataURL(file)
    }
  }

  const saveName = async (v: string) => { setSaving(true); await updateProfile({ name: v }); setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 1200) }
  const saveUsername = async (v: string) => { setSaving(true); await updateProfile({ username: v.startsWith('@') ? v : `@${v}` }); setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 1200) }

  return <section className="min-w-0"><div className="text-sm text-muted">Приложение</div><h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">Настройки</h1>
    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      <div className="glass rounded-[28px] p-5 md:p-7"><div className="flex items-center gap-2 text-lg font-semibold"><UserRound className="h-5 w-5" />Профиль</div><div className="mt-5 flex items-center gap-4"><label className="grid h-20 w-20 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-[24px] bg-[var(--surface-strong)] text-2xl font-semibold">{profile.avatarUrl ? <img src={profile.avatarUrl} alt="Аватар" className="h-full w-full object-cover" /> : profile.name.slice(0,1)}<input type="file" accept="image/*" onChange={avatarChange} className="hidden" /></label><div><div className="font-semibold">Фото профиля</div><div className="mt-1 text-xs text-muted">ID: {profile.id || 'гостевой режим'}</div><div className="mt-1 text-xs text-muted">{profile.role === 'premium' ? 'Premium' : profile.role === 'owner' ? 'Владелец' : profile.role === 'admin' ? 'Администратор' : 'Обычный аккаунт'}</div></div></div>
        <Field label="Имя" value={profile.name} onBlurSave={saveName} />
        <Field label="Username" value={profile.username} onBlurSave={saveUsername} />
        <label className="mt-4 block text-sm font-medium">Email<input value={profile.email ?? ''} readOnly className="soft-control mt-2 w-full rounded-2xl px-4 py-3 opacity-70" /></label>
        {saving && <div className="mt-3 text-xs text-muted">Сохранение…</div>}{saved && <div className="mt-3 flex items-center gap-2 text-xs text-[var(--accent)]"><Save className="h-3.5 w-3.5" />Сохранено</div>}
      </div>

      <div className="glass rounded-[28px] p-5 md:p-7"><div className="flex items-center gap-2 text-lg font-semibold"><Palette className="h-5 w-5" />Внешний вид</div><div className="mt-5 grid gap-4 sm:grid-cols-2"><Select label="Тема" value={appSettings.theme} onChange={(v) => void updateAppSettings({ theme: v as ThemeMode })} options={[['system','Системная'],['light','Светлая'],['dark','Тёмная']]} /><Select label="Плотность" value={appSettings.density} onChange={(v) => void updateAppSettings({ density: v as DensityMode })} options={[['comfortable','Комфортная'],['compact','Компактная']]} /></div>
        <div className="mt-5 rounded-2xl bg-[var(--surface)] p-4"><div className="text-sm font-semibold">Цвет акцента</div><div className="mt-3 flex flex-wrap gap-2">{['#D9534F','#6D5DD3','#2F80ED','#1F9D7A','#CC8B2E','#111827'].map((color) => <button key={color} title={color} onClick={() => void updateAppSettings({ accentColor: color })} className="h-10 w-10 rounded-full border-2 border-white shadow-soft" style={{ backgroundColor: color }} />)}</div></div>
        {(['premium','admin','owner'].includes(profile.role)) && <div className="mt-4 rounded-2xl bg-[var(--surface)] p-4"><div className="text-sm font-semibold">Дополнительные настройки Premium</div><div className="mt-3 flex flex-wrap gap-2">{[16,24,32,40].map((blur) => <button key={blur} onClick={() => void updateAppSettings({ blur })} className="rounded-full bg-[var(--surface-strong)] px-3 py-2 text-xs font-semibold">Стекло {blur}px</button>)}</div><div className="mt-2 text-xs text-muted">Premium добавляет кастомизацию, но не забирает функции у обычных пользователей.</div></div>}
      </div>

      <div className="glass rounded-[28px] p-5 md:p-7"><div className="flex items-center gap-2 text-lg font-semibold"><Shield className="h-5 w-5" />Аккаунт</div><div className="mt-3 text-sm leading-6 text-muted">Рабочие настройки и сами дни теперь находятся внутри раздела «Календарь → настройки». Здесь остаются только настройки приложения и аккаунта.</div><button onClick={() => void logout()} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-semibold text-[var(--accent)]"><LogOut className="h-4 w-4" />Выйти из аккаунта</button></div>
    </div>
  </section>
}

function Field({ label, value, onBlurSave }: { label: string; value: string; onBlurSave: (v: string) => void }) { return <label className="mt-4 block text-sm font-medium">{label}<input key={value} defaultValue={value} onBlur={(e) => void onBlurSave(e.target.value)} className="soft-control mt-2 w-full rounded-2xl px-4 py-3" /></label> }
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[][] }) { return <label className="block text-sm font-medium">{label}<select value={value} onChange={(e) => onChange(e.target.value)} className="soft-control mt-2 w-full rounded-2xl px-3 py-3">{options.map(([v,t]) => <option key={v} value={v}>{t}</option>)}</select></label> }
