# Enrichment Plan

## Approach

Two-track workflow:

1. **Manual enrichment** via Claude Code sessions (Connor's subscription) — interactive verification, note rewriting, hallucination hunting
2. **Reusable scripts** (Anthropic API + Exa API) — team can run these independently with their own API keys to continue the workflow

All work targets the staging database (`mapping_ai_staging`). Scripts and documentation live in `enrichment/`.

---

## Phases

### Phase 0: Setup

- [ ] `.env` with staging DB credentials (`DATABASE_URL`, `ANTHROPIC_API_KEY`, `EXA_API_KEY`)
- [ ] Python venv + dependencies (`psycopg2`, `anthropic`, `exa-py`, `python-dotenv`)
- [ ] Verify DB connectivity to `mapping_ai_staging`
- [ ] Run baseline audit script

### Phase 1: Audit & Baseline

Generate a snapshot of the current database state. This becomes the benchmark we measure all progress against.

- Script: `enrichment/scripts/audit.py`
- Output: entity counts by type, empty fields, edge gaps, orphan entities, issue breakdown
- Save baseline to `enrichment/logs/baseline-audit.md`

### Phase 2: Mechanical Cleanup

Fully scriptable batch fixes — no AI needed, run once.

| Task | Script | Scope |
|------|--------|-------|
| Citation artifact removal (`[n]`, `[n,n]`) | `cleanup_citations.py` | All entity notes |
| Edge type normalization (24 legacy → 12 canonical) | `normalize_edges.py` | All 2,228 edges |
| Belief field normalization | `normalize_beliefs.py` | Non-standard belief values |

### Phase 3: Entity Enrichment

Verify and improve existing entities. Two modes:

- **Manual (Claude Code):** Interactive sessions — query entity, review data, verify against sources, rewrite notes, fix hallucinations
- **Script (API):** `enrich_entity.py` — Exa web search → Claude API verification → structured JSON output → human review before DB write

Priority order:
1. Entities with existing edges (highest graph value)
2. Entities with empty/thin notes
3. Orphan entities (254 with zero edges)

### Phase 4: Edge Enrichment

- Add `source_url` and `evidence` to all edges (currently 0% have sources)
- Reclassify 585 `affiliated` edges to canonical types (`employer`, `member`, `advisor`, etc.)
- Verify directionality matches canonical conventions
- Fix edges pointing to wrong entities

### Phase 5: Seeding

Fill coverage gaps systematically.

- Run gap analysis by category (which org types, person roles, resource types are underrepresented?)
- Create missing key entities + their edges (executive teams for frontier labs, key agencies, etc.)
- Manual research + AI-assisted creation via `seed_entity.py`
- Follow the cascade: entity first, then edges, then any entities those edges require

### Phase 6: Importance Ratings

Do this last, after enrichment and seeding are complete.

- Coordinate `ALTER TABLE` with team before executing on staging
- AI-assisted scoring with human calibration
- Rate within category, cross-calibrate across categories

---

## Scripts (for team reuse)

All scripts in `enrichment/scripts/`. Each reads from `.env`, accepts CLI args, and logs changes.

| Script | Purpose | AI Required |
|--------|---------|-------------|
| `audit.py` | Baseline report — counts, gaps, issues | No |
| `cleanup_citations.py` | Batch `[n]` removal from notes | No |
| `normalize_edges.py` | Legacy → canonical edge types | No |
| `normalize_beliefs.py` | Non-standard → canonical belief values | No |
| `enrich_entity.py` | Single entity enrichment (Exa + Claude API) | Yes |
| `enrich_batch.py` | Batch enrichment with progress tracking | Yes |
| `seed_entity.py` | Create + enrich new entity | Yes |
| `importance.py` | Importance rating assignment | Yes |

### Common CLI patterns

```
--id 123            # Single entity by ID
--ids 1,2,3         # Multiple specific IDs
--batch-size 10     # Process N entities
--dry-run           # Show changes without writing to DB
--force             # Re-process already-processed entities
```

---

## Change Tracking

Every database modification is tracked at two levels:

### 1. Structured JSON logs

Scripts write every change to `enrichment/logs/changes/` as JSON:

```json
{
  "entity_id": 123,
  "timestamp": "2026-04-10T14:30:00Z",
  "phase": "entity-enrichment",
  "script": "enrich_entity.py",
  "before": { "notes": "old notes...", "category": "Executive" },
  "after": { "notes": "new notes...", "category": "Researcher" },
  "sources": ["https://example.com/bio"],
  "rationale": "Category was wrong — person is a researcher at MIT, not an executive"
}
```

This is the source of truth. Machine-readable, diffable, can generate any report format.

### 2. Markdown changelog tables

Human-readable summaries in `enrichment/logs/` — viewable directly on GitHub.

```markdown
| Entity ID | Name | Field | Before | After | Source |
|-----------|------|-------|--------|-------|--------|
| 123 | Jane Doe | category | Executive | Researcher | linkedin.com/in/janedoe |
```

One changelog file per phase/batch (e.g., `changelog-phase2-edges.md`).

---

## Phase Status

| Phase | Status | Notes |
|-------|--------|-------|
| 0 — Setup | Not started | |
| 1 — Audit | Not started | |
| 2 — Cleanup | Not started | |
| 3 — Entity Enrichment | Not started | |
| 4 — Edge Enrichment | Not started | |
| 5 — Seeding | Not started | |
| 6 — Importance | Not started | |
