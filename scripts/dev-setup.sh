#!/usr/bin/env bash
#
# Sets up a fully local prototype: Supabase in Docker, migrations applied, and
# env files written for the web app and worker. No cloud accounts, no API keys.
#
#   bash scripts/dev-setup.sh            # interactive
#   bash scripts/dev-setup.sh --yes      # accept every prompt (CI / re-runs)
#   bash scripts/dev-setup.sh --reset    # wipe the local database and re-migrate
#
set -euo pipefail
# shellcheck source=scripts/_common.sh
source "$(dirname "${BASH_SOURCE[0]}")/_common.sh"
cd "$REPO_ROOT"

ASSUME_YES=0
FORCE_RESET=0
SKIP_INSTALL=0

for arg in "$@"; do
  case "$arg" in
    -y|--yes) ASSUME_YES=1 ;;
    --reset) FORCE_RESET=1 ;;
    --skip-install) SKIP_INSTALL=1 ;;
    -h|--help)
      sed -n '3,9p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) die "unknown option: $arg" ;;
  esac
done

# Prompts unless --yes. Defaults to no, so an accidental Enter never destroys data.
confirm() {
  if [ "$ASSUME_YES" = 1 ]; then
    # Echo it anyway: --yes can agree to deleting local data, and the log should
    # show what was agreed to.
    say "$1 ${DIM}(--yes)${OFF}"
    return 0
  fi
  if [ ! -t 0 ]; then
    warn "not a terminal — assuming no for: $1"
    return 1
  fi
  local reply
  read -r -p "$1 [y/N] " reply
  [[ "$reply" =~ ^[Yy]$ ]]
}

# ---------------------------------------------------------------- prerequisites

step "Checking prerequisites"

command -v node >/dev/null 2>&1 || die "Node.js is not installed. Install Node 20 or newer: https://nodejs.org"
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 20 ] || die "Node $(node -v) is too old. This project needs Node 20 or newer."
say "  node $(node -v)"

command -v docker >/dev/null 2>&1 || die $'Docker is not installed.\n  Install Docker Desktop: https://docs.docker.com/get-started/get-docker/\n  Supabase runs Postgres, Auth, Storage and Realtime in Docker locally.'

docker info >/dev/null 2>&1 || die $'Docker is installed but not running.\n  Start Docker Desktop (or the docker daemon) and run this script again.'
say "  docker running"

command -v supabase >/dev/null 2>&1 || die $'The Supabase CLI is not installed.\n  macOS:   brew install supabase/tap/supabase\n  Linux:   see https://github.com/supabase/cli#install-the-cli\n  Windows: use WSL, then follow the Linux instructions.'
say "  supabase $(supabase --version 2>/dev/null | head -n1)"

# ------------------------------------------------------------------- npm install

if [ "$SKIP_INSTALL" = 0 ]; then
  if [ ! -d node_modules ]; then
    step "Installing dependencies (first run — this takes a few minutes)"
    npm install
  else
    say "  dependencies already installed ${DIM}(--skip-install to always skip)${OFF}"
  fi
fi

# --------------------------------------------------------------- supabase stack

ALREADY_RUNNING=0
if load_status_env; then
  ALREADY_RUNNING=1
  say "  local Supabase stack already running"
else
  step "Starting the local Supabase stack (first run pulls container images)"
  supabase start
  load_status_env || die "supabase start finished but 'supabase status' returned nothing."
fi

API_URL="$(status_first API_URL SUPABASE_URL)" || die "Could not read the API URL from 'supabase status -o env'."
ANON_KEY="$(status_first ANON_KEY PUBLISHABLE_KEY SUPABASE_ANON_KEY)" \
  || die "Could not read the anon/publishable key from 'supabase status -o env'."
SERVICE_KEY="$(status_first SERVICE_ROLE_KEY SECRET_KEY SUPABASE_SERVICE_ROLE_KEY)" \
  || die "Could not read the service-role key from 'supabase status -o env'."
DB_URL="$(status_first DB_URL)" || DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
STUDIO_URL="$(status_first STUDIO_URL)" || STUDIO_URL="http://127.0.0.1:54323"
MAIL_URL="$(status_first INBUCKET_URL MAILPIT_URL)" || MAIL_URL="http://127.0.0.1:54324"

# ------------------------------------------------------------------- migrations

step "Applying database migrations"

# Three answers, not two: "no schema", "schema there", and "couldn't ask". The
# third has to be kept separate — treating a failed query as an empty database
# would silently reset a database this script never actually looked at.
SCHEMA_STATE="unknown"
if SCHEMA_OUT="$(run_sql "$DB_URL" "select to_regclass('public.runs') is not null;" -tA 2>/dev/null)"; then
  case "$(printf '%s' "$SCHEMA_OUT" | tr -d '[:space:]')" in
    t) SCHEMA_STATE="present" ;;
    f) SCHEMA_STATE="absent" ;;
  esac
fi

# `supabase db reset` drops the local database and replays every migration. That
# is exactly right on an empty stack and destructive on one holding runs you
# care about, so it is only automatic when there is nothing to lose.
MIGRATION_COUNT="$(find supabase/migrations -name '*.sql' | wc -l | tr -d ' ')"
if [ "$FORCE_RESET" = 1 ]; then
  supabase db reset
  say "  replayed $MIGRATION_COUNT migrations"
elif [ "$SCHEMA_STATE" = "absent" ]; then
  supabase db reset
  say "  applied $MIGRATION_COUNT migrations"
elif [ "$SCHEMA_STATE" = "present" ]; then
  say "  schema already present ${DIM}(local runs and uploads left alone)${OFF}"
  say "  ${DIM}re-run with --reset to wipe the local database and replay migrations${OFF}"
else
  warn "Could not check the database schema (no working psql, and 'docker exec' failed)."
  if [ "$ALREADY_RUNNING" = 0 ]; then
    say "  ${DIM}'supabase start' applies migrations on a new database, so this is probably fine.${OFF}"
  fi
  if confirm "  Run 'supabase db reset' to replay migrations? This DELETES local runs and uploads."; then
    supabase db reset
    say "  replayed $MIGRATION_COUNT migrations"
  else
    say "  skipped ${DIM}(run 'npm run local:reset' yourself if the schema is out of date)${OFF}"
  fi
fi

# ------------------------------------------------------------------- demo user

# A real user with a real password, created through the Auth admin API so it
# works whatever the local Postgres does with password hashes. The login page
# offers a one-click sign-in as this user — a genuine password sign-in, so RLS
# and roles still apply; it just skips the trip through the mail catcher.
DEMO_EMAIL="demo@example.com"
DEMO_PASSWORD="local-dev-password"

step "Seeding the local demo user"

CREATE_BODY="$(
  curl -s -X POST "$API_URL/auth/v1/admin/users" \
    -H "apikey: $SERVICE_KEY" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$DEMO_EMAIL\",\"password\":\"$DEMO_PASSWORD\",\"email_confirm\":true}" \
    2>/dev/null
)" || CREATE_BODY=""

if printf '%s' "$CREATE_BODY" | grep -q '"id"'; then
  say "  created $DEMO_EMAIL"
elif printf '%s' "$CREATE_BODY" | grep -qi "already been registered\|already exists"; then
  say "  $DEMO_EMAIL already exists"
else
  warn "Could not create the demo user; magic-link sign-in still works."
  [ -n "$CREATE_BODY" ] && say "  ${DIM}${CREATE_BODY}${OFF}"
  DEMO_EMAIL=""
fi

# Admin so the whole app is reachable without a second step. Signing in with any
# other address still creates an ordinary rep, which is what to use for checking
# that one user cannot see another's runs.
if [ -n "$DEMO_EMAIL" ]; then
  if run_sql "$DB_URL" \
    "update public.users set role = 'admin' where email = :'email';" \
    -q -v "email=$DEMO_EMAIL" >/dev/null 2>&1; then
    say "  role: admin"
  else
    warn "Could not set the demo user's role; run: npm run local:admin -- $DEMO_EMAIL"
  fi
fi

# --------------------------------------------------------------------- env files

# Everything below is local-only: these keys are the Supabase CLI's fixed
# development keys, they reach nothing outside this machine, and .env files are
# gitignored. Real project keys never belong in a file the repo can see.
write_env() {
  local path="$1" body="$2"
  if [ -f "$path" ]; then
    if confirm "  $path exists. Overwrite it?"; then
      cp "$path" "$path.bak"
      say "    backed up to $path.bak"
    else
      say "    left as is"
      return 0
    fi
  fi
  printf '%s' "$body" > "$path"
  say "    wrote $path"
}

step "Writing local env files"

LLM_MODE_NOTE="offline demo mode (no Anthropic key needed)"
if [ -n "${ANTHROPIC_API_KEY:-}" ]; then
  WORKER_LLM_BLOCK="ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
LLM_OFFLINE_DEMO="
  LLM_MODE_NOTE="real Claude API (picked up ANTHROPIC_API_KEY from your shell)"
else
  WORKER_LLM_BLOCK="# No Anthropic key yet, so research steps return clearly-marked
# placeholder findings instead of calling Claude. Everything else is real.
# To switch to real research: set ANTHROPIC_API_KEY and blank out LLM_OFFLINE_DEMO.
ANTHROPIC_API_KEY=
LLM_OFFLINE_DEMO=true"
fi

write_env apps/worker/.env "# Generated by scripts/dev-setup.sh for local development.
# Local Supabase keys only — safe on this machine, still never committed.

SUPABASE_URL=${API_URL}
SUPABASE_SERVICE_ROLE_KEY=${SERVICE_KEY}

${WORKER_LLM_BLOCK}

WEB_ORIGIN=http://localhost:3000
PORT=8080

# Faster feedback than the 3s production default
POLL_INTERVAL_MS=1500
MAX_CONCURRENT_RUNS=2
LOG_LEVEL=debug
"

if [ -n "$DEMO_EMAIL" ]; then
  WEB_DEMO_BLOCK="# One-click sign-in on the login page, as this seeded user. A real password
# sign-in, so RLS and roles still apply — it only skips the email step. Ignored
# unless NODE_ENV is non-production AND the Supabase URL above is local.
LOCAL_DEV_EMAIL=${DEMO_EMAIL}
LOCAL_DEV_PASSWORD=${DEMO_PASSWORD}"
else
  WEB_DEMO_BLOCK="# The local demo user could not be created, so one-click sign-in is off.
LOCAL_DEV_EMAIL=
LOCAL_DEV_PASSWORD="
fi

write_env apps/web/.env.local "# Generated by scripts/dev-setup.sh for local development.

NEXT_PUBLIC_SUPABASE_URL=${API_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY}
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Server-side only — the browser never calls the worker directly
WORKER_BASE_URL=http://localhost:8080

${WEB_DEMO_BLOCK}
"

# ------------------------------------------------------------------------- done

step "Ready"
cat <<EOF

  Research mode   ${BOLD}${LLM_MODE_NOTE}${OFF}
  Supabase API    ${API_URL}
  Studio (DB UI)  ${STUDIO_URL}
  Sign-in emails  ${MAIL_URL}

Start the app:

  ${BOLD}npm run local:dev${OFF}        ${DIM}# worker on :8080 and web on :3000${OFF}

Then open http://localhost:3000 and press ${BOLD}Sign in as the local demo user${OFF}.
No email step, and that user is already an admin.

To sign in as somebody else, use the email form — the magic link lands in the
mail catcher at ${MAIL_URL}, and that account is an
ordinary rep, which is what to use for checking that one user cannot see
another's runs.

Full walkthrough: docs/local-prototype.md
EOF
