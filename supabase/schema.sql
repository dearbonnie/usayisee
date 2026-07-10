create extension if not exists pgcrypto;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  client_code text not null,
  client_name text,
  birth_year text,
  contact_info text,
  client_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  session_number integer not null,
  session_date date not null default current_date,
  session_topic text,
  presenting_issue text,
  life_core text,
  pattern_core text,
  custom_blocks text,
  core_sentence text,
  old_pattern text,
  difference text,
  worked text,
  next_adjustment text,
  spread_mode text not null default 'one',
  spread jsonb not null default '{}'::jsonb,
  blocks text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, client_id, session_number)
);

create index if not exists clients_owner_updated_idx on public.clients(owner_id, updated_at desc);
create index if not exists clients_owner_code_idx on public.clients(owner_id, client_code);
create index if not exists sessions_owner_date_idx on public.sessions(owner_id, session_date desc);
create index if not exists sessions_client_number_idx on public.sessions(client_id, session_number);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

drop trigger if exists sessions_set_updated_at on public.sessions;
create trigger sessions_set_updated_at
before update on public.sessions
for each row execute function public.set_updated_at();

alter table public.clients enable row level security;
alter table public.sessions enable row level security;

drop policy if exists "clients_select_own" on public.clients;
create policy "clients_select_own"
on public.clients for select
using (owner_id = auth.uid());

drop policy if exists "clients_insert_own" on public.clients;
create policy "clients_insert_own"
on public.clients for insert
with check (owner_id = auth.uid());

drop policy if exists "clients_update_own" on public.clients;
create policy "clients_update_own"
on public.clients for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "clients_delete_own" on public.clients;
create policy "clients_delete_own"
on public.clients for delete
using (owner_id = auth.uid());

drop policy if exists "sessions_select_own" on public.sessions;
create policy "sessions_select_own"
on public.sessions for select
using (owner_id = auth.uid());

drop policy if exists "sessions_insert_own" on public.sessions;
create policy "sessions_insert_own"
on public.sessions for insert
with check (owner_id = auth.uid());

drop policy if exists "sessions_update_own" on public.sessions;
create policy "sessions_update_own"
on public.sessions for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "sessions_delete_own" on public.sessions;
create policy "sessions_delete_own"
on public.sessions for delete
using (owner_id = auth.uid());
