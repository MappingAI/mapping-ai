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

Before creating the PR, load the app locally and confirm it works:

```bash
npm run dev   # Vite dev server on http://localhost:5173
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

Two GitHub Actions workflows run over the PR lifecycle:

**`.github/workflows/ci.yml`** — runs on every PR. Every check below must be green before merge:

| Check | What it runs |
|-------|--------------|
| Prettier format-check | `npm run format:check` |
| ESLint | `npm run lint` |
| TypeScript type-check | `npm run type-check` |
| Vitest | `npm test` |
| Vite build | `npm run build` |
| SAM template validate | `sam validate --lint` |

These are the **required status checks** on `main` — see the Branch Protection section below.

**`.github/workflows/deploy.yml`** — runs only on `push` to `main`. Performs:
- `npm ci` succeeds
- DB schema smoke test passes
- `node scripts/export-map-data.js` generates valid `map-data.json` + `map-detail.json`
- S3 sync succeeds
- CloudFront invalidation succeeds

## Branch Protection

`main` is protected. To enforce the CI gate, the maintainer configures these settings in GitHub → Settings → Branches → Branch protection rule for `main`:

- ✅ Require a pull request before merging
- ✅ Require status checks to pass before merging → select:
  - `Lint, type-check, test, build`
  - `SAM template validate`
- ✅ Require branches to be up to date before merging
- ✅ Do not allow bypassing the above settings (include administrators)
- ✅ Restrict pushes that create matching branches
- ❌ Allow force pushes (leave off)

**Hotfix exception:** P0 site-down incidents may push directly to `main` with the branch protection temporarily disabled by the admin. Re-enable protection immediately afterward and file a PR for the record.

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

### Backend (manual — dry-run discipline required)

The 2026-04-16 CloudFront outage ([post-mortem](solutions/integration-issues/sam-deploy-overwrites-manual-cloudfront-config-2026-04-16.md)) established that every `sam deploy` must be preceded by a changeset review. **Do not run `sam deploy` without passing through these steps:**

```bash
# 1. Drift scan — confirm the deployed stack still matches template.yaml.
#    If anything has drifted (someone Console-edited a setting), codify the
#    drift into template.yaml in a separate commit before deploying here.
aws cloudformation detect-stack-drift --stack-name mapping-ai
# Wait for completion:
aws cloudformation describe-stack-drift-detection-status \
  --stack-drift-detection-id <id-from-above>
aws cloudformation describe-stack-resource-drifts \
  --stack-name mapping-ai \
  --stack-resource-drift-status-filters MODIFIED DELETED

# 2. Dry run — build and generate a changeset without applying it.
sam build
sam deploy --no-execute-changeset --parameter-overrides \
  DatabaseUrl=$DATABASE_URL \
  AdminKey=$ADMIN_KEY \
  AnthropicApiKey=$ANTHROPIC_API_KEY

# 3. Read the changeset in the CloudFormation console or via:
aws cloudformation describe-change-set --change-set-name <arn-from-above>

# 4. Only if the changeset is scoped as expected (no surprise CloudFront,
#    IAM, or API Gateway changes), execute it:
aws cloudformation execute-change-set --change-set-name <arn>
```

Why not just `sam deploy` directly: SAM reconciles the *entire* stack on every deploy. A small template edit can trigger corrections to any resource that has drifted from the template — exactly how the 4/16 incident destroyed CloudFront's custom domain and URL-rewrite function. The dry-run makes the blast radius visible before it hits prod.

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

The CI gate runs these automatically, but a pre-push local run catches most failures before you wait on CI:

```bash
npm run format:check && npm run lint && npm run type-check && npm test && npm run build
```

Plus the deploy-specific checks:

```
[ ] Local browser test: map.html renders with data
[ ] Local browser test: contribute.html form loads
[ ] No console errors on affected pages
[ ] If script tags changed: verified in browser (not just grep)
[ ] If export pipeline changed: ran export-map-data.js locally
[ ] If backend changed: noted that sam deploy is needed (+ drift-scan + dry-run)
[ ] PR has summary and risk assessment
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
| `.github/workflows/ci.yml` | **P1** — gate misconfigured (false passes or false blocks) | Dry-run on a scratch PR; confirm all jobs still required in branch protection |
| `eslint.config.js`, `.prettierrc.json` | **P2** — false lint/format signals waste reviewer time | Run `npm run lint` + `npm run format:check` locally before committing |

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
