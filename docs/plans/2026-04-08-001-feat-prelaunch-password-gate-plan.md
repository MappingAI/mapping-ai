---
title: "feat: Pre-launch password gate on map and contribute pages"
type: feat
status: active
date: 2026-04-08
---

# Pre-Launch Password Gate on Map and Contribute Pages

## Overview

Add a client-side password gate to `map.html` and `contribute.html` so that visitors from the premature tweet see a visual teaser but cannot interact until they enter a shared password. The gate must be secure (no plaintext in git), simple to share verbally, and easy to remove when ready for public launch.

## Problem Frame

Someone posted about the tool on Twitter before launch. The site can't go fully offline — people are already visiting and should see *something*. But the interactive map, search, filters, detail panels, and contribution forms should be locked behind a password until the team is ready. The previous admin key implementation hardcoded the password in source files and git history — that mistake must not be repeated.

## Requirements Trace

- R1. map.html shows a disclaimer popup on **every** page load (no localStorage skip)
- R2. Without password: map.html shows a static 2D plot view — visible but no interactivity (no clicking nodes, no search, no tab switching, no detail panels)
- R3. Any click on the locked map triggers a password prompt
- R4. With correct password: full interactive map loads
- R5. contribute.html forms are grayed out / disabled without password; clicking any field triggers password prompt
- R6. With correct password: contribute.html forms work normally
- R7. Password never appears in git history (plaintext OR hash) — build-time injection only
- R8. Shared auth state across pages via localStorage (enter once, works on both pages + iframe)
- R9. Clean implementation — easy to identify and remove all gate code when going public
- R10. Mobile: password gate applies to mobile directory view (map.html) and mobile forms (contribute.html)

## Scope Boundaries

- **In scope**: map.html, contribute.html, deploy workflow, GitHub Secrets setup
- **Out of scope**: index.html, about.html, theoryofchange.html (these remain publicly accessible — they're informational pages)
- **Out of scope**: Server-side auth / Lambda@Edge / CloudFront signed URLs (overkill for a temporary pre-launch gate)
- **Out of scope**: Hiding the data itself — `map-data.json` still loads, API endpoints still work. This gates *interaction*, not *data*. Determined technical users could bypass it; that's acceptable for a pre-launch beta.

## Context & Research

### Relevant Code and Patterns

- **admin.html auth gate** (`admin.html:550-752`): Shows `#auth-gate` div, hides `#admin-content`. Validates via API call. Uses `localStorage.adminKey`. This is the closest existing pattern but validates server-side — our gate is simpler (client-side hash comparison).
- **Beta popup** (`map.html:5552-5567`): Fixed overlay, z-index 9999, `localStorage.betaDismissed`. We'll replace this with the disclaimer+gate combo.
- **Overlay pattern**: All overlays use `position:fixed; inset:0; z-index:9999; background:rgba(0,0,0,0.5)` with centered card. Consistent across beta popup, onboarding, info overlay, org panel overlay.
- **Deploy workflow** (`.github/workflows/deploy.yml`): Runs `npm ci`, builds TipTap, exports map-data.json, syncs to S3. No templating/injection step exists yet — we add one.
- **Secrets management**: GitHub Secrets for `DATABASE_URL`, AWS creds, `S3_BUCKET_NAME`, `CLOUDFRONT_DISTRIBUTION_ID`. SAM parameters for `AdminKey` (NoEcho). `.env` for local dev (gitignored).

### Institutional Learnings

- **Admin key in git history** (from `docs/ideation/2026-03-31-launch-critical-ideation.md`): The key `mappingai-admin-2026` was hardcoded in `admin.html`, `template.yaml`, and `api/admin.js`. Fixed on 4/2 but remains in git history permanently. CLAUDE.md still notes this as technical debt. The fix moved to prompt-on-load + SAM parameter overrides.
- **Memory rule** (`feedback_no_secrets.md`): "CRITICAL: never hardcode DB URLs, passwords, API keys in committed files."

## Key Technical Decisions

- **Client-side SHA-256 hash comparison via Web Crypto API**: The browser hashes the user's input and compares against an injected hash. Web Crypto's `subtle.digest('SHA-256', ...)` is async, built into all modern browsers, and cryptographically sound. No dependencies needed. This is appropriate for a pre-launch gate where the threat model is "casual visitor from tweet" not "determined attacker."

- **Build-time hash injection via deploy workflow (not hardcoded in source)**: The deploy workflow computes SHA-256 from a `SITE_PASSWORD` GitHub Secret and replaces a `__SITE_PASSWORD_HASH__` placeholder in HTML files via `sed` before S3 upload. Git only ever contains the placeholder string. This satisfies R7 completely — even the hash never touches git.

- **Shared `siteUnlocked` localStorage key across pages**: Entering the password on either page sets `localStorage.siteUnlocked = '1'`. Both pages check this on load. The contribute iframe inherits auth from its parent (same origin). This satisfies R8.

- **Disclaimer popup replaces beta popup (map.html only, shows every load)**: The existing `#beta-overlay` uses `betaDismissed` localStorage to show once. For the gate, the disclaimer shows on every load (R1). We remove the `betaDismissed` check and repurpose the popup. When the gate is removed post-launch, the beta popup can be restored to its original behavior.

- **Locked state via CSS `pointer-events: none` + transparent click-capture overlay**: Rather than conditionally preventing D3 initialization (which would require deep changes to the 5500-line file), we let the page render normally but block all interaction via CSS. A transparent overlay div captures clicks and shows the password prompt. This is much simpler and maps cleanly to the "static visual teaser" requirement.

- **Force Plot view as the locked default**: When not authenticated, the map starts in Plot view (the simpler scatter visualization). This provides a visual teaser without revealing the full interactive network. After unlock, the view system returns to its normal behavior (localStorage-persisted view preference).

- **Gate code in clearly marked blocks**: All gate HTML/CSS/JS wrapped in `<!-- PASSWORD GATE -->` comments. Deploy step marked with `# PASSWORD GATE`. Removal is search-and-delete.

## Open Questions

### Resolved During Planning

- **Q: Should the hash be committed to git?** No. Even though SHA-256 is one-way, the user explicitly wants nothing password-related in git history. Build-time injection from GitHub Secrets keeps the placeholder in git and the hash only in the deployed S3 files.

- **Q: What about local development?** When `__SITE_PASSWORD_HASH__` is not replaced (i.e., local dev without the injection step), the hash comparison will always fail. Two options: (a) the gate code detects the placeholder string and auto-unlocks in dev, or (b) developers manually set `localStorage.siteUnlocked = '1'` in console. Option (a) is simpler and safe — the placeholder is never deployed to production because the CI step always runs.

- **Q: Should deep links work without password?** No. Deep links (e.g., `#person-dario-amodei`) should resolve only after authentication. The disclaimer shows first, then password gate, then deep link resolution.

### Deferred to Implementation

- **Q: Exact password to use.** User's choice — they'll set the `SITE_PASSWORD` GitHub Secret. Something like `mappingai` or `betamap` — simple to share verbally.
- **Q: Disclaimer copy.** Reuse existing beta popup text or update it. Decide during implementation.

## Implementation Units

- [ ] **Unit 1: Password gate on map.html**

  **Goal:** Add disclaimer popup (every load) + locked mode (plot view, no interactivity) + password prompt + unlock flow.

  **Requirements:** R1, R2, R3, R4, R8, R9, R10

  **Dependencies:** None

  **Files:**
  - Modify: `map.html`

  **Approach:**
  1. Replace the existing `#beta-overlay` block (lines 5552-5567) with a combined disclaimer+gate system:
     - `#disclaimer-overlay`: Shows on every page load (no localStorage check). Contains beta text + "Continue" button. Dismissing it reveals the locked map or the unlocked map depending on auth state.
     - `#password-overlay`: Shown when user clicks anywhere on the locked map. Password input + submit button + error message area.
  2. Add a `#lock-overlay` div — transparent full-screen div (`position:fixed; inset:0; z-index:500`) that sits above the map/controls/sidebar but below the disclaimer and password modals. Clicking it shows `#password-overlay`.
  3. Add locked-mode CSS: when `body.locked`, set `pointer-events: none` on `.controls`, `#search-input`, `.view-btn`, `.mode-btn`, `#contribute-btn`, `.zoom-controls`, `#detail-panel`, `#mobile-directory` interactive elements. The `#lock-overlay` has `pointer-events: auto` and captures all clicks.
  4. Add auth logic (inline `<script>`):
     - `const SITE_HASH = '__SITE_PASSWORD_HASH__';`
     - `async function checkPassword(input)` — uses `crypto.subtle.digest('SHA-256', ...)` to hash input, converts to hex, compares to `SITE_HASH`
     - On page load: if `localStorage.siteUnlocked === '1'` AND `SITE_HASH !== '__SITE_PASSWORD_HASH__'` (not dev mode), skip lock. Otherwise add `body.locked` class and show `#lock-overlay`.
     - Dev mode detection: if `SITE_HASH` still contains the placeholder literal, auto-unlock (dev bypass).
     - On successful password: set `localStorage.siteUnlocked = '1'`, remove `body.locked`, hide overlays, if deep link hash exists then resolve it.
  5. Force Plot view when locked: before the existing view-restore logic, check `body.locked` — if locked, set `currentMode = 'plot'` regardless of localStorage preference. After unlock, view switching works normally.
  6. Remove the old `betaDismissed` localStorage check from the beta overlay script.
  7. Wrap all new code in `<!-- PASSWORD GATE START -->` / `<!-- PASSWORD GATE END -->` comments.

  **Patterns to follow:**
  - Overlay visual pattern from existing `#beta-overlay` (fixed, inset:0, z-index, centered card, blur background)
  - `localStorage` state pattern from existing `adminKey` / `betaDismissed` usage
  - Inline `<style>` and `<script>` blocks (project convention — no external files)

  **Test scenarios:**
  - Happy path: Load map.html → disclaimer shows → dismiss → locked plot visible → click map → password prompt → enter correct password → full interactive map unlocked, localStorage set
  - Happy path: Reload after auth → disclaimer shows (every time) → dismiss → map is already unlocked (localStorage check)
  - Happy path: Click search box while locked → password prompt (not search)
  - Happy path: Click Network/Plot tab while locked → password prompt (not tab switch)
  - Edge case: Enter wrong password → error message shown, map stays locked
  - Edge case: Deep link URL (e.g., `#person-dario-amodei`) → disclaimer → password gate → after unlock, deep link resolves
  - Edge case: Mobile view (directory) → same disclaimer → lock overlay covers directory → password gate works
  - Edge case: Local dev (placeholder not replaced) → auto-unlocks, no gate
  - Edge case: Contribute sidebar button while locked → password prompt
  - Integration: After unlock on map.html, open contribute.html → should be unlocked (shared localStorage)

  **Verification:**
  - Disclaimer appears on every page load regardless of prior visits
  - No interactive feature (search, filters, tabs, node clicks, detail panel, contribute button, zoom) works without password
  - Correct password unlocks full interactivity
  - Wrong password shows error, stays locked
  - Auth persists across page reloads and navigation to contribute.html

- [ ] **Unit 2: Password gate on contribute.html**

  **Goal:** Gray out all form fields, block interaction, prompt for password on click, shared auth with map.html.

  **Requirements:** R5, R6, R8, R9, R10

  **Dependencies:** Unit 1 (shared auth logic pattern, same SITE_HASH placeholder)

  **Files:**
  - Modify: `contribute.html`

  **Approach:**
  1. Add `#password-overlay` (same design as map.html — modal with password input).
  2. Add `#lock-overlay` (transparent click-capture div, same as map.html).
  3. Add locked-mode CSS: when `body.locked`, apply `opacity: 0.4; pointer-events: none` to all form elements (`.form`, `.form-toggle`, `details`, `.field`, `input`, `select`, `textarea`, `.pill-toggle`, `.tiptap-notes-wrapper`). The form toggle tabs (Person/Org/Resource), example sections, and all fields appear grayed out.
  4. Add same auth logic as map.html (`SITE_HASH` placeholder, SHA-256 comparison, localStorage check, dev bypass).
  5. On page load: if `localStorage.siteUnlocked === '1'` and not dev mode, skip lock. Otherwise add `body.locked` and show `#lock-overlay`.
  6. On click of `#lock-overlay` → show password modal. On correct password → unlock, remove gray overlay, enable forms.
  7. The existing `#info-overlay` ("How it works") should only show after unlock, not while locked. Gate its display behind the auth check.
  8. Disable auto-save (`localStorage` draft saving) while locked to prevent empty drafts from being stored.
  9. Wrap all new code in `<!-- PASSWORD GATE START -->` / `<!-- PASSWORD GATE END -->` comments.

  **Patterns to follow:**
  - Same overlay and auth patterns as Unit 1 (consistency across pages)
  - Existing `#info-overlay` pattern in contribute.html

  **Test scenarios:**
  - Happy path: Load contribute.html → forms grayed out → click any field → password prompt → enter correct password → forms fully functional
  - Happy path: Already authed from map.html → contribute.html loads unlocked
  - Happy path: Auth on contribute.html → navigate to map.html → map unlocked after disclaimer
  - Edge case: Click form toggle tabs (Person/Org/Resource) while locked → password prompt, not tab switch
  - Edge case: Click example submission `<details>` while locked → password prompt
  - Edge case: Mobile view → same gray overlay, password prompt on tap
  - Edge case: iframe embed from map.html contribute panel → shares localStorage, inherits auth state
  - Edge case: Wrong password → error message, forms stay locked
  - Edge case: Local dev (placeholder) → auto-unlock, forms work

  **Verification:**
  - All form fields, toggles, dropdowns, examples visually grayed out when locked
  - No form field is focusable or fillable when locked
  - Correct password fully restores form functionality
  - Auth state shared with map.html via localStorage

- [ ] **Unit 3: Build-time hash injection in deploy workflow**

  **Goal:** Add a deploy step that computes SHA-256 from `SITE_PASSWORD` GitHub Secret and injects into HTML files before S3 upload.

  **Requirements:** R7, R9

  **Dependencies:** Units 1 and 2 (HTML files must contain the `__SITE_PASSWORD_HASH__` placeholder)

  **Files:**
  - Modify: `.github/workflows/deploy.yml`

  **Approach:**
  1. Add a new step after "Build TipTap bundle" and before "Sync static files to S3":
     ```
     - name: Inject password gate hash
       env:
         SITE_PASSWORD: ${{ secrets.SITE_PASSWORD }}
       run: |
         if [ -n "$SITE_PASSWORD" ]; then
           HASH=$(echo -n "$SITE_PASSWORD" | sha256sum | cut -d' ' -f1)
           sed -i "s/__SITE_PASSWORD_HASH__/$HASH/g" map.html contribute.html
           echo "Password gate hash injected"
         else
           echo "No SITE_PASSWORD set — gate will auto-bypass"
         fi
     ```
  2. The step is conditional — if `SITE_PASSWORD` is not set, the placeholder stays, which triggers the dev-bypass logic in Units 1 and 2. This means the gate can be "turned off" by simply removing the GitHub Secret (no code change needed).
  3. Mark the step with `# PASSWORD GATE — remove after public launch`.

  **Patterns to follow:**
  - Existing workflow structure (env vars from secrets, echo status messages)
  - Conditional `if [ -n ... ]` pattern for optional steps

  **Test scenarios:**
  - Happy path: Push to main with `SITE_PASSWORD` secret set → HTML files on S3 contain the computed hash, not the placeholder
  - Happy path: Push to main without `SITE_PASSWORD` secret → placeholder stays, gate auto-bypasses on site
  - Edge case: Password with special characters → `sed` handles it correctly (hash is hex-only, so no special char issues in the replacement)
  - Edge case: Verify hash injection happens before S3 sync step (ordering)

  **Verification:**
  - Deployed HTML files on S3 contain a 64-char hex hash, not `__SITE_PASSWORD_HASH__`
  - Local git repo still shows placeholder (build-time only)
  - Removing the `SITE_PASSWORD` secret effectively disables the gate

## System-Wide Impact

- **Interaction graph:** The gate overlay sits above all interactive elements. It must be above the controls sidebar (z-index ~100), detail panel, zoom controls, contribute button, and mobile directory. It must be below the disclaimer and password modals.
- **iframe behavior:** map.html embeds contribute.html via iframe. Same-origin localStorage means auth state carries to the iframe automatically.
- **Deep links:** URL hash resolution must be deferred until after authentication. Currently runs during `fetch('map-data.json').then(...)` — it needs a conditional check.
- **Auto-save:** contribute.html saves form drafts to localStorage every 500ms. This should be disabled when locked to avoid saving empty drafts that overwrite real ones.
- **Existing beta popup:** Replaced on map.html. The `betaDismissed` localStorage key becomes unused (can be cleaned up). On other pages (index, about, theoryofchange), the beta popup remains unchanged.
- **View persistence:** map.html saves `mapMode`/`mapSubView` to localStorage. When locked, Plot view is forced — this must NOT overwrite the user's saved preference. After unlock, the saved preference should be restored.

## Risks & Dependencies

- **GitHub Secret must be created manually**: A team member with repo admin access must add `SITE_PASSWORD` to the repo's GitHub Secrets before the gate works in production. Document this in the PR description.
- **Race condition on first deploy**: If the code merges before the secret is set, the gate auto-bypasses (safe fallback — same as current behavior, no breakage).
- **Client-side gate is bypassable**: A determined user could `localStorage.setItem('siteUnlocked','1')` in the console. This is acceptable — the gate prevents casual access, not adversarial bypass. Real access control would require server-side auth which is out of scope.
- **Removal timing**: All gate code is in marked blocks. When ready for public launch, a single PR removes all `<!-- PASSWORD GATE -->` blocks from both HTML files and the deploy step. No other code is affected.

## Sources & References

- Related code: `admin.html:550-752` (auth gate pattern), `map.html:5552-5567` (beta popup pattern)
- Related learning: admin key hardcoded incident (`docs/ideation/2026-03-31-launch-critical-ideation.md:46`)
- Web Crypto API: `crypto.subtle.digest()` — built into all modern browsers, no polyfill needed
