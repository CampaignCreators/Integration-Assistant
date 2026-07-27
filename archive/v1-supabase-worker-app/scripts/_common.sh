# Shared helpers for the local-prototype scripts. Sourced, not executed.

# shellcheck shell=bash

RED=$'\033[31m'
GREEN=$'\033[32m'
YELLOW=$'\033[33m'
BOLD=$'\033[1m'
DIM=$'\033[2m'
OFF=$'\033[0m'

# Colour is noise in a log file or CI.
if [ ! -t 1 ]; then
  RED=""; GREEN=""; YELLOW=""; BOLD=""; DIM=""; OFF=""
fi

say()  { printf '%s\n' "$*"; }
step() { printf '\n%s==>%s %s%s%s\n' "$GREEN" "$OFF" "$BOLD" "$*" "$OFF"; }
warn() { printf '%s!%s  %s\n' "$YELLOW" "$OFF" "$*" >&2; }
die()  { printf '\n%serror:%s %s\n' "$RED" "$OFF" "$*" >&2; exit 1; }

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# The Supabase CLI names its containers after project_id in supabase/config.toml.
supabase_project_id() {
  awk -F'=' '/^[[:space:]]*project_id[[:space:]]*=/ {
    gsub(/[[:space:]"]/, "", $2); print $2; exit
  }' "$REPO_ROOT/supabase/config.toml"
}

# Captures `supabase status -o env` once. Callers then use status_value.
STATUS_ENV=""
load_status_env() {
  STATUS_ENV="$(cd "$REPO_ROOT" && supabase status -o env 2>/dev/null)" || return 1
  [ -n "$STATUS_ENV" ] || return 1
}

# Reads one KEY="value" line out of the captured status output.
status_value() {
  printf '%s\n' "$STATUS_ENV" | awk -v key="$1" -F'=' '
    $1 == key { sub(/^[^=]*=/, ""); gsub(/^"|"$/, ""); print; exit }
  '
}

# First non-empty value among the given status keys. CLI versions have renamed
# these (ANON_KEY -> PUBLISHABLE_KEY, SERVICE_ROLE_KEY -> SECRET_KEY), so ask
# for every spelling rather than pinning one CLI version.
status_first() {
  local key value
  for key in "$@"; do
    value="$(status_value "$key")"
    if [ -n "$value" ]; then
      printf '%s' "$value"
      return 0
    fi
  done
  return 1
}

# Runs SQL against the local database. Prefers a real psql, and falls back to
# the one inside the Supabase container — both because psql isn't a
# prerequisite, and because a locally installed psql may be too old to speak to
# the container's Postgres. Returns non-zero when neither route worked, which
# callers must distinguish from a query that ran and answered.
#
# The statement goes in on stdin, not via -c: psql only substitutes :'vars' for
# input it reads, so -c would send ":'email'" to the server as literal SQL and
# fail. Held in a variable so the second attempt still has it to send.
#
#   run_sql "$DB_URL" "select 1" -tA [more psql args]
run_sql() {
  local db_url="$1" sql="$2"
  shift 2
  local out=""
  if command -v psql >/dev/null 2>&1; then
    if out="$(printf '%s\n' "$sql" | psql "$db_url" -q -v ON_ERROR_STOP=1 "$@" 2>&1)"; then
      printf '%s\n' "$out"
      return 0
    fi
  fi
  if command -v docker >/dev/null 2>&1; then
    local dout="" status=0
    dout="$(printf '%s\n' "$sql" | docker exec -i "supabase_db_$(supabase_project_id)" \
      psql -U postgres -d postgres -q -v ON_ERROR_STOP=1 "$@" 2>&1)" || status=$?
    if [ "$status" -eq 0 ]; then
      printf '%s\n' "$dout"
      return 0
    fi
    # Both routes failed. Show psql's error as well — when psql is installed and
    # working, its message is the real one and the docker error is a red herring.
    [ -n "$out" ] && printf '%s\n' "$out" >&2
    [ -n "$dout" ] && printf '%s\n' "$dout" >&2
    return "$status"
  fi
  [ -n "$out" ] && printf '%s\n' "$out" >&2
  return 1
}
