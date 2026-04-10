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

All your documentation goes in `/enrichment/`:

```
enrichment/
├── ONBOARDING.md          # This document
├── scripts/               # Your processing scripts (Python, Node, SQL, etc.)
├── latex/                 # Your difference charts and analysis docs
└── logs/                  # Processing logs, change logs, issues
    ├── changes.md         # What you changed, with entity IDs
    └── issues.md          # New issues you discover
```

Your scripts modify the staging database directly. The repo stores your code and documentation, not data exports.

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

### Edge Enrichment & Ground Truthing

**Every edge in the database needs work.** You found that 100% of edges lack `source_url` and 33% lack `evidence` text. This is critical — unsourced relationships are unverifiable.

**For each edge:**
1. **Verify it's accurate** — Does this relationship actually exist? Is the role correct? Are the dates right?
2. **Add `source_url`** — Link to a page that confirms this relationship
3. **Add/improve `evidence`** — 1-2 sentences explaining the relationship
4. **Check entity mapping** — Do both `source_id` and `target_id` point to real entities?

**When an edge references a non-existent entity:**
1. The edge is "dangling" — it points to an ID that doesn't exist
2. You need to either: delete the edge (if the relationship is wrong) OR create the missing entity
3. If you create the entity, enrich it properly — don't leave stubs

### Deduplication: Check Before Creating

**Before creating ANY new entity, check for fuzzy matches.**

The database may already have the entity under a different name:
- "a16z" vs "Andreessen Horowitz"
- "Google DeepMind" vs "DeepMind"
- "Sen. Schumer" vs "Chuck Schumer" vs "Charles Schumer"
- "UC Berkeley" vs "University of California, Berkeley"

**How to check:**
```sql
-- Search for similar names
SELECT id, name, entity_type FROM entity
WHERE LOWER(name) LIKE '%schumer%'
   OR LOWER(name) LIKE '%andreessen%';

-- Check for orgs that might be the same
SELECT id, name, website FROM entity
WHERE entity_type = 'organization'
  AND (LOWER(name) LIKE '%deepmind%' OR website LIKE '%deepmind%');
```

**If you find a match:**
- Don't create a duplicate
- Use the existing entity ID
- If the existing entity needs enrichment, enrich it
- If there are actual duplicates in the DB already, flag them for merging

**Document your deduplication decisions** in your logs — "Searched for X, found existing entity ID Y, using that instead of creating new."

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

### Starting Points for Research

Since the AI policy landscape is specialized, here are concrete resources to guide your seeding:

**Authoritative Lists (check if we have everyone on these):**
- TIME100 AI (2024, 2025) — https://time.com/collection/time100-ai/
- Politico AI Power List — influential DC figures in AI policy
- Fortune AI 50 — business leaders shaping AI
- MIT Technology Review 35 Under 35 (AI category)

**Government Sources:**
- Senate AI Working Group members (Schumer, Rounds, Heinrich, Young)
- House AI Task Force members (24 members across 20 committees)
- OSTP leadership and AI staff
- NIST AI Safety Institute staff
- FTC technologists working on AI
- State-level AI task forces (California, Colorado, etc.)

**Think Tank / Research Sources:**
- Brookings AI Governance project team
- RAND AI policy researchers
- CSET (Georgetown) team
- AI Now Institute team
- Partnership on AI staff
- Future of Life Institute team
- Center for AI Safety team

**Industry Sources:**
- Leadership pages of: OpenAI, Anthropic, Google DeepMind, Meta AI, xAI, Cohere, Mistral, Inflection
- AI policy/government affairs leads at major tech companies
- a16z AI investment team, Sequoia AI partners, other major AI VCs

**Academic Sources:**
- Stanford HAI affiliated faculty
- MIT AI Policy Forum participants
- Berkeley AI Research (BAIR) leadership
- Oxford Future of Humanity Institute alumni (now dispersed)

**Media Sources:**
- Bylines on AI policy at: NYT, WaPo, Wired, The Verge, Platformer, MIT Tech Review
- AI-focused newsletters: Import AI, The Gradient, Jack Clark's writing
- AI-focused podcasts: Hard Fork, Your Undivided Attention, 80000 Hours

### Research Each Stakeholder Category

For each category, use the resources above as starting points. Ask "who are the most important players?" and check if we have them.

**People categories:**
| Category | Research Questions |
|----------|-------------------|
| Executive | Who runs the major AI companies? Who makes deployment decisions? |
| Researcher | Who publishes the most influential AI safety/capabilities papers? Who leads major labs? |
| Policymaker | Who writes AI legislation? Who runs the relevant committees and agencies? |
| Investor | Who funds AI companies? Who shapes capital allocation in the space? |
| Organizer | Who leads AI labor/advocacy movements? Who mobilizes public opinion? |
| Journalist | Who covers AI policy? Whose reporting shapes the narrative? |
| Academic | Who teaches AI ethics/policy? Who advises policymakers? |
| Cultural figure | Who shapes public perception of AI through art, writing, commentary? |

**Organization categories:**
| Category | Research Questions |
|----------|-------------------|
| Frontier Lab | Do we have all the major labs? Their key subsidiaries? |
| AI Safety/Alignment | Which safety orgs are missing? New ones founded recently? |
| Think Tank/Policy Org | Who publishes influential AI policy research? |
| Government/Agency | Federal agencies, state bodies, international orgs with US influence? |
| Academic | Which universities have major AI programs? AI ethics centers? |
| VC/Capital/Philanthropy | Who funds AI? Who funds AI safety? Major grants? |
| Labor/Civil Society | Unions, advocacy groups, civil rights orgs working on AI? |
| Ethics/Bias/Rights | Algorithmic justice orgs? AI accountability groups? |
| Media/Journalism | Major outlets covering AI? Newsletters? Podcasts? |
| Political Campaign/PAC | Who's spending on AI policy? Tech PACs? |
| Infrastructure & Compute | Chip companies, cloud providers, data center operators? |
| Deployers & Platforms | Companies deploying AI at scale? |

**Resources:**
| Type | Research Questions |
|------|-------------------|
| Reports | Major AI policy reports from 2023-2026? Government reports? |
| Books | Influential books on AI risk, governance, economics? |
| Papers | Seminal academic papers on AI safety, alignment, policy? |
| Podcasts/Media | Where do AI policymakers go to talk? |

### Executive Teams

For major organizations already in the database, ensure we have their key leadership:

| Org Type | Who to Add |
|----------|------------|
| Frontier Labs (OpenAI, Anthropic, Google DeepMind, Meta AI, xAI) | CEO, CTO, Chief Scientist, Head of Policy |
| Major Tech (Microsoft, Google, Amazon, Apple, Meta) | CEO, AI leads, Policy leads |
| Government Agencies (NIST, OSTP, FTC, NSF) | Director, AI-specific leads |
| Think Tanks | Executive Director, AI program leads |

### Edge Completeness

When adding a new entity, always add relevant edges:

- Person → their primary organization (`employed_by`)
- Person → orgs they founded (`founded`)
- Person → orgs they advise (`affiliated`)
- Org → parent org (`subsidiary_of`)
- Org → funders (`funded_by`)

---

## Final Task: Importance Ratings

**Do this AFTER enrichment and seeding are complete.**

Once the data is clean and comprehensive, add an `importance` rating (1-5) to every entity. This will be used to size nodes in the visualization.

### The Scale

| Rating | Meaning | Examples |
|--------|---------|----------|
| 5 | Defining figure in their category | Sam Altman (Executive), Yoshua Bengio (Researcher), Chuck Schumer (Policymaker) |
| 4 | Major player, widely recognized | CTO of a frontier lab, key Senate staffer, lead author of landmark paper |
| 3 | Significant contributor | Mid-level exec at major org, active policy advocate, respected journalist |
| 2 | Notable but narrower influence | Regional figure, niche expertise, early-career but promising |
| 1 | Peripheral or emerging | New to the space, limited track record, included for completeness |

### How to Assign

- Rate within category — a 5 in "Journalist" is the most important AI journalist, not compared to a 5 in "Executive"
- Consider: decision-making power, public influence, track record, reach
- When uncertain, err toward the middle (3)
- Document your reasoning for 5s and 1s — these are the extremes

### Database Change

You'll need to add the column:

```sql
ALTER TABLE entity ADD COLUMN importance SMALLINT CHECK (importance >= 1 AND importance <= 5);
```

Then populate it for all entities. This can be done programmatically with manual review for edge cases.

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

4. **Change logs** — Track what you changed in the database
   - Keep a running log of entities modified/created with IDs
   - Note what was wrong and how you fixed it
   - This doesn't need to be JSON — a markdown table or spreadsheet works

---

## Workflow

### How This Works

**You work directly on the staging database.** No JSON files to submit — you INSERT, UPDATE, and fix data directly in `mapping_ai_staging`.

We review your changes by:
1. Querying the staging database to see what changed
2. Reviewing your scripts and logs to understand your process
3. Promoting verified changes to production

### Daily Process

1. **Pull latest** from branch (in case we push script updates)
   ```bash
   git pull origin connor/data-processing
   ```

2. **Run your scripts** against staging database — they should directly modify the data

3. **Log what you changed** — Update your change logs with entity IDs and descriptions

4. **Commit your scripts and logs**
   ```bash
   git add enrichment/
   git commit -m "feat: enrich 50 frontier lab executives"
   git push origin connor/data-processing
   ```

### Review Cycle

1. You make changes directly in the staging database
2. You commit your scripts and logs to `connor/data-processing`
3. We query staging to review your changes
4. We promote approved changes to production
5. We may ask for revisions (you fix in staging, we re-review)

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
