---
date: 2026-04-17
topic: pending-entity-linking
focus: Make pending/recently-submitted entities immediately searchable and linkable in the contribute form
---

# Ideation: Pending Entity Linking in Contribute Form

## Codebase Context

**Problem:** When a user submits a new entity (person, org, resource) via the contribute form, that entity becomes invisible to all search surfaces until admin approval regenerates `map-data.json`. This means:
- A user who adds org A, then tries to link person B to org A, cannot find org A
- TipTap @mentions can't reference entities submitted seconds ago
- The "submit multiple related entities in one session" workflow is broken

**Current architecture:**
- `useAddPendingOrg` (in `useSubmitEntity.ts`) optimistically injects newly-created orgs into the TanStack Query `['map-data']` cache — but ONLY for orgs created via OrgCreationPanel, not for people or resources
- All search surfaces (`fuzzySearch`, `OrgSearch`, `TipTap @mentions`, `author TagInput`, `DuplicateDetection`) read from `useEntityCache` which reads from `['map-data']`
- The `/search?status=pending` API can find pending entities but requires 2+ char query, a network round-trip, and is unreliable on preview deployments (CORS)
- `localStorage` auto-save already persists form state across page loads
- The submission API returns a `submissionId` (NOT `entity.id` — those are only assigned on admin approval)
- `OrgCreationPanel.onOrgCreated` closes the panel but does NOT write the new org back into the triggering form field

**Key insight:** The `useAddPendingOrg` pattern proves that optimistic cache injection works. It just needs to be generalized to all entity types and persisted to localStorage.

## Ranked Ideas

### 1. Universal Optimistic Entity Cache + localStorage Ledger
**Description:** Generalize `useAddPendingOrg` into `useAddPendingEntity` that injects any just-submitted entity (person/org/resource) into the TanStack Query `['map-data']` cache. Persist these to a `localStorage` submission ledger (`mappingai_session_submissions`) that seeds the cache on page load. Every search surface automatically picks them up because they all read from `useEntityCache`. Remove the async `/search?status=pending` calls from form search callbacks — session cache makes them unnecessary for self-submitted entities.
**Rationale:** The pattern already works for orgs. Generalizing it is the highest-leverage single change. Makes every entity submitted this session instantly searchable everywhere with zero API dependency.
**Downsides:** Submission IDs ≠ entity IDs; links reference submission IDs until admin approval. Need to handle ID mismatch on admin side. localStorage ledger entries need expiry/cleanup when entities appear in real `map-data.json`.
**Confidence:** 90%
**Complexity:** Medium
**Status:** Unexplored

### 2. Auto-link Back from OrgCreationPanel
**Description:** After OrgCreationPanel submits, write the new org name + ID back into the specific field that triggered the panel (primaryOrg/primaryOrgId, affiliatedOrgIds, or parentOrg/parentOrgId). Currently `onOrgCreated` just closes the panel. Track `orgPanelTrigger` (already exists as state) and use it to write back.
**Rationale:** Users open the panel because they couldn't find the org. After creating it, they expect it linked. The current flow requires re-searching after panel close.
**Downsides:** Need to track which field triggered the panel and write back to the correct form field. Affiliated orgs (TagInput) need append, not replace.
**Confidence:** 95%
**Complexity:** Low
**Status:** Unexplored

### 3. TipTap "Don't See It?" Nudge + Empty State CTAs
**Description:** When TipTap @mention search returns 0 results, show "Don't see it? Submit a new entry" in the dropdown. Clicking it switches to the appropriate form tab. Add the same CTA to OrgSearch empty state and author TagInput empty state. The nudge should be subtle — a muted link at the bottom of the dropdown, not a modal or alert.
**Rationale:** Currently the empty state is "Keep typing to find people & orgs..." which dead-ends. A CTA turns every failed search into a contribution opportunity, feeding the growth flywheel.
**Downsides:** Minimal — small UI addition. Need to handle the tab switch gracefully (save current form state before switching).
**Confidence:** 95%
**Complexity:** Low
**Status:** Unexplored

### 4. Inline Person/Resource Creation Panels
**Description:** Build slide-in panels for people and resources analogous to OrgCreationPanel. Triggered from: author search "Not found? Add this person", TipTap @mention empty state, and any entity search that yields no results. Uses the same portal pattern as OrgCreationPanel.
**Rationale:** The 5-step "abandon form → switch tab → submit → switch back → re-search" flow is the biggest mid-form friction point. Inline creation keeps the user in context.
**Downsides:** Significant UI work. Need to handle panel-in-panel inception (creating an org while creating a person while filling a resource). The OrgCreationPanel already has `allowOrgCreation=false` prop pattern for this.
**Confidence:** 80%
**Complexity:** High
**Status:** Unexplored

### 5. Recency Boost in fuzzySearch
**Description:** Entities with `_pending: true` get +20 score boost in `fuzzySearch` so they appear at the top of search results. 3-line change in `src/lib/search.ts`.
**Rationale:** Even after cache injection, a pending "AI Safety Institute" competes with 10+ approved entities starting with "AI". Recency boost makes self-submissions feel sticky and immediately findable.
**Downsides:** Negligible — very small change.
**Confidence:** 95%
**Complexity:** Low
**Status:** Unexplored

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | Ghost entity pre-creation (reserve ID before panel opens) | Over-engineered; creates garbage submissions on cancel |
| 2 | Deterministic client-side UUIDs | Requires server schema changes + UUID→int resolution layer |
| 3 | BroadcastChannel cross-tab sync | Nice-to-have but rare scenario; session cache handles 95% of cases |
| 4 | Batch submission mode / visual graph | Far beyond current scope; great future feature but doesn't solve the immediate linking gap |
| 5 | Contributor reputation / auto-approve | Policy decision, not a technical fix |
| 6 | Collaborative session rooms | Future workshop feature, not the core problem |
| 7 | Bidirectional mention suggestions | Only works with approved entities; doesn't help pending flow |
| 8 | Smart submission templates (pre-fill from prior) | Nice DX but doesn't solve the entity linkability gap |
| 9 | Contributor key / personal feed | Backend changes + new API required; session cache is simpler |
| 10 | Optimistic edge creation | Correct long-term but premature; edges only matter post-approval |
| 11 | Contributor entity namespace with deferred resolution | Clever but adds architectural complexity; session cache achieves 90% with 10% of the effort |
| 12 | Real-time pending entity broadcast (SSE/polling) | Lambda architecture makes SSE impractical; polling is wasteful; session cache is better |
| 13 | Unified useSearchAll hook | Good cleanup but doesn't solve the core problem — it's a refactor, not a feature |

## Session Log
- 2026-04-17: Initial ideation — 30 candidates generated across 4 frames, 5 survivors after adversarial filtering. Top priority confirmed by user: instant self-linking (ideas 1+5), with auto-link-back (2), TipTap nudge (3), and inline panels (4) all wanted.
