---
date: 2026-04-07
topic: search-robustness
focus: "Making search actually robust - handling critical query types, fixing keyword-only matching, verifying LLM search works"
---

# Ideation: Search Robustness

## Codebase Context

**Project:** Static HTML/CSS/JS stakeholder map for AI policy landscape. D3.js visualization with ~500-1000 entities (people, orgs, resources), rich relationship data in edge table, belief/stance scores from crowdsourced submissions.

**Current search architecture:**

1. **Client-side keyword search** (`map.html:3308-3544`):
   - SEMANTIC_MAP: ~40 manually-maintained synonym groups
   - `expandQuery()`: Expands user query using SEMANTIC_MAP + partial key matching
   - `scoreEntity()`: Scores entities across 12 fields (name, category, title, primary_org, notes, etc.)
   - Two modes: autocomplete dropdown (12 results) and Search view with AI/Keyword toggle

2. **Server-side LLM search** (`api/semantic-search.js`):
   - Fetches ALL entities from map-data.json (cached 5 min)
   - Sends entire entity list (~20KB context) to Claude Haiku on every query
   - LLM returns matching entity names based on broad interpretation
   - Validates returned names against actual entity list (hallucination guard)

**Key problems identified:**
- Keyword search is blatantly doing keyword match, missing conceptual queries
- LLM search unclear if working - users must manually toggle to it
- No feedback when search fails or returns unexpected results
- SEMANTIC_MAP is static, drifts out of sync with entity data
- Edge/relationship data completely unused in search
- User doesn't know what queries will work

**Critical query types to support:**
- "Who are the key players on compute governance?"
- "Which orgs are pro-regulation?"
- "People who think AGI is close"
- "Connections between OpenAI and government"
- "Critics of SB 1047"
- "Funders of AI safety research"

---

## Ranked Ideas

### 1. Unified Cascading Search (kill the toggle)
**Description:** Eliminate the Keyword/AI toggle. Run fast client-side keyword search first (150ms). If results are poor (0 matches or all low-confidence <20 score), automatically escalate to LLM search with a subtle loading indicator. User sees one search box, system picks the right approach.

**Rationale:** The toggle forces users to understand implementation details. Most queries work fine with keyword; LLM is only needed for conceptual queries like "who thinks AGI is close." Cascading optimizes cost and UX simultaneously.

**Downsides:** LLM fallback adds latency for complex queries; need to tune the "poor results" threshold carefully.

**Confidence:** 85%

**Complexity:** Medium

**Status:** Unexplored

---

### 2. "Why This Matched" Explanations
**Description:** For each search result, show a compact explanation: which field matched (name, category, notes, org), whether it was synonym expansion, or LLM inference. Display as a subtle gray line under each result: "Matched: primary_org contains 'anthropic'" or "AI: inferred from regulatory stance."

**Rationale:** Current search is a black box. Users see results but don't know why, making it impossible to refine queries intelligently. The scoring logic already exists in `scoreEntity()` - just surface it. LLM search already returns an `explanation` field that goes unused.

**Downsides:** Adds visual complexity to results; explanations might confuse casual users.

**Confidence:** 80%

**Complexity:** Low-Medium

**Status:** Unexplored

---

### 3. Pre-Filter Before LLM Call
**Description:** Before sending 20KB of entity context to Claude Haiku, run keyword pre-filtering server-side to reduce candidates to ~100 relevant entities. Only send the filtered set to the LLM for semantic ranking. Query "OpenAI researchers" -> keyword filter finds 50 OpenAI-related entities -> LLM ranks them.

**Rationale:** Current semantic-search.js sends ALL entities on every query (lines 70-88). This wastes tokens, increases latency, and doesn't scale. Pre-filtering could cut LLM costs 80%+ while improving response time.

**Downsides:** Might miss entities that only LLM world knowledge would find (e.g., "critics of scaling" where no field contains those words). Need fallback for zero pre-filter results.

**Confidence:** 85%

**Complexity:** Medium

**Status:** Unexplored

---

### 4. Auto-Generate SEMANTIC_MAP from Entity Data
**Description:** Create a script that runs weekly (or on map-data.json refresh) to auto-generate SEMANTIC_MAP from actual entity data. Extract: all org names and abbreviations, category terms, location names, stance vocabulary. Output a generated JS file that replaces the hand-maintained one.

**Rationale:** The current 40+ synonym groups drift out of sync with the database. When "xAI" was added, someone had to remember to add it to frontier lab synonyms. Auto-generation eliminates maintenance burden and ensures search vocabulary matches actual data.

**Downsides:** Generated synonyms may lack domain nuance (e.g., "miri" expands to "safety" is expert knowledge). May need a human-curated overlay for domain-specific associations.

**Confidence:** 75%

**Complexity:** Medium

**Status:** Unexplored

---

### 5. Relationship-Aware Search (edge + @mention)
**Description:** Extend search to leverage the edge table and @mention graph. Support queries like "funders of MIRI" (traverse funder edges), "connected to OpenAI" (any edge type), "critics of frontier labs" (critic edge_type). Also parse @mentions in notes_html to create implicit relationship signals for ranking.

**Rationale:** The richest data in this map is relationships, but search ignores them entirely. Users asking "who funds AI safety" can't get answers without manual browsing. The edge table and @mention graph are underutilized assets.

**Downsides:** Adds query parsing complexity; need to define syntax (or rely on LLM interpretation). @mention parsing requires HTML traversal.

**Confidence:** 80%

**Complexity:** Medium-High

**Status:** Unexplored

---

### 6. Graph-Aware Search Ranking
**Description:** Incorporate edge relationships into search result scoring. When searching "AI safety researchers," boost results that have edges to known AI safety orgs. A researcher with 5 connections to DeepMind, Anthropic, MIRI is more relevant than an isolated name match.

**Rationale:** Currently search treats entities as isolated items. But network position is a strong relevance signal - highly connected entities in a domain are often more important. The edge data exists but isn't used for ranking.

**Downsides:** Biases toward well-connected entities; might demote important but less-documented people. Requires loading edge data for scoring.

**Confidence:** 75%

**Complexity:** Medium

**Status:** Unexplored

---

### 7. Stance-First Search ("Find My Tribe")
**Description:** Add a search mode where users select a belief profile (e.g., "pro-regulation + short AGI timeline + high risk concern") and the system returns entities matching that stance combination. Uses the weighted belief scores already in the data.

**Rationale:** This map's unique value is belief/stance data. Policymakers building coalitions need to find natural allies. Journalists profiling a viewpoint need representative voices. Stance alignment is often more relevant than keyword matching.

**Downsides:** Many entities have incomplete stance data; results may be sparse. UI design for multi-dimensional belief selection is non-trivial.

**Confidence:** 70%

**Complexity:** Medium

**Status:** Unexplored

---

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | Query intent disambiguation panel | UX friction exceeds value |
| 2 | Progressive query refinement UI | Overlaps with query suggestions |
| 3 | Searchable query history with templates | Low urgency, doesn't fix core problem |
| 4 | Natural language query parsing feedback | Subsumed by "why matched" explanations |
| 5 | Autocomplete that teaches query syntax | Conflates discovery and search |
| 6 | Learn from clicks (implicit feedback) | Premature for dataset size |
| 7 | Embedding-based search | High implementation cost vs simpler alternatives |
| 8 | Autocomplete IS search (remove mode) | Map highlighting in Search view is valuable |
| 9 | Query suggestions | Handled by LLM escalation in unified search |
| 10 | Question-driven search | LLM search already does this conceptually |
| 11 | "Show me the controversy" | Tangential to search robustness focus |
| 12 | Temporal search ("as of" time) | No supporting data - no timestamps on stance changes |
| 13 | Conversational refinement | Over-engineered for current user base |
| 14 | Search by absence ("who's missing") | Analytics tool, not search feature |
| 15 | "Explain this cluster" | Browse feature, not search |
| 16 | Influence flow search | Too complex, requires richer edge data |
| 17 | Persona-based search modes | Need user research first |
| 18 | Search feedback loop infrastructure | Need more users first to be actionable |
| 19 | Category co-occurrence index | Overlaps with auto SEMANTIC_MAP |
| 20 | Faceted search with graph counts | UI complexity not justified |
| 21 | Composite entity search | Node click already shows 1-hop connections |
| 22 | Semantic search cache with embeddings | Premature optimization |

---

## Session Log
- 2026-04-07: Initial ideation -- 38 raw candidates generated across 4 sub-agents (user pain/friction, inversion/automation, assumption-breaking, leverage/compounding), 7 survived after adversarial filtering. Focus: search robustness for critical query types.
