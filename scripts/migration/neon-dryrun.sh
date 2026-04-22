#!/usr/bin/env bash
#
# Phase 2.1 Neon dry-run: pg_dump from prod RDS → pg_restore to a throwaway
# Neon branch → row-count comparison. This does NOT touch production Lambda,
# GitHub Secrets, or DNS. It exists so a human can prove schema+data copy
# cleanly before running the real cutover in `docs/runbooks/2026-04-22-phase-2-neon-cutover.md`.
#
# Usage:
#   DATABASE_URL="postgres://…@mapping-ai-db.…rds.amazonaws.com:5432/postgres" \
#     scripts/migration/neon-dryrun.sh [--delete-after]
#
# Requires:
#   - neonctl authed locally (~/.config/neonctl/credentials.json present)
#   - pg_dump + pg_restore + psql on PATH (Postgres 17 client; `brew install libpq`
#     or use `docker run --rm postgres:17 pg_dump …` if you prefer not to install)
#   - $DATABASE_URL pointing at the prod RDS instance
#   - Network egress to RDS (not reachable from public internet if VPC-locked;
#     run from a machine that already talks to RDS, i.e. Anushree's laptop)
#
# Exit codes: 0 on success, 1 on any step failure. Errors are NOT silenced.

set -euo pipefail

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

NEON_PROJECT_ID="${NEON_PROJECT_ID:-calm-tree-46517731}"
BRANCH_NAME="${BRANCH_NAME:-dryrun-$(date +%Y-%m-%d-%H%M%S)}"
DUMP_PATH="${DUMP_PATH:-/tmp/mapping-ai-dryrun-$(date +%Y-%m-%d-%H%M%S).dump}"
DELETE_AFTER=false

for arg in "$@"; do
  case "$arg" in
    --delete-after)
      DELETE_AFTER=true
      ;;
    -h|--help)
      sed -n '2,20p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      exit 1
      ;;
  esac
done

# ---------------------------------------------------------------------------
# Preflight
# ---------------------------------------------------------------------------

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is unset. Export the prod RDS connection string and retry." >&2
  exit 1
fi

if ! command -v neonctl >/dev/null 2>&1; then
  echo "ERROR: neonctl not found on PATH. Install via 'npm i -g neonctl' and authenticate." >&2
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "ERROR: pg_dump not found on PATH. Install Postgres 17 client tools:" >&2
  echo "  macOS: brew install libpq && brew link --force libpq" >&2
  echo "  Linux: sudo apt install postgresql-client-17" >&2
  echo "  Docker fallback: prefix commands with 'docker run --rm --network=host postgres:17 …'" >&2
  exit 1
fi

if ! command -v pg_restore >/dev/null 2>&1; then
  echo "ERROR: pg_restore not found on PATH (install same way as pg_dump)." >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "ERROR: psql not found on PATH (install same way as pg_dump)." >&2
  exit 1
fi

if ! neonctl me >/dev/null 2>&1; then
  echo "ERROR: neonctl is not authenticated. Run 'neonctl auth' and retry." >&2
  exit 1
fi

echo "→ Preflight OK. Using Neon project $NEON_PROJECT_ID, branch name $BRANCH_NAME"

# ---------------------------------------------------------------------------
# Cleanup trap: always remove temp dump; optionally remove Neon branch
# ---------------------------------------------------------------------------

cleanup() {
  local exit_code=$?
  if [[ -f "$DUMP_PATH" ]]; then
    echo "→ Removing local dump file $DUMP_PATH"
    rm -f "$DUMP_PATH"
  fi
  if [[ "$DELETE_AFTER" == "true" && -n "${CREATED_BRANCH_ID:-}" ]]; then
    echo "→ --delete-after set: deleting Neon branch $CREATED_BRANCH_ID"
    neonctl branches delete "$CREATED_BRANCH_ID" --project-id "$NEON_PROJECT_ID" || {
      echo "WARN: failed to delete Neon branch $CREATED_BRANCH_ID; clean up manually." >&2
    }
  fi
  exit $exit_code
}
trap cleanup EXIT

# ---------------------------------------------------------------------------
# Step 1: create isolated Neon branch
# ---------------------------------------------------------------------------

echo "→ Creating Neon branch '$BRANCH_NAME' on project $NEON_PROJECT_ID"
CREATE_OUTPUT=$(neonctl branches create \
  --project-id "$NEON_PROJECT_ID" \
  --name "$BRANCH_NAME" \
  --output json)
CREATED_BRANCH_ID=$(printf '%s' "$CREATE_OUTPUT" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["branch"]["id"] if isinstance(d, dict) and "branch" in d else d[0]["branch"]["id"])')
echo "  Branch id: $CREATED_BRANCH_ID"

# ---------------------------------------------------------------------------
# Step 2: extract connection string
# ---------------------------------------------------------------------------

echo "→ Extracting connection string for branch $BRANCH_NAME"
NEON_URL=$(neonctl connection-string "$BRANCH_NAME" --project-id "$NEON_PROJECT_ID")
if [[ -z "$NEON_URL" ]]; then
  echo "ERROR: neonctl connection-string returned empty value." >&2
  exit 1
fi
# Redact password in logs. Only show scheme + host path.
REDACTED_URL=$(printf '%s' "$NEON_URL" | sed -E 's#://[^:]+:[^@]+@#://REDACTED@#')
echo "  Connection URL (redacted): $REDACTED_URL"

# ---------------------------------------------------------------------------
# Step 3: pg_dump from RDS
# ---------------------------------------------------------------------------

echo "→ Running pg_dump from prod RDS → $DUMP_PATH (custom format, no-owner, no-acl)"
pg_dump -Fc --no-owner --no-acl "$DATABASE_URL" -f "$DUMP_PATH"
DUMP_SIZE=$(wc -c < "$DUMP_PATH" | tr -d ' ')
echo "  Dump written: $DUMP_SIZE bytes"

# ---------------------------------------------------------------------------
# Step 4: pg_restore into Neon branch
# ---------------------------------------------------------------------------

echo "→ Running pg_restore → Neon branch '$BRANCH_NAME'"
# --clean drops objects before recreating so a re-run against the same branch
# doesn't conflict on existing schema. --no-owner / --no-acl avoids trying to
# reassign ownership to RDS role names that don't exist on Neon.
pg_restore --clean --if-exists --no-owner --no-acl -d "$NEON_URL" "$DUMP_PATH"
echo "  Restore complete."

# ---------------------------------------------------------------------------
# Step 5: row-count comparison
# ---------------------------------------------------------------------------

echo "→ Running row-count queries on Neon branch"
psql "$NEON_URL" -v ON_ERROR_STOP=1 <<'SQL'
\echo '---- entity rows by type (Neon) ----'
SELECT entity_type, COUNT(*) AS n FROM entity GROUP BY entity_type ORDER BY entity_type;
\echo '---- submission count (Neon) ----'
SELECT COUNT(*) AS submissions FROM submission;
\echo '---- edge count (Neon) ----'
SELECT COUNT(*) AS edges FROM edge;
\echo '---- trigger check (Neon) ----'
SELECT tgname FROM pg_trigger WHERE tgrelid IN ('entity'::regclass, 'submission'::regclass) AND NOT tgisinternal ORDER BY tgname;
SQL

echo "→ Running same row-count queries on prod RDS for comparison"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
\echo '---- entity rows by type (RDS) ----'
SELECT entity_type, COUNT(*) AS n FROM entity GROUP BY entity_type ORDER BY entity_type;
\echo '---- submission count (RDS) ----'
SELECT COUNT(*) AS submissions FROM submission;
\echo '---- edge count (RDS) ----'
SELECT COUNT(*) AS edges FROM edge;
SQL

# ---------------------------------------------------------------------------
# Step 6: hand-off banner
# ---------------------------------------------------------------------------

cat <<BANNER

===========================================================
DRY-RUN COMPLETE

Neon branch: $BRANCH_NAME  ($CREATED_BRANCH_ID)
Compare the row counts above. They should match exactly.

To smoke-test the app against this Neon branch locally:
  export DATABASE_URL='$REDACTED_URL'   # copy the unredacted value from
                                        # neonctl connection-string above
  pnpm run dev

To delete this Neon branch when done:
  neonctl branches delete "$CREATED_BRANCH_ID" --project-id "$NEON_PROJECT_ID"
  (or re-run this script with --delete-after to combine)

Prod traffic is UNCHANGED. This script does not touch Lambda, GitHub
Secrets, or DNS. See docs/runbooks/2026-04-22-phase-2-neon-cutover.md
for the real cutover.
===========================================================
BANNER
