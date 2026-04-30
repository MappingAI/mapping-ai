# Data Consultant: Trial Assignment

**Project:** U.S. AI Policy Stakeholder Map

---

## Your Tasks

Complete **all three tasks** below. This should take less than 30 minutes. Document your work in a markdown file.

### Task 1: Examine & Fix 5 Entity Notes

Find 5 entities that have notes but need improvement. For each:
1. **Verify claims** — Check that stated facts are actually true
2. **Remove hallucinations** — Delete anything you can't verify
3. **Enrich if thin** — Add context about their AI policy relevance
4. **Clean formatting** — Remove `[n]` citation artifacts if present
5. **Fill missing fields** — Add any missing data you can verify

Choose a mix: some with obvious problems, some that look fine but need verification.

**Deliverable:** JSON (see Deliverable Format section)

### Task 2: Enrich 3 Empty Entities

Find 3 entities with no notes. Provide COMPLETE data in DB-ready format:
- All applicable fields filled (not just notes)
- 2-4 sentences explaining **why they matter to AI policy**
- **No hallucination** — only write what you can verify

**Deliverable:** JSON (see Deliverable Format section)

### Task 3: Add 3 Edges + 1 New Entity

**Part A:** Add 3 new edges connecting existing entities
**Part B:** Add 1 new entity relevant to U.S. AI policy (search first to confirm it doesn't exist)

**Deliverable:** JSON (see Deliverable Format section)

---

## Project Overview

We're building an interactive map of the U.S. AI policy ecosystem — the people, organizations, and resources shaping how AI is governed in America. **Live site:** [mapping-ai.org](https://mapping-ai.org)

The database currently has **709 people**, **734 organizations**, and **161 resources**, connected by **2,228 edges** (relationships).

Your role is to ensure our data is **accurate, well-sourced, comprehensive, and properly connected**.

---

## CRITICAL ISSUE: Data Hallucinations

**Our database contains fabricated information.** Previous automated enrichment introduced facts that cannot be verified or are demonstrably false. Identifying and correcting these is your primary responsibility.

### Real Examples of Hallucinations in Our Data

**1. Suspiciously Specific Dates**
> "Meta AI... was founded on December 11, 2015"
> "Safe Superintelligence Inc... founded on June 19, 2024"

These hyper-specific founding dates are often invented. Verify against primary sources.

**2. Fabricated Dollar Amounts**
> "Leopold Aschenbrenner... Founded $5.5 billion hedge fund"
> "Daniel Kokotajlo... costing him approximately $2 million in equity"

Dollar figures are frequently hallucinated. Always verify financial claims.

**3. Unverifiable Awards/Lists**
> "Latanya Sweeney was named to Time magazine's 2025 list of the 100 most influential people in AI"

Did this list actually exist? Was she actually on it? Verify before keeping.

**4. Future Events Stated as Fact**
> "Jensen Huang: In January 2026 stated 'I think we've achieved AGI' on Lex Fridman podcast"

If you see dates that seem suspiciously recent or future, verify the event actually happened.

**5. Vague Partnership Claims**
> "International Association for Safe and Ethical AI... has become a trusted partner of OECD, United Nations, European Union"

What does "trusted partner" mean? Is there an actual formal partnership? These vague claims often inflate an entity's importance.

### How to Spot Hallucinations

| Red Flag | Example | Action |
|----------|---------|--------|
| Hyper-specific dates | "Founded March 17, 2023" | Verify against official source |
| Round dollar amounts | "$5.5 billion", "$2 million" | Find the actual figure or remove |
| Superlatives | "world's leading", "most influential" | Remove unless directly quoted |
| Future dates | Events in 2026, 2027 | Check if this actually happened |
| Vague prestige claims | "partnered with UN" | Find evidence of formal relationship |
| Citation references | [6,7,9] in notes | These are formatting artifacts to clean up |

### Your Responsibility

When you encounter a claim you cannot verify:
1. **Remove it** — Better to have less information than false information
2. **Flag it** — Note in your deliverable that you removed an unverifiable claim
3. **Replace it** — If you can find the correct information, use that instead

---

## KNOWN ISSUE (Out of Scope for Trial): Entities That Don't Belong

Some entities in the database may not belong at all:
- **Not AI-relevant**: Companies that merely *use* AI rather than shape AI policy
- **Duplicates**: Same entity entered under different names
- **Too peripheral**: Minor figures with no real influence on AI policy
- **International-only**: No meaningful U.S. presence or influence

If you encounter entities that seem like they shouldn't be in the database, note them in your "Issues Surfaced" section — but **don't spend trial time auditing for removals**. This will be part of the larger engagement.

---

## SECOND ISSUE: Insufficient Notes

**Every entity needs to be examined.** Even entities that have notes often have:
- Too little information (1 sentence when 2-4 would be appropriate)
- Missing key context (role in AI policy, key affiliations, why they matter)
- Outdated information that needs refreshing
- No mention of their actual relevance to AI policy

The notes should answer: **"Why does this person/org/resource matter to the U.S. AI policy landscape?"**

### What Good Notes Look Like

**Important:** Notes are public-facing. Write clean prose WITHOUT inline citations like [1], [2], [6,7]. Source URLs go in the separate `notes_sources` field, not embedded in the text.

**Bad (too thin):**
> "Jennifer Pahlka is the founder of Code for America."

**Good (comprehensive):**
> "Jennifer Pahlka founded Code for America in 2009 and served as U.S. Deputy Chief Technology Officer under President Obama (2013-2014). Her 2023 book 'Recoding America' critiques federal technology procurement and has influenced AI governance discussions around government AI adoption. She advocates for iterative, human-centered approaches to public sector technology deployment."

---

## Exemplary Entries (What Excellence Looks Like)

Below are examples of well-filled entities in the exact JSON format matching `entities.json` and `edges.json`.

### Person Example: Dario Amodei

```json
{
  "id": 50,
  "entity_type": "person",
  "name": "Dario Amodei",
  "title": "CEO and Co-founder",
  "category": "Executive",
  "other_categories": "Researcher",
  "primary_org": "Anthropic",
  "other_orgs": "Former VP Research at OpenAI (2016-2020), Former Senior Research Scientist at Google Brain (2015-2016), Postdoctoral scholar at Stanford University School of Medicine",
  "location": "San Francisco, CA",
  "influence_type": "Decision-maker, Builder, Researcher/analyst, Narrator",
  "twitter": "@DarioAmodei",
  "bluesky": "@darioamodei.bsky.social",
  "notes": "Dario Amodei (born 1983) is an American AI researcher and entrepreneur who co-founded Anthropic in 2021 with his sister Daniela Amodei. He previously served as Vice President of Research at OpenAI, where he led development of GPT-2 and GPT-3. Amodei earned his PhD in biophysics from Princeton University as a Hertz Fellow. He advocates for 'responsible scaling' with mandatory pre-deployment safety testing and has testified before the Senate supporting AI disclosure requirements. In 2025, Time magazine listed him among the 100 most influential people.",
  "notes_sources": [
    "https://www.anthropic.com/company",
    "https://time.com/collection/time100-ai-2025/",
    "Senate Judiciary Committee testimony, July 2023"
  ],
  "thumbnail_url": null,
  "belief_regulatory_stance": "Targeted",
  "belief_regulatory_stance_detail": "Advocates for 'responsible scaling' policies requiring safety evaluations before deploying more capable models. Testified before Senate supporting mandatory disclosure requirements while opposing broad restrictions on AI development.",
  "belief_evidence_source": "Explicitly stated",
  "belief_agi_timeline": "2-3 years",
  "belief_ai_risk": "Existential",
  "belief_threat_models": "Loss of control, Power concentration, Weapons proliferation, Cybersecurity, Bioterrorism, Economic inequality, Democratic erosion, Labor displacement"
}
```

**Example edges for Dario Amodei:**

```json
[
  {
    "source_id": 50,
    "target_id": 100,
    "edge_type": "employed_by",
    "role": "CEO and Co-founder",
    "is_primary": true,
    "start_date": "2021",
    "end_date": null,
    "evidence": "Dario Amodei is CEO and co-founder of Anthropic",
    "source_url": "https://www.anthropic.com/company",
    "source_name": "Dario Amodei",
    "source_entity_type": "person",
    "target_name": "Anthropic",
    "target_entity_type": "organization"
  },
  {
    "source_id": 50,
    "target_id": 101,
    "edge_type": "employed_by",
    "role": "Vice President of Research",
    "is_primary": false,
    "start_date": "2016",
    "end_date": "2020",
    "evidence": "Previously served as Vice President of Research at OpenAI",
    "source_url": "https://www.anthropic.com/company",
    "source_name": "Dario Amodei",
    "source_entity_type": "person",
    "target_name": "OpenAI",
    "target_entity_type": "organization"
  },
  {
    "source_id": 50,
    "target_id": 51,
    "edge_type": "co_founded_with",
    "role": null,
    "is_primary": false,
    "start_date": "2021",
    "end_date": null,
    "evidence": "Co-founded Anthropic in 2021 with his sister Daniela Amodei",
    "source_url": "https://www.anthropic.com/company",
    "source_name": "Dario Amodei",
    "source_entity_type": "person",
    "target_name": "Daniela Amodei",
    "target_entity_type": "person"
  }
]
```

---

### Organization Example: Anthropic

```json
{
  "id": 100,
  "entity_type": "organization",
  "name": "Anthropic",
  "title": null,
  "category": "Frontier Lab",
  "other_categories": "AI Safety/Alignment",
  "primary_org": null,
  "other_orgs": null,
  "website": "https://www.anthropic.com",
  "funding_model": "Venture-backed",
  "parent_org_id": null,
  "location": "San Francisco, CA",
  "influence_type": "Decision-maker, Builder, Researcher/analyst",
  "twitter": "@AnthropicAI",
  "bluesky": null,
  "notes": "Anthropic is an AI safety company founded in 2021 by former OpenAI leaders Dario and Daniela Amodei. The company developed Constitutional AI methodology and the Claude family of language models. Structured as a Public Benefit Corporation, Anthropic raised over $7 billion in funding. The company maintains 'responsible scaling' policies requiring safety evaluations before deploying more capable models.",
  "notes_sources": [
    "https://www.anthropic.com/company",
    "https://www.anthropic.com/news/anthropics-responsible-scaling-policy"
  ],
  "thumbnail_url": null,
  "belief_regulatory_stance": "Moderate",
  "belief_regulatory_stance_detail": "Supports mandatory safety evaluations and transparency requirements while advocating for targeted rather than broad restrictions.",
  "belief_evidence_source": "Explicitly stated",
  "belief_agi_timeline": "5-10 years",
  "belief_ai_risk": "Serious",
  "belief_threat_models": "Loss of control, Weapons proliferation, Cybersecurity, Misinformation"
}
```

**Example edges for Anthropic:**

```json
[
  {
    "source_id": 100,
    "target_id": 101,
    "edge_type": "spun_out_from",
    "role": null,
    "is_primary": false,
    "start_date": "2021",
    "end_date": null,
    "evidence": "Founded by former OpenAI leaders who left to start Anthropic",
    "source_url": "https://www.anthropic.com/company",
    "source_name": "Anthropic",
    "source_entity_type": "organization",
    "target_name": "OpenAI",
    "target_entity_type": "organization"
  },
  {
    "source_id": 100,
    "target_id": 200,
    "edge_type": "funded_by",
    "role": null,
    "is_primary": false,
    "start_date": "2023",
    "end_date": null,
    "evidence": "Google invested $300 million in Anthropic",
    "source_url": "https://www.wsj.com/articles/google-invests-300-million-in-ai-startup-anthropic",
    "source_name": "Anthropic",
    "source_entity_type": "organization",
    "target_name": "Google",
    "target_entity_type": "organization"
  }
]
```

---

### Resource Example: Computing Power and the Governance of AI

```json
{
  "id": 500,
  "entity_type": "resource",
  "name": null,
  "title": null,
  "category": null,
  "other_categories": null,
  "primary_org": null,
  "other_orgs": null,
  "website": null,
  "funding_model": null,
  "parent_org_id": null,
  "location": null,
  "influence_type": null,
  "twitter": null,
  "bluesky": null,
  "notes": "This GovAI paper established the theoretical foundation for compute governance, arguing that controlling access to AI training compute offers a practical regulatory mechanism. Cited extensively in EU AI Act discussions and U.S. export control debates. The authors propose a framework where compute thresholds trigger reporting requirements, safety evaluations, and potential licensing.",
  "notes_sources": [
    "https://arxiv.org/abs/2402.08797"
  ],
  "thumbnail_url": null,
  "belief_regulatory_stance": "Moderate",
  "belief_regulatory_stance_detail": null,
  "belief_evidence_source": null,
  "belief_agi_timeline": null,
  "belief_ai_risk": null,
  "belief_threat_models": null,
  "resource_title": "Computing Power and the Governance of Artificial Intelligence",
  "resource_category": "AI Policy",
  "resource_author": "Lennart Heim et al.",
  "resource_type": "Academic Paper",
  "resource_url": "https://arxiv.org/abs/2402.08797",
  "resource_year": "2024",
  "resource_key_argument": "Compute is a uniquely effective lever for AI governance because it is detectable, excludable, and quantifiable — making it more suitable for regulation than data or algorithms, which are easily copied and concealed."
}
```

**Example edges for the resource:**

```json
[
  {
    "source_id": 500,
    "target_id": 300,
    "edge_type": "authored_by",
    "role": null,
    "is_primary": true,
    "start_date": null,
    "end_date": null,
    "evidence": "Lead author of the paper",
    "source_url": "https://arxiv.org/abs/2402.08797",
    "source_name": "Computing Power and the Governance of Artificial Intelligence",
    "source_entity_type": "resource",
    "target_name": "Lennart Heim",
    "target_entity_type": "person"
  },
  {
    "source_id": 500,
    "target_id": 301,
    "edge_type": "published_by",
    "role": null,
    "is_primary": false,
    "start_date": null,
    "end_date": null,
    "evidence": "Published by GovAI",
    "source_url": "https://arxiv.org/abs/2402.08797",
    "source_name": "Computing Power and the Governance of Artificial Intelligence",
    "source_entity_type": "resource",
    "target_name": "Centre for the Governance of AI (GovAI)",
    "target_entity_type": "organization"
  }
]
```

---

## Supplementary Documentation

You will receive **DATABASE.md** — a comprehensive reference document covering:
- Full database schema (all 3 tables: entity, submission, edge)
- All form field options with descriptions
- Field mappings (form → database → frontend)
- All edge types and their definitions
- Belief score scales (regulatory stance 1-7, timeline 1-5, risk 1-5)

Refer to DATABASE.md when you need to understand specific field options or data structure.

---

## Other Data Quality Issues

### 1. Missing Notes (710 entities)
- **373 people** have no notes at all
- **260 organizations** have no notes at all
- **77 resources** have no notes at all

### 2. Poor Org Nesting (680 of 734 orgs have no parent)
Many orgs should be nested under parent organizations:
- "OpenAI Safety" → parent: OpenAI
- "Google DeepMind" → parent: Alphabet/Google
- "Stanford HAI" → parent: Stanford University
- "RAND AI Policy" → parent: RAND Corporation

### 3. Missing Edges
People need connections to their organizations (`employed_by`, `founded`, `board_member`). Organizations need connections to funders, partners, and subsidiaries.

### 4. Adding New Entities

We need new entities added across ALL categories — not just sparse ones. The map should comprehensively cover the U.S. AI policy landscape.

**Current counts (for reference):**

| People | Count | | Organizations | Count |
|--------|-------|---|---------------|-------|
| Policymaker | 148 | | Academic | 166 |
| Executive | 146 | | AI Safety/Alignment | 145 |
| Researcher | 138 | | Government/Agency | 93 |
| Academic | 134 | | VC/Capital/Philanthropy | 87 |
| Organizer | 68 | | Think Tank/Policy Org | 70 |
| Investor | 36 | | Deployers & Platforms | 46 |
| Journalist | 25 | | Media/Journalism | 30 |
| Cultural figure | 14 | | Labor/Civil Society | 27 |
| | | | Frontier Lab | 24 |
| | | | Ethics/Bias/Rights | 21 |
| | | | Infrastructure & Compute | 13 |
| | | | Political Campaign/PAC | 12 |

**Resources (161 total):** AI Safety (86), AI Policy (57), then very sparse elsewhere.

**Priority areas** (but add to any category where you see gaps):
- Journalists covering AI (only 25)
- Cultural figures shaping public discourse (only 14)
- Political campaigns/PACs focused on AI (only 12)
- Infrastructure & compute companies (only 13)
- Resources on labor, national security, policy proposals

---

## Scope Rules

### This is a U.S. AI Policy Map
Only add entities that **actively shape the U.S. AI ecosystem**:
- YES: Researchers, executives, policymakers working on AI
- YES: Organizations building, funding, regulating, or advocating about AI
- YES: Resources (papers, articles, books) about AI policy, safety, governance
- NO: Companies that merely *use* AI (e.g., a retailer using AI recommendations)
- NO: International-only entities with no U.S. presence or influence

### Avoid Redundant Entities
Before adding a new entity, search the database for:
- Alternate names ("a16z" = "Andreessen Horowitz")
- Subsidiaries that should be nested, not separate
- Already-existing entries with slight spelling variations

---

## Edge Structure

Edges connect entities and represent relationships. Each edge has a **direction**: source → target.

| Field | Required | Description |
|-------|----------|-------------|
| `source_id` | Yes | Entity the edge comes FROM |
| `target_id` | Yes | Entity the edge goes TO |
| `edge_type` | Yes | Type of relationship (see below, or create custom) |
| `role` | No | Role/title (e.g., "CEO", "Board Member") |
| `start_date` | No | When relationship began (YYYY or YYYY-MM) |
| `end_date` | No | When it ended (NULL = ongoing) |
| `is_primary` | No | Is this the person's main affiliation? |

**Direction matters:**
- `Sam Altman` → `OpenAI` with type `employed_by` means "Sam is employed by OpenAI"
- `Anthropic` → `OpenAI` with type `spun_out_from` means "Anthropic spun out from OpenAI"
- For symmetric relationships like `collaborator` or `partner_of`, we typically create edges in both directions

### Standard Edge Types

**Person → Organization:**
- `employed_by` — Current or past employment
- `founded` — Founded the organization
- `advises` — Advisory role
- `board_member` — Board membership
- `invested_in` — Investment relationship
- `affiliated` — General affiliation

**Person → Person:**
- `co_founded_with` — Co-founded something together
- `collaborator` — Collaboration
- `mentor_of` / `mentored_by` — Mentorship
- `former_colleague` — Past colleagues
- `critic_of` / `supporter_of` — Public stance

**Organization → Organization:**
- `subsidiary_of` — Parent/child relationship
- `funded_by` — Receives funding from
- `partner_of` — Partnership
- `spun_out_from` — Spinoff origin
- `affiliated` — General affiliation

### Custom Edge Types
If none of the standard types fit, you can propose a custom edge type:
```
Edge: [Source] → [Target]
Type: [your_custom_type]
Definition: [what this edge type means]
```

### Temporal Edges
For relationships with clear start/end dates, include them:
```
Sam Altman → OpenAI
  Type: employed_by
  Role: CEO
  Start: 2019
  End: ongoing
```

```
Sam Altman → Y Combinator
  Type: employed_by
  Role: President
  Start: 2014
  End: 2019
```

---

## Deliverable Format

Submit your work as **JSON** (recommended). We'll provide template files.

JSON is preferred because:
- Notes are multi-line prose — JSON handles this cleanly
- Sources are arrays — no need to flatten to semicolons
- Each entity type has different fields — only include what's relevant

CSV is acceptable if you strongly prefer spreadsheets.

### Entity JSON Templates

**Person** (matches `entities.json` format):
```json
{
  "id": 123,
  "entity_type": "person",
  "name": "Full Name",
  "title": "Job Title",
  "category": "Executive",
  "other_categories": "Researcher, Investor",
  "primary_org": "Main Organization",
  "other_orgs": "Other affiliations with context",
  "location": "City, State",
  "influence_type": "Decision-maker, Builder",
  "twitter": "@handle",
  "bluesky": "@handle.bsky.social",
  "notes": "2-4 sentences of clean prose. No inline citations like [1] or [2]. Write naturally about why this person matters to AI policy.",
  "notes_sources": ["https://example.com/source1", "Senate testimony, July 2023"],
  "belief_regulatory_stance": "Moderate",
  "belief_regulatory_stance_detail": "Evidence or quote supporting this",
  "belief_evidence_source": "Explicitly stated",
  "belief_agi_timeline": "5-10 years",
  "belief_ai_risk": "Serious",
  "belief_threat_models": "Loss of control, Power concentration",
  "_verification": {
    "issues_found": "What problems you found in the original data",
    "notes": "How you verified or corrected claims"
  }
}
```

**Organization** (matches `entities.json` format):
```json
{
  "id": 456,
  "entity_type": "organization",
  "name": "Org Name",
  "category": "Frontier Lab",
  "other_categories": "AI Safety/Alignment",
  "website": "https://example.com",
  "funding_model": "Venture-backed",
  "parent_org_id": null,
  "location": "San Francisco, CA",
  "influence_type": "Builder, Researcher/analyst",
  "twitter": "@handle",
  "bluesky": "@handle",
  "notes": "2-4 sentences about why this org matters to AI policy.",
  "notes_sources": ["source 1", "source 2"],
  "belief_regulatory_stance": "Targeted",
  "belief_regulatory_stance_detail": "Evidence",
  "belief_evidence_source": "Inferred",
  "belief_agi_timeline": "2-3 years",
  "belief_ai_risk": "Catastrophic",
  "belief_threat_models": "Loss of control, Bioterrorism"
}
```

**Resource** (matches `entities.json` format):
```json
{
  "entity_type": "resource",
  "resource_title": "Title of the Resource",
  "resource_author": "Author Name(s)",
  "resource_category": "AI Policy",
  "resource_type": "Academic Paper",
  "resource_url": "https://example.com/paper",
  "resource_year": "2024",
  "resource_key_argument": "1-2 sentences summarizing the main argument.",
  "notes": "Why this resource matters, who it influenced.",
  "notes_sources": ["source 1", "source 2"],
  "belief_regulatory_stance": "Moderate",
  "belief_agi_timeline": null,
  "belief_ai_risk": "Serious"
}
```

**Format notes:**
- `id`: Include for updates, omit for new entities
- `notes`: Public-facing — NO inline citations like [1], [2]
- `notes_sources`: Array of URLs or citations (we'll convert to JSON string for DB)
- `other_categories`, `belief_threat_models`, `influence_type`: Comma-separated strings
- `_verification`: Your notes for our review (not stored in DB)
- People don't have `website`, `funding_model`, `parent_org_id`, or `resource_*` fields
- Resources don't have `primary_org`, `other_orgs`, `influence_type`, etc.

### Edge JSON Template (matches `edges.json` format)

```json
{
  "source_id": 123,
  "target_id": 456,
  "edge_type": "employed_by",
  "role": "CEO",
  "is_primary": true,
  "start_date": "2019",
  "end_date": null,
  "evidence": "Exact quote from source proving this relationship",
  "source_url": "https://example.com",
  "source_name": "Sam Altman",
  "source_entity_type": "person",
  "target_name": "OpenAI",
  "target_entity_type": "organization"
}
```

**Edge direction:** Edges flow FROM source TO target:
- "Sam Altman employed_by OpenAI" → source: Sam Altman, target: OpenAI
- "Google invested_in Anthropic" → source: Google, target: Anthropic

**Format notes:**
- `source_id`/`target_id`: Include if you know the ID from `entities.json`, otherwise we'll match by name
- `source_name`/`target_name`: Entity names (for readability, helps us match)
- `source_entity_type`/`target_entity_type`: `person`, `organization`, or `resource`
- `start_date`/`end_date`: Optional — YYYY or YYYY-MM format, don't guess
- `evidence`: Exact quote proving this relationship
- `source_url`: URL or citation (e.g., "Senate testimony, July 2023")

**Note on dates:** Include when available, but don't guess. Many relationships won't have precise dates.

---

## Bonus: Surface Issues

If you notice systemic problems beyond what you can fix in this trial, document them:

```
## Issues Surfaced

### [Issue Title]
- **Scope:** How many entities affected?
- **Example:** [specific entity ID and problem]
- **Suggested fix:** [how to address this at scale]
```

Examples of issues worth surfacing:
- Categories of entities that seem systematically wrong
- Edge types that are being misused
- Patterns of hallucination (e.g., "all founding dates look suspicious")
- Entities that might be duplicates of each other
- Orgs that should be nested but aren't
- Missing major players in the AI policy space (any category)
- Entire organizations or people you expected to find but didn't

---

## Evaluation Criteria

| Criterion | Weight | What We're Looking For |
|-----------|--------|------------------------|
| **Accuracy** | 35% | No hallucinated facts. Claims verified against sources. Unverifiable claims removed. |
| **Thoroughness** | 25% | Actually checked claims, not just reformatted. Enriched thin notes meaningfully. |
| **Judgment** | 20% | Good choices about what to include/exclude. AI-relevance filtering. Appropriate skepticism. |
| **Issue Surfacing** | 10% | Identified systemic problems. Suggested improvements beyond the trial scope. |
| **Completeness** | 10% | All three tasks attempted with clear documentation. |

### Red Flags (automatic disqualification)
- Keeping unverified claims from original notes without checking
- Inventing facts not in sources
- Adding non-AI-relevant entities
- Creating duplicate entities without checking
- Sloppy sourcing (broken links, unreliable sources)
- Missing evidence for edges
- Just reformatting without verifying

### Green Flags (what impresses us)
- Catching and removing hallucinated claims
- Finding correct information to replace wrong information
- Noting uncertainty ("sources conflict on this date")
- Good temporal precision on edges when available
- Thoughtful custom edge types with clear definitions
- Surfacing systemic issues we hadn't noticed
- Suggesting entities we're missing (in any category, not just sparse ones)
- Adding high-quality new entities with proper sourcing

---

## Database Access

You'll be given read access to the database via an admin interface. For the trial:

**To find entities with notes to examine:**
Browse entities and look for thin notes, suspicious claims, or `[n]` citations

**To find entities without notes:**
Filter by `notes = empty`

**To search for existing entities:**
Use the search bar before adding anything new

**To check org nesting:**
Look at `parent_org_id` field — NULL means no parent assigned

---

## Reference: Field Options

### Person Categories (`category`)
Executive, Researcher, Policymaker, Investor, Organizer, Journalist, Academic, Cultural figure

### Organization Categories (`category`)
Frontier Lab, AI Safety/Alignment, Think Tank/Policy Org, Government/Agency, Academic, VC/Capital/Philanthropy, Labor/Civil Society, Ethics/Bias/Rights, Media/Journalism, Political Campaign/PAC, Infrastructure & Compute, Deployers & Platforms

### Resource Categories (`resource_category`)
AI Safety, AI Governance, AI Capabilities, Labor & Economy, National Security, Industry Analysis, Policy Proposal, Technical, Philosophy/Ethics

### Resource Types (`resource_type`)
Essay, Book, Report, Podcast, Video, Website, Academic Paper, News Article, Substack/Newsletter

### Funding Model (`funding_model`) — Organizations only
Venture-backed, Revenue-generating, Government-funded, Philanthropic, Membership/dues-based, Mixed, Public benefit corp, Self-funded/endowed, Other

### Regulatory Stance (`belief_regulatory_stance`)
| Value | Description |
|-------|-------------|
| Accelerate | Minimal/no regulation |
| Light-touch | Voluntary, self-governance |
| Targeted | Sector-specific rules, not broad R&D restrictions |
| Moderate | Mandatory safety evals + transparency |
| Restrictive | External oversight of compute, training runs |
| Precautionary | Pause/moratorium until governance catches up |
| Nationalize | Nationalize/public control |
| Mixed/unclear | No clear position |

### AGI Timeline (`belief_agi_timeline`)
Already here, 2-3 years, 5-10 years, 10-25 years, 25+ years or never, Unknown

### AI Risk Level (`belief_ai_risk`)
Overstated, Manageable, Serious, Catastrophic, Existential, Unknown

### Threat Models (`belief_threat_models`) — comma-separated
Loss of control, Power concentration, Labor displacement, Cybersecurity threats, Weapons proliferation, Misinformation/deepfakes, Economic inequality, Democratic erosion, Environmental harm, Existential risk

### Influence Type (`influence_type`) — comma-separated
Decision-maker, Researcher/analyst, Builder, Narrator, Connector/convener, Advisor/strategist, Funder/investor, Organizer/advocate, Implementer

### Evidence Source (`belief_evidence_source`)
Explicitly stated, Inferred

### Edge Types
**Person → Organization:** employed_by, founded, advises, board_member, invested_in, affiliated
**Person → Person:** co_founded_with, collaborator, mentor_of, mentored_by, former_colleague, critic_of, supporter_of
**Organization → Organization:** subsidiary_of, funded_by, partner_of, spun_out_from, affiliated
**Resource → Person/Org:** authored_by, published_by

---

## Submission

When complete, submit your markdown file documenting:
1. The 5 examined & fixed notes (Task 1)
2. The 3 enriched entities (Task 2)
3. The 3 edges + 1 new entity (Task 3)
4. Any issues surfaced (Bonus)

We'll review for accuracy, thoroughness, judgment, and issue-surfacing before discussing the full 30-hour engagement.

---

## Questions?

If anything is unclear, ask before starting. The trial is meant to assess your judgment and attention to detail — we'd rather you ask clarifying questions than make assumptions.
