# Deployment & Review Process

How code gets from a local branch to production, and what checks must pass at each stage.

---

## Architecture

```
Feature branch → PR (review + CI) → main → GitHub Actions auto-deploy
                                            ├── S3 sync (HTML, CSS, JS, JSON)
                                            └── CloudFront invalidation

Backend (Lambda + API Gateway + CloudFront config):
Feature branch → PR (review + CI) → main → manual `sam build && sam deploy`
```

**Key distinction:** Pushing to `main` automatically deploys *frontend* (static files to S3/CloudFront). It does NOT deploy *backend* (Lambda functions, API Gateway, CloudFront settings). Backend requires a manual `sam deploy`.

## Branch Strategy

| Branch | Purpose | Deploys to |
|--------|---------|------------|
| `main` | Production. Every push auto-deploys frontend. | Live site (mapping-ai.org) |
| `feat/*` | Feature branches. Work in progress. | Nothing (local only) |
| `fix/*` | Hotfix branches. Urgent production fixes. | Nothing until merged to main |

**Rules:**
- Never push directly to `main`. Always use a PR.
- Exception: P0 hotfixes (site is down) may push directly to main with post-hoc PR for documentation.
- Feature branches should be rebased on main before merging to avoid complex merge commits.

## Pull Request Requirements

Every PR to `main` must include:

### 1. Local browser verification

Before creating the PR, load these pages locally and confirm they work:

```bash
npx serve .   # or: node dev-server.js
```

| Page | What to check |
|------|---------------|
| `map.html` | Map renders with nodes visible. Click a node → detail panel opens. Filters work. Search works. |
| `contribute.html` | Form loads. Dropdowns work. Org search returns results. |
| `admin.html` | Auth gate appears. (Full admin test requires API access.) |
| `index.html` | Page loads, navigation works. |

**If your PR changes `<script>` tags, CSS loading, or data fetching — browser testing is mandatory, not optional.**

### 2. PR description

```markdown
## Summary
- What changed and why

## Testing
- [ ] Verified map.html loads and renders nodes
- [ ] Verified contribute.html form works
- [ ] Verified no console errors on affected pages
- [ ] Ran `node scripts/export-map-data.js` (if export/data changes)

## Risk assessment
- Frontend only / Backend only / Both
- Requires sam deploy: yes/no
```

### 3. CI checks pass

The GitHub Actions workflow runs on push to main. It must pass before the deploy reaches production. Current checks:
- `npm ci` succeeds
- `npm run build:tiptap` succeeds
- DB schema smoke test passes
- `node scripts/export-map-data.js` generates valid map-data.json + map-detail.json
- S3 sync succeeds
- CloudFront invalidation succeeds

### 4. Review

- At least one human (or informed AI review) must approve the PR
- Changes to `<script>` tags, data loading, or D3 code require extra scrutiny (see [D3 defer incident](post-mortems/2026-04-09-d3-defer-map-outage.md))
- Backend changes (api/*.js, template.yaml) should be in separate PRs from frontend changes when possible

## Deploy Process

### Frontend (automatic)

```
git push origin main
→ GitHub Actions: npm ci → build → export map data → S3 sync → CloudFront invalidation
→ Live in ~2-3 minutes
```

**What gets deployed:** All `.html` files, `assets/` (CSS, JS, images), `map-data.json`, `map-detail.json`

**What does NOT get deployed:** `api/`, `scripts/`, `template.yaml`, `node_modules/`, `.github/`

### Backend (manual)

```bash
sam build && sam deploy --parameter-overrides \
  DatabaseUrl=$DATABASE_URL \
  AdminKey=$ADMIN_KEY \
  AnthropicApiKey=$ANTHROPIC_API_KEY
```

**What gets deployed:** Lambda functions (api/*.js), API Gateway config (routes, throttle, CORS), CloudFront settings (security headers, cache policy)

**When to deploy backend:**
- After merging changes to `api/*.js` files
- After merging changes to `template.yaml`
- After merging `api/cors.js` or any shared Lambda module

**Order of operations for changes that touch both frontend and backend:**
1. Deploy backend first (`sam deploy`)
2. Verify API endpoints work (`curl /search?q=test`)
3. Then push frontend to main (triggers auto-deploy)
4. Verify site works end-to-end

## Rollback

### Frontend rollback (fast — ~2 min)

If the site breaks after a push to main:

```bash
# Option 1: Revert the commit and push
git revert HEAD
git push origin main
# Wait for CI deploy (~2 min)

# Option 2: Re-deploy previous version from S3
# CloudFront caches may serve stale content for up to 60s (map-data.json) or 24h (assets)
# Force invalidation:
aws cloudfront create-invalidation --distribution-id E34ZXLC7CZX7XT --paths "/*"
```

### Backend rollback (manual — ~5 min)

```bash
# Revert to previous Lambda deployment
# SAM doesn't have a built-in rollback, but you can:
git revert <commit>
sam build && sam deploy
```

## Pre-Push Checklist

Copy this into your PR or run through it mentally before merging:

```
[ ] Local browser test: map.html renders with data
[ ] Local browser test: contribute.html form loads
[ ] No console errors on affected pages
[ ] If script tags changed: verified in browser (not just grep)
[ ] If export pipeline changed: ran export-map-data.js locally
[ ] If backend changed: noted that sam deploy is needed
[ ] PR has summary and risk assessment
[ ] CI passes on the branch
```

## Known Risks by File

| File(s) | Risk if broken | Key checks |
|---------|---------------|------------|
| `map.html` | **P0** — primary product page, map disappears | Browser test: nodes render, D3 loads |
| `contribute.html` | **P1** — can't collect data | Browser test: form renders, dropdowns work |
| `api/export-map.js` | **P0** — map data malformed → empty/broken map | Run export locally, verify JSON |
| `scripts/export-map-data.js` | **P0** — CI deploy fails or generates bad data | Run locally before pushing |
| `api/admin.js` | **P1** — admin can't approve/reject | Test with admin key |
| `template.yaml` | **P1** — API Gateway misconfigured | `sam validate` before deploy |
| `.github/workflows/deploy.yml` | **P0** — deploy pipeline breaks | Review carefully, test on branch if possible |

## Incident Response

If the live site is broken:

1. **Assess severity:** Is the map empty? Is the whole site down? Is it just a visual glitch?
2. **Check CI:** `gh run list --limit 1` — did the last deploy succeed?
3. **Identify the cause:** `git log --oneline -5` — what was the last change?
4. **Fix or revert:**
   - If the fix is obvious and small → commit fix and push
   - If the cause is unclear → `git revert HEAD && git push` to restore previous state
5. **Verify:** Wait for deploy (~2 min), check the site
6. **Document:** Write a post-mortem in `docs/post-mortems/`
