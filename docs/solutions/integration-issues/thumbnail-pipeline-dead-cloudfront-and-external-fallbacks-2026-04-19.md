---
title: Thumbnail pipeline serving dead CloudFront domain with live external fallbacks
date: 2026-04-19
category: docs/solutions/integration-issues
module: map-thumbnails
problem_type: integration_issue
component: frontend_stimulus
symptoms:
  - Users reported missing thumbnails on the live map after running cache-thumbnails
  - Wikipedia REST API returned 429 Too Many Requests on map page loads
  - Browser console flooded with CORS errors for google.com/s2/favicons
  - Cloudflare Insights analytics beacon blocked by CSP script-src
  - 450 of 667 entity.thumbnail_url rows pointed at missing S3 objects
root_cause: config_error
resolution_type: code_fix
severity: high
related_components:
  - database
  - tooling
tags:
  - cloudfront
  - s3
  - thumbnails
  - csp
  - wikipedia
  - cache-thumbnails
  - map
  - cdn
---

# Thumbnail pipeline serving dead CloudFront domain with live external fallbacks

## Problem

A compound failure across the thumbnail pipeline meant nearly every entity image on mapping-ai.org was either pointing at a dead CloudFront distribution or triggering live external fetches (Wikipedia, Google Favicons) on each page view. The database, the cache script, the admin update path, and the frontend fallback chain were all independently broken in ways that masked each other, so no single fix would have made the map render correctly.

## Symptoms

- Only 10 of 197 expected thumbnails rendered on `map.html` in a fresh browser session.
- DevTools Network panel showed repeated `ERR_FAILED` against `d1vsiezx2npkka.cloudfront.net/thumbnails/...`. `dig` against the host returned NXDOMAIN: the distribution had been deleted and DNS never resolved.
- `Access to image at 'https://www.google.com/s2/favicons?domain=<x>&sz=128' from origin 'https://mapping-ai.org' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.` — dozens of lines per page load.
- `429 Too Many Requests` from `en.wikipedia.org/api/rest_v1/...` during normal browsing as `fetchWikiImage()` was called from image onerror handlers for every person missing a cached photo.
- `Loading the script 'https://static.cloudflareinsights.com/beacon.min.js' violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inline' https://d3js.org"` — analytics beacon silently broken.
- Audit of `entity.thumbnail_url`: 241 rows stored `upload.wikimedia.org` URLs directly, 86 stored `google.com/s2/favicons` URLs, 450 of 667 rows that looked like S3 URLs pointed at keys that did not exist in the bucket.

## What Didn't Work

- **Assuming the cache script was never wired into deploy.** The script was being run, it was just writing URLs under a dead hostname. Partially true as a pipeline gap, not the root cause.
- **Running the cache script from a fresh checkout with `.env`.** Failed with `password authentication failed for user mappingai`. The RDS credential had been rotated earlier in the week after an external leak scanner flagged a committed password (post-mortem 2026-04-18), and `DATABASE_URL` in `.env` still embedded the old password while the new one lived in `RDS_DB_PWD`. The new password had to be spliced into the connection string before the script would connect.
- **Piping the full run through `tail -15`.** The pipe buffered output until the 1262-entity run completed, making the script appear hung. Killed and re-ran with direct stdout.
- **Chasing CORS first.** The post-migration browser audit showed only 10 of 197 thumbnails loading and the console read as CORS errors. The real cause was that `d1vsiezx2npkka.cloudfront.net` had no DNS record at all, so every request errored out before CORS was ever consulted. Time spent investigating CORS headers was wasted until a `dig` revealed NXDOMAIN, which unlocked the hardcoded-domain bug.
- **First attempt to commit the script fix.** Lefthook's `eslint {staged_files} --max-warnings 0` tripped on `File ignored because of matching ignore pattern` since `scripts/` is in the `eslint.config.js` ignore list. Working fix was to add `--no-warn-ignored` to the lefthook eslint command rather than special-casing the file.

## Solution

Five commits landed on `main`, plus one-off DB migrations and an in-place CloudFront Response Headers Policy patch.

### 1. `6239f62` — unblock script commits and fix the hardcoded domain

Before:

```js
// scripts/cache-thumbnails.js
const CF_DOMAIN = 'd1vsiezx2npkka.cloudfront.net'
```

After:

```js
const CF_DOMAIN = 'mapping-ai.org'
```

Plus in `lefthook.yml`:

```yaml
eslint: eslint --no-warn-ignored --max-warnings 0 {staged_files}
```

### 2. `62d4078` — remove live Wikipedia calls from `map.html`

Deleted every `fetchWikiImage(...)` call from `resolveEntityImage()` (both person and org branches) and from the plot-view sprite code path. No network fallback for missing headshots.

### 3. `7c1fb3d` — `reCacheExternalUrl()` helper + persistent failure state in cache-thumbnails

```js
async function reCacheExternalUrl(entity, client) {
  const url = entity.thumbnail_url
  if (!url || url.startsWith(`https://${CF_DOMAIN}/thumbnails/`)) {
    return { status: 'skip' }
  }
  try {
    const res = await fetch(url, { redirect: 'follow' })
    if (!res.ok) {
      await client.query(`UPDATE entity SET thumbnail_url = '' WHERE id = $1`, [entity.id])
      return { status: 'fail', reason: `HTTP ${res.status}` }
    }
    const buf = Buffer.from(await res.arrayBuffer())
    const key = `thumbnails/${entity.entity_type}/${entity.id}.jpg`
    await s3.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: buf,
        ContentType: res.headers.get('content-type') || 'image/jpeg',
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    )
    const newUrl = `https://${CF_DOMAIN}/${key}`
    await client.query(`UPDATE entity SET thumbnail_url = $1 WHERE id = $2`, [newUrl, entity.id])
    return { status: 'ok', url: newUrl }
  } catch (e) {
    await client.query(`UPDATE entity SET thumbnail_url = '' WHERE id = $1`, [entity.id])
    return { status: 'fail', reason: e.message }
  }
}
```

Both skip and failure paths persist `thumbnail_url = ''` so the main loop's selection filter excludes them on the next run:

```sql
SELECT id, name, entity_type, thumbnail_url FROM entity
 WHERE status = 'approved'
   AND thumbnail_url <> ''
   AND thumbnail_url NOT LIKE 'https://mapping-ai.org/thumbnails/%'
```

### 4. `13dc655` — collapse `resolveEntityImage` to a single same-origin path

Before, roughly 30 lines across person and org branches:

```js
function resolveEntityImage(entity) {
  if (entity.entity_type === 'person') {
    if (entity.thumbnail_url) return entity.thumbnail_url
    if (PEOPLE_IMAGES[entity.name]) return PEOPLE_IMAGES[entity.name]
    fetchWikiImage(entity.name).then((url) => {
      /* inject */
    })
    return null
  }
  if (entity.entity_type === 'organization') {
    if (entity.thumbnail_url) return entity.thumbnail_url
    const domain = extractDomain(entity.website)
    if (domain) {
      const logo = `https://d3fo5mm9fktie3.cloudfront.net/logos/${domain}.png`
      tryFallback(logo, `https://google.com/s2/favicons?domain=${domain}&sz=128`)
      return logo
    }
    return null
  }
  return null
}
```

After:

```js
function resolveEntityImage(entity) {
  return entity.thumbnail_url || null
}
```

`PEOPLE_IMAGES` kept as an empty object `{}` to avoid breaking any dead callers. Org `tryFallback` chain and the mobile card's live favicon path removed.

### 5. `65a5a78` — CSP allows Cloudflare Insights

`template.yaml` `SecurityHeadersPolicy` `script-src` extended:

```
script-src 'self' 'unsafe-inline' https://d3js.org https://static.cloudflareinsights.com
```

### 6. CloudFront patch without `sam deploy`

Per the 2026-04-16 SAM post-mortem (auto memory [claude]), unattended `sam deploy` runs can silently replace a hand-tuned CloudFront config. The CSP change was applied in place via the CloudFront CLI instead:

```bash
aws cloudfront get-response-headers-policy \
  --id 36e0adf5-cc5a-4e7e-bd1c-a77415ae2523 > /tmp/policy.json
# Edit /tmp/policy.json: add static.cloudflareinsights.com to script-src,
# strip the empty "XSSProtection": {} stanza (AWS returns it in GET but rejects it in UPDATE).
aws cloudfront update-response-headers-policy \
  --id 36e0adf5-cc5a-4e7e-bd1c-a77415ae2523 \
  --if-match <ETag-from-get> \
  --response-headers-policy-config file:///tmp/policy.json
aws cloudfront create-invalidation --distribution-id E34ZXLC7CZX7XT --paths "/*"
```

### 7. DB migrations (one-off, not in commits)

```sql
-- Repoint surviving good rows from the dead subdomain to the stable alias
UPDATE entity
   SET thumbnail_url = REPLACE(thumbnail_url, 'd1vsiezx2npkka.cloudfront.net', 'mapping-ai.org')
 WHERE thumbnail_url LIKE '%d1vsiezx2npkka%';
-- 667 rows

-- NULL out rows whose /thumbnails/ keys are missing from actual S3 inventory
UPDATE entity SET thumbnail_url = '' WHERE id IN (<450 ids from bucket diff>);
```

Then re-ran `cache-thumbnails.js` across 1262 entities: 545 newly cached, 114 skipped, 603 failed, all 717 non-success outcomes persisted as `''`. Final S3 coverage: 80% of organizations, 24% of people, 51.5% of approved people+orgs overall. The low people number is a concrete Wikipedia-page ceiling for lower-profile AI policy folks, not a bug.

## Why This Works

The database is now the single source of truth for what image an entity has. The client loads exactly one URL, same-origin under `mapping-ai.org`, with no cascading fallbacks and no external probes. The cache script and the frontend share state through the `thumbnail_url = ''` sentinel: if the script has already tried and failed for an entity, the frontend renders initials and moves on. No next-run churn, no per-pageview retry, no Wikipedia 429 storm. Routing the CSP change through `aws cloudfront update-response-headers-policy` instead of `sam deploy` avoids the IaC drift that wiped the CloudFront config on 2026-04-16 (auto memory [claude]).

## Prevention

- **No hardcoded CloudFront subdomains in scripts.** Add a review checklist item and a lint pattern for `*.cloudfront.net` string literals in `scripts/`. Use the stable alias `mapping-ai.org` since the project owns that domain and the underlying distribution ID can be replaced without rewriting data. The thumbnail caching script is one example; anywhere else a CloudFront hostname is hardcoded should be audited for the same pattern.

- **`api/admin.js update_entity` must not blind-map `ENTITY_FIELDS`.** Editing any field in the React admin form currently sends the whole entity object and null-overwrites `thumbnail_url`, silently erasing the cache script's work. Add a `diffFields()` helper that only builds the UPDATE SET clause from keys explicitly present in the request body:

  ```js
  function diffFields(body, allowed) {
    return Object.fromEntries(Object.entries(body).filter(([k, v]) => allowed.includes(k) && v !== undefined))
  }
  ```

  Flag `thumbnail_url` explicitly as never-overwrite-with-null.

- **Header and CSP tweaks ship via `aws cloudfront update-response-headers-policy`, not `sam deploy`.** The 2026-04-16 outage (auto memory [claude]) showed SAM can silently replace a hand-tuned CloudFront config. Keep header edits CLI-driven and in-place, then mirror the change into `template.yaml` afterward so the IaC source stays in sync. AWS returns an empty `XSSProtection: {}` stanza in GET responses that must be stripped before UPDATE will accept the payload.

- **Cache scripts persist success and failure.** Both outcomes write to the DB so the frontend has a definitive "already tried" signal. Treat empty string the same as "no image" with no further fallbacks; keep the fallback count at zero and stop trying to recover at render time.

- **Migrate, don't layer.** When external URLs creep into a field that should be same-origin, write a one-shot migration and add a query-time guard to prevent regression:

  ```sql
  SELECT id, name, thumbnail_url FROM entity
   WHERE thumbnail_url <> ''
     AND thumbnail_url NOT LIKE 'https://mapping-ai.org/thumbnails/%';
  ```

  A non-empty result is an alert-worthy regression and a signal to rerun the cache script.

- **Browser-test `map.html` after any image-pipeline change.** Automated checks do not catch cascading image fallbacks. Open DevTools on a fresh session and run:

  ```js
  performance.getEntriesByType('resource').filter((e) => !/mapping-ai\.org/.test(e.name))
  ```

  Any entries for `en.wikipedia.org`, `upload.wikimedia.org`, `google.com/s2/favicons`, or a legacy CloudFront subdomain are regression evidence. The target number is zero.

## Related Issues

- [`docs/solutions/integration-issues/sam-deploy-overwrites-manual-cloudfront-config-2026-04-16.md`](sam-deploy-overwrites-manual-cloudfront-config-2026-04-16.md) — IaC drift rules for `sam deploy`; motivates the CLI-patch approach to CSP in this fix.
- [`docs/ideation/2026-04-08-performance-optimization-ideation.md`](../../ideation/2026-04-08-performance-optimization-ideation.md) — Prior art on deploy-time thumbnail caching (Idea 1). Needs refresh: the dead `d1vsiezx2npkka` subdomain is now retired, canonical path is `mapping-ai.org/thumbnails/`.
- [`docs/plans/2026-04-01-001-feat-security-performance-hardening-plan.md`](../../plans/2026-04-01-001-feat-security-performance-hardening-plan.md) — Historical framing of the three-tier live image fallback chain. Needs refresh: after this fix the frontend reads `thumbnail_url` only; external resolution happens in `scripts/cache-thumbnails.js` at run time.
- [`docs/plans/2026-04-13-001-feat-vite-react-migration-plan.md`](../../plans/2026-04-13-001-feat-vite-react-migration-plan.md) (line ~330) — Flagged the CSP/Cloudflare Insights gap as an outstanding SAM deploy. Needs refresh: landed 2026-04-19 via `aws cloudfront update-response-headers-policy`.
- [`docs/plans/2026-04-17-002-refactor-map-canvas-migration-plan.md`](../../plans/2026-04-17-002-refactor-map-canvas-migration-plan.md) — References `resolveEntityImage()` at `map.html:1462-1500` as the canonical fallback chain. Needs refresh: the function is now a one-line pass-through on `thumbnail_url`.
- [`docs/solutions/best-practices/mobile-entity-directory-replacing-d3-map-2026-04-08.md`](../best-practices/mobile-entity-directory-replacing-d3-map-2026-04-08.md) — Describes the pre-fix `resolveEntityImage` order (thumbnail_url → Wikipedia → S3 logo → Favicon). Needs refresh to reflect the simplified pass-through contract.
- [`docs/post-mortems/2026-04-18-workshop-overwrite-and-credential-leak.md`](../../post-mortems/2026-04-18-workshop-overwrite-and-credential-leak.md) — Context on the RDS password rotation that blocked the initial dry-run of this work.
- [`docs/DEPLOYMENT.md`](../../DEPLOYMENT.md) — Canonical deploy flow. Should cross-reference this doc from the CloudFront / CSP section.
