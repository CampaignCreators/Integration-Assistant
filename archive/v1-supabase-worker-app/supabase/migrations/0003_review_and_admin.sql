-- Phase 4: reviewer corrections, regeneration, and admin visibility.

-- The match strategy and mapping gaps are written into the requirements
-- document. Without persisting them, regenerating after a reviewer edit would
-- silently drop both from the rebuilt document.
alter table public.runs
  add column mapping_meta_json jsonb;

comment on column public.runs.mapping_meta_json is
  'How records are matched between the systems, and the gaps the mapping could '
  'not resolve. Read back when regenerating deliverables.';

-- ─────────────────────────────────────────────────────── app settings

-- Single-row configuration table so an admin can change the concurrency cap
-- without a redeploy (spec §10 cost control).
create table public.app_settings (
  id boolean primary key default true,
  max_concurrent_runs integer not null default 3
    check (max_concurrent_runs between 1 and 20),
  updated_at timestamptz not null default now(),
  constraint app_settings_singleton check (id)
);

insert into public.app_settings (id) values (true) on conflict (id) do nothing;

create trigger app_settings_touch before update on public.app_settings
  for each row execute function public.touch_updated_at();

alter table public.app_settings enable row level security;

create policy "app_settings: readable by signed-in users" on public.app_settings
  for select using (auth.uid() is not null);

-- Only the worker (service role) writes; the admin API goes through it.

-- ─────────────────────────────────────────────────────── cost rollup

-- Per-run cost and token totals. `security_invoker` makes the view respect the
-- caller's RLS, so a rep reading it still only sees their own runs.
create view public.run_cost_summary
with (security_invoker = true) as
select
  r.id                                        as run_id,
  r.user_id,
  r.target_software,
  r.status,
  r.recommended_approach,
  r.created_at,
  coalesce(sum(u.estimated_cost_usd), 0)::numeric(12, 4) as cost_usd,
  coalesce(sum(u.input_tokens), 0)::bigint     as input_tokens,
  coalesce(sum(u.output_tokens), 0)::bigint    as output_tokens,
  count(u.id)                                  as llm_calls
from public.runs r
left join public.usage_events u on u.run_id = r.id
group by r.id;

-- ─────────────────────────────────────────────────────── admin role management

-- Admins may change roles; nobody may change their own (so the last admin
-- cannot lock themselves out, and a rep cannot promote themselves).
create policy "users: admin updates roles" on public.users
  for update
  using (public.current_user_role() = 'admin' and id <> auth.uid())
  with check (public.current_user_role() = 'admin' and id <> auth.uid());
