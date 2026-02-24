-- 001_init.sql
-- Extensions
create extension if not exists pgcrypto;
create extension if not exists citext;

-- ============================================================
-- 1) Allowlist table (private-ish)
--   - Not readable from clients
--   - Used only via security definer function is_allowlisted()
-- ============================================================
create table if not exists public.allowlist (
  email citext primary key,
  created_at timestamptz not null default now()
);

-- Revoke all direct access from client roles
revoke all on table public.allowlist from anon, authenticated;

-- Security definer function: returns whether current auth email is allowlisted
create or replace function public.is_allowlisted()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.allowlist a
    where a.email = auth.email()
  );
$$;

-- Allow clients to call the function (it returns only boolean)
grant execute on function public.is_allowlisted() to anon, authenticated;

-- ============================================================
-- 2) Profiles table
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email citext unique not null,
  display_name text,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.profiles enable row level security;
alter table public.profiles force row level security;

-- Policies: only allowlisted users, and only their own profile row
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles
for select
using (public.is_allowlisted() and id = auth.uid());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles
for insert
with check (public.is_allowlisted() and id = auth.uid() and email = auth.email());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
using (public.is_allowlisted() and id = auth.uid())
with check (public.is_allowlisted() and id = auth.uid());

-- helper RPC for exactly-two-user workspace member lookup
create or replace function public.workspace_members()
returns table (id uuid, email citext, display_name text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.email, p.display_name
  from public.profiles p
  where public.is_allowlisted();
$$;

grant execute on function public.workspace_members() to authenticated;

-- ============================================================
-- 3) Tasks table
-- ============================================================
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  memo text,
  due_date date,
  priority text not null default 'medium',
  assignee uuid references public.profiles(id),
  status text not null default 'open',
  is_archived boolean not null default false,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Data constraints
  constraint tasks_title_len check (char_length(title) between 1 and 100),
  constraint tasks_memo_len check (memo is null or char_length(memo) <= 2000),
  constraint tasks_priority_chk check (priority in ('low','medium','high')),
  constraint tasks_status_chk check (status in ('open','done'))
);

create index if not exists idx_tasks_due_date on public.tasks(due_date);
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_tasks_archived on public.tasks(is_archived);
create index if not exists idx_tasks_assignee on public.tasks(assignee);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_tasks_set_updated_at on public.tasks;
create trigger trg_tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

-- RLS
alter table public.tasks enable row level security;
alter table public.tasks force row level security;

-- Policies:
-- - any allowlisted user can read/insert/update shared tasks
-- - enforce created_by = auth.uid() on insert to prevent spoofing
drop policy if exists tasks_select_allowlisted on public.tasks;
create policy tasks_select_allowlisted
on public.tasks
for select
using (public.is_allowlisted());

drop policy if exists tasks_insert_allowlisted on public.tasks;
create policy tasks_insert_allowlisted
on public.tasks
for insert
with check (
  public.is_allowlisted()
  and created_by = auth.uid()
);

drop policy if exists tasks_update_allowlisted on public.tasks;
create policy tasks_update_allowlisted
on public.tasks
for update
using (public.is_allowlisted())
with check (public.is_allowlisted());

-- Optional: disallow DELETE (MVP uses archive)
revoke delete on public.tasks from anon, authenticated;
