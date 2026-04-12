# Post-Mortem: D3 Defer Broke Production Map

**Date:** 2026-04-09
**Duration:** ~50 minutes (22:32 deploy completed → 23:23 hotfix pushed, +2 min deploy)
**Severity:** P0 — entire map page non-functional, primary product surface
**Author:** Claude (AI assistant) — the change author

---

## Summary

Adding `defer` to the D3.js CDN `<script>` tag in map.html caused the entire stakeholder map to render as a blank page. The `defer` attribute delays script execution until after HTML parsing, but map.html's 4,000+ line inline `<script>` block calls `d3.select()`, `d3.forceSimulation()`, and other D3 APIs during parsing — before the deferred D3 library was available. Result: `d3 is undefined`, all D3 calls fail silently, empty map.

## Timeline (UTC+1)

| Time | Event |
|------|-------|
| 04:00–06:16 | 12 commits created on `feat/security-performance-hardening` branch (CORS, throttle, split JSON, font defer, D3 defer, TipTap defer, security headers, admin key fix, resize debounce, stats query, load testing, nosniff) |
| 22:32 | Branch merged to `main` via fast-forward, pushed to origin |
| 22:32 | GitHub Actions deploy triggered — `npm ci`, build, export, S3 sync, CloudFront invalidation |
| 22:32 | Deploy completed successfully. Broken map.html now live. |
| ~23:00 | User reports "entire map is empty and broken" |
| 23:23 | Hotfix committed: removed `defer` from D3 script tag |
| 23:23 | Hotfix pushed to main, deploy triggered |
| 23:25 | Deploy completed, CloudFront invalidation started |
| ~23:27 | Map confirmed working again |

## Root Cause

**The commit** `1d80e90 perf: defer Google Fonts + D3.js, add resource hints on all pages` changed:

```html
<!-- Before (working) -->
<script src="https://d3js.org/d3.v7.min.js"></script>

<!-- After (broken) -->
<script src="https://d3js.org/d3.v7.min.js" defer></script>
```

**Why this breaks:** HTML script loading semantics:
- A `defer` script downloads in parallel but executes *after* the document is fully parsed
- An inline `<script>` (no `src`) executes *immediately* when the parser encounters it
- map.html's architecture: `<head>` has the D3 CDN script, then `<body>` has a massive inline `<script>` that calls D3 APIs directly
- Execution order with `defer`: parser encounters inline script → executes it → `d3` is undefined (deferred script hasn't run yet) → all D3 calls throw/fail → empty map

This is a well-known HTML behavior but was not caught because:
1. No local browser testing was performed after the change
2. No staging environment exists to validate before production
3. The automated CI pipeline only validates the *build* succeeds, not that the *rendered page* works

## What Went Well

- **Fast detection:** User noticed within ~30 minutes of deploy
- **Fast fix:** Hotfix committed and deployed within 5 minutes of report
- **Clean rollback:** Single attribute removal, no complex revert needed
- **CI pipeline worked:** Both the broken deploy and the fix deploy completed correctly

## What Went Wrong

### 1. No browser testing before push

The D3 defer was part of a batch of 12 commits. Automated verification scripts checked:
- All Lambda files import cors.js correctly
- Split JSON produces valid skeleton + detail files
- Admin.html uses header auth and sessionStorage
- No `@import` remaining in HTML files

But **nobody loaded the map in a browser**. A 5-second check (`npx serve . → open localhost:3000/map.html`) would have caught this instantly.

### 2. No staging environment

Changes went directly from feature branch → main → production. There is no staging URL, preview deploy, or canary deployment. Every push to `main` is immediately live.

### 3. Batch merge of 12 commits without PR review

All 12 commits were merged to main in a single fast-forward merge. No pull request was created, no human reviewed the changes, and no CI checks ran against the branch before merge. The merge was done at the user's request ("test everything...then push to main") but the testing was limited to automated scripts, not functional verification.

### 4. Incorrect "safe to push" assessment

The D3 defer was categorized as a "safe frontend-only change" alongside font deferral and TipTap deferral. The reasoning was that `defer` is a standard performance optimization for external scripts. This failed to account for:
- The inline script dependency on D3 (defer only works if ALL dependent code is also deferred or in external files)
- Font `defer` works differently (fonts degrade gracefully with FOUT; scripts fail hard)
- TipTap `defer` works because TipTap is initialized via event handlers, not inline parsing

### 5. No smoke test in CI

The deploy workflow validates:
- Schema exists (DB smoke test)
- map-data.json generates successfully
- S3 sync and CloudFront invalidation succeed

It does NOT validate:
- Pages render correctly in a browser
- JavaScript executes without errors
- Core user flows work (map loads, filters work, search works)

## Action Items

| # | Action | Priority | Owner |
|---|--------|----------|-------|
| 1 | **Add smoke test to CI:** After S3 deploy, fetch map.html from CloudFront and verify D3 initializes (headless browser or at minimum check for JS errors) | High | TBD |
| 2 | **Establish PR review requirement:** All changes to main must go through a PR, even from AI assistants. No direct merges. | High | Team |
| 3 | **Create staging environment:** Preview deploy to a separate CloudFront distribution (or S3 prefix) before production | Medium | TBD |
| 4 | **Pre-push browser checklist:** Before any push to main, verify core pages load in a local browser: map.html (D3 renders), contribute.html (form works), admin.html (auth gate shows) | High | All contributors |
| 5 | **AI assistant guardrail:** When making changes to `<script>` tags in HTML, always test in a browser before committing. Never batch script-loading changes with unrelated commits. | High | Claude |
| 6 | **Separate backend from frontend deploys:** Backend changes (api/*.js, template.yaml) that require `sam deploy` should be on separate branches/PRs from frontend changes, to reduce blast radius | Medium | Team |

## Lessons Learned

1. **`defer` on external scripts is NOT universally safe.** It's only safe when all dependent code is also deferred or runs after DOMContentLoaded. Inline scripts that run during parsing are incompatible with deferred dependencies.

2. **Automated validation is not a substitute for browser testing.** Grep checks, JSON validation, and syntax verification cannot catch runtime behavior like "D3 is undefined when the inline script runs."

3. **Batch merges multiply risk.** Merging 12 commits at once made it harder to isolate which change broke things. If the D3 defer had been its own PR, the blast radius would have been obvious.

4. **"Safe frontend-only changes" can still break the entire site.** A one-word change (`defer`) to a `<script>` tag rendered the primary product page non-functional.

5. **Fast recovery matters as much as prevention.** The ~5 minute time-to-fix was possible because the cause was obvious and the fix was a single attribute removal. Complex changes would have taken much longer to diagnose and revert.
