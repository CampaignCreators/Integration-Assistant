-- Phase 5: reliability. Lets a crashed or redeployed worker's runs be found and
-- resumed instead of sitting in a working state forever.

-- Updated as a run passes through each step. A run in a working state whose
-- heartbeat has gone quiet has lost its worker.
alter table public.runs
  add column heartbeat_at timestamptz;

comment on column public.runs.heartbeat_at is
  'Last time a worker reported progress on this run. A working run with a stale '
  'heartbeat is orphaned and safe to resume — pipeline steps are idempotent.';

-- Seed the heartbeat for runs already in flight when this migration lands, so
-- any that were orphaned by the deploy itself are detectable immediately. The
-- SET expression reads the pre-update `updated_at`; the touch trigger then
-- refreshes `updated_at`, which is why the two end up different on purpose.
update public.runs
set heartbeat_at = updated_at
where status in ('extracting', 'researching', 'generating')
  and heartbeat_at is null;

-- Finding orphans means scanning by status and heartbeat together.
create index runs_heartbeat_idx
  on public.runs (status, heartbeat_at)
  where status in ('extracting', 'researching', 'generating');

/*
 * Claims runs whose worker has gone away.
 *
 * `stale_after` should comfortably exceed the longest single step, so a run
 * that is genuinely mid-research is never stolen from a live worker. A null
 * heartbeat falls back to updated_at, which covers rows written before this
 * migration.
 */
create or replace function public.claim_orphaned_runs(stale_after interval)
returns setof public.runs
language sql as $$
  update public.runs
  set heartbeat_at = now(), updated_at = now()
  where id in (
    select id from public.runs
    where status in ('extracting', 'researching', 'generating')
      and coalesce(heartbeat_at, updated_at) < now() - stale_after
    order by coalesce(heartbeat_at, updated_at) asc
    limit 10
    for update skip locked
  )
  returning *;
$$;

revoke execute on function public.claim_orphaned_runs(interval)
  from public, anon, authenticated;

-- Set the heartbeat when a run is first claimed, so a worker that dies
-- immediately after claiming still leaves a detectable trail.
create or replace function public.claim_next_run()
returns setof public.runs
language sql as $$
  update public.runs
  set status = 'extracting', heartbeat_at = now(), updated_at = now()
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
