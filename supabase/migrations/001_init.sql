-- База данных для календаря смен.
-- Выполните файл целиком в Supabase SQL Editor.

create extension if not exists pgcrypto;

create type public.user_role as enum ('user', 'premium', 'admin', 'owner');
create type public.shift_kind as enum ('work', 'off', 'extra', 'vacation');
create type public.extra_compensation as enum ('pay', 'day_off');
create type public.off_reason as enum ('weekend', 'schedule', 'personal', 'compensatory');
create type public.schedule_type as enum ('5/2', '2/2', '1/3', '3/3', '4/2', 'weekdays');
create type public.theme_mode as enum ('light', 'dark', 'system');
create type public.density_mode as enum ('comfortable', 'compact');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  display_name text not null default 'Пользователь',
  avatar_url text,
  role public.user_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists profiles_username_lower_idx on public.profiles ((lower(username)));

create table if not exists public.work_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  pay_per_shift numeric(12,2) not null default 4200,
  extra_pay numeric(12,2) not null default 3500,
  default_start time not null default '09:00',
  default_end time not null default '18:00',
  monthly_hours_target numeric(8,2) not null default 160,
  schedule_type public.schedule_type not null default '5/2',
  weekend_days jsonb not null default '[5,6]'::jsonb,
  weekdays jsonb not null default '[0,1,2,3,4]'::jsonb,
  timezone text not null default 'Europe/Moscow',
  updated_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  theme public.theme_mode not null default 'system',
  density public.density_mode not null default 'comfortable',
  accent_color text not null default '#D9534F',
  blur numeric(5,2) not null default 24,
  show_month_summary boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.day_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  kind public.shift_kind not null,
  hours numeric(6,2) not null default 0,
  start_time time,
  end_time time,
  note text,
  off_reason public.off_reason,
  extra_compensation public.extra_compensation,
  restored_work jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, date)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists work_settings_set_updated_at on public.work_settings;
create trigger work_settings_set_updated_at before update on public.work_settings for each row execute function public.set_updated_at();
drop trigger if exists app_settings_set_updated_at on public.app_settings;
create trigger app_settings_set_updated_at before update on public.app_settings for each row execute function public.set_updated_at();
drop trigger if exists day_entries_set_updated_at on public.day_entries;
create trigger day_entries_set_updated_at before update on public.day_entries for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin','owner')
  );
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'owner'
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_owner() to authenticated;

create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role is distinct from new.role and not public.is_owner() then
    raise exception 'Только владелец может изменять роли';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_escalation on public.profiles;
create trigger profiles_prevent_role_escalation before update on public.profiles for each row execute function public.prevent_role_escalation();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text := lower(coalesce(new.raw_user_meta_data ->> 'username', 'user_' || replace(substr(new.id::text, 1, 8), '-', '')));
  final_username text := base_username;
  counter integer := 1;
begin
  while exists (select 1 from public.profiles where lower(username) = lower(final_username)) loop
    final_username := base_username || counter::text;
    counter := counter + 1;
  end loop;

  insert into public.profiles(id, username, display_name)
  values (
    new.id,
    final_username,
    coalesce(new.raw_user_meta_data ->> 'display_name', 'Пользователь')
  );
  insert into public.work_settings(user_id) values (new.id) on conflict do nothing;
  insert into public.app_settings(user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Вспомогательная функция для входа по username.
-- Она возвращает email только по точному username. Основные данные всё равно защищены RLS.
create or replace function public.email_for_username(p_username text)
returns text
language sql
security definer
set search_path = public
as $$
  select u.email
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(p.username) = lower(regexp_replace(trim(p_username), '^@', ''))
  limit 1;
$$;
grant execute on function public.email_for_username(text) to anon, authenticated;

alter table public.profiles enable row level security;
alter table public.work_settings enable row level security;
alter table public.app_settings enable row level security;
alter table public.day_entries enable row level security;

-- Profiles: пользователь видит себя, admin/owner — всех.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select using (auth.uid() = id or public.is_admin());
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert with check (auth.uid() = id);
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update using (auth.uid() = id or public.is_admin()) with check (auth.uid() = id or public.is_admin());

-- Рабочие настройки.
drop policy if exists work_settings_all on public.work_settings;
create policy work_settings_all on public.work_settings for all using (auth.uid() = user_id or public.is_admin()) with check (auth.uid() = user_id or public.is_admin());

-- Настройки приложения.
drop policy if exists app_settings_all on public.app_settings;
create policy app_settings_all on public.app_settings for all using (auth.uid() = user_id or public.is_admin()) with check (auth.uid() = user_id or public.is_admin());

-- Дни календаря.
drop policy if exists day_entries_all on public.day_entries;
create policy day_entries_all on public.day_entries for all using (auth.uid() = user_id or public.is_admin()) with check (auth.uid() = user_id or public.is_admin());

-- Storage: аватары.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- Удаляем/создаём политики Storage заново, чтобы SQL можно было повторно запускать.
drop policy if exists avatars_read on storage.objects;
create policy avatars_read on storage.objects for select using (bucket_id = 'avatars');
drop policy if exists avatars_insert on storage.objects;
create policy avatars_insert on storage.objects for insert with check (
  bucket_id = 'avatars' and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin())
);
drop policy if exists avatars_update on storage.objects;
create policy avatars_update on storage.objects for update using (
  bucket_id = 'avatars' and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin())
);
drop policy if exists avatars_delete on storage.objects;
create policy avatars_delete on storage.objects for delete using (
  bucket_id = 'avatars' and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin())
);
