-- ===== RonTech Flow — Schema Supabase =====
-- Incolla TUTTO questo nel SQL Editor del tuo progetto Supabase e premi RUN.
-- Dashboard: https://supabase.com/dashboard/project/awsqwdexuulygqbmjrnh/sql

-- 1) PROFILES (collegata a auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  company text,
  created_at timestamptz default now()
);

-- 2) ORDERS
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company text not null,
  destination text not null,
  status text not null default 'programmato',
  note text default '',
  delivery_date date,
  created_at timestamptz default now()
);

create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists orders_created_at_idx on public.orders(created_at desc);

-- 3) RLS (Row Level Security): ogni utente vede SOLO i suoi dati
alter table public.profiles enable row level security;
alter table public.orders enable row level security;

-- Profili
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Ordini
drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own" on public.orders
  for select using (auth.uid() = user_id);

drop policy if exists "orders_insert_own" on public.orders;
create policy "orders_insert_own" on public.orders
  for insert with check (auth.uid() = user_id);

drop policy if exists "orders_update_own" on public.orders;
create policy "orders_update_own" on public.orders
  for update using (auth.uid() = user_id);

drop policy if exists "orders_delete_own" on public.orders;
create policy "orders_delete_own" on public.orders
  for delete using (auth.uid() = user_id);
