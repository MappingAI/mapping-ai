#!/usr/bin/env bash
#
# Setup a new worktree with dependencies and environment.
# Run from inside the worktree, or pass the worktree path as an argument.
#
# Usage:
#   scripts/setup-worktree.sh                  # setup current directory
#   scripts/setup-worktree.sh /path/to/worktree
#
# What it does:
#   1. Copies .env from the main repo (never committed, just local)
#   2. Adds derived env vars (STAGING_DATABASE_URL, key aliases)
#   3. Installs root dependencies (pnpm install)
#   4. Installs verification/ dependencies if present (npm install)
#   5. Installs lefthook for pre-commit hooks
#   6. Verifies DB connectivity

set -euo pipefail

# Resolve paths
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MAIN_REPO="$(cd "$SCRIPT_DIR/.." && pwd)"
WORKTREE="${1:-$(pwd)}"

# Verify this is a git worktree
if ! git -C "$WORKTREE" rev-parse --git-dir &>/dev/null; then
  echo "ERROR: $WORKTREE is not a git repository or worktree"
  exit 1
fi

echo "Setting up worktree: $WORKTREE"
echo "Main repo: $MAIN_REPO"
echo ""

# ── 1. Copy .env ──
if [ -f "$MAIN_REPO/.env" ]; then
  if [ -f "$WORKTREE/.env" ] && [ "$(wc -c < "$WORKTREE/.env")" -gt 10 ]; then
    echo "✓ .env already exists ($(wc -c < "$WORKTREE/.env" | tr -d ' ') bytes), skipping"
  else
    cp "$MAIN_REPO/.env" "$WORKTREE/.env"
    echo "✓ Copied .env from main repo"
  fi
else
  echo "⚠ No .env in main repo ($MAIN_REPO/.env). Create one from .env.example."
fi

# ── 2. Add derived env vars if missing ──
ENV_FILE="$WORKTREE/.env"
if [ -f "$ENV_FILE" ]; then
  # STAGING_DATABASE_URL from Neon CLI
  if ! grep -q "STAGING_DATABASE_URL" "$ENV_FILE" 2>/dev/null; then
    if command -v neonctl &>/dev/null; then
      STAGING_URL=$(neonctl connection-string --project-id calm-tree-46517731 --branch verification-staging 2>/dev/null || true)
      if [ -n "$STAGING_URL" ]; then
        echo "STAGING_DATABASE_URL=\"$STAGING_URL\"" >> "$ENV_FILE"
        echo "✓ Added STAGING_DATABASE_URL from Neon CLI"
      fi
    else
      echo "⚠ neonctl not found, skipping STAGING_DATABASE_URL"
    fi
  fi

  # Key aliases for verification pipeline
  if ! grep -q "EXA_MULTIAGENT_VERIFICATION_KEY" "$ENV_FILE" 2>/dev/null; then
    EXA_KEY=$(grep "^EXA_API_KEY=" "$ENV_FILE" | head -1)
    if [ -n "$EXA_KEY" ]; then
      echo "${EXA_KEY/EXA_API_KEY/EXA_MULTIAGENT_VERIFICATION_KEY}" >> "$ENV_FILE"
      echo "✓ Added EXA_MULTIAGENT_VERIFICATION_KEY alias"
    fi
  fi

  if ! grep -q "ANTHROPIC_MULTIAGENT_VERIFICATION_KEY" "$ENV_FILE" 2>/dev/null; then
    ANTHROPIC_KEY=$(grep "^ANTHROPIC_API_KEY=" "$ENV_FILE" | head -1)
    if [ -n "$ANTHROPIC_KEY" ]; then
      echo "${ANTHROPIC_KEY/ANTHROPIC_API_KEY/ANTHROPIC_MULTIAGENT_VERIFICATION_KEY}" >> "$ENV_FILE"
      echo "✓ Added ANTHROPIC_MULTIAGENT_VERIFICATION_KEY alias"
    fi
  fi
fi

# ── 3. Install root dependencies ──
if [ -f "$WORKTREE/pnpm-lock.yaml" ]; then
  echo ""
  echo "Installing root dependencies (pnpm)..."
  (cd "$WORKTREE" && pnpm install --frozen-lockfile 2>&1 | tail -3)
  echo "✓ Root dependencies installed"
elif [ -f "$WORKTREE/package-lock.json" ]; then
  echo ""
  echo "Installing root dependencies (npm)..."
  (cd "$WORKTREE" && npm ci 2>&1 | tail -3)
  echo "✓ Root dependencies installed"
fi

# ── 4. Verification uses root dependencies (no separate package.json) ──

# ── 5. Install lefthook ──
if command -v lefthook &>/dev/null && [ -f "$WORKTREE/lefthook.yml" ]; then
  (cd "$WORKTREE" && lefthook install 2>/dev/null || true)
  echo "✓ Lefthook installed"
fi

# ── 6. Verify connectivity ──
echo ""
echo "Verifying environment..."
if [ -f "$ENV_FILE" ]; then
  KEY_COUNT=$(grep -cE "^(DATABASE_URL|ANTHROPIC_API_KEY|EXA_API_KEY|R2_ACCESS_KEY_ID)=" "$ENV_FILE" 2>/dev/null || echo 0)
  echo "  Env vars found: $KEY_COUNT core keys"

  # Quick DB connectivity check
  DB_URL=$(grep "^DATABASE_URL=" "$ENV_FILE" | head -1 | cut -d'"' -f2)
  if [ -n "$DB_URL" ]; then
    if node -e "
      import pg from 'pg';
      const pool = new pg.Pool({ connectionString: '$DB_URL', ssl: { rejectUnauthorized: false } });
      try { await pool.query('SELECT 1'); console.log('  DB: connected'); } catch(e) { console.log('  DB: FAILED -', e.message); }
      await pool.end();
    " 2>/dev/null; then
      true
    else
      echo "  DB: could not verify (node/pg not available yet)"
    fi
  fi
fi

echo ""
echo "Setup complete!"
echo ""
echo "Quick start:"
echo "  pnpm run dev          # Start dev server"
echo "  pnpm exec tsc --noEmit  # Type check"
echo "  pnpm exec vitest run  # Tests"
