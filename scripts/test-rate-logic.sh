#!/usr/bin/env bash
# Run the rate logic tests against a throwaway Postgres.
#
# Builds an empty database, applies every migration in order, then loads
# scripts/rate-logic.test.sql which seeds a realistic rate matrix and asserts
# the behaviour of fn_get_rate, fn_resolve_rate and fn_rate_change_impact.
# Nothing here touches a real project.
#
#   ./scripts/test-rate-logic.sh          # uses a temporary local cluster
#   DATABASE_URL=postgres://... ./scripts/test-rate-logic.sh   # or an existing one
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATIONS="$ROOT/supabase/migrations"
TESTS="$ROOT/scripts/rate-logic.test.sql"
RLS_TESTS="$ROOT/scripts/rls-guards.test.sql"

if [[ -n "${DATABASE_URL:-}" ]]; then
  PSQL=(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q)
  cleanup() { :; }
  # Roles the migrations GRANT to. A plain Postgres has none of them.
  for role in anon authenticated service_role; do
    psql "$DATABASE_URL" -q -c "create role $role" >/dev/null 2>&1 || true
  done
else
  command -v initdb >/dev/null 2>&1 || export PATH="/usr/lib/postgresql/16/bin:$PATH"
  command -v initdb >/dev/null 2>&1 || {
    echo "postgres not found. Install it, or set DATABASE_URL to a scratch database." >&2
    exit 1
  }

  PGTMP="$(mktemp -d)"
  PORT="${PGPORT:-55999}"
  # initdb refuses to run as root, so hand the cluster to an unprivileged user.
  RUNAS=""
  if [[ "$(id -u)" -eq 0 ]]; then
    id postgres >/dev/null 2>&1 || useradd postgres
    chown -R postgres "$PGTMP"
    RUNAS="postgres"
  fi
  run() { if [[ -n "$RUNAS" ]]; then su "$RUNAS" -c "PATH=$PATH $*"; else eval "$*"; fi; }

  cleanup() {
    run "pg_ctl -D $PGTMP/data stop -m immediate" >/dev/null 2>&1 || true
    rm -rf "$PGTMP"
  }
  trap cleanup EXIT

  echo "starting throwaway postgres on port $PORT"
  run "initdb -D $PGTMP/data -U postgres --auth=trust" >/dev/null
  run "pg_ctl -D $PGTMP/data -o '-p $PORT -k /tmp' -l $PGTMP/log start" >/dev/null
  for _ in $(seq 1 30); do
    psql -h /tmp -p "$PORT" -U postgres -c 'select 1' >/dev/null 2>&1 && break
    sleep 1
  done

  PSQL=(psql -h /tmp -p "$PORT" -U postgres -v ON_ERROR_STOP=1 -q)
  # Roles the migrations grant to. Harmless locally, required for the GRANTs.
  "${PSQL[@]}" -c "create role anon; create role authenticated; create role service_role;" >/dev/null
fi

echo "creating base-table fixtures"
"${PSQL[@]}" -f "$ROOT/scripts/test-fixtures.sql" >/dev/null

echo "applying migrations"
# Migrations assume the Supabase schema already exists; failures on statements
# that depend on tables this project does not create locally are expected and
# skipped. What matters is that the rate functions and their tables land.
for f in "$MIGRATIONS"/*.sql; do
  "${PSQL[@]}" -f "$f" >/dev/null 2>&1 || true
done

echo "applying auth fixtures"
"${PSQL[@]}" -f "$ROOT/scripts/test-auth-fixtures.sql" >/dev/null
# The guard policies need has_role(), which the auth fixtures only just created.
"${PSQL[@]}" -f "$MIGRATIONS"/*collection_centre_collection_guards.sql >/dev/null
"${PSQL[@]}" -f "$MIGRATIONS"/*farmer_pins.sql >/dev/null
"${PSQL[@]}" -f "$MIGRATIONS"/*collection_undo_window.sql >/dev/null
"${PSQL[@]}" -f "$MIGRATIONS"/*farmer_phone_capture.sql >/dev/null
"${PSQL[@]}" -f "$MIGRATIONS"/*farmer_portal_tokens.sql >/dev/null
"${PSQL[@]}" -f "$MIGRATIONS"/*slip_printed_lock.sql >/dev/null

# The rate functions are the subject under test, so their absence is fatal
# rather than something to skip past.
for fn in fn_get_rate fn_resolve_rate fn_rate_change_impact fn_clear_farmer_pin fn_farmer_pin_status fn_set_farmer_phone fn_mark_slip_printed fn_regenerate_portal_token; do
  "${PSQL[@]}" -tc "select 1 from pg_proc where proname = '$fn'" | grep -q 1 || {
    echo "FATAL: $fn was not created by the migrations" >&2
    exit 1
  }
done

echo "running rate logic tests"
"${PSQL[@]}" -f "$TESTS"

echo "running collection centre guard tests"
"${PSQL[@]}" -f "$RLS_TESTS"
