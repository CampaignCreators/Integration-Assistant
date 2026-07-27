#!/usr/bin/env bash
#
# Checks database privileges against what the app actually needs: the worker can
# run the queue, signed-in users can read their own data but not write findings,
# and anon reaches nothing. Also confirms RLS is on everywhere.
#
# Grants are invisible to the unit tests — the worker's very first "permission
# denied for function claim_next_run" only appeared against a real database — so
# this runs against the live local stack.
#
#   bash scripts/verify-db.sh
#
set -euo pipefail
# shellcheck source=scripts/_common.sh
source "$(dirname "${BASH_SOURCE[0]}")/_common.sh"
cd "$REPO_ROOT"

command -v supabase >/dev/null 2>&1 || die "The Supabase CLI is not installed. Run: bash scripts/dev-setup.sh"
load_status_env || die "The local Supabase stack isn't running. Run: bash scripts/dev-setup.sh"
DB_URL="$(status_first DB_URL)" || DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"

SQL=$(
  cat <<'EOSQL'
with expected(kind, who, object, priv, want) as (values
  -- The worker owns the queue. Nobody else may touch it.
  ('f', 'service_role',  'public.claim_next_run()',                'execute', true),
  ('f', 'service_role',  'public.claim_orphaned_runs(interval)',   'execute', true),
  ('f', 'authenticated', 'public.claim_next_run()',                'execute', false),
  ('f', 'anon',          'public.claim_next_run()',                'execute', false),
  -- RLS policies call these, so the calling role needs execute on them.
  ('f', 'authenticated', 'public.current_user_role()',             'execute', true),
  ('f', 'authenticated', 'public.is_elevated()',                   'execute', true),
  ('f', 'authenticated', 'public.can_access_run(uuid)',            'execute', true),
  ('f', 'authenticated', 'public.path_run_id(text)',               'execute', true),
  -- The worker writes everything the pipeline produces.
  ('t', 'service_role',  'public.runs',                            'update',  true),
  ('t', 'service_role',  'public.research_findings',               'insert',  true),
  ('t', 'service_role',  'public.field_mappings',                  'insert',  true),
  ('t', 'service_role',  'public.deliverables',                    'insert',  true),
  ('t', 'service_role',  'public.usage_events',                    'insert',  true),
  ('t', 'service_role',  'public.run_events',                      'insert',  true),
  ('t', 'service_role',  'public.app_settings',                    'select',  true),
  -- A signed-in rep reads their own data and creates runs.
  ('t', 'authenticated', 'public.runs',                            'select',  true),
  ('t', 'authenticated', 'public.runs',                            'insert',  true),
  ('t', 'authenticated', 'public.runs',                            'delete',  true),
  ('t', 'authenticated', 'public.research_findings',               'select',  true),
  ('t', 'authenticated', 'public.deliverables',                    'select',  true),
  ('t', 'authenticated', 'public.app_settings',                    'select',  true),
  ('t', 'authenticated', 'public.run_cost_summary',                'select',  true),
  -- ...but never writes pipeline output directly.
  ('t', 'authenticated', 'public.research_findings',               'insert',  false),
  ('t', 'authenticated', 'public.deliverables',                    'insert',  false),
  ('t', 'authenticated', 'public.usage_events',                    'insert',  false),
  ('t', 'authenticated', 'public.app_settings',                    'update',  false),
  ('t', 'authenticated', 'public.users',                           'select',  true),
  ('t', 'authenticated', 'public.users',                           'update',  false),
  -- anon is unused: every policy requires a signed-in user.
  ('t', 'anon',          'public.runs',                            'select',  false),
  ('t', 'anon',          'public.users',                           'select',  false),
  ('t', 'anon',          'public.app_settings',                    'select',  false)
),
checked as (
  select who, object, priv, want,
    case kind
      when 'f' then has_function_privilege(who, object, priv)
      else has_table_privilege(who, object, priv)
    end as got
  from expected
)
select case when got = want then 'PASS' else 'FAIL' end
       || '  ' || who || ' ' || priv
       || case when want then ' on ' else ' on (must be denied) ' end || object
from checked

union all

-- A table without RLS is readable by every signed-in user, whatever the grants.
select 'FAIL  row-level security is off on ' || c.relname
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity

order by 1 desc;
EOSQL
)

step "Checking database privileges"

if ! OUT="$(run_sql "$DB_URL" "$SQL" -tA)"; then
  printf '%s\n' "$OUT" >&2
  die "Could not query the database."
fi

FAILED=0
while IFS= read -r line; do
  [ -z "$line" ] && continue
  case "$line" in
    PASS*) printf '  %s%s%s\n' "$GREEN" "$line" "$OFF" ;;
    FAIL*) printf '  %s%s%s\n' "$RED" "$line" "$OFF"; FAILED=1 ;;
    *) printf '  %s\n' "$line" ;;
  esac
done <<<"$OUT"

if [ "$FAILED" = 1 ]; then
  say ""
  die "Privileges are not what the app needs. If migrations are behind, run: npm run local:reset"
fi

step "All privilege checks passed"
