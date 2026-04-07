---
date: 2026-04-07
topic: search-ux-comprehensive
focus: "Comprehensive query types + UX for understanding the AI policy landscape"
---

# Ideation: Search UX & Query Comprehensiveness

## Codebase Context

**Project:** Interactive D3.js stakeholder map for AI policy landscape. ~350 people, ~500 orgs, ~150 resources, 862 relationship edges. Rich data includes stances, beliefs, affiliations, funding models.

**Current search:**
- Client-side keyword search with SEMANTIC_MAP (~40 synonym groups)
- Server-side LLM search via Claude Haiku (sends ~20KB entity context)
- No relationship/edge data sent to LLM
- No result summarization or explanation

**Key gaps:**
- Can't answer relational queries ("people at frontier labs AND think tanks")
- No explanation of why results matched
- No guidance for users who don't know what to search for
- Results are just lists of names — no synthesis or insight

**User types:** Researchers, journalists, policymakers exploring the AI policy landscape.

---

## Ranked Ideas

### 1. Graph-Context Search (Path & Connection Discovery)
**Description:** Enable relational queries by enriching LLM context with edge/affiliation data. Users can ask "How is Anthropic connected to the White House?", "Find people who bridge safety orgs and frontier labs", or "People who've worked at frontier labs AND think tanks AND government."

**Rationale:** The map's core value is relationships, but current search ignores them. This unlocks "who's connected to whom" questions — the primary research use case. The edge data (862 relationships) exists but isn't sent to the LLM.

**Downsides:** Requires enriching LLM context with edge summaries (~24KB additional). Path-finding across large graphs could produce overwhelming results.

**Confidence:** 85%

**Complexity:** Medium

**Status:** Unexplored

---

### 2. Positional / Belief Clustering ("Find My Tribe")
**Description:** Let users find entities with similar stance profiles: "Who else has views like Dario Amodei?" or "Show me the pro-regulation + high-risk-concern cluster." Uses the belief score data already in map-data.json.

**Rationale:** The map's unique differentiator is belief/stance data. Coalition-finding and camp-mapping are core policy research tasks that no other tool does well.

**Downsides:** Many entities have incomplete stance data. UI for multi-dimensional stance selection is non-trivial.

**Confidence:** 75%

**Complexity:** Medium

**Status:** Unexplored

---

### 3. Topic & Expertise Routing
**Description:** For topic queries like "compute governance experts" or "who works on AI and labor," return entities who actually work on that topic based on affiliations, notes, and resources — not just keyword matches.

**Rationale:** Users often start with a topic, not a name. Current search can find "compute" in text but can't identify who's actually an expert. LLM world knowledge + entity context enables this.

**Downsides:** Relies on LLM inference quality. May return false positives for loosely related entities.

**Confidence:** 80%

**Complexity:** Medium

**Status:** Unexplored

---

### 4. Neighborhood / Context Queries ("Brief Me")
**Description:** Given any entity, return its full context: who funds it, who collaborates with it, who criticizes it, related resources, connected clusters. A "tell me everything about X" query.

**Rationale:** Before meetings or research deep-dives, users need situational awareness. This is the "brief me on [person/org]" use case that currently requires clicking through multiple nodes.

**Downsides:** Could return overwhelming amounts of information. Needs thoughtful summarization.

**Confidence:** 85%

**Complexity:** Medium

**Status:** Unexplored

---

### 5. Natural Language Result Summary
**Description:** Before showing individual results, generate a 2-3 sentence summary: "Found 23 people and 15 orgs, primarily researchers and think tanks with cautious regulatory stances. Key players are MIRI, FHI, CAIS."

**Rationale:** Users get immediate orientation without counting and categorizing manually. Transforms a list of names into insight.

**Downsides:** Adds LLM latency to every search. Summary quality depends on result set coherence.

**Confidence:** 80%

**Complexity:** Low-Medium

**Status:** Unexplored

---

### 6. Match Explanation Badges
**Description:** Each result shows why it matched: "works at matching org," "mentioned in notes," "semantic: AI safety → alignment." Makes the system's reasoning transparent.

**Rationale:** Current search is a black box. Users can't evaluate result quality or learn to query better. Transparency builds trust.

**Downsides:** Visual complexity. Explanations may confuse casual users.

**Confidence:** 80%

**Complexity:** Low

**Status:** Unexplored

---

### 7. "Also Explore" Suggestions
**Description:** After results, suggest related queries: "See who FUNDS these orgs," "Critics of these positions," "Related topics: compute, export controls." Guide users to productive next steps.

**Rationale:** First searches rarely find exactly what users need. Suggestions help refine/expand without starting over. Turns dead-ends into discoveries.

**Downsides:** Suggestion quality depends on understanding the result set. Could feel like noise if poorly targeted.

**Confidence:** 75%

**Complexity:** Low-Medium

**Status:** Unexplored

---

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | Role/influence pattern queries | Overlaps with path discovery |
| 2 | Funding flow tracing | Subset of path queries |
| 3 | Career trajectory queries | No temporal data in schema |
| 4 | Comparative/versus queries | Overlaps with belief clustering |
| 5 | Anomaly detection | Requires analytics infrastructure |
| 6 | Multi-hop reasoning | Subsumed by path discovery + LLM |
| 7 | Faceted result clusters | UI complexity, overlaps with NL summary |
| 8 | Relationship web preview | Duplicates existing map highlighting |
| 9 | Stance spectrum viz | Plot view already does this |
| 10 | Result set comparison | Power user, low initial value |
| 11 | Timeline-aware results | No temporal data |
| 12 | Confidence indicators | Premature |
| 13 | Narrative result cards | Overlaps with NL summary |
| 14 | Onboarding tour | Already in prior ideation |
| 15 | Persona pathways | UI cost vs uncertain value |
| 16 | "What's hot" highlights | Submission counts already shown |
| 17 | Question cards | Lower leverage than core improvements |
| 18 | Narrative debate views | High editorial maintenance |
| 19 | "Surprise me" random walk | Gimmick |
| 20 | Cluster summary cards | Orthogonal to search |
| 21 | Entry quiz | Over-engineered |
| 22 | "Connected to you" entry point | Overlaps with neighborhood queries |
| 23 | Map reading guide | Already in prior ideation |
| 24 | Boolean query builder | LLM handles this naturally |
| 25 | Network distance queries | Subsumed by path discovery |
| 26 | Saved searches with alerts | Infrastructure heavy |
| 27 | Cohort comparison | Power user, defer |
| 28 | Temporal snapshots | No infrastructure |
| 29 | Bulk export | Valuable but orthogonal to focus |
| 30 | Cluster detection | Algorithmic complexity |
| 31 | Query-by-example | Overlaps with belief clustering |
| 32 | Collaborative sharing | Need users first |
| 33 | API access | Premature |

---

## Session Log
- 2026-04-07: Initial ideation — 40 raw candidates generated across 4 sub-agents (query types, result presentation, guided discovery, power user features), 7 survived after adversarial filtering. Focus: comprehensive query types and UX for landscape understanding.
