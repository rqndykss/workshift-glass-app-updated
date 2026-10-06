'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, ShieldCheck, UserCog, Save } from 'lucide-react'
import { supabase } from '@/shared/lib/supabase/browser'
import { useShiftStore } from '@/store/useShiftStore'

interface AdminUser { id: string; username: string; display_name: string; role: string; avatar_url?: string }

export function AdminView() {
  const profile = useShiftStore((s) => s.profile)
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<AdminUser[]>([])
  const [selected, setSelected] = useState<AdminUser | null>(null)
  const [notice, setNotice] = useState('')
  const isAdmin = profile.role === 'admin' || profile.role === 'owner'
  const isOwner = profile.role === 'owner'

  useEffect(() => { if (!isAdmin || !supabase) return; void loadUsers() }, [isAdmin])
  async function loadUsers() { if (!supabase) return; const { data } = await supabase.from('profiles').select('id,username,display_name,role,avatar_url').order('created_at', { ascending: false }).limit(200); setUsers((data ?? []) as AdminUser[]) }

  const filtered = useMemo(() => users.filter((u) => (`${u.username} ${u.display_name} ${u.id}`).toLowerCase().includes(query.toLowerCase())), [users, query])
  if (!isAdmin) return <section className="glass rounded-[28px] p-7"><div className="text-lg font-semibold">Доступ запрещён</div><div className="mt-2 text-sm text-muted">Раздел доступен только администраторам.</div></section>

  const updateRole = async (role: string) => { if (!selected || !supabase || !isOwner) return; const { error } = await supabase.from('profiles').update({ role }).eq('id', selected.id); if (error) setNotice(error.message); else { setSelected({ ...selected, role }); setUsers(users.map((u) => u.id === selected.id ? { ...u, role } : u)); setNotice('Роль сохранена.') } }

  return <section className="min-w-0"><div className="text-sm text-muted">Управление аккаунтами</div><h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">Администрирование</h1><div className="mt-5 grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
    <div className="glass min-h-[500px] rounded-[28px] p-5 md:p-6"><div className="flex items-center gap-2 text-lg font-semibold"><ShieldCheck className="h-5 w-5" />Пользователи</div><div className="relative mt-4"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ID, username или имя" className="soft-control w-full rounded-2xl py-3 pl-10 pr-4" /></div><div className="mt-4 space-y-2">{filtered.slice(0, 30).map((user) => <button key={user.id} onClick={() => setSelected(user)} className="flex w-full items-center gap-3 rounded-2xl bg-[var(--surface)] p-3 text-left hover:bg-[var(--surface-strong)]"><div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--surface-strong)] text-xs font-semibold">{user.avatar_url ? <img src={user.avatar_url} alt="" className="h-full w-full object-cover" /> : user.display_name?.slice(0,1)}</div><div className="min-w-0"><div className="truncate text-sm font-semibold">{user.display_name}</div><div className="truncate text-xs text-muted">@{user.username} · {user.id.slice(0,8)}</div></div><span className="ml-auto rounded-full bg-[var(--surface-strong)] px-2 py-1 text-[10px] font-semibold">{user.role}</span></button>)}{!filtered.length && <div className="py-10 text-center text-sm text-muted">Ничего не найдено</div>}</div></div>
    <div className="glass rounded-[28px] p-5 md:p-6">{selected ? <UserEditor user={selected} isOwner={isOwner} updateRole={updateRole} notice={notice} setNotice={setNotice} /> : <div className="grid min-h-[450px] place-items-center text-center text-sm text-muted"><div><UserCog className="mx-auto h-10 w-10" /><div className="mt-3">Выберите пользователя слева.</div><div className="mt-1 text-xs">Можно найти человека по ID или username и вручную исправить профиль, роль и рабочие данные.</div></div></div>}</div>
  </div></section>
}

function UserEditor({ user, isOwner, updateRole, notice, setNotice }: { user: AdminUser; isOwner: boolean; updateRole: (role: string) => Promise<void>; notice: string; setNotice: (v: string) => void }) {
  const [pay, setPay] = useState(4200); const [extra, setExtra] = useState(3500); const [name, setName] = useState(user.display_name)
  useEffect(() => { const load = async () => { if (!supabase) return; const { data } = await supabase.from('work_settings').select('*').eq('user_id', user.id).single(); if (data) { setPay(Number(data.pay_per_shift ?? 4200)); setExtra(Number(data.extra_pay ?? 3500)) } }; void load() }, [user.id])
  const save = async () => { if (!supabase) return; const profileRes = await supabase.from('profiles').update({ display_name: name }).eq('id', user.id); const settingsRes = await supabase.from('work_settings').upsert({ user_id: user.id, pay_per_shift: pay, extra_pay: extra }, { onConflict: 'user_id' }); setNotice(profileRes.error?.message || settingsRes.error?.message || 'Изменения сохранены.') }
  return <div><div className="text-lg font-semibold">Пользователь</div><div className="mt-1 text-sm text-muted">ID: {user.id}</div><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Имя<input value={name} onChange={(e) => setName(e.target.value)} className="soft-control mt-2 w-full rounded-2xl px-3 py-3" /></label><label className="text-sm font-medium">Роль<select value={user.role} disabled={!isOwner} onChange={(e) => void updateRole(e.target.value)} className="soft-control mt-2 w-full rounded-2xl px-3 py-3"><option value="user">Обычный</option><option value="premium">Premium</option><option value="admin">Администратор</option><option value="owner">Владелец</option></select></label><label className="text-sm font-medium">Цена смены<input type="number" value={pay} onChange={(e) => setPay(Number(e.target.value))} className="soft-control mt-2 w-full rounded-2xl px-3 py-3" /></label><label className="text-sm font-medium">Доп. смена<input type="number" value={extra} onChange={(e) => setExtra(Number(e.target.value))} className="soft-control mt-2 w-full rounded-2xl px-3 py-3" /></label></div><button onClick={save} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--ink)] px-4 py-3.5 text-sm font-semibold text-[var(--ink-on)]"><Save className="h-4 w-4" />Сохранить</button>{notice && <div className="mt-3 rounded-2xl bg-[var(--surface)] p-3 text-sm text-muted">{notice}</div>}<div className="mt-5 rounded-2xl bg-[var(--surface)] p-4 text-xs leading-5 text-muted">Владелец может выдавать Premium и права администратора. Администраторы могут редактировать данные пользователей, но не выдавать себе или другим новые роли.</div></div>
}
