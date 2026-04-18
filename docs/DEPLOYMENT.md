# Deployment & Review Process

How code gets from a local branch to production, and what checks must pass at each stage.

---

## Architecture

```
Feature branch -> PR (review + CI) -> main -> GitHub Actions auto-deploy
                                               ├── npm ci
                                               ├── npm run build:tiptap
                                               ├── npx vite build -> dist/
                                               ├── node scripts/export-map-data.js
                                               ├── Password hash + analytics injection on dist/
                                               ├── aws s3 sync dist/ -> S3
                                               ├── CloudFront cache invalidation
                                               └── Post-deploy smoke test (all pages HTTP 200)

Backend (Lambda + API Gateway + CloudFront config):
Feature branch -> PR -> main -> manual `sam build && sam deploy`
```

**Key distinction:** Pushing to `main` automatically deploys the *frontend* (Vite-built static files to S3/CloudFront). It does NOT deploy the *backend* (Lambda functions, API Gateway, CloudFront settings). Backend requires a manual `sam deploy`.

**Critical: Never run `sam deploy` without checking for drift first.** See the [SAM deploy post-mortem](solutions/integration-issues/sam-deploy-overwrites-manual-cloudfront-config-2026-04-16.md) for why. Always run `aws cloudformation detect-stack-drift` before deploying.

## Branch Strategy

| Branch | Purpose | Deploys to |
|--------|---------|------------|
| `main` | Production. Every push auto-deploys frontend. | Live site (mapping-ai.org) |
| `feat/*` | Feature branches. Work in progress. | Cloudflare Pages preview (auto) |
| `fix/*` | Hotfix branches. Urgent production fixes. | Nothing until merged to main |

**Rules:**
- Never push directly to `main`. Always use a PR.
- Exception: P0 hotfixes (site is down) may push directly to main with post-hoc PR for documentation.
- Feature branches get automatic Cloudflare Pages preview deployments at `<branch>.mapping-ai.pages.dev`.

## Pull Request Requirements

Every PR to `main` must include:

### 1. Local verification

Before creating the PR, test locally:

```bash
# Terminal 1: React pages
npx vite dev

# Terminal 2: API proxy + map
node dev-server.js
```

| Page | URL | What to check |
|------|-----|---------------|
| Contribute | localhost:5173/contribute | Form loads, dropdowns work, org search returns results |
| Map | localhost:3000/map.html | Map renders with nodes. Click a node, detail panel opens. Filters work. |
| Admin | localhost:5173/admin | Auth gate appears, can type password |
| Insights | localhost:5173/insights | Charts render with data |
| Homepage | localhost:5173/ | Page loads, navigation works |

Also run:
```bash
npx tsc --noEmit    # Type checking
npx vitest run      # Unit tests
```

### 2. PR description

Include a summary, testing notes, and risk assessment.

### 3. CI checks pass

The GitHub Actions workflow runs on push to main:
1. `npm ci`
2. `npm run build:tiptap` (legacy TipTap bundle for map.html)
3. Write `.env.production` with `VITE_SITE_PASSWORD_HASH`
4. `npx vite build` (React pages to dist/)
5. DB schema smoke test
6. `node scripts/export-map-data.js` generates map-data.json + map-detail.json
7. Password hash and analytics token injection on dist/ files
8. S3 sync (HTML with no-cache, hashed assets with immutable cache)
9. CloudFront invalidation
10. **Post-deploy smoke test** (curls all pages, fails build if any return non-200)

### 4. Review

- At least one human or thorough AI review must approve the PR
- Changes to map.html, D3 code, or script tags require extra scrutiny
- Backend changes (api/*.js, template.yaml) should be in separate PRs from frontend when possible

## Deploy Process

### Frontend (automatic)

```
git push origin main
-> GitHub Actions: build -> export -> inject -> sync -> invalidate -> smoke test
-> Live in ~3-5 minutes
```

**What gets deployed:** All files in `dist/` (Vite-built HTML/JS/CSS), map-data.json, map-detail.json, workshop/ directory

**What does NOT get deployed:** `api/`, `scripts/`, `template.yaml`, `node_modules/`, `src/`

### Backend (manual)

```bash
# ALWAYS check for drift first
aws cloudformation detect-stack-drift --stack-name mapping-ai

# Then build and deploy
sam build && sam deploy --parameter-overrides \
  DatabaseUrl=$DATABASE_URL \
  AdminKey=$ADMIN_KEY \
  AnthropicApiKey=$ANTHROPIC_API_KEY
```

**Review the changeset before confirming.** If it shows unexpected Modify/Add on resources you didn't change (especially CloudFront), STOP and investigate.

### Cloudflare Pages (automatic for branches)

Every branch push triggers a Cloudflare Pages preview build via `scripts/build-preview.sh`. Preview URLs: `<branch-name>.mapping-ai.pages.dev`

## Rollback

### Frontend rollback (~2 min)

```bash
# Option 1: Revert and push
git revert HEAD
git push origin main

# Option 2: Force invalidation after S3 rollback
aws cloudfront create-invalidation --distribution-id E34ZXLC7CZX7XT --paths "/*"
```

### Backend rollback (~5 min)

```bash
git revert <commit>
sam build && sam deploy
```

## Post-Push Verification (MANDATORY)

After every push to main, verify the site works:

```bash
for page in "/" "/contribute" "/map" "/about" "/insights" "/admin"; do
  echo "$(curl -s -o /dev/null -w '%{http_code}' https://mapping-ai.org${page}) ${page}"
done
```

The deploy workflow does this automatically, but always verify manually too. A broken prod site with no one checking is the worst outcome.

## Known Risks by File

| File(s) | Risk | Key checks |
|---------|------|------------|
| `map.html` | **P0**: primary product page | Browser test: nodes render, D3 loads |
| `src/contribute/` | **P1**: can't collect data | Form renders, dropdowns work, submission succeeds |
| `api/export-map.js` | **P0**: map data malformed | Run export locally, verify JSON |
| `api/admin.js` | **P1**: admin can't approve/reject | Test with admin key |
| `template.yaml` | **P1**: API/CloudFront misconfigured | `sam validate`, check drift |
| `.github/workflows/deploy.yml` | **P0**: deploy pipeline breaks | Review carefully |
| `src/hooks/useSubmitEntity.ts` | **P1**: form submission broken | Test submit end-to-end |
| `src/lib/api.ts` | **P1**: all API calls broken | Check search + submit work |

## Incident Response

If the live site is broken:

1. **Assess:** Is the map empty? Whole site down? Just a visual glitch?
2. **Check CI:** `gh run list --limit 1` (did the last deploy succeed?)
3. **Identify:** `git log --oneline -5` (what changed?)
4. **Fix or revert:** obvious fix -> commit and push. Unclear -> `git revert HEAD && git push`
5. **Verify:** Wait for deploy (~3 min), check all pages
6. **Document:** Write a post-mortem in `docs/post-mortems/`
