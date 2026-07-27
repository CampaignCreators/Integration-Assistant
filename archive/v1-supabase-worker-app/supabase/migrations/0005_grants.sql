-- Explicit table and function privileges.
--
-- Everything up to here left privileges to Postgres and Supabase defaults, and
-- two things went wrong because of it:
--
--   1. `revoke execute on function claim_next_run() from public` in 0001 and
--      0004 locked the queue functions down correctly, but the worker's
--      service_role had only the implicit PUBLIC grant — so revoking from
--      PUBLIC revoked the worker's access too. The worker could not claim a
--      single run: "permission denied for function claim_next_run".
--   2. Table access relied on Supabase's default privileges, which are not
--      guaranteed to grant new tables to anon/authenticated/service_role.
--      "permission denied for table app_settings" is the same fault.
--
-- The grants below mirror the RLS policies deliberately: a command is granted
-- only where a policy exists to constrain it. Grants decide which statements
-- may be *attempted*; RLS still decides which rows they may touch. Both are
-- needed, and neither substitutes for the other.

grant usage on schema public to anon, authenticated, service_role;

-- ─────────────────────────────────────────────────────── the worker

-- The worker connects as service_role and bypasses RLS by design — it is the
-- only thing that writes findings, deliverables and usage rows.
grant all on all tables in schema public to service_role;

-- So a table added by a later migration doesn't silently lock the worker out
-- again. Client roles stay explicit below, on purpose: a new table should not
-- become readable by every signed-in user just because it was created.
alter default privileges in schema public grant all on tables to service_role;

-- The queue functions are the worker's alone. The revokes in 0001 and 0004
-- stand; this is the grant that was missing beside them.
grant execute on function public.claim_next_run() to service_role;
grant execute on function public.claim_orphaned_runs(interval) to service_role;
alter default privileges in schema public grant execute on functions to service_role;

-- ─────────────────────────────────────────────────────── signed-in users

-- One line per policy in 0001/0003. `anon` is granted nothing at all: every
-- policy requires auth.uid() to be present, so an unauthenticated caller has
-- nothing to reach and should be refused at the privilege level too.

-- Read only. Role changes go through the worker's admin route, so the browser
-- needs no write privilege here; the "users: admin updates roles" policy in
-- 0003 stays as the second line of defence if that ever changes.
grant select on public.users to authenticated;

grant select, insert, update, delete on public.runs to authenticated;

-- Child tables are read-only from a browser; every write goes through the
-- worker. Granting insert/update here would mean trusting RLS alone to stop it.
grant select on public.brief to authenticated;
grant select on public.uploads to authenticated;
grant select on public.extracted_signals to authenticated;
grant select on public.research_findings to authenticated;
grant select on public.field_mappings to authenticated;
grant select on public.deliverables to authenticated;
grant select on public.run_events to authenticated;
grant select on public.usage_events to authenticated;

grant select on public.app_settings to authenticated;
grant select on public.run_cost_summary to authenticated;

-- ─────────────────────────────────────────────────────── policy helpers

-- RLS policy expressions are evaluated with the calling role's privileges, so
-- the caller needs EXECUTE on the helpers its policies invoke — security
-- definer changes what the function may see, not who may call it.
grant execute on function public.current_user_role() to authenticated, service_role;
grant execute on function public.is_elevated() to authenticated, service_role;
grant execute on function public.can_access_run(uuid) to authenticated, service_role;
grant execute on function public.path_run_id(text) to authenticated, service_role;
