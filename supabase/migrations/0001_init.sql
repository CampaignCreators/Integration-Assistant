-- CC Integration App — Phase 0 foundation schema
-- Tables per docs/build-spec.md §6, RLS per §10, storage buckets, queue claim fn.

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────── enums

create type public.user_role as enum ('rep', 'reviewer', 'admin');

create type public.run_status as enum (
  'draft', 'queued', 'extracting', 'awaiting_confirmation',
  'researching', 'generating', 'complete', 'failed'
);

create type public.sync_direction as enum (
  'hubspot_to_target', 'target_to_hubspot', 'two_way'
);

create type public.sync_frequency as enum (
  'realtime', 'near_realtime', 'hourly', 'daily', 'manual'
);

create type public.volume_bucket as enum ('lt_1k', '1k_10k', '10k_100k', 'gt_100k');

create type public.finding_side as enum ('hubspot', 'target', 'marketplace', 'middleware');

create type public.deliverable_kind as enum ('requirements_doc', 'mapping_sheet');

create type public.event_status as enum ('started', 'progress', 'succeeded', 'failed', 'skipped');

create type public.signal_category as enum (
  'system', 'entity', 'field', 'pain_point', 'behavior', 'edge_case', 'constraint', 'other'
);

-- ─────────────────────────────────────────────────────────────── helpers

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ─────────────────────────────────────────────────────────────── users

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text,
  role public.user_role not null default 'rep',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger users_touch before update on public.users
  for each row execute function public.touch_updated_at();

-- Mirror auth.users into public.users on signup.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Role helpers (security definer so RLS policies can consult users).
create or replace function public.current_user_role()
returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.users where id = auth.uid()
$$;

create or replace function public.is_elevated()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.current_user_role() in ('reviewer', 'admin'), false)
$$;

-- ─────────────────────────────────────────────────────────────── runs

create table public.runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  title text,
  target_software text,
  direction public.sync_direction,
  frequency public.sync_frequency,
  status public.run_status not null default 'draft',
  recommended_approach text,
  confidence text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index runs_user_id_idx on public.runs (user_id);
create index runs_status_idx on public.runs (status);

create trigger runs_touch before update on public.runs
  for each row execute function public.touch_updated_at();

-- Can the current (authenticated) user access this run?
create or replace function public.can_access_run(rid uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.runs r
    where r.id = rid
      and (r.user_id = auth.uid() or public.is_elevated())
  )
$$;

-- ─────────────────────────────────────────────────────────────── run children

create table public.brief (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null unique references public.runs (id) on delete cascade,
  objects text[] not null default '{}',
  trigger_event text,
  volume public.volume_bucket,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.uploads (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs (id) on delete cascade,
  storage_path text not null,
  filename text not null,
  type text not null check (type in ('txt', 'md', 'docx', 'pdf', 'vtt', 'srt')),
  size_bytes bigint,
  status text not null default 'uploaded' check (status in ('uploaded', 'extracted', 'failed')),
  extracted_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.extracted_signals (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs (id) on delete cascade,
  category public.signal_category not null,
  value text not null,
  source_ref text,
  is_inferred boolean not null default false,
  conflict_with_brief boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.research_findings (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs (id) on delete cascade,
  side public.finding_side not null,
  summary text not null,
  details_json jsonb not null default '{}'::jsonb,
  sources text[] not null default '{}',
  confidence text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.field_mappings (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs (id) on delete cascade,
  source_obj text not null,
  source_field text not null,
  target_obj text not null,
  target_field text not null,
  direction text not null default 'one_way' check (direction in ('one_way', 'two_way')),
  transform text,
  required boolean not null default false,
  match_key boolean not null default false,
  notes text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.deliverables (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs (id) on delete cascade,
  kind public.deliverable_kind not null,
  storage_path text not null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.run_events (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs (id) on delete cascade,
  step text not null,
  status public.event_status not null,
  message text,
  ts timestamptz not null default now()
);

create index run_events_run_id_ts_idx on public.run_events (run_id, ts);

create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs (id) on delete cascade,
  step text not null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  estimated_cost_usd numeric(10, 4) not null default 0,
  created_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['brief', 'uploads', 'extracted_signals', 'research_findings',
                           'field_mappings', 'deliverables']
  loop
    execute format(
      'create trigger %I_touch before update on public.%I
         for each row execute function public.touch_updated_at()', t, t);
    execute format('create index %I_run_id_idx on public.%I (run_id)', t, t);
  end loop;
end $$;

-- ─────────────────────────────────────────────────────────────── RLS

alter table public.users enable row level security;
alter table public.runs enable row level security;
alter table public.brief enable row level security;
alter table public.uploads enable row level security;
alter table public.extracted_signals enable row level security;
alter table public.research_findings enable row level security;
alter table public.field_mappings enable row level security;
alter table public.deliverables enable row level security;
alter table public.run_events enable row level security;
alter table public.usage_events enable row level security;

create policy "users: read self or elevated" on public.users
  for select using (id = auth.uid() or public.is_elevated());

create policy "runs: read own or elevated" on public.runs
  for select using (user_id = auth.uid() or public.is_elevated());

create policy "runs: insert own" on public.runs
  for insert with check (user_id = auth.uid());

create policy "runs: update own or elevated" on public.runs
  for update using (user_id = auth.uid() or public.is_elevated())
  with check (user_id = auth.uid() or public.is_elevated());

create policy "runs: delete own or admin" on public.runs
  for delete using (user_id = auth.uid() or public.current_user_role() = 'admin');

-- Child tables: read-only from clients (writes go through the worker's
-- service-role connection, which bypasses RLS).
do $$
declare t text;
begin
  foreach t in array array['brief', 'uploads', 'extracted_signals', 'research_findings',
                           'field_mappings', 'deliverables', 'run_events', 'usage_events']
  loop
    execute format(
      'create policy "%s: read via run access" on public.%I
         for select using (public.can_access_run(run_id))', t, t);
  end loop;
end $$;

-- ─────────────────────────────────────────────────────────────── realtime

alter publication supabase_realtime add table public.runs, public.run_events;

-- ─────────────────────────────────────────────────────────────── job queue

-- Atomically claim the oldest queued run (called by the worker via service role).
create or replace function public.claim_next_run()
returns setof public.runs
language sql as $$
  update public.runs
  set status = 'extracting', updated_at = now()
  where id = (
    select id from public.runs
    where status = 'queued'
    order by created_at asc
    limit 1
    for update skip locked
  )
  returning *;
$$;

revoke execute on function public.claim_next_run() from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────── storage

insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', false), ('deliverables', 'deliverables', false)
on conflict (id) do nothing;

-- Objects are stored under <run_id>/<file>; resolve the run id defensively.
create or replace function public.path_run_id(object_name text)
returns uuid
language plpgsql immutable as $$
begin
  return ((storage.foldername(object_name))[1])::uuid;
exception when others then
  return null;
end $$;

create policy "uploads bucket: insert into own runs" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'uploads' and public.can_access_run(public.path_run_id(name)));

create policy "uploads bucket: read own runs" on storage.objects
  for select to authenticated
  using (bucket_id = 'uploads' and public.can_access_run(public.path_run_id(name)));

create policy "uploads bucket: delete own runs" on storage.objects
  for delete to authenticated
  using (bucket_id = 'uploads' and public.can_access_run(public.path_run_id(name)));

create policy "deliverables bucket: read own runs" on storage.objects
  for select to authenticated
  using (bucket_id = 'deliverables' and public.can_access_run(public.path_run_id(name)));
