---
title: "fix: Contribute form UX bugs and improvements"
type: fix
status: active
date: 2026-04-08
---

# Contribute Form UX Bugs and Improvements

## Overview

Fix 13 bugs and improvements across the contribute form: semantic text updates, interaction bugs (org search deselect, form sizing, edit-mode cancel), side panel parity, submission performance, TipTap @mention/hyperlink issues, resource form link text, and mobile spacing.

## Problem Frame

The contribute form has accumulated UX friction from multiple rapid feature additions. Users report: pill labels that don't match their relationship to the entity, inability to click out of org search dropdowns, slow submission times (~5s due to blocking LLM review), broken cancel flow when editing existing entities, TipTap @mention closing prematurely on space (can't search "Dario Amodei"), hyperlinks in TipTap notes getting prefixed with the site URL, and the resource form's "Can't find it?" link incorrectly opening org creation instead of person creation.

## Requirements Trace

- R1. Update relationship pill display text: "I can connect you" -> "I am connected", "I represent" -> "I am part of this org", "I am an author." -> "I am a creator."
- R2. Org search dropdowns close on blur (click outside)
- R3. Side panel category dropdown matches main form (add "Infrastructure & Compute" and "Deployers & Platforms")
- R4. Form submission returns quickly (LLM review must not block the response)
- R5. Cancel button in edit mode closes existing entity sidebar, clears prefilled fields, and restores form to clean state
- R6. Name field is non-editable when editing an existing entity
- R7. Newly created org via side panel appears in subsequent searches immediately
- R8. TipTap @mention allows spaces in query so multi-word names are searchable
- R9. Custom dropdown opening does not shift/resize other form fields
- R10. Resource form "Can't find it?" link says "Add a person" (not "Add an org") and opens person creation
- R11. TipTap hyperlinks don't get prefixed with the site URL
- R12. Mobile form spacing is correct
- R13. Pill `data-value` attributes updated to match backend's `normalizeRelationship()` expectations

## Scope Boundaries

- **In scope**: contribute.html, src/tiptap-notes.js, api/submit.js
- **Out of scope**: Admin form, map.html entity display, new category additions to person roles or org sectors beyond the side panel sync
- **Out of scope**: TipTap relationship-type prompt on @mention insert (documented as a desired feature but not in this bug list)

## Context & Research

### Relevant Code and Patterns

- **Pill toggle JS** (`contribute.html:3137-3151`): Toggles `.active`, writes `data-value` to hidden input. Backend `normalizeRelationship()` (`api/submit.js:38-43`) maps: `"self"` -> `"self"`, `"connector"`/`"close_relation"` -> `"connector"`, everything else -> `"external"`.
- **Org search** (`contribute.html:2388-2490`): Focus handler shows top-5, input handler searches. Missing blur handler unlike location (2586), author (2670), twitter (2771), bluesky (2816) which all have `blur -> setTimeout -> clear results`.
- **Side panel categories** (`contribute.html:3254-3266`): Missing "Infrastructure & Compute" and "Deployers & Platforms" that main form has at lines 1361-1363.
- **Submit handler** (`contribute.html:3073-3134`): Single POST to `/submit`. Backend (`api/submit.js:211-257`) does blocking LLM review with 5s timeout before responding.
- **Cancel handler** (`contribute.html:2113-2116`): Only clears `updateEntityId` and removes banner. Does not close sidebar, clear fields, or lock name.
- **"Can't find it?" overwrite** (`contribute.html:3756-3770`): Line 3760 overwrites ALL `.create-org-link` text to "Can't find it? Add this org" and binds all to `openOrgPanel()`, destroying the resource author field's "Add this person" text.
- **TipTap mention config** (`src/tiptap-notes.js:389-393`): Default `@tiptap/extension-mention` behavior stops matching at whitespace (space closes popup).
- **Entity cache** (`contribute.html:1931-1942`): `_entityCache` loaded once from `map-data.json`. Never updated after side panel submissions.

### Institutional Learnings

- **MutationObserver feedback loop** (`docs/solutions/ui-bugs/inline-org-panel-rich-field-parity.md`): After programmatically setting input values, use `dataset.linkedOrgId` as settled-state flag + `input.blur()` to prevent re-triggers. Relevant to item 8 (panel cache update).
- **Debounce pattern**: 80ms for client-side search, 150ms for external APIs.
- **TipTap guard**: Always check `container._editor` before `initTipTapEditors()` to prevent duplicate editors.

## Key Technical Decisions

- **Make LLM review fire-and-forget in the Lambda**: Move the Claude Haiku call after `res.status(200).json(...)` is sent. The Lambda runtime continues executing briefly after the response. Alternatively, use `context.callbackWaitsForEmptyEventLoop = false` and fire the LLM call without awaiting. This eliminates the 0-5s blocking delay with zero functional impact since the LLM review result is non-critical (already wrapped in try-catch, logged as warning on failure).

- **Allow spaces in TipTap mention query via custom `allow` regex**: Override the default `@tiptap/extension-mention` suggestion config to accept spaces in the query string. The `suggestion.allow` option or a custom `char` + regex pattern lets users type `@Dario Amodei` without the popup closing at the space.

- **Fix hyperlink prefixing in TipTap link insertion**: The TipTap Link extension likely uses a relative URL when the user doesn't include `https://`. The fix is to configure the Link extension with `autolink: true` and ensure that link insertion normalizes URLs (prepends `https://` if no protocol is present, rather than treating it as a relative path).

- **Fix "Can't find it?" by checking `data-switch` attribute**: Instead of overwriting all `.create-org-link` text uniformly, the IIFE at line 3756 should check each link's `data-switch` attribute and set text/behavior accordingly: `data-switch="person"` -> "Can't find it? Add this person" (open person form or skip org panel), `data-switch="organization"` -> "Can't find it? Add this org" (open org panel).

- **Edit-mode name field**: Set `input[name="name"]` to `readonly` when entering edit mode. Remove `readonly` on cancel. This prevents changing the identity of an existing entity while still allowing other field edits.

## Open Questions

### Resolved During Planning

- **Q: Should pill `data-value` attributes change too?** Yes. Current values like "I can connect you with this person" all map to "external" in the backend. The person "I am connected" pill should have `data-value="connector"` (maps to connector weight=2). The org "I am part of this org" should have `data-value="self"` (maps to self weight=10). The resource "I am a creator" should have `data-value="self"`.

- **Q: What causes form field sizing to shift?** The org search results dropdown is rendered in-flow (not absolutely positioned) inside the field container. When results appear, they push subsequent fields down. Custom select dropdowns use `position: absolute` and `max-height` transitions (lines 488-494) so they don't affect layout. The org search results div should also use absolute positioning.

### Deferred to Implementation

- **Q: Exact TipTap mention `allow` regex.** Depends on the installed version's API. The implementer should check `@tiptap/extension-mention` docs for the correct configuration option.
- **Q: Mobile spacing specifics.** Test on mobile viewport during implementation and fix what's visually off. The known patterns (sticky submit, fixed nav overlap, field sizing) are documented.

## Implementation Units

- [ ] **Unit 1: Semantic text + label fixes**

  **Goal:** Update pill display text, `data-value` attributes, and fix the resource form "Can't find it?" link.

  **Requirements:** R1, R10, R13

  **Dependencies:** None

  **Files:**
  - Modify: `contribute.html`

  **Approach:**
  - Person pills: Change "I can connect you" display text to "I am connected", set `data-value="connector"`. Keep "I am this person" as `data-value="self"`.
  - Org pills: Change "I represent this org" to "I am part of this org", set `data-value="self"`. Change "I can connect you" to "I am connected", set `data-value="connector"`.
  - Resource pills: Change "I am the author" to "I am a creator", set `data-value="self"`.
  - "Can't find it?" fix: In the IIFE at line ~3756, check `link.dataset.switch` before setting text. If `data-switch="person"`, set text to "Can't find it? Add this person" and do NOT rebind to `openOrgPanel`. If `data-switch="organization"`, keep current behavior.

  **Patterns to follow:**
  - Existing pill toggle pattern at `contribute.html:3137-3151`
  - Backend `normalizeRelationship()` at `api/submit.js:38-43`

  **Test scenarios:**
  - Happy path: Person form shows "I am this person" / "I am connected" / "Someone I know of" pills with correct `data-value` (self/connector/external)
  - Happy path: Org form shows "I am part of this org" / "I am connected" / "An org I know of" with data-value (self/connector/external)
  - Happy path: Resource form shows "I am a creator" / "A resource I found" with data-value (self/external)
  - Happy path: Resource author "Can't find it?" link says "Add this person" and switches to person form (not org panel)
  - Integration: Submit a person form with "I am connected" pill selected -> backend stores `submitter_relationship = 'connector'`

  **Verification:**
  - All pill display texts match the requested labels
  - All `data-value` attributes correctly map through `normalizeRelationship()` to self/connector/external
  - Resource author "Can't find it?" opens person creation, not org panel

- [ ] **Unit 2: Org search blur + form sizing stability**

  **Goal:** Close org search dropdown on click-outside and prevent dropdown from shifting form layout.

  **Requirements:** R2, R9

  **Dependencies:** None

  **Files:**
  - Modify: `contribute.html`

  **Approach:**
  - Add blur handler to `.primary-org-search` and `.parent-org-search` inputs matching the pattern used by location/author/twitter/bluesky fields: `input.addEventListener('blur', () => setTimeout(() => { resultsDiv.innerHTML = ''; }, 200));` — the 200ms delay lets click events on results fire before clearing.
  - Make `.org-search-results` use `position: absolute` (with the parent field set to `position: relative`) so results overlay rather than push content. This matches the custom select dropdown pattern (lines 488-494).

  **Patterns to follow:**
  - Blur handler at `contribute.html:2586` (location), `2670` (author), `2771` (twitter), `2816` (bluesky)
  - Custom select absolute positioning at `contribute.html:488-494`

  **Test scenarios:**
  - Happy path: Focus primary org field -> results appear -> click outside field -> results disappear
  - Happy path: Focus primary org -> results appear -> click a result -> result selected, dropdown closes
  - Happy path: Org search results appear -> other form fields below do NOT shift position
  - Edge case: Focus primary org -> type query -> results appear -> press Escape -> results clear (existing behavior preserved)
  - Edge case: Focus parent org field -> same blur behavior applies

  **Verification:**
  - Clicking outside any org search field closes its dropdown
  - Org search results overlay the form content without shifting layout

- [ ] **Unit 3: Side panel category sync + post-submit cache**

  **Goal:** Add missing categories to side panel dropdown and make newly created orgs appear in subsequent searches.

  **Requirements:** R3, R7

  **Dependencies:** None

  **Files:**
  - Modify: `contribute.html`

  **Approach:**
  - Add `<option value="AI Infrastructure & Compute">Infrastructure & Compute</option>` and `<option value="AI Deployers & Platforms">Deployers & Platforms</option>` to the side panel's category select (lines ~3254-3266), matching the main form's options.
  - After successful side panel submission (in the success handler around line ~3593), push the new org into `_entityCache.organizations` with the submitted fields and `status: 'pending'`. This makes it immediately available to `searchEntities()` for subsequent searches. Use `submissionId` (returned from the API) as the entity ID, with a `_pending: true` flag.

  **Patterns to follow:**
  - Main form category options at `contribute.html:1359-1373`
  - Entity cache structure at `contribute.html:1931-1942`
  - MutationObserver settled-state pattern from `docs/solutions/ui-bugs/inline-org-panel-rich-field-parity.md`

  **Test scenarios:**
  - Happy path: Open side panel -> category dropdown shows "Infrastructure & Compute" and "Deployers & Platforms"
  - Happy path: Create a new org via side panel -> immediately search for it in primary org field -> it appears with "pending" badge
  - Edge case: Create org via panel -> search by partial name -> it appears in results

  **Verification:**
  - Side panel category dropdown has all 12 org categories matching the main form
  - Newly created orgs appear in search results within the same page session

- [ ] **Unit 4: Make LLM review non-blocking**

  **Goal:** Return the API response before the LLM review call so submissions feel instant.

  **Requirements:** R4

  **Dependencies:** None

  **Files:**
  - Modify: `api/submit.js`

  **Approach:**
  - Move the LLM review call (lines ~211-257) to fire AFTER sending the 200 response. In the Lambda handler, send the success response first, then fire the LLM review without awaiting. Use `context.callbackWaitsForEmptyEventLoop = false` if using callback-style, or simply don't await the LLM promise. The LLM review is already wrapped in try-catch and non-critical.
  - The DB UPDATE that stores the LLM review result (line ~250-256) needs to happen in the background too. Wrap the entire LLM block in a fire-and-forget async function.

  **Patterns to follow:**
  - Existing try-catch + warning log pattern for LLM review failure at `api/submit.js:258`

  **Test scenarios:**
  - Happy path: Submit a form -> response returns in <1s (no 5s LLM wait)
  - Happy path: After quick response, LLM review still completes and updates the submission row in the DB
  - Error path: LLM review fails silently -> submission still saved, no error shown to user
  - Edge case: Lambda cold start -> submission still returns quickly after initial connection setup

  **Verification:**
  - Form submission perceived latency drops from ~5s to <1s
  - LLM review results still appear in admin panel after a few seconds

- [ ] **Unit 5: Fix edit mode cancel and name locking**

  **Goal:** Cancel button properly restores form to clean state, and name field is non-editable when editing existing entity.

  **Requirements:** R5, R6

  **Dependencies:** None

  **Files:**
  - Modify: `contribute.html`

  **Approach:**
  - When entering edit mode (`prefillFormFromExisting` at line ~2066): set `input[name="name"]` to `readonly` and add a visual indicator (e.g., subtle background color change).
  - Expand the cancel handler (line ~2113) to also: (1) close the existing entity sidebar (`#existing-card` remove `.open` class), (2) reset all form fields to empty (call the existing `clearForm()` or reset each field), (3) remove `readonly` from the name field, (4) clear any duplicate detection state.

  **Patterns to follow:**
  - Existing card close pattern at `contribute.html:2173-2176`
  - Form clear/reset patterns used in the "Clear form" link handler

  **Test scenarios:**
  - Happy path: Click "Add info to this entry" -> name field becomes readonly, sidebar shows entity card -> click Cancel -> sidebar closes, form clears, name field editable again
  - Happy path: In edit mode, name field shows the entity's name but user cannot modify it
  - Edge case: Cancel after partially editing other fields -> all fields reset, no stale data remains
  - Edge case: After cancel, user can start a fresh submission with a new name

  **Verification:**
  - Name field is visually distinct and non-editable in edit mode
  - Cancel restores the form to a completely clean state

- [ ] **Unit 6: TipTap @mention space support + hyperlink fix**

  **Goal:** Allow spaces in @mention queries and fix hyperlink URL prefixing.

  **Requirements:** R8, R11

  **Dependencies:** None

  **Files:**
  - Modify: `src/tiptap-notes.js`

  **Approach:**
  - **@mention space**: Configure the Mention extension's suggestion to allow spaces in the query. The `@tiptap/extension-mention` suggestion uses a `char` trigger and a regex to match the query. Override the default `allow` or provide a custom `findSuggestionMatch` function that permits spaces, stopping only at a second `@`, newline, or when the popup is dismissed. This lets users type `@Dario Amodei` and see results for "Dario Amodei".
  - **Hyperlink prefixing**: The TipTap Link extension's `setLink` command likely receives user input without a protocol prefix, causing the browser to treat it as a relative URL (prepending the current origin). In the link insertion handler, normalize the URL: if it doesn't start with `http://`, `https://`, or `mailto:`, prepend `https://`. Check the existing link insertion UI code (if any custom modal/prompt exists) or configure the Link extension's `validate` option.
  - Rebuild TipTap bundle after changes: `npm run build:tiptap`.

  **Patterns to follow:**
  - Existing mention suggestion at `src/tiptap-notes.js:50-137`
  - TipTap Link extension configuration

  **Test scenarios:**
  - Happy path: Type `@Dario` -> popup shows -> type space -> popup stays open -> type `Amodei` -> results filter to "Dario Amodei"
  - Happy path: Insert a hyperlink `example.com` in notes -> rendered link points to `https://example.com` not `https://mapping-ai.org/example.com`
  - Happy path: Insert `https://example.com` -> link preserved as-is
  - Edge case: Type `@` then space immediately -> popup closes (no query to search)
  - Edge case: Insert `mailto:info@example.com` -> link preserved as-is

  **Verification:**
  - Multi-word @mention queries work (popup stays open through spaces)
  - All hyperlinks in TipTap notes point to correct external URLs

- [ ] **Unit 7: Mobile form spacing**

  **Goal:** Fix spacing inconsistencies in the contribute form on mobile viewports.

  **Requirements:** R12

  **Dependencies:** Units 1-2 (text and layout changes that affect mobile)

  **Files:**
  - Modify: `contribute.html`

  **Approach:**
  - Test the form at 375px viewport width (iPhone SE) and 390px (iPhone 14). Identify and fix specific spacing issues:
    - Sticky submit button overlap with form content (add bottom padding to form)
    - Field label/input spacing
    - Pill toggle layout on narrow screens
    - Side panel full-width behavior
  - Defer specific CSS fixes to implementation since they depend on visual testing.

  **Test scenarios:**
  - Happy path: Form renders cleanly at 375px width, all fields visible and usable
  - Happy path: Submit button doesn't overlap the last form field
  - Happy path: Pill toggles wrap gracefully on narrow screens
  - Edge case: Keyboard open on mobile -> form content still scrollable

  **Verification:**
  - No overlapping elements, cut-off text, or unreachable fields on mobile viewport

## System-Wide Impact

- **API response contract**: Unit 4 changes `api/submit.js` response timing but NOT the response body. The frontend handler at `contribute.html:3113-3118` is unaffected.
- **Entity cache**: Unit 3 modifies the in-memory `_entityCache` structure by adding pending entities. The `searchEntities()` function and any code that reads `_entityCache` must handle entities with `_pending: true` and no `id` (using `submissionId` instead).
- **TipTap bundle**: Unit 6 modifies `src/tiptap-notes.js` which requires `npm run build:tiptap` to regenerate `assets/js/tiptap-notes.js`. The deploy workflow already does this.
- **`data-value` change**: Unit 1 changes pill `data-value` attributes. The backend `normalizeRelationship()` already accepts "self", "connector", "external" — the new values align with this. No backend change needed for this.

## Risks & Dependencies

- **TipTap @mention space regex**: The `@tiptap/extension-mention` API for custom suggestion matching may vary by version. The implementer should check the installed version (`package.json` shows `@tiptap/*: ^3.20.5`).
- **Lambda fire-and-forget timing**: AWS Lambda may terminate the runtime shortly after sending the response. The LLM review call (up to 5s) needs the Lambda to stay alive. Using `context.callbackWaitsForEmptyEventLoop = false` with a non-awaited promise is the standard pattern for this, but if the Lambda runtime is killed too quickly, the review may not complete. Test by checking that LLM reviews still appear in admin.
- **Mobile spacing is underspecified**: The user reports spacing issues but without screenshots. The implementer should do a visual pass and fix what they find, keeping changes minimal.

## Sources & References

- Related code: `contribute.html` (3847 lines), `src/tiptap-notes.js` (434 lines), `api/submit.js` (273 lines)
- Related learning: `docs/solutions/ui-bugs/inline-org-panel-rich-field-parity.md`
- Related learning: `docs/solutions/best-practices/mobile-entity-directory-replacing-d3-map-2026-04-08.md`
