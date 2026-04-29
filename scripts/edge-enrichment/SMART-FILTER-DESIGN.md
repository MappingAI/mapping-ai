# Smart Filter Design: Single-Occurrence Entity Classification

## The Problem

We have 2,376 entity suggestions that were only seen once during enrichment. These represent 56% of our edge discoveries (2,170 discoveries depend on them).

**Quality is mixed:**
- Some are real entities: "Dragoneer", "True Ventures", "High-Flyer Capital Management"
- Some are noise: "investors", "U.S. operations", "AI programs", "wealthy backers"

We need to classify them without:
1. Rejecting real entities (false negatives)
2. Keeping garbage (false positives)
3. Introducing AI hallucinations

---

## Risk: AI Hallucination

Using Claude to classify entities could introduce errors:

| Risk | Example | Consequence |
|------|---------|-------------|
| **False confidence** | Claude says "XYZ Corp is a real AI company" when it doesn't exist | We keep garbage |
| **Over-rejection** | Claude says "Dragoneer is not AI-related" when it's a major tech VC | We lose real data |
| **Fabrication** | Claude invents details about an entity | Corrupted data |

### Mitigation Strategies

1. **Ground truth first**: Only trust Exa search results, not Claude's "knowledge"
2. **Conservative defaults**: When uncertain, keep (don't reject)
3. **Human review layer**: Flag ambiguous cases for manual review
4. **Audit trail**: Log all decisions with reasoning

---

## Approach Options

### Option A: Rules-Only (No AI)

Use pattern matching to classify:

```
REJECT if:
- Matches noise patterns (investors, various, unknown, etc.)
- Too long (>100 chars, likely a description)
- Generic government terms ("federal government", "state funding")

KEEP if:
- Matches entity patterns (Inc, LLC, Foundation, Fund, etc.)
- Proper noun structure
- Has specific funding amount attached

REVIEW if:
- Everything else
```

**Pros:** No hallucination risk, fast, free
**Cons:** Many entities end up in "review" pile, limited intelligence

**Estimated outcome:**
- ~80 auto-rejected (obvious noise)
- ~200 auto-kept (obvious entities)
- ~2,100 need manual review

---

### Option B: Exa Search Only (No Claude)

Use Exa to verify entity existence:

```
For each entity:
1. Search Exa for exact name
2. If 0 results → likely noise
3. If 1+ results with matching title → likely real
4. Check if results mention AI/tech/policy → AI-relevant
```

**Pros:** Grounded in real search results, no fabrication
**Cons:**
- Search may not find real entities (false negatives)
- Search may find unrelated matches (false positives)
- Cost: ~$19 for 2,376 searches

**Estimated outcome:**
- More accurate than rules-only
- Still need human review for edge cases

---

### Option C: Exa + Claude (Current Script)

Use Exa search, then Claude to interpret results:

```
For each entity:
1. Pre-filter with rules (skip obvious noise/real)
2. Search Exa for name
3. Pass search results to Claude
4. Claude classifies based on search evidence
```

**Pros:** Most accurate classification
**Cons:**
- Hallucination risk from Claude
- Cost: ~$40-50 for full run
- Slower

---

### Option D: Tiered Approach (Recommended)

Combine all approaches in layers:

```
Layer 1: Rules (free, instant)
├── REJECT: obvious noise patterns → ~80 entities
├── KEEP: obvious entity patterns → ~200 entities
└── CONTINUE: ambiguous → ~2,100 entities

Layer 2: Exa Search (cheap, grounded)
├── NO RESULTS: likely noise → reject
├── RESULTS MATCH: likely real → keep
└── AMBIGUOUS: → Layer 3

Layer 3: Human Review
├── High-value (has funding amounts) → prioritize
├── Low-value (no context) → bulk decision
```

**Key principle:** Claude is NOT used for classification. Only Exa search + rules.

---

## Recommended Implementation

### Phase 1: Rules-Based Triage (No API)

Create buckets:

| Bucket | Criteria | Action |
|--------|----------|--------|
| `reject_obvious` | Matches noise patterns | Auto-reject |
| `keep_obvious` | Matches entity patterns (Inc, LLC, Foundation) | Auto-keep |
| `high_value` | Has funding amount > $100K | Prioritize for Exa |
| `low_value` | No context, no amount | Deprioritize |

### Phase 2: Exa Verification (For high-value only)

For entities with funding amounts (higher signal):

1. Search Exa for entity name
2. **If 0 results:** Mark as `likely_noise`
3. **If results exist:** Check if any result title contains the entity name
   - Yes → Mark as `verified_real`
   - No → Mark as `needs_review`

**No Claude involved.** Just search existence verification.

### Phase 3: Human Review

Generate a review spreadsheet:
- Entity name
- Context (citation snippet)
- Amount (if any)
- Exa search results (titles + URLs)
- Suggested action

Human makes final call.

---

## Cost Estimate (Tiered Approach)

| Phase | Entities | Cost |
|-------|----------|------|
| Rules triage | 2,376 | $0 |
| Exa (high-value only) | ~500 | $4 |
| Human review | ~300 | Time only |

**Total: ~$4** vs $40-50 for full AI classification

---

## Questions to Resolve

1. **What's our tolerance for false negatives?**
   - If we reject a real entity, we lose funding data
   - Conservative = keep more, manual review more
   - Aggressive = reject more, risk losing data

2. **How much human review time is available?**
   - If limited: be more aggressive with auto-reject
   - If available: be conservative, review more manually

3. **Should we use Claude at all?**
   - Pro: Better at understanding context
   - Con: Hallucination risk, cost
   - Alternative: Use Claude only for EXPLAINING decisions, not making them

4. **What about entities that exist but aren't AI-relevant?**
   - "Brooklyn Academy of Music" is real but not AI-related
   - Should we reject these or keep them?
   - Recommendation: Keep for now (they might fund AI research)

---

## Next Steps

1. [ ] Decide on approach (A, B, C, or D)
2. [ ] If D: Implement rules-only triage first
3. [ ] Generate review list for high-value ambiguous entities
4. [ ] Manual review session
5. [ ] Run Exa verification on remaining high-value
6. [ ] Final cleanup

---

## Appendix: Noise Patterns

```javascript
const NOISE_PATTERNS = [
  /^(unknown|unspecified|various|multiple|several|other)/i,
  /^(investors|donors|funders|backers|supporters|members)$/i,
  /^(private|public|federal|state|local) (sector|government|investors)/i,
  /^(wealthy|rich|anonymous|individual) /i,
  /(unspecified|various|unknown)$/i,
  /\(various\)/i,
]
```

## Appendix: Entity Patterns

```javascript
const ENTITY_PATTERNS = [
  / (Inc|LLC|Corp|Ltd|Foundation|Fund|Institute|University|Ventures|Capital|Partners)\.?$/i,
  / (GmbH|AG|SA|BV|PLC)$/i,
  /^[A-Z][a-z]+ [A-Z][a-z]+ Foundation$/,  // "John Smith Foundation"
]
```
