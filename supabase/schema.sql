-- Integration Assistant — full schema.
--
-- Paste this into the Supabase SQL editor and run it once. It is idempotent, so
-- running it again after a change is safe.
--
-- One table. A run holds everything about one piece of scoping work: the inputs,
-- the answers given, the mapping, and whether it has been confirmed. The parts
-- that change shape as the app evolves are jsonb, validated by zod in the app
-- rather than by a column per field — this is a single-purpose internal tool, and
-- a migration per UI tweak would cost more than it protects.

create extension if not exists pgcrypto;

create table if not exists public.runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Untitled run',
  target_software text not null default '',
  use_case text not null default '',
  notes text not null default '',
  -- [{ name, text, storage_path }]
  documents jsonb not null default '[]'::jsonb,
  -- [{ question, answer }]
  answers jsonb not null default '[]'::jsonb,
  -- { reason, questions: [...] } while a round of questions is outstanding
  questions jsonb,
  mapping jsonb,
  confirmed boolean not null default false,
  round integer not null default 0,
  demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists runs_user_updated_idx
  on public.runs (user_id, updated_at desc);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists runs_touch on public.runs;
create trigger runs_touch before update on public.runs
  for each row execute function public.touch_updated_at();

-- ─────────────────────────────────────────────────────── row-level security

alter table public.runs enable row level security;

drop policy if exists "runs: read own" on public.runs;
create policy "runs: read own" on public.runs
  for select using (user_id = auth.uid());

drop policy if exists "runs: insert own" on public.runs;
create policy "runs: insert own" on public.runs
  for insert with check (user_id = auth.uid());

drop policy if exists "runs: update own" on public.runs;
create policy "runs: update own" on public.runs
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "runs: delete own" on public.runs;
create policy "runs: delete own" on public.runs
  for delete using (user_id = auth.uid());

-- ─────────────────────────────────────────────────────── privileges
--
-- RLS decides which rows a statement may touch; grants decide whether the
-- statement may run at all. Both are needed. Leaving these to Supabase's
-- defaults is exactly what broke the previous version of this app — the worker
-- role held only an implicit grant, and a revoke took it away silently.

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.runs to authenticated;
grant execute on function public.touch_updated_at() to authenticated;

-- anon is granted nothing: every policy above requires a signed-in user, so an
-- unauthenticated caller should be refused at the privilege level too.

-- ─────────────────────────────────────────────────────── storage

insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', false)
on conflict (id) do nothing;

-- Paths are <user_id>/<run_id>/<filename>, so ownership is provable from the
-- path itself and needs no lookup.

drop policy if exists "uploads: insert own" on storage.objects;
create policy "uploads: insert own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "uploads: read own" on storage.objects;
create policy "uploads: read own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "uploads: delete own" on storage.objects;
create policy "uploads: delete own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─────────────────────────────────────────────────────── check it worked

-- Should return true for every row.
--   select
--     has_table_privilege('authenticated', 'public.runs', 'insert') as can_insert,
--     not has_table_privilege('anon', 'public.runs', 'select')      as anon_blocked,
--     relrowsecurity                                                as rls_on
--   from pg_class where oid = 'public.runs'::regclass;
