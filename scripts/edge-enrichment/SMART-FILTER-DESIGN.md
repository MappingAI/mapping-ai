# Edge Enrichment: Post-Processing Roadmap

## Current State (April 29, 2026)

### Edge Discoveries

| Status | Count | Description |
|--------|-------|-------------|
| `pending_review` | 347 | ✅ Both entities exist, AI-relevant, ready to promote |
| `pending_entities` | 2,341 | ⏳ Need entity creation/resolution |
| `rejected` | 110 | ❌ Not AI-related or invalid |
| **Total** | **2,798** | After consolidation (removed 117 duplicates) |

### Multi-Source Edges

| Metric | Count |
|--------|-------|
| Edges with 2+ sources | 103 |
| Now tracked via `sources_count` column | ✅ |

### Entity Suggestions

| Status | Count | Description |
|--------|-------|-------------|
| `pending` | 1,881 | ⏳ Need classification |

**By occurrence:**
- Seen once: 1,437 (76%) - highest risk of noise
- Seen 2-4 times: 342 (18%)
- Seen 5+ times: 102 (5%) - likely real

### Edge Evidence (Temporal Data)

| Metric | Count |
|--------|-------|
| Total evidence records | 1,887 |
| With start_date | 1,221 (65%) |
| With end_date | 279 (15%) |

---

## Completed Steps ✅

### Step 0: Cleanup Orphan Edges ✅
- Fuzzy matched 53 edges (suffix stripping: "SoftBank Group" → "SoftBank")
- Deleted 992 tangential edges (neither entity in RDS)
- Deleted 1,133 orphaned entity suggestions
- Exported deleted data for recovery

### Step 0.5: Fix Wrong Matches ✅
- Fixed 13 DeepMind edges (was matched to "Ezra Klein" → now "Google DeepMind")
- Fixed 2 CEA edges (was matched to "Aether" → now unmatched)

### Step 0.6: AI Relevance Review ✅
- Exported 448 deduplicated edges for Claude review
- Claude identified ~93 non-AI-related edges
- Applied rejections (110 total rejected including self-referential)

### Step 0.7: Improved Enrichment Prompt ✅
- Updated `discover-funding.js` with AI-relevance requirements
- Added entity involvement check (searched entity must be funder OR recipient)
- Added server-side validation (AI keywords, no self-referential, entity involved)

### Step 0.8: Source Consolidation ✅
- Added `sources_count` and `updated_at` columns to edge_discovery
- Updated `discover-funding.js` to consolidate sources at discovery time (Option A)
- Ran consolidation script on existing data: 117 duplicate rows → 103 multi-source edges
- Script: `post-process/consolidate-duplicate-edges.js`

---

## Remaining Roadmap

### Phase 1: Promote Ready Edges

**Step 1.1: Promote pending_review edges to production**
- 398 edges ready to add to RDS `edge` table
- Script: `promote-discoveries.js`
- Creates new edges with source attribution

**Estimated effort:** ~5 minutes (scripted)

---

### Phase 2: Process Entity Suggestions (1,881 pending)

**Step 2.1: Merge Known Duplicates**
- Script: `post-process-1-merge-duplicates.js`
- Merges obvious duplicates (e.g., "Open Philanthropy" → "Coefficient Giving")
- Updates edge_discovery to point to existing entity IDs

**Step 2.2: Reject Generic Names**
- Script: `post-process-2-reject-generic.js`
- Auto-rejects: "investors", "federal government", "private sector", etc.
- Estimated: ~50-100 auto-rejected

**Step 2.3: Classify Single-Occurrence Entities (1,437)**
- Highest risk of noise
- Options:
  - **Option A:** Rules-only triage (free, fast, ~80% accuracy)
  - **Option B:** Exa search verification (~$12 for all, higher accuracy)
  - **Option C:** Export for Claude review (similar to edge review)
- Need to decide: aggressive (auto-reject more) vs conservative (review more)

**Step 2.4: Review Multi-Occurrence Entities (444)**
- Seen 2+ times = higher confidence they're real
- Still need AI-relevance check
- Could batch review in Claude

**Estimated effort:** 2-4 hours depending on approach

---

### Phase 3: Create Approved Entities in RDS

**Step 3.1: Export approved suggestions for creation**
- Generate entity creation list with:
  - Name, type (person/org)
  - Category (if inferrable)
  - Context (how discovered)

**Step 3.2: Batch create entities in RDS**
- Script: `create-entities-from-suggestions.js` (to be created)
- Assigns IDs, sets status='pending' for human review

**Step 3.3: Update edge_discovery with new entity IDs**
- Resolves pending_entities → pending_review

**Estimated effort:** 1-2 hours (scripted)

---

### Phase 4: Enrich New Entities

Once entities are created in RDS, they need enrichment:

**Step 4.1: Employment/Affiliation Edges**
- Script: `enrich-edges.js`
- Finds employment, board positions, affiliations
- Cost: ~$0.03/entity

**Step 4.2: Lifecycle Data (Orgs only)**
- Script: `enrich-org-lifecycle.js`
- Finds founding dates, end dates
- Cost: ~$0.01/entity

**Step 4.3: Thumbnails**
- Script: `resolve-thumbnails.js`
- Finds profile images
- Cost: ~$0.01/entity

**Estimated cost for 500 new entities:** ~$25

---

### Phase 5: Second-Pass Funding Discovery

After new entities exist, run discover-funding again:

**Step 5.1: Run discover-funding on new entities**
- Now uses improved prompt (AI-relevant, entity-involved)
- May discover additional funding relationships

**Step 5.2: Process new discoveries**
- Repeat Phase 1-3 for any new edges/suggestions

---

### Phase 6: Final Promotion

**Step 6.1: Promote all pending_review edges**
- All edges with both entities resolved

**Step 6.2: Apply edge evidence to existing edges**
- 1,887 temporal data records
- Updates start_date, end_date on existing edges

**Step 6.3: Regenerate map-data.json**
- `pnpm run db:export-map`
- Reflects new entities and edges

---

## Decision Points

### Decision 1: Entity Suggestion Classification Approach

| Approach | Cost | Accuracy | Time |
|----------|------|----------|------|
| A. Rules-only | $0 | ~80% | 10 min |
| B. Exa verification | ~$15 | ~90% | 1 hour |
| C. Claude batch review | ~$5 | ~95% | 30 min |
| D. Manual review | $0 | 100% | 4+ hours |

**Recommendation:** Option C for high-value (seen 2+ times), Option A for single-occurrence

### Decision 2: New Entity Creation Threshold

Should we create ALL approved suggestions, or only high-confidence ones?

| Threshold | Entities Created | Risk |
|-----------|-----------------|------|
| All approved | ~1,500 | More noise in RDS |
| Seen 2+ times | ~400 | Miss real single-occurrence entities |
| With funding amount | ~800 | Good balance |

**Recommendation:** Create entities with funding amounts first, review rest later

### Decision 3: Enrichment Priority

Which new entities to enrich first?

| Priority | Criteria | Count |
|----------|----------|-------|
| P0 | AI labs, safety orgs | ~50 |
| P1 | VCs, foundations | ~200 |
| P2 | Other tech companies | ~300 |
| P3 | Everything else | ~500+ |

---

## Cost Estimates

| Phase | Estimated Cost |
|-------|---------------|
| Phase 1 (Promote) | $0 |
| Phase 2 (Entity classification) | $5-20 |
| Phase 3 (Entity creation) | $0 |
| Phase 4 (Enrichment) | $25-50 |
| Phase 5 (Second-pass) | $20-40 |
| **Total** | **$50-110** |

---

## Scripts Reference

| Script | Purpose | Status |
|--------|---------|--------|
| `post-process/post-process-0-cleanup-orphans.js` | Delete tangential edges | ✅ Done |
| `post-process/post-process-1-merge-duplicates.js` | Merge known duplicates | ⏳ Ready |
| `post-process/post-process-2-reject-generic.js` | Reject generic names | ⏳ Ready |
| `post-process/post-process-4-smart-filter.js` | AI relevance filter | ⏳ Ready |
| `post-process/apply-review-rejections.js` | Apply Claude review | ✅ Done |
| `post-process/consolidate-duplicate-edges.js` | Consolidate multi-source edges | ✅ Done |
| `post-process/promote-discoveries.js` | Promote edges to RDS | ⏳ Ready |
| `post-process/export-pending-review.js` | Export for review | ✅ Done |
| `discover-funding.js` | Discover funding relationships | ✅ Updated (w/ source consolidation) |
| `enrich-edges.js` | Add temporal data | ⏳ Ready |
| `enrich-org-lifecycle.js` | Add founding dates | ⏳ Ready |

---

## Quick Start: Next Actions

```bash
# 1. Run merge duplicates (entity suggestions)
node scripts/edge-enrichment/post-process/post-process-1-merge-duplicates.js --dry-run
node scripts/edge-enrichment/post-process/post-process-1-merge-duplicates.js --apply

# 2. Run reject generic (entity suggestions)
node scripts/edge-enrichment/post-process/post-process-2-reject-generic.js --dry-run
node scripts/edge-enrichment/post-process/post-process-2-reject-generic.js --apply

# 3. Promote ready edges (347 pending_review edges)
node scripts/edge-enrichment/post-process/promote-discoveries.js --dry-run
node scripts/edge-enrichment/post-process/promote-discoveries.js --apply

# 4. Export remaining suggestions for review
node scripts/edge-enrichment/post-process/export-entity-suggestions.js
```

---

## Appendix: Enrichment Run Summary (April 28, 2026)

**Total Cost:** $84.43 (Exa: $30.91, Anthropic: $53.51)

### Original Counts (Before Post-Processing)

| Metric | Count |
|--------|-------|
| Edge discoveries | 3,907 |
| Entity suggestions | 3,014 |
| Edge evidence | 1,887 |
| Lifecycle claims | 645 |

### After Post-Processing (Current)

| Metric | Count |
|--------|-------|
| Edge discoveries | 2,915 |
| Entity suggestions | 1,881 |
| Rejected edges | 110 |
| Deleted (tangential) | 992 |
