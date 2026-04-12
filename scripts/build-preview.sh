#!/bin/bash
# Build script for Cloudflare Pages preview deployments
# Builds static assets and copies them to dist/ for serving
set -e

echo "=== Building preview ==="

# 1. Build TipTap bundle
npm run build:tiptap
echo "✓ TipTap built"

# 2. Pull latest map data from production (so preview has real data)
curl -sf https://mapping-ai.org/map-data.json -o map-data.json || echo "⚠ Could not fetch map-data.json (preview will work without it)"
curl -sf https://mapping-ai.org/map-detail.json -o map-detail.json || echo "⚠ Could not fetch map-detail.json"
echo "✓ Map data fetched"

# 3. Inject password gate hash (if SITE_PASSWORD env var is set in Cloudflare Pages)
if [ -n "$SITE_PASSWORD" ]; then
  HASH=$(echo -n "$SITE_PASSWORD" | sha256sum | cut -d' ' -f1)
  sed -i "s/__SITE_PASSWORD_HASH__/$HASH/g" map.html contribute.html
  echo "✓ Password gate hash injected"
else
  echo "⚠ No SITE_PASSWORD — gate will auto-bypass (preview is open)"
fi

# 4. Copy only public files to dist/
mkdir -p dist/assets/css dist/assets/js dist/assets/images dist/assets/favicon
cp *.html dist/
cp map-data.json map-detail.json dist/ 2>/dev/null || true
cp -r assets/css/* dist/assets/css/
cp -r assets/js/* dist/assets/js/
cp -r assets/images/* dist/assets/images/ 2>/dev/null || true
cp -r assets/favicon/* dist/assets/favicon/ 2>/dev/null || true
cp robots.txt sitemap.xml dist/ 2>/dev/null || true

echo "✓ Preview built → dist/"
ls -la dist/*.html
