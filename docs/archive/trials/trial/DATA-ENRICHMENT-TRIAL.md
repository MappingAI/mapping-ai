# Data Consultant: Trial Assignment

We're building an interactive map of the U.S. AI policy ecosystem — the people, organizations, and resources shaping how AI is governed in America. The data comes from a combination of manual research, web scraping, and AI-assisted enrichment, so data quality is a core challenge.

**Live site:** [mapping-ai.org](https://mapping-ai.org)

The database currently has **709 people**, **734 organizations**, and **161 resources**, connected by **2,228 edges** (relationships). Your role is to ensure our data is **accurate, well-sourced, comprehensive, and properly connected**.

---

## Table of Contents

1. [Your Tasks](#your-tasks)
2. [Quality Standards](#quality-standards)
3. [Exemplary Entries](#exemplary-entries)
4. [Deliverable Format](#deliverable-format)
5. [Evaluation Criteria](#evaluation-criteria)
6. [Bonus: Surface Issues](#bonus-surface-issues)
7. [Reference: Field Options](#reference-field-options)
8. [Database Access](#database-access)
9. [Submission](#submission)

---

## Your Tasks

Complete **all three tasks** below. This should take less than 30 minutes.

### Task 1: Examine & Fix 5 Entity Notes

Find 5 entities that have notes but need improvement. For each:
1. **Verify claims** — Check that stated facts are actually true
2. **Remove unverifiable claims** — Delete any facts you can't confirm against a reliable source
3. **Enrich if thin** — Add context about their AI policy relevance
4. **Clean formatting** — Remove `[n]` citation artifacts if present
5. **Fill missing fields** — Add any missing data you can verify

Choose a mix: some with obvious problems, some that look fine but need verification.

### Task 2: Enrich 3 Empty Entities

Find 3 entities with no notes. Provide COMPLETE data:
- All applicable fields filled (not just notes)
- 2-4 sentences explaining **why they matter to AI policy**
- **No unverified claims** — only include facts you can confirm with a source

### Task 3: Add 3 Edges + 1 New Entity

**Part A:** Add 3 new edges connecting existing entities
**Part B:** Add 1 new entity relevant to U.S. AI policy (search first to confirm it doesn't exist)

**Deliverable:** JSON for all tasks (see Deliverable Format section)

---

## Quality Standards

### The #1 Problem: Data Hallucinations

**Our database likely contains fabricated or inaccurate information.** Because the database was built through a combination of manual entry, web scraping, and AI-assisted enrichment, some entries include facts that cannot be verified or are demonstrably false. Identifying and correcting these is your primary responsibility.

**Real examples of hallucinations in our data:**

| Type | Example | Why It's Suspicious |
|------|---------|---------------------|
| Hyper-specific dates | "Meta AI... founded on December 11, 2015" | These are often invented. Verify against primary sources. |
| Fabricated dollar amounts | "Leopold Aschenbrenner... Founded $5.5 billion hedge fund" | Dollar figures are frequently hallucinated. |
| Unverifiable awards | "Named to Time magazine's 2025 list of 100 most influential people in AI" | Did this list exist? Were they on it? |
| Future events as fact | "In January 2027 stated 'I think we've achieved AGI'" | Verify the event actually happened. |
| Vague prestige claims | "has become a trusted partner of OECD, United Nations" | Vague language like "trusted partner" could mean anything from a formal MOU to attending a conference. Look for specific evidence of the relationship. |

**How to spot hallucinations:**

| Red Flag | Action |
|----------|--------|
| Hyper-specific dates | Verify against official source |
| Round dollar amounts | Find the actual figure or remove |
| Superlatives ("world's leading") | Remove unless directly quoted |
| Future dates | Check if this actually happened |
| Vague prestige claims | Find evidence of formal relationship |
| Citation references like [6,7,9] | Clean up — these are formatting artifacts |

**When you encounter a claim you cannot verify:**
1. **Remove it** — Better to have less information than false information
2. **Flag it** — Note in your deliverable that you removed an unverifiable claim
3. **Replace it** — If you can find the correct information, use that instead

### What Good Notes Look Like

Notes should answer: **"Why does this person/org/resource matter to the U.S. AI policy landscape?"**

**Important:** Notes are public-facing. Write clean prose WITHOUT inline citations like [1], [2], [6,7]. Source URLs go in the separate `notes_sources` field.

**Bad (too thin):**
> "Jennifer Pahlka is the founder of Code for America."

**Good (comprehensive):**
> "Jennifer Pahlka founded Code for America in 2009 and served as U.S. Deputy Chief Technology Officer under President Obama (2013-2014). Her 2023 book 'Recoding America' critiques federal technology procurement and has influenced AI governance discussions around government AI adoption. She advocates for iterative, human-centered approaches to public sector technology deployment."

### Scope: U.S. AI Policy Only

Only add entities that **actively shape the U.S. AI ecosystem**:
- ✓ Researchers, executives, policymakers working on AI
- ✓ Organizations building, funding, regulating, or advocating about AI
- ✓ Resources (papers, articles, books) about AI policy, safety, governance
- ✗ Companies that merely *use* AI (e.g., a retailer using AI recommendations)
- ✗ International-only entities with no U.S. presence or influence

Before adding a new entity, search the database for:
- Alternate names ("a16z" = "Andreessen Horowitz")
- Subsidiaries that should be nested, not separate
- Existing entries with slight spelling variations

### Out of Scope for Trial: Entities That Don't Belong

Some entities in the database may not belong at all (not AI-relevant, duplicates, too peripheral, international-only). If you encounter these, note them in your "Issues Surfaced" section — but **don't spend trial time auditing for removals**. This will be part of the larger engagement.

---

## Exemplary Entries

Below are examples of well-filled entities in the exact JSON format matching `entities.json` and `edges.json`.

**Note:** The IDs shown below are illustrative. Look up actual entity IDs in `entities.json` when creating edges.

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
  "belief_threat_models": "Loss of control, Existential risk, Weapons"
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
  "belief_threat_models": "Loss of control, Weapons, Misinformation"
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

## Deliverable Format

Submit **3 separate JSON files**:

**`task1-fixes.json`** — Array of 5 entities you examined and fixed:
```json
[
  { /* entity 1 with _verification */ },
  { /* entity 2 with _verification */ },
  ...
]
```

**`task2-enrichments.json`** — Array of 3 entities you enriched from empty:
```json
[
  { /* entity 1 with _verification */ },
  { /* entity 2 with _verification */ },
  { /* entity 3 with _verification */ }
]
```

**`task3-additions.json`** — Object with edges and new entity:
```json
{
  "edges": [
    { /* edge 1 */ },
    { /* edge 2 */ },
    { /* edge 3 */ }
  ],
  "new_entity": { /* your new entity */ }
}
```

Optionally include an **`issues.md`** file if you surface systemic issues.

### Entity JSON Templates

**Person:**
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

**Organization:**
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
  "belief_threat_models": "Loss of control, Weapons"
}
```

**Resource:**
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
- `notes_sources`: Array of URLs or citations
- `other_categories`, `belief_threat_models`, `influence_type`: Comma-separated strings
- `_verification`: Your notes for our review (not stored in DB)

### Edge JSON Template

Edges connect entities and represent relationships. Each edge has a **direction**: source → target.

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

**Edge fields:**

| Field | Required | Description |
|-------|----------|-------------|
| `source_id` | Yes* | Entity the edge comes FROM |
| `target_id` | Yes* | Entity the edge goes TO |
| `edge_type` | Yes | Type of relationship (see Reference section) |
| `role` | No | Role/title (e.g., "CEO", "Board Member") |
| `start_date` | No | When relationship began (YYYY or YYYY-MM) |
| `end_date` | No | When it ended (NULL = ongoing) |
| `is_primary` | No | Is this the person's main/current affiliation? (see below) |
| `evidence` | Yes | Quote or description proving this relationship |
| `source_url` | Yes | URL or citation (e.g., "Senate testimony, July 2023") |

*If you don't know the ID, include `source_name`/`target_name` and we'll match.

**`is_primary` explained:**
- `true` = This is the person's primary, current affiliation (their main job)
- `false` = Secondary affiliation (advisory roles, board seats, past positions, part-time)
- Example: Eliezer Yudkowsky has `is_primary: true` for MIRI (his main org) but `is_primary: false` for advisory roles elsewhere

**Direction matters:**
- "Sam Altman employed_by OpenAI" → source: Sam Altman, target: OpenAI
- "Anthropic funded_by Google" → source: Anthropic, target: Google
- For symmetric relationships like `collaborator`, create edges in both directions

**Note on dates:** Include when available, but don't guess. Many relationships won't have precise dates.

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
- Suggesting entities we're missing
- Adding high-quality new entities with proper sourcing

---

## Bonus: Surface Issues

If you notice systemic problems beyond what you can fix in this trial, document them:

```markdown
## Issues Surfaced

### [Issue Title]
- **Scope:** How many entities affected?
- **Example:** [specific entity ID and problem]
- **Suggested fix:** [how to address this at scale]
```

Examples worth surfacing:
- Categories of entities that seem systematically wrong
- Patterns of hallucination
- Entities that might be duplicates
- Orgs that should be nested but aren't
- Missing major players you expected to find

---

## Reference: Field Options

### Person Categories (`category`) — pick ONE
Executive, Researcher, Policymaker, Investor, Organizer, Journalist, Academic, Cultural figure

### Organization Categories (`category`) — pick ONE
Frontier Lab, AI Safety/Alignment, Think Tank/Policy Org, Government/Agency, Academic, VC/Capital/Philanthropy, Labor/Civil Society, Ethics/Bias/Rights, Media/Journalism, Political Campaign/PAC, Infrastructure & Compute, Deployers & Platforms

### Other Categories (`other_categories`) — pick ANY, comma-separated
Use any category from the lists above as secondary categories. Example: `"Researcher, Investor"`

### Resource Categories (`resource_category`) — pick ONE
AI Safety, AI Governance, AI Capabilities, Labor & Economy, National Security, Industry Analysis, Policy Proposal, Technical, Philosophy/Ethics

### Resource Types (`resource_type`) — pick ONE
Essay, Book, Report, Podcast, Video, Website, Academic Paper, News Article, Substack/Newsletter

### Funding Model (`funding_model`) — pick ONE, Organizations only
Venture-backed, Revenue-generating, Government-funded, Philanthropic, Membership/dues-based, Mixed, Public benefit corp, Self-funded/endowed, Other

### Regulatory Stance (`belief_regulatory_stance`) — pick ONE
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

### AGI Timeline (`belief_agi_timeline`) — pick ONE
Already here, 2-3 years, 5-10 years, 10-25 years, 25+ years or never, Unknown

### AI Risk Level (`belief_ai_risk`) — pick ONE
Overstated, Manageable, Serious, Catastrophic, Existential, Unknown

### Threat Models (`belief_threat_models`) — pick up to 3, comma-separated
Loss of control, Power concentration, Labor displacement, Cybersecurity, Weapons, Misinformation, Economic inequality, Democratic erosion, Environmental, Existential risk, Copyright/IP

### Influence Type (`influence_type`) — pick ANY, comma-separated
Decision-maker, Researcher/analyst, Builder, Narrator, Connector/convener, Advisor/strategist, Funder/investor, Organizer/advocate, Implementer

### Evidence Source (`belief_evidence_source`) — pick ONE
Explicitly stated, Inferred

### Edge Types — pick ONE per edge
**Person → Organization:** employed_by, founded, advises, board_member, invested_in, affiliated
**Person → Person:** co_founded_with, collaborator, mentor_of, mentored_by, former_colleague, critic_of, supporter_of
**Organization → Organization:** subsidiary_of, funded_by, partner_of, spun_out_from, affiliated
**Resource → Person/Org:** authored_by, published_by

Custom edge types: If none fit, propose your own with a clear definition.

---

## Database Access

You'll receive two files:
- **`entities.json`** — All 1,604 entities (people, organizations, resources) with their current data
- **`edges.json`** — All 2,228 edges (relationships between entities)

**Important:** This data is a work in progress. Because it was assembled through a mix of manual research, web scraping, and AI-assisted enrichment, it contains unverified claims, thin notes, missing fields, formatting artifacts like `[1,2,3]`, and inconsistent values. Don't assume existing data is correct — verify everything you work with.

**To find entities with notes to examine:** Browse and look for thin notes, suspicious claims, or `[n]` citation artifacts

**To find entities without notes:** Filter by empty `notes` field

**To search for existing entities:** Search by name before adding anything new

**To check org nesting:** Look at `parent_org_id` field — NULL means no parent assigned

---

## Submission

Submit exactly these files:

| File | Contents | Required |
|------|----------|----------|
| `task1-fixes.json` | Array of 5 entities you examined and fixed (include `_verification` for each) | Yes |
| `task2-enrichments.json` | Array of 3 entities you enriched from empty (include `_verification` for each) | Yes |
| `task3-additions.json` | Object with `edges` array (3 edges) and `new_entity` object | Yes |
| `issues.md` | Systemic issues you noticed beyond the trial scope | Optional |

**Checklist before submitting:**
- [ ] All 3 required JSON files included
- [ ] task1 has exactly 5 entities with `_verification` explaining what you fixed
- [ ] task2 has exactly 3 entities with `_verification` explaining your sources
- [ ] task3 has exactly 3 edges and 1 new entity
- [ ] All edges have `evidence` and `source_url`
- [ ] No inline citations like [1], [2] in notes (sources go in `notes_sources`)
- [ ] JSON is valid (no syntax errors)

We'll review for accuracy, thoroughness, and judgment before discussing the full engagement.

---

## Questions?

If anything is unclear, ask before starting. We'd rather you ask clarifying questions than make assumptions.
