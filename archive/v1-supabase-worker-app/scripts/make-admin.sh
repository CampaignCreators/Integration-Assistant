#!/usr/bin/env bash
#
# Promotes a local user to the admin role, so the admin screen and every run
# become visible. Sign in through the app first — the row only exists after a
# successful sign-in.
#
#   bash scripts/make-admin.sh you@example.com
#
set -euo pipefail
# shellcheck source=scripts/_common.sh
source "$(dirname "${BASH_SOURCE[0]}")/_common.sh"
cd "$REPO_ROOT"

EMAIL="${1:-}"
ROLE="${2:-admin}"

if [ -z "$EMAIL" ]; then
  die "usage: bash scripts/make-admin.sh <email> [rep|reviewer|admin]"
fi
case "$ROLE" in
  rep|reviewer|admin) ;;
  *) die "role must be one of: rep, reviewer, admin (got '$ROLE')" ;;
esac

command -v supabase >/dev/null 2>&1 || die "The Supabase CLI is not installed. Run: bash scripts/dev-setup.sh"
load_status_env || die "The local Supabase stack isn't running. Run: bash scripts/dev-setup.sh"
DB_URL="$(status_first DB_URL)" || DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"

# :'email' lets psql do the quoting, so an odd address can't alter the statement.
if ! RESULT="$(run_sql "$DB_URL" \
  "update public.users set role = :'role'::public.user_role where email = :'email' returning email;" \
  -tA -v "email=$EMAIL" -v "role=$ROLE")"; then
  # An empty result means "no such user"; a failed query means "couldn't ask",
  # and reporting the second as the first would send you looking in the wrong place.
  printf '%s\n' "$RESULT" >&2
  die "Could not reach the local database. Is the stack up? Try: npm run local:setup"
fi

if [ -z "$(printf '%s' "$RESULT" | tr -d '[:space:]')" ]; then
  die "No user with the email '$EMAIL'. Sign in through the app at http://localhost:3000 first, then run this again."
fi

printf '%s%s%s is now %s%s%s\n' "$BOLD" "$EMAIL" "$OFF" "$BOLD" "$ROLE" "$OFF"
say "Reload the app — the role is read on each request."
