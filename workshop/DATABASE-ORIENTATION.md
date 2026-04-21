# Workshop Database Orientation

This guide explains how to read and write data during the workshop, including quality standards and best practices.

---

## Overview

There are two databases. Most workshop participants work on **staging**, a complete copy of production data that you can freely modify without affecting the live site. The **debugging team** has read-only access to production to test the contribute form and see how real submissions flow through the system.

| Database             | Purpose                     | Who                                         | Access     |
| -------------------- | --------------------------- | ------------------------------------------- | ---------- |
| `mappingai_workshop` | Staging - experiment freely | Data Enrichment, Data Quality, Data Seeding | Read/Write |
| `mappingai`          | Production - the live site  | Debugging team                              | Read-only  |

**Check your .env file** to confirm which database you're connected to.

---

## What Good Notes Look Like

Notes should answer: **"Why does this person/org/resource matter to the U.S. AI policy landscape?"**

**Important:** Notes are public-facing. Write clean prose WITHOUT inline citations like [1], [2], [6,7]. Source URLs go in the separate `notes_sources` field.

**Bad (too thin):**

> "Jennifer Pahlka is the founder of Code for America."

**Good (comprehensive):**

> "Jennifer Pahlka founded Code for America in 2009 and served as U.S. Deputy Chief Technology Officer under President Obama (2013-2014). Her 2023 book 'Recoding America' critiques federal technology procurement and has influenced AI governance discussions around government AI adoption. She advocates for iterative, human-centered approaches to public sector technology deployment."

---

## Database Schema

The database has **3 main tables**:

### `entity` - People, Organizations, Resources

| Column               | Type     | Description                                                 |
| -------------------- | -------- | ----------------------------------------------------------- |
| `id`                 | integer  | Primary key                                                 |
| `entity_type`        | text     | `person`, `organization`, or `resource`                     |
| `name`               | text     | Person/org name                                             |
| `title`              | text     | Job title (person) or tagline (org)                         |
| `category`           | text     | Primary role/sector (see Reference section)                 |
| `other_categories`   | text     | Additional categories, comma-separated                      |
| `primary_org`        | text     | Person's main organization                                  |
| `other_orgs`         | text     | Other affiliations with context                             |
| `location`           | text     | City, State or multiple cities                              |
| `website`            | text     | URL (orgs only)                                             |
| `funding_model`      | text     | Funding type (orgs only)                                    |
| `parent_org_id`      | integer  | FK to parent org (orgs only)                                |
| `influence_type`     | text     | How they influence AI policy, comma-separated               |
| `twitter`            | text     | Twitter/X handle                                            |
| `bluesky`            | text     | Bluesky handle                                              |
| `notes`              | text     | Plain text description (2-4 sentences, NO inline citations) |
| `notes_html`         | text     | Rich text (HTML) with @mentions                             |
| `notes_sources`      | text     | JSON array of URLs or citations                             |
| `notes_confidence`   | smallint | 1-5 quality rating from enrichment                          |
| `thumbnail_url`      | text     | Profile image URL                                           |
| `importance`         | smallint | 1-5 importance rating (how central to AI policy)            |
| `status`             | text     | `approved`, `pending`, or `internal`                        |
| `qa_approved`        | boolean  | Must be true to appear on map                               |
| `enrichment_version` | text     | `v2`, `v2-auto`, etc.                                       |

**Belief/stance columns:**

| Column                            | Type | Description                               |
| --------------------------------- | ---- | ----------------------------------------- |
| `belief_regulatory_stance`        | text | Position on AI regulation (see Reference) |
| `belief_regulatory_stance_detail` | text | Evidence/quotes supporting the stance     |
| `belief_evidence_source`          | text | `Explicitly stated` or `Inferred`         |
| `belief_agi_timeline`             | text | When they think AGI arrives               |
| `belief_ai_risk`                  | text | How seriously they take AI risk           |
| `belief_threat_models`            | text | Top concerns, comma-separated             |

**Resource-specific columns:**

| Column                  | Type | Description                           |
| ----------------------- | ---- | ------------------------------------- |
| `resource_title`        | text | Title of the resource                 |
| `resource_url`          | text | Link to the resource                  |
| `resource_type`         | text | Essay, Book, Report, etc.             |
| `resource_author`       | text | Author name(s)                        |
| `resource_year`         | text | Publication year                      |
| `resource_category`     | text | AI Safety, AI Governance, etc.        |
| `resource_key_argument` | text | 1-2 sentence summary of main argument |

### `edge` - Relationships

Connections between entities. Each edge has a **direction**: source → target.

| Column       | Type     | Description                                        |
| ------------ | -------- | -------------------------------------------------- |
| `id`         | integer  | Primary key                                        |
| `source_id`  | integer  | FK → entity (the "from" entity)                    |
| `target_id`  | integer  | FK → entity (the "to" entity)                      |
| `edge_type`  | text     | Type of relationship (see Reference)               |
| `role`       | text     | Role in relationship (e.g., "CEO", "Board Member") |
| `is_primary` | boolean  | Is this the person's main/current affiliation?     |
| `start_date` | text     | When relationship began (YYYY or YYYY-MM)          |
| `end_date`   | text     | When it ended (NULL = ongoing)                     |
| `evidence`   | text     | Quote or description proving this relationship     |
| `source_url` | text     | URL or citation                                    |
| `confidence` | smallint | 1-5 confidence rating                              |
| `created_by` | text     | `system`, `manual`, `enrich-v2`, etc.              |

**Direction matters:**

- "Sam Altman employed_by OpenAI" → source: Sam Altman, target: OpenAI
- "Anthropic spun_out_from OpenAI" → source: Anthropic, target: OpenAI
- For symmetric relationships like `collaborator`, create edges in both directions

**`is_primary` explained:**

- `true` = This is the person's primary, current affiliation (their main job)
- `false` = Secondary affiliation (advisory roles, board seats, past positions)

### `submission` - Pending Contributions

Form submissions waiting for review. Same columns as `entity` plus `submitter_email`, `submitter_relationship`, `status`, `llm_review`.

---

## Exemplary Entries

Below are examples of well-filled entities based on actual high-quality work.

### Person Example: Marc Benioff

```json
{
  "id": 1123,
  "entity_type": "person",
  "name": "Marc Benioff",
  "title": "Chair, CEO, and Co-Founder of Salesforce",
  "category": "Executive",
  "other_categories": null,
  "primary_org": "Salesforce",
  "other_orgs": "Owner and Co-Chairman of Time magazine, World Economic Forum Board of Trustees member",
  "location": "San Francisco, CA",
  "influence_type": "Decision-maker, Narrator, Builder",
  "twitter": "@Benioff",
  "bluesky": null,
  "notes": "Marc Benioff is the co-founder, chairman, and CEO of Salesforce, which has invested heavily in AI through its Einstein AI platform and Agentforce autonomous agent product line. He has been one of the most vocal major tech CEOs calling for AI regulation, stating at the 2026 World Economic Forum in Davos that AI models 'became suicide coaches' and arguing that Section 230 must be reformed so that companies are held accountable for harmful AI outputs. Under his leadership, Salesforce cut approximately 4,000 customer service roles due to AI automation and paused hiring software engineers for FY2026, making Benioff a central figure in debates about AI's impact on employment.",
  "notes_sources": [
    "https://www.cnbc.com/2026/01/20/salesforce-benioff-ai-regulation-suicide-coaches.html",
    "https://fortune.com/2025/09/02/salesforce-ceo-billionaire-marc-benioff-ai-agents-jobs-layoffs-customer-service-sales/",
    "https://en.wikipedia.org/wiki/Marc_Benioff"
  ],
  "belief_regulatory_stance": "Targeted",
  "belief_regulatory_stance_detail": "Called for AI regulation at the 2026 World Economic Forum, arguing 'it can't be just growth at any cost.' Advocates for reforming Section 230 so tech companies are liable for harmful AI outputs.",
  "belief_evidence_source": "Explicitly stated",
  "belief_agi_timeline": "Unknown",
  "belief_ai_risk": "Serious",
  "belief_threat_models": "Labor displacement, Misinformation, Power concentration"
}
```

### Organization Example: Anduril Industries

```json
{
  "id": 1058,
  "entity_type": "organization",
  "name": "Anduril Industries",
  "category": "Infrastructure & Compute",
  "other_categories": "Deployers & Platforms",
  "website": "https://www.anduril.com",
  "funding_model": "Venture-backed",
  "parent_org_id": null,
  "location": "Costa Mesa, CA",
  "influence_type": "Builder, Decision-maker",
  "twitter": "@anduriltech",
  "notes": "Anduril Industries is a defense technology company founded in 2017 by Palmer Luckey that develops AI-powered autonomous systems for the U.S. military and allied forces. Its products include counter-drone systems, autonomous surveillance platforms, and the Lattice networked command-and-control software. Anduril entered a strategic partnership with OpenAI in December 2024 to integrate advanced AI models into counter-unmanned aircraft systems, marking a significant expansion of commercial AI into military applications.",
  "notes_sources": [
    "https://www.anduril.com/news/anduril-partners-with-openai",
    "https://en.wikipedia.org/wiki/Anduril_Industries"
  ],
  "belief_regulatory_stance": "Light-touch",
  "belief_regulatory_stance_detail": "Supports streamlined defense procurement and advocates for integrating commercial AI into military systems without restrictive regulation.",
  "belief_evidence_source": "Inferred",
  "belief_agi_timeline": "Unknown",
  "belief_ai_risk": "Manageable",
  "belief_threat_models": "Weapons, Cybersecurity"
}
```

### Edge Examples

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
    "source_url": "https://www.anthropic.com/company"
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
    "source_url": "https://www.anthropic.com/company"
  }
]
```

---

## Setup

### 1. Get your .env file

Your facilitator will provide one of these files:

| Stream                    | File              | Database Access        |
| ------------------------- | ----------------- | ---------------------- |
| Data Enrichment / Quality | `.env.enrichment` | Staging (read/write)   |
| Data Seeding              | `.env.seeding`    | Staging (read/write)   |
| Debugging                 | `.env.debugging`  | Production (read-only) |

> ⚠️ **NEVER commit or push your .env file.** It contains database passwords and API keys. Do not paste its contents into commit messages, pull requests, Slack, or any shared location. The `.env` files are gitignored, but be vigilant - leaked credentials require rotating all affected passwords and keys.

### 2. Place the .env file

```bash
cd mapping-ai
cp /path/to/.env.enrichment .env
pnpm install --frozen-lockfile
```

### 3. Verify your connection

```bash
source .env
psql $DATABASE_URL -c "SELECT COUNT(*) FROM entity"
```

---

## Reading Data

### Basic queries

```sql
-- Count entities by type
SELECT entity_type, COUNT(*)
FROM entity WHERE status = 'approved'
GROUP BY entity_type;

-- Find people at a specific org
SELECT name, title, category
FROM entity
WHERE entity_type = 'person'
  AND primary_org ILIKE '%anthropic%';

-- Find all edges for a person
SELECT e.name as source, t.name as target, ed.edge_type, ed.role
FROM edge ed
JOIN entity e ON ed.source_id = e.id
JOIN entity t ON ed.target_id = t.id
WHERE e.name = 'Dario Amodei';

-- Find entities missing notes
SELECT id, name, entity_type, category
FROM entity
WHERE status = 'approved'
  AND (notes IS NULL OR notes = '')
LIMIT 50;

-- Find notes with citation artifacts
SELECT id, name, LEFT(notes, 100)
FROM entity
WHERE notes ~ '\[\d+\]'
LIMIT 20;
```

---

## Writing Data

### Insert a new entity

**Complete person example:**

```sql
INSERT INTO entity (
  entity_type, name, title, category, other_categories,
  primary_org, other_orgs, location, influence_type,
  twitter, bluesky,
  notes, notes_sources, notes_confidence, importance,
  belief_regulatory_stance, belief_regulatory_stance_detail,
  belief_evidence_source, belief_agi_timeline, belief_ai_risk, belief_threat_models,
  status, qa_approved
) VALUES (
  'person',
  'Alondra Nelson',
  'Harold F. Linder Professor at the Institute for Advanced Study',
  'Academic',
  'Policymaker',
  'Institute for Advanced Study',
  'Former Deputy Assistant to President Biden for Science and Society; former acting director of OSTP',
  'Princeton, NJ',
  'Decision-maker, Researcher/analyst, Narrator',
  '@alikiniki',
  NULL,
  'Alondra Nelson served as Deputy Assistant to President Biden and acting director of the White House Office of Science and Technology Policy (2021-2023), where she led the development of the Blueprint for an AI Bill of Rights. A sociologist of science and technology, she has shaped federal AI policy through her emphasis on civil rights, equity, and democratic values. Her academic work focuses on the social dimensions of science and technology, particularly their impact on marginalized communities.',
  '["https://www.whitehouse.gov/ostp/news-updates/2022/10/04/blueprint-for-an-ai-bill-of-rights/", "https://www.ias.edu/scholars/alondra-nelson"]',
  4,
  4,
  'Moderate',
  'Led development of the AI Bill of Rights, which calls for protections against algorithmic discrimination, data privacy, and notice when AI is used in consequential decisions.',
  'Explicitly stated',
  'Unknown',
  'Serious',
  'Power concentration, Democratic erosion, Labor displacement',
  'approved',
  true
);
```

**Complete organization example:**

```sql
INSERT INTO entity (
  entity_type, name, category, other_categories,
  website, funding_model, location, influence_type,
  twitter, bluesky,
  notes, notes_sources, notes_confidence, importance,
  belief_regulatory_stance, belief_regulatory_stance_detail,
  belief_evidence_source, belief_agi_timeline, belief_ai_risk, belief_threat_models,
  status, qa_approved
) VALUES (
  'organization',
  'Center for AI Safety',
  'AI Safety/Alignment',
  NULL,
  'https://www.safe.ai',
  'Philanthropic',
  'San Francisco, CA',
  'Researcher/analyst, Narrator, Organizer/advocate',
  '@CenterAISafety',
  NULL,
  'The Center for AI Safety (CAIS) is a nonprofit research and advocacy organization focused on reducing societal-scale risks from AI. CAIS authored the widely-signed 2023 Statement on AI Risk ("Mitigating the risk of extinction from AI should be a global priority...") which was endorsed by hundreds of AI researchers and tech leaders. The organization conducts technical AI safety research and provides resources for policymakers and the public.',
  '["https://www.safe.ai/work/statement-on-ai-risk", "https://www.safe.ai/about"]',
  5,
  4,
  'Restrictive',
  'Advocates for external oversight of frontier AI development and has called for treating advanced AI systems as potential catastrophic risks requiring strong governance.',
  'Explicitly stated',
  '5-10 years',
  'Catastrophic',
  'Loss of control, Existential risk, Power concentration',
  'approved',
  true
);
```

### Update an existing entity

```sql
UPDATE entity
SET
  notes = 'Updated bio here...',
  notes_sources = '["https://source1.com", "https://source2.com"]',
  belief_regulatory_stance = 'Moderate'
WHERE id = 123;
```

### Add a relationship (edge)

**Person → Organization (employment):**

```sql
-- First, find the entity IDs
SELECT id, name FROM entity WHERE name ILIKE '%alondra nelson%';  -- returns 1234
SELECT id, name FROM entity WHERE name ILIKE '%institute for advanced study%';  -- returns 567

-- Then create the edge
INSERT INTO edge (
  source_id, target_id, edge_type, role, is_primary,
  start_date, end_date, evidence, source_url, confidence, created_by
) VALUES (
  1234,  -- Alondra Nelson
  567,   -- Institute for Advanced Study
  'employed_by',
  'Harold F. Linder Professor',
  true,  -- This is her current primary position
  '2023',
  NULL,  -- Still there (no end date)
  'Joined IAS as professor after leaving OSTP in 2023',
  'https://www.ias.edu/scholars/alondra-nelson',
  5,
  'workshop'
);
```

**Person → Person (collaboration):**

```sql
INSERT INTO edge (
  source_id, target_id, edge_type, evidence, source_url, confidence, created_by
) VALUES (
  1234,  -- Person A
  5678,  -- Person B
  'collaborator',
  'Co-authored "AI Governance Framework" paper in 2025',
  'https://example.com/paper',
  4,
  'workshop'
);

-- For symmetric relationships like collaborator, add the reverse edge too
INSERT INTO edge (source_id, target_id, edge_type, evidence, source_url, confidence, created_by)
VALUES (5678, 1234, 'collaborator', 'Co-authored "AI Governance Framework" paper in 2025',
        'https://example.com/paper', 4, 'workshop');
```

---

## Testing Locally

To see your changes on the map:

### 1. Export map data from staging

```bash
source .env
node scripts/export-map-data.js
# Creates map-data.json in project root
```

### 2. Run a local server

```bash
npx serve .
# Or: python3 -m http.server 8000
```

### 3. View the map

Open http://localhost:3000/map.html - it loads the local `map-data.json`.

### 4. Refresh after changes

```bash
node scripts/export-map-data.js
# Refresh browser
```

---

## Reference: Field Options

### Person Categories (`category`) - pick ONE

Executive, Researcher, Policymaker, Investor, Organizer, Journalist, Academic, Cultural figure

### Organization Categories (`category`) - pick ONE

Frontier Lab, AI Safety/Alignment, Think Tank/Policy Org, Government/Agency, Academic, VC/Capital/Philanthropy, Labor/Civil Society, Ethics/Bias/Rights, Media/Journalism, Political Campaign/PAC, Infrastructure & Compute, Deployers & Platforms

### Resource Categories (`resource_category`) - pick ONE

AI Safety, AI Governance, AI Capabilities, Labor & Economy, National Security, Industry Analysis, Policy Proposal, Technical, Philosophy/Ethics

### Resource Types (`resource_type`) - pick ONE

Essay, Book, Report, Podcast, Video, Website, Academic Paper, News Article, Substack/Newsletter

### Funding Model (`funding_model`) - Organizations only

Venture-backed, Revenue-generating, Government-funded, Philanthropic, Membership/dues-based, Mixed, Public benefit corp, Self-funded/endowed, Other

### Regulatory Stance (`belief_regulatory_stance`)

| Value         | Description                                       |
| ------------- | ------------------------------------------------- |
| Accelerate    | Minimal/no regulation                             |
| Light-touch   | Voluntary, self-governance                        |
| Targeted      | Sector-specific rules, not broad R&D restrictions |
| Moderate      | Mandatory safety evals + transparency             |
| Restrictive   | External oversight of compute, training runs      |
| Precautionary | Pause/moratorium until governance catches up      |
| Nationalize   | Nationalize/public control                        |
| Mixed/unclear | No clear position                                 |

### AGI Timeline (`belief_agi_timeline`)

Already here, 2-3 years, 5-10 years, 10-25 years, 25+ years or never, Unknown

### AI Risk Level (`belief_ai_risk`)

Overstated, Manageable, Serious, Catastrophic, Existential, Unknown

### Threat Models (`belief_threat_models`) - comma-separated, pick up to 3

Loss of control, Power concentration, Labor displacement, Cybersecurity, Weapons, Misinformation, Economic inequality, Democratic erosion, Environmental, Existential risk, Copyright/IP

### Influence Type (`influence_type`) - comma-separated

Decision-maker, Researcher/analyst, Builder, Narrator, Connector/convener, Advisor/strategist, Funder/investor, Organizer/advocate, Implementer

### Evidence Source (`belief_evidence_source`)

| Value             | Description                                                                       |
| ----------------- | --------------------------------------------------------------------------------- |
| Explicitly stated | Direct quotes from speeches, testimony, writing, interviews                       |
| Inferred          | Deduced from actions, funding patterns, affiliations, or organizational positions |
| Unknown           | No clear evidence either way                                                      |

### Edge Types

**Person → Organization:**
| Edge Type | Description |
|-----------|-------------|
| `employed_by` | Current or past employment (use `is_primary` + dates to distinguish) |
| `founded` | Founded or co-founded the organization |
| `advises` | Formal advisory role |
| `board_member` | Board of directors or similar governing body |
| `invested_in` | Personal investment in the organization |
| `affiliated` | General affiliation (fellowships, visiting positions, memberships) |

**Person → Person:**
| Edge Type | Description |
|-----------|-------------|
| `co_founded_with` | Co-founded a company or organization together |
| `collaborator` | Ongoing professional collaboration (research, advocacy, etc.) |
| `mentor_of` | Mentorship relationship (source mentors target) |
| `mentored_by` | Reverse mentorship (source was mentored by target) |
| `former_colleague` | Previously worked together |
| `critic_of` | Publicly criticized (must have evidence) |
| `supporter_of` | Publicly endorsed or supported |

**Organization → Organization:**
| Edge Type | Description |
|-----------|-------------|
| `subsidiary_of` | Wholly or majority owned by parent org |
| `funded_by` | Receives significant funding from another org |
| `partner_of` | Formal partnership or alliance |
| `spun_out_from` | Originated from another organization |
| `affiliated` | General affiliation (membership, consortium, etc.) |

**Resource → Person/Org:**
| Edge Type | Description |
|-----------|-------------|
| `authored_by` | Resource was written/created by this person |
| `published_by` | Resource was published by this organization |

**Custom edge types:** If none of the above fit, you may propose a new edge type. Use lowercase with underscores (e.g., `acquired_by`). Document the rationale in the `evidence` field. New types should be rare - most relationships fit existing categories.

### Importance (`importance`) - 1-5 scale, relative to the U.S. AI policy stakeholder map

| Value | Meaning                                                                | Examples                                                                 |
| ----- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 5     | **Essential** - Cannot tell the story of U.S. AI policy without them   | Sam Altman, Dario Amodei, Senators Schumer/Hawley, NIST                  |
| 4     | **Major** - Significant ongoing influence, recognized across the field | CEOs of major AI companies, key congressional staff, leading researchers |
| 3     | **Notable** - Meaningful contributions, known within AI policy circles | Mid-tier org leaders, prolific researchers, state-level policymakers     |
| 2     | **Minor** - Some relevance, limited visibility outside their niche     | Junior staff, emerging voices, smaller orgs                              |
| 1     | **Peripheral** - Tangential connection, included for completeness      | One-time commentators, orgs with minor AI involvement                    |

**Calibration tip:** Ask "How often does this person/org come up in AI policy conversations?" Score 5 = constantly, score 1 = rarely.

### Confidence (`notes_confidence`, `edge.confidence`) - 1-5 scale

| Value | Meaning                                           |
| ----- | ------------------------------------------------- |
| 5     | Highly confident - multiple authoritative sources |
| 4     | Confident - verified against primary source       |
| 3     | Moderate - verified but some ambiguity            |
| 2     | Low - limited sourcing, may need verification     |
| 1     | Very low - speculative, needs verification        |

---

## Tips

1. **Always check your DATABASE_URL** - make sure you're on staging, not production.

2. **Use transactions** for multi-step changes:

   ```sql
   BEGIN;
   UPDATE entity SET notes = 'new notes' WHERE id = 123;
   SELECT * FROM entity WHERE id = 123;  -- check result
   COMMIT;  -- or ROLLBACK if wrong
   ```

3. **The staging database is yours** - don't worry about breaking things.

4. **Re-export after changes** - the map reads from `map-data.json`, not the database.

5. **When in doubt, remove unverifiable claims** - accuracy > completeness.

---

## Questions?

Ask your facilitator or check the full schema documentation in `docs/DATABASE.md`.
