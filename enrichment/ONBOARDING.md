# Data Enrichment Onboarding

Welcome to the Mapping AI data enrichment project. This document covers everything you need to get started.

---

## Core Priorities

You're not just cleaning data — you're building a foundation we can trust and extend. These are the priorities that matter most:

### 1. Ground Truthing & Accuracy

**The database contains hallucinations. Finding and fixing them is job #1.**

- Verify every claim you touch against a reliable source
- Remove unverifiable information — less data is better than false data
- Keep formatting clean (no `[n]` citation artifacts, proper field values)
- When adding edges, ensure both entities exist and are correctly enriched
- Remember: edges create entities — when you add a relationship to someone not in the DB, you need to create and enrich that entity too

### 2. Replicability & Documentation

**Your process is as valuable as the data.**

A year from now, someone else (or you) should be able to:
- **Understand exactly what you did** — Every decision documented
- **Re-run your entire process** — Scripts work, dependencies listed
- **Verify your changes** — Before/after comparisons, source citations
- **Extend your work** — Build on your foundation for future enrichment

This means: commit early and often, comment your code explaining *why*, keep logs of manual decisions, treat your LaTeX difference charts as deliverables.

### 3. Data Seeding & Coverage

**Fill the gaps systematically.**

- Add executive teams for major orgs (Frontier Labs, Big Tech, key agencies)
- Ensure balanced coverage across all stakeholder categories
- When you add an entity, add their key relationships too
- Prioritize entities that connect to many others — they have outsized value

### 4. Surfacing Issues

**Tell us what you find.**

- Document new issues as you discover them
- Communicate proactively when patterns affect many entities
- Ask when you're uncertain about a judgment call
- Propose schema changes if the current structure doesn't fit reality

---

## Table of Contents

1. [Core Priorities](#core-priorities)
2. [Project Overview](#project-overview)
3. [Your Workspace](#your-workspace)
4. [Database Access](#database-access)
5. [Your Tasks](#your-tasks)
6. [Seeding Strategy](#seeding-strategy)
7. [Quality Standards](#quality-standards)
8. [Documentation Requirements](#documentation-requirements)
9. [Workflow](#workflow)
10. [Reference: Schema & Field Options](#reference-schema--field-options)

---

## Project Overview

We're building an interactive map of the U.S. AI policy ecosystem — the people, organizations, and resources shaping how AI is governed in America.

**Live site:** [mapping-ai.org](https://mapping-ai.org)

**Current database:**
- ~1,670 entities (709 people, 734 organizations, 161 resources)
- ~2,228 edges (relationships)
- 44% of entities have empty or thin notes
- 100% of edges lack source URLs

Your role is to systematically improve data quality across the entire database.

---

## Your Workspace

### Git Branch: `connor/data-processing`

**CRITICAL:** You must work ONLY on this branch.

```bash
git checkout connor/data-processing
```

**Why this matters:**
- Merges to `main` trigger automatic deployment to the public site
- Your work should be reviewed before going live
- This branch is isolated — you can experiment safely

**Never run:**
```bash
git checkout main
git merge connor/data-processing  # NO — we will do this after review
git push origin main              # NO — triggers public deploy
```

### Folder Structure

All your work goes in `/enrichment/`:

```
enrichment/
├── ONBOARDING.md          # This document
├── scripts/               # Your processing scripts (Python, Node, etc.)
├── latex/                 # Your difference charts and analysis docs
├── output/                # Generated JSON files for review
│   ├── fixes/             # Entity corrections
│   ├── enrichments/       # Empty entity completions
│   ├── additions/         # New entities and edges
│   └── batch-updates/     # Bulk operations (citation cleanup, etc.)
└── logs/                  # Processing logs, verification notes
```

Create these folders as needed.

---

## Database Access

You have **read-write access** to a staging database that mirrors production.

### Connection Details

```
Host:     mapping-ai-db.c9sccou2k3xe.eu-west-2.rds.amazonaws.com
Port:     5432
Database: mapping_ai_staging
User:     connor_staging
Password: [sent separately — do not commit to git]
SSL:      Required (rejectUnauthorized: false)
```

**Connection string format:**
```
postgresql://connor_staging:PASSWORD@mapping-ai-db.c9sccou2k3xe.eu-west-2.rds.amazonaws.com:5432/mapping_ai_staging?sslmode=require
```

**NEVER commit your password to git.** Store it in a local `.env` file that's gitignored, or use environment variables.

### Important Notes

1. **This is a staging copy** — changes here do NOT affect the public site
2. **Test your scripts here** — verify they work before we apply to production
3. **Production database name is `mappingai`** — you do NOT have access to it

### Tables

| Table | Description |
|-------|-------------|
| `entity` | All people, organizations, and resources |
| `edge` | Relationships between entities |
| `submission` | User submissions (less relevant for your work) |

### Quick Queries

```sql
-- Count by type
SELECT entity_type, COUNT(*) FROM entity GROUP BY entity_type;

-- Entities with empty notes
SELECT id, name, entity_type FROM entity WHERE notes IS NULL OR notes = '';

-- Edges missing source URLs
SELECT COUNT(*) FROM edge WHERE source_url IS NULL;

-- Orphan entities (no edges)
SELECT e.id, e.name, e.entity_type
FROM entity e
LEFT JOIN edge src ON e.id = src.source_id
LEFT JOIN edge tgt ON e.id = tgt.target_id
WHERE src.id IS NULL AND tgt.id IS NULL;
```

---

## Your Tasks

Your trial work identified 12 data quality issues. Now apply that same rigor to the entire database.

### Priority Order

1. **Fix citation artifacts** — Strip `[n]`, `[n,n]` patterns from all notes
2. **Fix hallucinated/incorrect data** — Verify and correct entries like you did in the trial
3. **Enrich empty entities** — Prioritize those with existing edges
4. **Add source URLs to edges** — Currently 0% have sources
5. **Connect orphan entities** — 254 entities have zero edges
6. **Normalize edge types** — Fix non-standard types (`person_organization` → `employed_by`, etc.)
7. **Seed missing key entities** — See Seeding Strategy below

### The Cascade Effect: Edges Create Entities

**This is important:** As you enrich data and add edges, you will inevitably reference entities that don't yet exist in the database.

Example: You're enriching OpenAI and want to add an edge "Sam Altman employed_by OpenAI". But wait — is Sam Altman in the database? What about his board seat at Reddit? His connection to Y Combinator?

**The workflow:**
1. You add an edge referencing a new entity (person, org, or resource)
2. That entity now needs to be created and enriched
3. That entity has its own relationships that need edges
4. Those edges may reference more entities...

**How to handle this:**
- Keep a running list of entities you need to create
- Batch similar entities (all OpenAI leadership, all a16z partners, etc.)
- Don't create stub entries — if you create an entity, enrich it properly
- Use `source_name` and `target_name` in your edge JSON when you don't have the ID yet

This cascade is expected. It's how the graph grows. Just be systematic about tracking what needs to be done.

### Executing on Your Trial Issues

In your trial, you identified 12 systemic issues. Now execute on them:

| Issue | Action |
|-------|--------|
| 1. Citation artifacts `[n]` in notes | Regex sweep, then manual review |
| 2. `notes_sources` as JSON strings | Parse and convert to arrays |
| 3. Incorrect `primary_org` assignments | Cross-reference against notes |
| 4. Duplicate entities (House AI Task Force) | Merge and redirect edges |
| 5. Notes lack AI policy relevance | Rewrite to explain AI relevance |
| 6. Hallucinated government titles | Verify against official sources |
| 7. 710 empty-notes entities | Prioritize by edges, then prominence |
| 8. ALL 2,228 edges have null `source_url` | This is highest priority — add sources |
| 9. 254 orphan entities | Connect to the graph |
| 10. Non-standard edge types | Map to canonical types |
| 11. Dangling edge references | Delete or fix broken references |
| 12. Stale `primary_org` for former officials | Update to current affiliations |

### Surfacing New Issues

You will find more issues as you work. **Document them immediately.**

Create `enrichment/logs/issues.md` and add entries as you go:

```markdown
## Issues Surfaced

### [Date] — [Issue Title]
- **Scope:** How many entities affected?
- **Example:** [specific entity ID and problem]
- **Suggested fix:** [how to address at scale]
- **Priority:** High / Medium / Low
```

**Communicate proactively:**
- Found a pattern affecting 100+ entities? Tell us before fixing all of them — we may want to discuss the approach
- Found something that might require a schema change? Flag it
- Uncertain about a judgment call? Ask

We'd rather know about problems early than discover them in review.

### Batching

Group similar fixes for efficiency:

| Batch Type | Example |
|------------|---------|
| Regex cleanup | Citation artifact removal across all notes |
| Category fixes | Normalize all `person_organization` edges |
| Org enrichment | All frontier labs, all think tanks, etc. |
| Person enrichment | All executives at a single org |

---

## Seeding Strategy

Beyond fixing existing data, we need to **fill gaps** in coverage.

### Executive Teams

For major organizations, ensure we have their key leadership:

| Org Type | Who to Add |
|----------|------------|
| Frontier Labs (OpenAI, Anthropic, Google DeepMind, Meta AI, xAI) | CEO, CTO, Chief Scientist, Head of Policy |
| Major Tech (Microsoft, Google, Amazon, Apple, Meta) | CEO, AI leads, Policy leads |
| Government Agencies (NIST, OSTP, FTC, NSF) | Director, AI-specific leads |
| Think Tanks | Executive Director, AI program leads |

### Stakeholder Coverage

Ensure balanced representation across all categories:

**People categories:** Executive, Researcher, Policymaker, Investor, Organizer, Journalist, Academic, Cultural figure

**Organization categories:** Frontier Lab, AI Safety/Alignment, Think Tank/Policy Org, Government/Agency, Academic, VC/Capital/Philanthropy, Labor/Civil Society, Ethics/Bias/Rights, Media/Journalism, Political Campaign/PAC, Infrastructure & Compute, Deployers & Platforms

For each category, identify who's missing and prioritize by influence.

### Edge Completeness

When adding a new entity, always add relevant edges:

- Person → their primary organization (`employed_by`)
- Person → orgs they founded (`founded`)
- Person → orgs they advise (`affiliated`)
- Org → parent org (`subsidiary_of`)
- Org → funders (`funded_by`)

---

## Quality Standards

### The #1 Problem: Hallucinations

**Our database likely contains fabricated or inaccurate information.** Because the database was built through a combination of manual entry, web scraping, and AI-assisted enrichment, some entries include facts that cannot be verified or are demonstrably false. Identifying and correcting these is your primary responsibility.

**Real examples of hallucinations you found in your trial:**
- "Under Secretary of War" — fabricated title (correct: "Acting Under Secretary of Defense for Research and Engineering")
- Twitter handle `@t` — obviously wrong
- "Center for AI Safety" as primary_org when it should be UC Berkeley — completely wrong organization
- Obsolete affiliations stated as current (Gina Raimondo still listed at Commerce after leaving)

**How to spot hallucinations:**

| Red Flag | Action |
|----------|--------|
| Hyper-specific dates ("founded on December 11, 2015") | Verify against official source |
| Round dollar amounts ("raised $500 million") | Find the actual figure or remove |
| Superlatives ("world's leading", "most influential") | Remove unless directly quoted |
| Future dates stated as fact | Check if this actually happened |
| Vague prestige claims ("trusted partner of the UN") | Find evidence of formal relationship |
| Citation artifacts like [6,7,9] | Clean up — these are formatting errors |
| Government titles | Cross-reference against congress.gov, whitehouse.gov — these are frequently wrong |

**When you encounter a claim you cannot verify:**
1. **Remove it** — Better to have less information than false information
2. **Flag it** — Note in your `_verification` that you removed an unverifiable claim
3. **Replace it** — If you can find the correct information, use that instead

### What Good Notes Look Like

Notes should answer: **"Why does this person/org matter to U.S. AI policy?"**

- 2-4 sentences of clean prose
- No inline citations like [1], [2] — sources go in `notes_sources`
- Specific policy positions, actions, or relationships
- Not Wikipedia biography — AI policy relevance

### Evidence Standards

| Field | Evidence Required |
|-------|-------------------|
| `notes` | Every factual claim must be verifiable |
| `notes_sources` | 1-4 URLs supporting the notes |
| Edge `evidence` | 1-2 sentences explaining the relationship |
| Edge `source_url` | URL confirming the relationship |

---

## Documentation Requirements

**This is not optional.** Your documentation is a primary deliverable, not an afterthought.

We will evaluate your work on:
1. **Can we re-run it?** — Scripts execute, dependencies are clear
2. **Can we understand it?** — Decisions are explained, not just made
3. **Can we verify it?** — Sources cited, before/after shown
4. **Can we extend it?** — Process is generalizable, not one-off

### Required Documentation

1. **Scripts** — All processing code in `enrichment/scripts/`
   - Clear comments explaining what each script does
   - Input/output file paths documented
   - Version any external dependencies

2. **LaTeX/Analysis** — Your difference charts and verification documents in `enrichment/latex/`
   - Before/after comparisons
   - Verification methodology
   - Statistics on changes made

3. **Logs** — Processing logs in `enrichment/logs/`
   - What was run, when, in what order
   - Any errors or edge cases encountered
   - **Manual decisions and rationale** — This is critical. When you make a judgment call (e.g., "I classified this person as Policymaker rather than Executive because..."), write it down. These decisions are institutional knowledge.

4. **Output JSON** — All changes as JSON in `enrichment/output/`
   - Organized by type (fixes, enrichments, additions)
   - Include `_verification` blocks explaining your research

### JSON Output Format

Follow the same format as your trial deliverables:

**Entity fix/enrichment:**
```json
{
  "id": 123,
  "entity_type": "person",
  "name": "...",
  // ... all fields ...
  "_verification": {
    "issues_found": "Description of what was wrong",
    "notes": "How you verified and what you changed"
  }
}
```

**New edge:**
```json
{
  "source_id": 123,
  "target_id": 456,
  "edge_type": "employed_by",
  "role": "CEO",
  "is_primary": true,
  "evidence": "...",
  "source_url": "https://..."
}
```

---

## Workflow

### Daily Process

1. **Pull latest** from branch (in case we push updates)
   ```bash
   git pull origin connor/data-processing
   ```

2. **Run your scripts** against staging database

3. **Generate output JSON** with verification notes

4. **Commit your work** with clear messages
   ```bash
   git add enrichment/
   git commit -m "feat: enrich 50 frontier lab executives"
   git push origin connor/data-processing
   ```

### Review Cycle

1. You push changes to `connor/data-processing`
2. We review your output JSON and verification notes
3. We apply approved changes to production
4. We may ask for revisions or clarifications

### Communication

- Questions? Open a GitHub issue or message directly
- Found a systemic problem? Document it in `enrichment/logs/issues.md`
- Need schema changes? Propose them — don't assume the schema is fixed

---

## Reference: Schema & Field Options

### Entity Types

- `person`
- `organization`
- `resource`

### Person Categories (pick ONE)

- Executive
- Researcher
- Policymaker
- Investor
- Organizer
- Journalist
- Academic
- Cultural figure

### Organization Categories (pick ONE primary)

- Frontier Lab
- Infrastructure & Compute
- Deployers & Platforms
- AI Safety/Alignment
- Think Tank/Policy Org
- Government/Agency
- Academic
- VC/Capital/Philanthropy
- Labor/Civil Society
- Ethics/Bias/Rights
- Media/Journalism
- Political Campaign/PAC

### Influence Type (pick ANY that apply, comma-separated)

- Decision-maker (legislator, regulator)
- Advisor/strategist
- Researcher/analyst
- Funder/investor
- Builder (develops AI systems)
- Organizer/advocate
- Narrator (journalist, author, podcaster)
- Implementer (executes policy/deploys AI)
- Connector/convener

### Resource Types (pick ONE)

- Essay
- Book
- Report
- Podcast
- Video
- Website
- Academic Paper
- News Article
- Substack/Newsletter

### Resource Categories (pick ONE)

- AI Safety
- AI Governance
- AI Capabilities
- Labor & Economy
- National Security
- Industry Analysis
- Policy Proposal
- Technical
- Philosophy/Ethics

### Edge Types

| Type | Direction | Example |
|------|-----------|---------|
| `employed_by` | person → org | "Sam Altman employed_by OpenAI" |
| `founded` | person → org | "Dario Amodei founded Anthropic" |
| `affiliated` | person → org | "Yoshua Bengio affiliated Stanford HAI" |
| `invested_in` | org/person → org | "a16z invested_in Anthropic" |
| `funded_by` | org → org/person | "Anthropic funded_by Google" |
| `subsidiary_of` | org → org | "DeepMind subsidiary_of Alphabet" |
| `partner_of` | org ↔ org | "OpenAI partner_of Microsoft" |
| `collaborated` | person ↔ person | Research collaborations |
| `former_colleague` | person ↔ person | Past work together |
| `critic_of` | person → org/person | Public criticism |
| `authored_by` | resource → person | "Paper authored_by Bengio" |
| `published_by` | resource → org | "Report published_by Brookings" |

### Belief Fields

**regulatory_stance** (pick ONE):
- Light-touch
- Targeted
- Moderate
- Restrictive
- Unknown

**agi_timeline** (pick ONE):
- Already here
- 2-3 years
- 5-10 years
- 10-25 years
- 25+ years or never
- Unknown

**ai_risk** (pick ONE):
- Manageable
- Serious
- Existential
- Unknown

**threat_models** (pick up to 3):
- Labor displacement
- Economic inequality
- Power concentration
- Democratic erosion
- Cybersecurity
- Misinformation
- Environmental
- Weapons
- Loss of control
- Copyright/IP
- Existential risk

**evidence_source** (pick ONE):
- Explicitly stated
- Inferred
- Unknown

---

## Questions?

If anything is unclear, ask before proceeding. We'd rather answer questions upfront than review incorrect work later.

Good luck!
