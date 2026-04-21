#!/bin/bash
# Build script for Cloudflare Pages preview deployments
# Runs Vite build and prepares dist/ for serving
set -e

echo "=== Building preview ==="
echo "Node: $(node --version 2>/dev/null || echo 'not found')"

# 0. Make pnpm available. CF Pages' auto-detect from pnpm-lock.yaml has been
# unreliable; install via corepack if pnpm isn't already on PATH.
if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm not on PATH; enabling via corepack"
  if command -v corepack >/dev/null 2>&1; then
    corepack enable pnpm
    corepack prepare pnpm@10.33.0 --activate
  else
    echo "corepack unavailable; falling back to npm install -g pnpm"
    npm install -g pnpm@10.33.0
  fi
fi
echo "pnpm: $(pnpm --version)"

# Make sure deps are installed. No-op if CF Pages already ran install.
pnpm install --frozen-lockfile
echo "✓ Dependencies installed"

# 1. Build TipTap bundle (still needed for map.html inline code)
pnpm run build:tiptap
echo "✓ TipTap built"

# 2. Pull latest map data from production (so preview has real data)
curl -sf https://mapping-ai.org/map-data.json -o map-data.json || echo "⚠ Could not fetch map-data.json (preview will work without it)"
curl -sf https://mapping-ai.org/map-detail.json -o map-detail.json || echo "⚠ Could not fetch map-detail.json"
echo "✓ Map data fetched"

# 3. Build with Vite (outputs to dist/)
pnpm exec vite build
echo "✓ Vite build complete"

# 4. Copy map data into dist/
cp map-data.json dist/map-data.json 2>/dev/null || true
cp map-detail.json dist/map-detail.json 2>/dev/null || true
echo "✓ Map data copied to dist/"

# 5. Inject password gate hash (if SITE_PASSWORD env var is set in Cloudflare Pages)
if [ -n "$SITE_PASSWORD" ]; then
  HASH=$(echo -n "$SITE_PASSWORD" | sha256sum | cut -d' ' -f1)
  sed -i "s/__SITE_PASSWORD_HASH__/$HASH/g" dist/map.html dist/contribute.html
  echo "✓ Password gate hash injected"
else
  echo "⚠ No SITE_PASSWORD — gate will auto-bypass (preview is open)"
fi

# 6. Inject Cloudflare analytics token (if set)
if [ -n "$CF_ANALYTICS_TOKEN" ]; then
  sed -i "s/__CF_ANALYTICS_TOKEN__/$CF_ANALYTICS_TOKEN/g" dist/*.html
  echo "✓ Analytics token injected"
fi

echo "✓ Preview built → dist/"
ls -la dist/*.html
