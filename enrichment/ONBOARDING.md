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
7. [Final Task: Importance Ratings](#final-task-importance-ratings)
8. [Quality Standards](#quality-standards)
9. [Documentation Requirements](#documentation-requirements)
10. [Workflow](#workflow)
11. [Reference: Schema & Field Options](#reference-schema--field-options)

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
3. **Enrich empty entities** — Prioritize those with existing edges (people, orgs, AND resources)
4. **Add source URLs to edges** — Currently 0% have sources
5. **Connect orphan entities** — 254 entities have zero edges
6. **Normalize edge types** — Fix non-standard types (`person_organization` → `employer`, etc.)
7. **Seed missing key entities** — See Seeding Strategy below (includes resources!)
8. **Enrich and seed resources** — Papers, reports, testimony, books that shaped AI policy

### Resources Are Part of Your Work

Resources (papers, reports, books, podcasts, etc.) are first-class entities. You should:
- **Enrich existing resources** — Fill in `resource_key_argument`, verify `resource_author`, add notes explaining why this resource matters
- **Seed new resources** — Add influential papers, landmark reports, congressional testimony (see Seeding Strategy)
- **Create edges for resources** — `author` (person → resource) and `publisher` (resource → org)

### The Cascade Effect: Edges Require Entities First

**The edge table has foreign key constraints.** You cannot insert an edge until both `source_id` and `target_id` exist in the entity table. The database will reject the insert.

Example: You want to add "Sam Altman is employed by OpenAI". Before you can insert that edge:
1. Sam Altman must exist in `entity` (check: does he? what's his ID?)
2. OpenAI must exist in `entity` (check: does it? what's its ID?)

If either is missing, create and enrich the entity FIRST, then add the edge.

**The cascade:**
- You enrich an entity and discover relationships
- Those relationships require edges
- Some edges reference entities that don't exist yet
- You must create those entities before you can add the edges
- Those new entities have their own relationships...

**How to handle this:**
- Keep a running list of entities you need to create
- Batch similar entities (all OpenAI leadership, all a16z partners, etc.)
- Create entities BEFORE the edges that reference them
- Don't create stub entries — if you create an entity, enrich it properly

This cascade is expected. It's how the graph grows. Just be systematic about tracking what needs to be done.

### Edge Enrichment & Ground Truthing

**Every edge in the database needs work.** You found that 100% of edges lack `source_url` and 33% lack `evidence` text. This is critical — unsourced relationships are unverifiable.

**For each edge:**
1. **Verify it's accurate** — Does this relationship actually exist? Is the role correct? Are the dates right?
2. **Add `source_url`** — Link to a page that confirms this relationship
3. **Add/improve `evidence`** — 1-2 sentences explaining the relationship
4. **Check entity mapping** — Do both `source_id` and `target_id` point to real entities?

### Check Existing Edges Before Creating New Ones

**IMPORTANT:** Before adding any edge, check if a related edge already exists — even in the opposite direction.

Because the frontend handles directionality display, an edge stored as `A → B` can be displayed from B's perspective. You don't need to create `B → A` as well.

**Before creating an edge, query:**
```sql
-- Check for existing edges between these two entities (either direction)
SELECT e.*, s.name as source_name, t.name as target_name
FROM edge e
JOIN entity s ON e.source_id = s.id
JOIN entity t ON e.target_id = t.id
WHERE (e.source_id = 123 AND e.target_id = 456)
   OR (e.source_id = 456 AND e.target_id = 123);
```

**Example scenario:**
- You're enriching Anthropic Institute and want to add "Anthropic Institute is a subsidiary of Anthropic"
- First check: does an edge already exist between these two entities?
- If you find `Anthropic → Anthropic Institute, parent_company` — **don't create a new edge**
- The existing edge already captures this relationship; the frontend will display it correctly from either perspective

**When you find an existing edge:**
- If it's the same relationship, don't duplicate it
- If it needs enrichment (missing source_url, evidence), enrich the existing edge
- If the edge_type is wrong (e.g., `affiliated` should be `employer`), update it

**When an edge points to the wrong entity:**

Note: The edge table has `ON DELETE CASCADE` on both FKs — truly dangling edges (pointing to non-existent IDs) cannot exist. But edges can point to the *wrong* entity — source_id or target_id resolves to a real entity but the incorrect one.

1. Find these by cross-referencing edge evidence text against the actual entity names at those IDs
2. You need to either: delete the edge (if the relationship is wrong) OR update the source_id/target_id to point to the correct entity
3. If the correct entity doesn't exist yet, create and enrich it first

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
| Edge type fixes | Normalize non-standard edge types (see Legacy Edge Types table) |
| Org enrichment | All frontier labs, all think tanks, etc. |
| Person enrichment | All executives at a single org |

---

## Seeding Strategy

Beyond fixing existing data, we need to **fill gaps** in coverage.

### Starting Points for Research

Go beyond the obvious lists. Here are specific, actionable research directions for each category:

**Finding People — Executives:**
- Who testified before Congress on AI? (Search congress.gov hearing transcripts)
- Who signed the CAIS "Statement on AI Risk"? (May 2023, ~350 signatories)
- Who signed the Frontier AI Safety Commitments at Seoul/Bletchley summits?
- Who's quoted in major AI policy stories? (Check NYT, WaPo, Wired AI coverage)
- Who's on the boards of AI companies? (Check SEC filings, company pages)

**Finding People — Researchers:**
- Authors of most-cited AI safety/alignment papers (Google Scholar, Semantic Scholar)
- NeurIPS, ICML, ICLR keynote speakers on policy/safety topics
- Authors on landmark papers: "Attention Is All You Need", Constitutional AI, RLHF papers
- Who peer-reviews for AI safety journals? Who's on program committees?

**Finding People — Policymakers:**
- Sponsors and co-sponsors of AI bills — search congress.gov for "artificial intelligence"
- State legislators: California (SB 1047 authors/opponents), Colorado, Texas AI bills
- Agency officials giving speeches on AI (search NIST, FTC, OSTP press releases)
- Congressional staff who specialize in AI — the most efficient path is through elected officials who have taken public AI stances. Identify their chiefs of staff and legislative directors for tech/science. Use LinkedIn, official .gov staff directories, and hearing transcripts (staff are sometimes credited). Key committees: House Science, Space & Technology; Senate Commerce; Senate Homeland Security & Governmental Affairs; House Energy & Commerce
- International officials with US influence (UK AI Safety Institute, EU AI Act negotiators)

**Finding People — Investors:**
- Who led Series A/B/C for frontier labs? (Check Crunchbase, PitchBook)
- General partners at AI-focused funds (a16z, Sequoia, Khosla, Greylock AI teams)
- Philanthropists funding AI safety (Open Philanthropy grantees, Survival and Flourishing Fund)
- Angel investors in AI startups

**Finding People — Organizers:**
- Who organized the "Pause Giant AI Experiments" letter? (Future of Life Institute, March 2023)
- Union leaders negotiating AI clauses (SAG-AFTRA, WGA AI negotiators, UAW, CWA — both have been leaders on labor AI issues)
- Civil society advocates who've testified on AI (ACLU, EFF, Color of Change)
- Grassroots organizers: Distributed AI Research Institute, Algorithmic Justice League leadership

**Finding People — Journalists:**
- Who broke major AI stories? (Search for exclusives, scoops)
- Who's on the AI beat? (Check mastheads: NYT, WaPo, WSJ, Wired, The Verge, Reuters)
- Newsletter authors: Platformer, Import AI, The Gradient, Axios AI+, The Decoder
- Podcast hosts covering AI policy

**Finding People — Academics:**
- Who advises government on AI? (Check NIST AI Safety Institute advisors, NAIAC members)
- Authors of widely-assigned AI ethics syllabi
- Conference organizers for AI policy events (AIES, FAccT, AI & Society)
- University AI policy center directors

**Finding People — Cultural Figures:**
- Authors of AI-themed fiction influencing discourse (Ted Chiang, etc.)
- Public intellectuals commenting on AI (who appears on mainstream podcasts?)
- Documentary filmmakers covering AI
- Artists in the AI copyright debate

**Finding Organizations:**
- Who submitted comments on NTIA AI accountability RFC? (Public record)
- Who submitted comments on EU AI Act? (Public consultations)
- Who signed the White House voluntary AI commitments? (July 2023, 15 companies)
- Industry associations: ITI, BSA, NetChoice — who are their AI policy leads?
- New orgs founded 2023-2026 focused on AI (search Crunchbase, news)

**Finding Resources:**
- Congressional testimony transcripts (congress.gov — search AI hearings)
- GAO reports on AI (gao.gov)
- NIST AI Risk Management Framework and related docs
- White House Executive Orders and fact sheets on AI
- State-level AI task force reports
- Influential op-eds in major outlets (search NYT, WSJ, WaPo opinion sections for "artificial intelligence")
- Amicus briefs in AI-related lawsuits (copyright cases, etc.)

**Social Media as Research Source:**
- Twitter/X, Bluesky, LinkedIn — for surfacing who is actively shaping public AI discourse
- Use social media to track public positions, find who's being quoted/cited, identify rising voices
- Check follower networks of known AI policy figures to find adjacent influencers

### Research Questions to Ask Yourself

As you research each category, ask:

**Who has power?**
- Who makes decisions that affect AI development or deployment?
- Who controls funding, compute, or talent pipelines?
- Who can block or enable AI legislation?

**Who shapes the narrative?**
- Who do journalists call for quotes on AI?
- Whose writing/speeches get cited in policy debates?
- Who has a large platform and uses it to discuss AI?

**Who has expertise?**
- Who wrote the papers that policymakers cite?
- Who do companies hire to advise on AI safety?
- Who trains the next generation of AI researchers/policymakers?

**Who is newly influential?**
- Who emerged in 2024-2026 as a voice on AI?
- Which orgs were founded recently and are already making impact?
- Who moved from one sector to another (industry → government, academia → advocacy)?

**Who is missing from the conversation?**
- Are there perspectives underrepresented in our database?
- Labor voices? Civil rights perspectives? International voices with US influence?
- Critics who aren't from the usual AI safety circles?

### Quality Filter: Don't Add Randos

**Not everyone tangentially connected to AI belongs in this database.**

Before adding someone, ask:
- Would an informed person researching US AI policy expect to find them here?
- Have they taken public action on AI policy (testimony, writing, organizing, building)?
- Do they have influence beyond their immediate circle?

**DO add:**
- The CTO of a frontier lab (even if not famous outside tech)
- A state legislator who authored a major AI bill
- A union negotiator who secured AI contract terms
- A researcher whose paper changed how people think about alignment

**DON'T add:**
- Random employees at AI companies (unless leadership or policy roles)
- Academics who mentioned AI once in a paper
- Journalists who wrote one article about ChatGPT
- People who are "interested in AI" but haven't shaped policy

**When in doubt:** If you can't write 2 sentences about why they matter to US AI policy, they probably don't belong.

**Edge test:** If a new entity is unlikely to connect to at least 2–3 other entities already in (or being added to) the DB, that's a strong signal they don't belong. Influence in a network is relational — if you can't draw edges to/from them, they're probably not central enough.

**Bluechip org rule:** If an individual is clearly heavily influencing AI governance and is strongly associated with a well-known organization — meaning employed by, founded, or leads it (not just tangentially connected) — that organization should also be added as an entity.

### Research Each Stakeholder Category

For each category, use the resources above as starting points. Systematically work through the research questions above.

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

For major organizations already in the database, ensure we have their major executive team:

| Org Type | Who to Add |
|----------|------------|
| Frontier Labs (OpenAI, Anthropic, Google DeepMind, Meta AI, xAI) | CEO, CTO, Chief Scientist, Head of Policy |
| Major Tech (Microsoft, Google, Amazon, Apple, Meta) | CEO, AI leads, Policy leads |
| Government Agencies (NIST, OSTP, FTC, NSF, OMB, AISI, NSC, PCAST) | Director, AI-specific leads, White House AI task force members |
| Think Tanks | Executive Director, AI program leads |

### Edge Completeness

When adding a new entity, always add relevant edges:

**For people:**
- Person → their primary organization (`employer`, `is_primary: true`)
- Person → orgs they founded (`founder`)
- Person → orgs they advise (`advisor`)
- Person → orgs they're members of (`member`)
- Person ↔ collaborators (`collaborator` — symmetric, pick one direction)

**For organizations:**
- Org → parent org (`parent_company`)
- Org → funders (`funder` — note: funder is source, recipient is target)
- Org ↔ partners (`partner` — symmetric, pick one direction)

**For resources:**
- Resource → author (`author` — person is source, resource is target)
- Resource → publisher (`publisher` — resource is source, org is target)

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

**Cross-category calibration:** While within-category is the primary lens, there should be meaningful across-category differences in absolute floor and ceiling. Example: Ezra Klein may be the top journalist on AI (a 5 in Journalist) but is not as important to AI governance as Donald Trump or Dario Amodei. Let the top of high-influence categories — heads of state, frontier lab CEOs, top regulators — anchor the absolute top of the scale.

### Database Change

**⚠️ Coordinate with team before running DDL.** This ALTER TABLE should be agreed before you execute it on staging.

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

Notes should answer: **"Why does this person/org/resource matter to the U.S. AI policy landscape?"**

**Every note must explain AI relevance.** If someone reads the note, they should understand why this entity is in an AI policy database — not just who they are.

**Bad (generic bio, no AI relevance):**
> "Jennifer Pahlka is the founder of Code for America. She previously worked at CDBaby and earned a degree from UC Berkeley."

**Good (AI-specific, explains relevance):**
> "Jennifer Pahlka founded Code for America in 2009 and served as U.S. Deputy Chief Technology Officer under President Obama (2013-2014). Her 2023 book 'Recoding America' critiques federal technology procurement and has influenced AI governance discussions around government AI adoption. She advocates for iterative, human-centered approaches to public sector technology deployment."

**Bad (Wikipedia summary):**
> "Marc Andreessen is an American businessman and investor. He co-founded Netscape and later Andreessen Horowitz. His net worth is estimated at $1.9 billion."

**Good (AI policy focus):**
> "Marc Andreessen co-founded Andreessen Horowitz (a16z), one of the most influential investors in AI companies. He authored 'Why AI Will Save the World' in 2023, arguing against AI regulation. a16z led the campaign against California's SB 1047 AI safety bill, and Andreessen advises the Trump administration on technology policy."

**Checklist for every note:**
- [ ] Does it mention AI, AI policy, or AI-adjacent work?
- [ ] Does it explain *why* this entity matters to the AI landscape?
- [ ] Would someone unfamiliar with the person understand their AI relevance?
- [ ] Is it specific (policy positions, actions, testimony, publications) rather than vague?

**Format:**
- 2-4 sentences of clean prose
- No inline citations like [1], [2] — sources go in `notes_sources`
- No superlatives unless directly quoted ("world's leading" → remove)
- Include dates where relevant (founded X in 2021, testified in July 2023)

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

### Entity Table — Key Columns

| Column | Type | Description |
|--------|------|-------------|
| `entity_type` | TEXT | `person`, `organization`, or `resource` |
| `category` | TEXT | Primary category (see options below) |
| `influence_type` | TEXT | Comma-separated influence types |
| `notes` | TEXT | Plain text notes (AI relevance required) |
| `notes_html` | TEXT | Rich text version |
| `notes_sources` | TEXT | Source URLs as JSON string |
| `notes_confidence` | SMALLINT | Confidence score for the notes (1-5) |
| `enrichment_version` | TEXT | Tracks which enrichment pass produced this data |
| `notes_v1` | TEXT | Original pre-enrichment notes (preserved for comparison) |
| `qa_approved` | BOOLEAN | Set to TRUE when fully verified — Connor's sign-off mechanism |

### `entity_type` (pick ONE)

- `person`
- `organization`
- `resource`

### `category` — Person Categories (pick ONE)

- Executive
- Researcher
- Policymaker
- Investor
- Organizer
- Journalist
- Academic
- Cultural figure

### `category` — Organization Categories (pick ONE primary)

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

### `influence_type` (pick ANY that apply, comma-separated)

- Decision-maker (legislator, regulator)
- Advisor/strategist
- Researcher/analyst
- Funder/investor
- Builder (develops AI systems)
- Organizer/advocate
- Narrator (journalist, author, podcaster)
- Implementer (executes policy/deploys AI)
- Connector/convener

### `resource_type` (pick ONE)

- Essay
- Book
- Report
- Podcast
- Video
- Website
- Academic Paper
- News Article
- Substack/Newsletter

### `resource_category` (pick ONE)

- AI Safety
- AI Governance
- AI Capabilities
- Labor & Economy
- National Security
- Industry Analysis
- Policy Proposal
- Technical
- Philosophy/Ethics

### Edge Table: Understanding the Columns

The edge table has these key columns you'll work with:

#### `source_id` and `target_id`

These are foreign keys pointing to entities. **The relationship reads as: source → target.**

Example: If source_id=100 (Sam Altman) and target_id=200 (OpenAI) with edge_type="employer", it means "Sam Altman is employed by OpenAI."

#### `role` — The specific position or function

The `role` column provides more detail within the edge_type. Think of edge_type as the category and role as the specific instance.

| edge_type | role examples |
|-----------|---------------|
| `employer` | "CEO", "Chief Scientist", "VP of Policy", "Research Scientist" |
| `founder` | "Co-founder", "Founding CEO", "Co-founder and Chairman" |
| `advisor` | "Board Advisor", "Technical Advisor", "Policy Advisor" |
| `member` | "Board Member", "Fellow", "Working Group Member", "Steering Committee" |
| `funder` | "Lead Investor (Series B)", "Angel Investor", "Grant Program Officer" |

**Examples:**
- Sam Altman → OpenAI: `edge_type: "employer"`, `role: "CEO"`
- Yoshua Bengio → Stanford HAI: `edge_type: "advisor"`, `role: "Advisory Board Member"`
- Marc Andreessen → OpenAI: `edge_type: "funder"`, `role: "Series A Lead Investor"`
- Dario Amodei → Anthropic: `edge_type: "founder"`, `role: "Co-founder and CEO"`

#### `is_primary` — Is this their main affiliation?

A person often has multiple edges to organizations. `is_primary` marks which one is their **main** affiliation — the one you'd list first if describing who they are.

**Example: Yoshua Bengio**
| target | edge_type | role | is_primary |
|--------|-----------|------|------------|
| Mila | employer | Scientific Director | **true** |
| Université de Montréal | employer | Professor | false |
| Stanford HAI | advisor | Advisory Board | false |
| Vector Institute | advisor | Co-founder | false |

If someone asks "Where does Yoshua Bengio work?", you'd say "Mila" — that's his primary affiliation.

**Rules for `is_primary`:**
- Each person should have exactly ONE `is_primary: true` edge (their main job)
- Advisory roles, board seats, and affiliations are typically `is_primary: false`
- Former roles should have `end_date` set, not `is_primary`
- When in doubt, primary = where they spend most of their time / where they'd list on a business card

### Edge Types & Direction Conventions

**Why direction matters:** The frontend can display edges from either entity's perspective using a lookup table. But for query consistency and data cleanliness, follow these canonical directions.

| Type | Canonical Direction | Example | Frontend renders reverse as... |
|------|---------------------|---------|-------------------------------|
| `employer` | person → org | Sam Altman → OpenAI | "OpenAI employs Sam Altman" |
| `founder` | person → org | Dario Amodei → Anthropic | "Anthropic was founded by Dario Amodei" |
| `funder` | funder → recipient | a16z → Anthropic | "Anthropic is funded by a16z" |
| `parent_company` | parent → child | Anthropic → Anthropic Institute | "Anthropic Institute is subsidiary of Anthropic" |
| `advisor` | advisor → advisee | Yoshua Bengio → Stanford HAI | "Stanford HAI is advised by Yoshua Bengio" |
| `member` | person → org | Dan Hendrycks → CAIS | "CAIS has member Dan Hendrycks" |
| `author` | person → resource | Bengio → "Managing AI Risk" | "Managing AI Risk was authored by Bengio" |
| `publisher` | org → resource | Brookings → AI Report | "AI Report was published by Brookings" |
| `collaborator` | person → person | Dario Amodei → Sam Altman | Same both ways (symmetric) |
| `partner` | org → org | OpenAI → Microsoft | Same both ways (symmetric) |
| `critic` | critic → target | Timnit Gebru → Google | "Google is criticized by Timnit Gebru" |
| `supporter` | supporter → target | Reid Hoffman → OpenAI | "OpenAI is supported by Reid Hoffman" |

**For symmetric relationships** (collaborator, partner): Pick one direction and stick with it. Don't create both A→B and B→A — that's a duplicate.

**Use `role` for specificity:**
| edge_type | role examples |
|-----------|---------------|
| `employer` | "CEO", "Chief Scientist", "VP of Policy" |
| `founder` | "Co-founder", "Founding CEO" |
| `advisor` | "Board Advisor", "Technical Advisor" |
| `member` | "Board Member", "Fellow", "Working Group Member" |
| `funder` | "Series B Lead", "Angel Investor", "Grant Program Officer" |

**Proposing new edge types:**

The types above cover most relationships. If you encounter one that doesn't fit, you can propose a new type — but be conservative:
- Does this really not fit? ("technical advisor" → just use `advisor` with `role: "Technical Advisor"`)
- Will it be used for more than 2-3 edges?
- Is the direction convention clear?

**If you propose a new type:** Document it in your logs with examples and explain why existing types don't work.

**Don't create variations:** Use `funder` for all investment/grant relationships (not `investor`, `invested_in`, `funded_by`). Pick one name, one direction.

### Legacy Edge Types (Need Cleanup)

The database currently has 24 different edge_type values. Many are duplicates or need migration to the canonical types above. Here's the mapping:

| Legacy Type | Count | → Canonical Type | Action |
|-------------|-------|------------------|--------|
| `employed_by` | 518 | `employer` | Flip direction (person→org) |
| `person_organization` | 72 | `employer` | These are employment relationships |
| `founded` | 118 | `founder` | Keep as-is |
| `co_founded_with` | 71 | `founder` | Set role="Co-founder" |
| `funded_by` | 79 | `funder` | Flip direction (funder→recipient) |
| `invested_in` | 45 | `funder` | Keep direction, rename |
| `funder` | 17 | `funder` | Keep as-is |
| `subsidiary_of` | 116 | `parent_company` | Flip direction (parent→child) |
| `spun_out_from` | 13 | `parent_company` | Flip direction |
| `collaborator` | 239 | `collaborator` | Keep as-is |
| `former_colleague` | 26 | `collaborator` | Set end_date if known |
| `partner_of` | 155 | `partner` | Keep as-is |
| `advises` | 26 | `advisor` | Keep as-is |
| `mentored_by` | 15 | `advisor` | Flip direction, set role="Mentor" |
| `mentor_of` | 1 | `advisor` | Set role="Mentor" |
| `board_member` | 36 | `member` | Set role="Board Member" |
| `authored_by` | 30 | `author` | Flip direction (person→resource) |
| `published_by` | 16 | `publisher` | Flip direction (org→resource) |
| `critic_of` | 22 | `critic` | Keep as-is |
| `critic` | 1 | `critic` | Keep as-is |
| `supporter_of` | 19 | `supporter` | Keep as-is |
| `affiliated` | 585 | **NEEDS REVIEW** | Mixed: some are `member`, `advisor`, `employer` |
| `affiliated_with` | 7 | **NEEDS REVIEW** | Same as `affiliated` |
| `mentioned` | 1 | **DROP?** | Weak relationship |

**The `affiliated` bucket (585 edges) needs manual review.** Samples show:
- Senators → Committees (should be `member`)
- People → Think tanks (should be `member` or `advisor`)
- Person → Org employment (should be `employer`)
- Spouse relationships (probably drop — not relevant to AI policy)

When you encounter an `affiliated` edge, reclassify it to the appropriate canonical type.

### Belief Fields

**`belief_regulatory_stance`** (pick ONE):
- Accelerate — minimal/no regulation
- Light-touch — voluntary, self-governance
- Targeted — sector-specific rules, not broad R&D restrictions
- Moderate — mandatory safety evals + transparency
- Restrictive — external oversight of compute, training runs
- Precautionary — pause/moratorium until governance catches up
- Nationalize — nationalize/public control
- Mixed/unclear
- Other — describe in notes

**`belief_agi_timeline`** (pick ONE):
- Already here — already here/emerging
- 2-3 years — within 2-3 years
- 5-10 years — within 5-10 years
- 10-25 years
- 25+ years or never
- Ill-defined — considers the concept ill-defined
- Unknown — not publicly stated

**`belief_ai_risk`** (pick ONE):
- Overstated — hype will fade
- Manageable — real but manageable (like previous technologies)
- Serious — serious societal risks (labor, power, democracy)
- Catastrophic — potentially catastrophic (bioweapons, loss of control)
- Existential — threatens humanity's survival
- Mixed/nuanced — describe in notes
- Unknown — not publicly stated

**`belief_threat_models`** (pick up to 3, comma-separated):
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

**`belief_evidence_source`** (pick ONE):
- Explicitly stated — speeches, testimony, writing
- Inferred — from actions/funding/affiliations
- Unknown

### Belief Field Cleanup Task

**The live DB contains non-canonical belief values** written by Claude during prior enrichment passes. Normalize these:

| Column | Dirty Values | Action |
|--------|--------------|--------|
| `belief_regulatory_stance` | Various non-standard strings | Map to canonical values above or set NULL |
| `belief_ai_risk` | Various non-standard strings | Map to canonical values above or set NULL |
| `belief_agi_timeline` | "Ill-defined", "Ill-defined concept" | Map to "Ill-defined" or "Unknown" |

Run a query to find distinct values and map them to the canonical options listed above.

---

## Questions?

If anything is unclear, ask before proceeding. We'd rather answer questions upfront than review incorrect work later.

Good luck!
