---
title: "feat: Universal pending entity cache with localStorage persistence"
type: feat
status: active
date: 2026-04-17
origin: docs/ideation/2026-04-17-pending-entity-linking-ideation.md
---

# feat: Universal pending entity cache with localStorage persistence

## Overview

Generalize the existing `useAddPendingOrg` pattern to inject ALL entity types (person, org, resource) into the TanStack Query cache after submission, persist them to a localStorage ledger that seeds the cache on page load, add a recency boost so self-submitted entities rank first in search, auto-link back from OrgCreationPanel, and add "don't see it?" nudges when search returns no results.

## Problem Frame

When a user submits a new entity via the contribute form, that entity is invisible to all search surfaces (OrgSearch, author TagInput, TipTap @mentions, DuplicateDetection) until admin approval regenerates `map-data.json`. This breaks the core workflow of submitting multiple related entities in one session — a user who adds org A then tries to link person B to org A cannot find it.

`useAddPendingOrg` already solves this for orgs created via OrgCreationPanel by optimistically injecting into the `['map-data']` query cache. But this only covers one entity type via one creation path. People and resources submitted through the main form are never injected.

## Requirements Trace

- R1. Any entity submitted in the current session must be immediately searchable in all search surfaces (OrgSearch, author TagInput, TipTap @mentions, DuplicateDetection)
- R2. Session submissions must survive page reloads via localStorage persistence
- R3. Self-submitted entities must rank above approved entities with the same match score (recency boost)
- R4. After creating an org via OrgCreationPanel, the triggering form field must auto-populate with the new org
- R5. When TipTap @mention search returns no results, show a "don't see it? submit a new entry" nudge
- R6. The same nudge should appear in OrgSearch and author TagInput empty states

## Scope Boundaries

- No inline person/resource creation panels (future work, idea #4 from ideation)
- No batch submission mode
- No cross-tab BroadcastChannel sync
- No server-side changes — all client-side
- No contributor key / reputation system
- Submission ID vs entity ID mismatch is a known limitation — links will reference submission IDs until admin approval

## Context & Research

### Relevant Code and Patterns

- `useAddPendingOrg` (`src/hooks/useSubmitEntity.ts:29-52`) — proven pattern for optimistic cache injection via `queryClient.setQueryData(['map-data'])`
- `useEntityCache` (`src/hooks/useEntityCache.ts`) — flattens `people + organizations + resources` from `['map-data']` into `EntityCache.entities`; all search reads from this
- `fuzzySearch` (`src/lib/search.ts:17-28`) — scoring: 100 (exact) / 80 (startsWith) / 60 (includes) / 0
- `useAutoSave` (`src/hooks/useAutoSave.ts`) — localStorage persistence pattern with debounce, suppress, and migration
- `OrgCreationPanel` (`src/contribute/OrgCreationPanel.tsx:106-143`) — calls `addPendingOrg()` then `onOrgCreated({ id, name, category })`; ContributeForm's `onOrgCreated` only closes the panel
- `handleSubmitSuccess` (`src/contribute/ContributeForm.tsx:193-206`) — clears form and shows success message but does NOT inject the submitted entity into cache
- `TipTapEditor` (`src/components/TipTapEditor.tsx`) — `createSuggestion` renders empty state as "Keep typing to find people & orgs..."

### Institutional Learnings

- `docs/solutions/integration-issues/sam-deploy-overwrites-manual-cloudfront-config-2026-04-16.md` — avoid touching production infrastructure; all changes client-side only

## Key Technical Decisions

- **Generalize `useAddPendingOrg` into `useAddPendingEntity`** rather than creating separate hooks per type: The existing hook already does 90% of the work. One hook with an `entityType` parameter is simpler than three hooks. The `['map-data']` cache structure already has `people`, `organizations`, `resources` arrays.

- **localStorage ledger as a separate key from auto-save drafts**: The auto-save system uses `mappingai_form_draft_v2` for in-progress form state. The submission ledger is semantically different (completed submissions, not drafts). Using a separate key (`mappingai_session_submissions`) avoids coupling and makes each system independently clearable.

- **Seed cache on app initialization, not on every render**: Read the localStorage ledger once during `useEntityCache` initialization and merge it into the query data. This avoids re-reading localStorage on every render cycle.

- **Recency boost as a score addition, not a separate sort**: Adding +20 to `_pending` entities in `scoreEntity` keeps the scoring logic in one place. Entities the user just submitted will rank at 80+20=100 for startsWith matches, above the 80 an approved entity would get.

- **Auto-link back uses existing `orgPanelTrigger` state**: ContributeForm already tracks which field triggered the panel (`'primary' | 'parent' | 'affiliated'`). The `onOrgCreated` callback just needs to write back to the correct form field based on this trigger.

## Open Questions

### Resolved During Planning

- **Should the ledger expire entries?** Yes — entries older than 7 days are pruned on load. Entries that appear in the real `map-data.json` (by name + type match) are also pruned.

- **What about the submission ID vs entity ID mismatch?** This is a known limitation documented in the ideation. When admin approves an entity, it gets a new entity ID. Links referencing the old submission ID may become orphaned. The admin approval trigger should be updated separately (future work) to resolve these references. For now, the form stores submission IDs and the admin panel handles resolution.

### Deferred to Implementation

- **Exact pruning logic for ledger entries matching approved entities**: The name + type match heuristic may need refinement based on real data (e.g., duplicate names across types).
- **Whether `useAddPendingEntity` should also inject into `['map-detail']`**: Likely not needed since pending entities won't have detail data, but verify during implementation.

## Implementation Units

- [ ] **Unit 1: Create `useAddPendingEntity` hook**

  **Goal:** Replace `useAddPendingOrg` with a generalized `useAddPendingEntity` that injects any entity type into the `['map-data']` cache.

  **Requirements:** R1

  **Dependencies:** None

  **Files:**
  - Modify: `src/hooks/useSubmitEntity.ts`
  - Test: `src/__tests__/hooks/useSubmitEntity.test.ts`

  **Approach:**
  - Rename `useAddPendingOrg` to `useAddPendingEntity`
  - Accept `entityType: 'person' | 'organization' | 'resource'` parameter
  - Accept a generic data bag (name, category, title, primary_org, etc.) so the cached entity has enough fields for search and display
  - Inject into the correct array (`people`, `organizations`, or `resources`) based on `entityType`
  - Keep `_pending: true` and `status: 'pending'` markers
  - Update `OrgCreationPanel` to call the new hook name

  **Patterns to follow:**
  - Existing `useAddPendingOrg` in `src/hooks/useSubmitEntity.ts:29-52`

  **Test scenarios:**
  - Happy path: inject a person → `['map-data'].people` contains the new entity with `_pending: true`
  - Happy path: inject a resource → `['map-data'].resources` contains it
  - Happy path: inject an org → `['map-data'].organizations` contains it (backward compat)
  - Edge case: inject when `['map-data']` cache is null/empty → no crash, entity still added
  - Edge case: inject duplicate (same ID) → does not create duplicate entries

  **Verification:**
  - `OrgCreationPanel` still works as before (regression)
  - New entity types appear in `useEntityCache().cache.entities` after injection

---

- [ ] **Unit 2: Inject all entity types on form submission**

  **Goal:** Call `useAddPendingEntity` from `handleSubmitSuccess` and each form's `onSubmit` handler so every submitted entity is immediately cached.

  **Requirements:** R1

  **Dependencies:** Unit 1

  **Files:**
  - Modify: `src/contribute/ContributeForm.tsx`
  - Modify: `src/contribute/PersonForm.tsx`
  - Modify: `src/contribute/OrganizationForm.tsx`
  - Modify: `src/contribute/ResourceForm.tsx`

  **Approach:**
  - Each form's `onSubmit` handler already has access to the form data and gets back `{ id }` from the mutation. Pass this data to `useAddPendingEntity` in the `onSuccess` callback.
  - The entity injected into cache should include: `id` (submission ID), `entity_type`, `name`, `category`, `title`, `primary_org`, `location`, `status: 'pending'`, `_pending: true`
  - For resources: map `resourceTitle` → `name`, `resourceType` → `resource_type`, etc.

  **Patterns to follow:**
  - `OrgCreationPanel.onSubmit` lines 128-132 — calls `addPendingOrg` after `mutateAsync`

  **Test scenarios:**
  - Happy path: submit a person form → person appears in entity cache with correct fields
  - Happy path: submit a resource form → resource appears in cache with `name` mapped from `resourceTitle`
  - Integration: submit person A, then type A's name in TipTap @mention → A appears in results

  **Verification:**
  - After submitting any entity type, it appears in search results immediately without page reload

---

- [ ] **Unit 3: localStorage submission ledger**

  **Goal:** Persist session submissions to localStorage so they survive page reloads. Seed the TanStack Query cache from the ledger on app initialization.

  **Requirements:** R2

  **Dependencies:** Unit 1

  **Files:**
  - Create: `src/hooks/useSubmissionLedger.ts`
  - Modify: `src/hooks/useEntityCache.ts`
  - Test: `src/__tests__/hooks/useSubmissionLedger.test.ts`

  **Approach:**
  - New hook `useSubmissionLedger` manages a localStorage key `mappingai_session_submissions`
  - Ledger shape: `{ version: 1, entries: Array<{ id, entity_type, name, category, title, primary_org, location, status, submittedAt }> }`
  - `addEntry(entity)` appends to the ledger (called by `useAddPendingEntity`)
  - `getEntries()` returns the current ledger, pruning entries older than 7 days
  - On `useEntityCache` initialization, read the ledger and merge entries into the `['map-data']` query cache via `queryClient.setQueryData`
  - When `map-data.json` loads, prune ledger entries that now appear in the real data (matching by name + entity_type)

  **Patterns to follow:**
  - `useAutoSave` localStorage pattern (`src/hooks/useAutoSave.ts`) — key naming, JSON serialization, error handling

  **Test scenarios:**
  - Happy path: add entry → survives in localStorage → retrieved on next `getEntries()` call
  - Happy path: page reload → ledger entries seed the entity cache → entities searchable
  - Edge case: entry older than 7 days → pruned on load
  - Edge case: entry matches an approved entity in map-data.json (same name + type) → pruned
  - Edge case: localStorage unavailable → degrades gracefully (cache injection still works for current session)
  - Edge case: corrupted/malformed localStorage data → cleared and reset without crash

  **Verification:**
  - Submit entity → close tab → reopen → entity appears in search results

---

- [ ] **Unit 4: Recency boost in fuzzySearch**

  **Goal:** Entities with `_pending: true` get a score boost so self-submitted entities rank at the top of search results.

  **Requirements:** R3

  **Dependencies:** Unit 1 (entities need `_pending` flag)

  **Files:**
  - Modify: `src/lib/search.ts`
  - Modify: `src/__tests__/lib/search.test.ts`

  **Approach:**
  - In `fuzzySearch`, after scoring each entity, add +20 to the score if the entity has `_pending: true`
  - This means a pending entity matching via `startsWith` gets 80+20=100, ranking above non-pending `startsWith` matches (80) and equal to exact matches

  **Patterns to follow:**
  - Existing `scoreEntity` function in `src/lib/search.ts:17-28`

  **Test scenarios:**
  - Happy path: pending entity "Anthropic" + approved entity "Anthropic Research" → query "Anthro" → pending ranks first
  - Happy path: pending entity with exact match → score is 100+20=120, always first
  - Edge case: no pending entities → scoring unchanged (regression)

  **Verification:**
  - Self-submitted entity always appears at top of search results when name matches

---

- [ ] **Unit 5: Auto-link back from OrgCreationPanel**

  **Goal:** After creating an org via the side panel, auto-populate the triggering form field with the new org.

  **Requirements:** R4

  **Dependencies:** None (independent fix)

  **Files:**
  - Modify: `src/contribute/ContributeForm.tsx`

  **Approach:**
  - `ContributeForm` already tracks `orgPanelTrigger` (`'primary' | 'parent' | 'affiliated'`) and knows which form is active (`activeTab`)
  - Update `onOrgCreated` callback to write back to the correct form field:
    - `'primary'` → `form.setValue('primaryOrg', name)` + `form.setValue('primaryOrgId', id)`
    - `'parent'` → `form.setValue('parentOrg', name)` + `form.setValue('parentOrgId', id)`
    - `'affiliated'` → append to `form.getValues('affiliatedOrgIds')` array as a new Tag

  **Patterns to follow:**
  - `OrgSearch.onChange` callback pattern — sets both name and ID fields

  **Test scenarios:**
  - Happy path: trigger from primary org field → org auto-fills as primary org with ID
  - Happy path: trigger from affiliated orgs → org appended as new tag
  - Happy path: trigger from parent org (org form) → parent org field populated
  - Edge case: panel cancelled (not submitted) → no field change

  **Verification:**
  - After creating org via panel, returning to the form shows the org already linked in the triggering field

---

- [ ] **Unit 6: "Don't see it?" nudge in search empty states**

  **Goal:** When search returns no results, show a subtle CTA to submit a new entry.

  **Requirements:** R5, R6

  **Dependencies:** None (independent UI fix)

  **Files:**
  - Modify: `src/components/TipTapEditor.tsx`
  - Modify: `src/contribute/OrgSearch.tsx`
  - Modify: `src/contribute/ResourceForm.tsx` (author TagInput)

  **Approach:**
  - **TipTap**: In `createSuggestion.updateList`, when `items.length === 0`, change the empty state from "Keep typing to find people & orgs..." to include a subtle link: "Keep typing to find people & orgs... Don't see it? Submit a new entry." The link is not clickable (inside tippy popup) but the text nudges the user.
  - **OrgSearch**: When `results.length === 0` and `value.length >= 2`, show a message below the input: "No matches found. Can't find it? Add this org" (the "Add this org" link already exists via `onCreateOrg` — just ensure it's visible in the no-results state too)
  - **Author TagInput (ResourceForm)**: The "Not found? Add this person" link already exists below the input. Ensure it's visible even when search returns 0 results.

  **Patterns to follow:**
  - Existing "Can't find it? Add this org" link in `OrgSearch.tsx:252-263`
  - Existing "Not found? Add this person" in `ResourceForm.tsx`

  **Test scenarios:**
  - Happy path: type "@xyz" in TipTap notes → dropdown shows empty state with "submit a new entry" text
  - Happy path: type "XYZ Corp" in OrgSearch with no matches → "Can't find it?" link visible
  - Edge case: results exist → no nudge shown (normal dropdown)

  **Verification:**
  - Every empty search state across all three surfaces shows a nudge toward contribution

## System-Wide Impact

- **Search surfaces affected:** All search functions read from `useEntityCache` → `['map-data']` query. Injecting entities there makes them visible everywhere automatically. No per-surface wiring needed beyond Unit 2.
- **Cache consistency:** The `['map-data']` query has `staleTime: Infinity`. Injected entries persist until the query is manually invalidated or the page refreshes (at which point the localStorage ledger re-seeds them).
- **ID space:** Pending entities use submission IDs. If admin approves and the entity gets a real entity ID, the cached pending entry with the old submission ID becomes stale. The ledger pruning (Unit 3) handles this by matching name + type against real `map-data.json` entries.
- **Auto-save interaction:** `useAutoSave` saves form field values, which may include references to submission IDs in fields like `primaryOrgId`. These are separate from the submission ledger. Both persist independently.

## Risks & Dependencies

- **Submission ID / entity ID mismatch**: Links created to pending entities reference submission IDs. After admin approval, these become stale. Mitigation: document as known limitation; admin approval trigger can be updated separately to resolve references.
- **localStorage size**: Each ledger entry is ~200 bytes. Even 100 submissions = 20KB, well within localStorage limits (~5MB). Low risk.
- **Stale pending entries**: A pending entity that gets rejected by admin stays in the ledger until the 7-day expiry. It won't cause harm (just shows in search with a "pending" badge) but may confuse users who expect rejected entities to disappear. Mitigation: acceptable for MVP; admin rejection sync can be added later.

## Sources & References

- **Origin document:** [docs/ideation/2026-04-17-pending-entity-linking-ideation.md](../ideation/2026-04-17-pending-entity-linking-ideation.md) — Ideas #1 and #5
- Related code: `useAddPendingOrg` in `src/hooks/useSubmitEntity.ts`, `useAutoSave` in `src/hooks/useAutoSave.ts`
- Related post-mortem: `docs/solutions/integration-issues/sam-deploy-overwrites-manual-cloudfront-config-2026-04-16.md` — reinforces client-side-only approach
