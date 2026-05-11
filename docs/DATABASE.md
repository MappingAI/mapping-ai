# Database Schema Documentation

This document describes the PostgreSQL database schema, form fields and their options, data flow from form submission to map display, and field mappings.

## Overview

The database has **3 tables**:

- `entity` — Approved people, organizations, and resources displayed on the map
- `submission` — Pending/approved form submissions (crowdsourced data)
- `edge` — Relationships between entities (affiliations, funding, collaborations, etc.)

## Data Flow

```
User submits form (contribute.html)
    ↓
POST /submit API (api/submit.js)
    ↓
INSERT into `submission` table (status='pending')
    ↓
Admin approves via admin.html
    ↓
DB trigger creates `entity` row, sets submission.entity_id
    ↓
export-map-data.js generates map-data.json
    ↓
map.html loads JSON (no live DB queries)
```

---

# Form Fields Reference

## Person Form

### Submitter Relationship

**DB Column:** `submitter_relationship`
**Selection:** Single-select (pill toggle)
**Options:**
| Value | Label |
|-------|-------|
| `self` | I am this person |
| `connector` | I can connect you |
| `external` | Someone I know of |

### Name

**DB Column:** `name`
**Type:** Free text (required)

### Primary Role

**DB Column:** `category`
**Selection:** Single-select dropdown
**Options:**
| Value | Description |
|-------|-------------|
| `Executive` | CEO, CTO, founder |
| `Researcher` | Academic, lab scientist |
| `Policymaker` | Legislator, regulator |
| `Investor` | VC, philanthropist, funder |
| `Organizer` | Activist, advocate, union |
| `Journalist` | Reporter, podcaster, author |
| `Academic` | Professor, think tank fellow |
| `Cultural figure` | Public intellectual |

### Additional Roles

**DB Column:** `other_categories`
**Selection:** Multi-select tag dropdown
**Options:** Same as Primary Role
**Storage:** Comma-separated string

### Title

**DB Column:** `title`
**Type:** Free text (job title)

### Primary Organization

**DB Column:** `primary_org`
**Type:** Search autocomplete (looks up existing entities in DB)

### Additional Affiliated Orgs

**DB Column:** `other_orgs`
**Type:** Free text or search autocomplete

### Location

**DB Column:** `location`
**Type:** Search autocomplete (Photon/OpenStreetMap geocoding)
**Selection:** Multi-city tags allowed

### Regulatory Stance

**DB Column:** `belief_regulatory_stance`
**Selection:** Single-select dropdown (click again to deselect)
**Score Column:** `belief_regulatory_stance_score` (1-7, NULL for non-scored options)
**Options:**
| Score | Value | Description |
|-------|-------|-------------|
| 1 | `Accelerate` | Minimal/no regulation |
| 2 | `Light-touch` | Voluntary, self-governance |
| 3 | `Targeted` | Sector-specific rules, not broad R&D restrictions |
| 4 | `Moderate` | Mandatory safety evals + transparency |
| 5 | `Restrictive` | External oversight of compute, training runs |
| 6 | `Precautionary` | Pause/moratorium until governance catches up |
| 7 | `Nationalize` | Nationalize/public control |
| NULL | `Mixed/unclear` | No clear position |
| NULL | `Other` | Describe in notes |

### Regulatory Stance Detail

**DB Column:** `belief_regulatory_stance_detail`
**Type:** Free text (evidence, quotes, context)

### Evidence Source

**DB Column:** `belief_evidence_source`
**Selection:** Single-select dropdown
**Options:**
| Value | Description |
|-------|-------------|
| `Explicitly stated` | Speeches, testimony, writing |
| `Inferred` | Inferred from actions/funding/affiliation |

### AGI Timeline Belief

**DB Column:** `belief_agi_timeline`
**Selection:** Single-select dropdown (click again to deselect)
**Score Column:** `belief_agi_timeline_score` (1-5, NULL for non-scored options)
**Options:**
| Score | Value | Description |
|-------|-------|-------------|
| 1 | `Already here` | Already here/emerging |
| 2 | `2-3 years` | Within 2-3 years |
| 3 | `5-10 years` | Within 5-10 years |
| 4 | `10-25 years` | 10-25 years |
| 5 | `25+ years or never` | 25+ years or never |
| NULL | `Ill-defined` | Considers the concept ill-defined |
| NULL | `Unknown` | Unknown/not publicly stated |

### AI Risk Level

**DB Column:** `belief_ai_risk`
**Selection:** Single-select dropdown (click again to deselect)
**Score Column:** `belief_ai_risk_score` (1-5, NULL for non-scored options)
**Options:**
| Score | Value | Description |
|-------|-------|-------------|
| 1 | `Overstated` | Hype will fade |
| 2 | `Manageable` | Real but manageable (like previous technologies) |
| 3 | `Serious` | Serious societal risks (labor, power, democracy) |
| 4 | `Catastrophic` | Potentially catastrophic (bioweapons, loss of control) |
| 5 | `Existential` | Existential (threatens humanity's survival) |
| NULL | `Mixed/nuanced` | Describe in notes |
| NULL | `Unknown` | Unknown/not publicly stated |

### Key Concerns (Threat Models)

**DB Column:** `belief_threat_models`
**Selection:** Multi-select (top 3 recommended)
**Storage:** Comma-separated string
**Options:**

- Labor displacement/unemployment
- Concentration of corporate/state power
- Cybersecurity threats
- Environmental harm (energy/water)
- Loss of human control
- Existential/civilizational risk
- Economic inequality
- Democratic erosion/surveillance
- Misinformation/deepfakes
- Weapons proliferation (bio, autonomous)
- Copyright/IP/creative economy

### Influence Type

**DB Column:** `influence_type`
**Selection:** Multi-select (all that apply)
**Storage:** Comma-separated string
**Options:**
| Value | Description |
|-------|-------------|
| `Decision-maker` | Legislator, regulator |
| `Researcher/analyst` | Research and analysis |
| `Builder` | Develops AI systems |
| `Narrator` | Journalist, author, podcaster |
| `Connector/convener` | Brings people together |
| `Advisor/strategist` | Advisory roles |
| `Funder/investor` | Funds AI development or policy |
| `Organizer/advocate` | Activism and advocacy |
| `Implementer` | Executes policy/deploys AI |

### Twitter/X

**DB Column:** `twitter`
**Type:** Free text (handle)

### Bluesky

**DB Column:** `bluesky`
**Type:** Search autocomplete (Bluesky API)

### Notes

**DB Column:** `notes` (plain text), `notes_html` (rich text), `notes_mentions` (JSONB)
**Type:** Rich text editor (TipTap) with @mentions
**Purpose:** Biographical info, relationships, context. **Edges are created via @mentions here.**

---

## Organization Form

### Submitter Relationship

**DB Column:** `submitter_relationship`
**Selection:** Single-select (pill toggle)
**Options:**
| Value | Label |
|-------|-------|
| `self` | I represent this org |
| `connector` | I can connect you |
| `external` | An org I know of |

### Organization Name

**DB Column:** `name`
**Type:** Free text (required)

### Primary Category

**DB Column:** `category`
**Selection:** Single-select dropdown
**Options:**
| Value | Description |
|-------|-------------|
| `Frontier Lab` | Major AI research labs (OpenAI, Anthropic, DeepMind, etc.) |
| `Infrastructure & Compute` | Cloud, chips, data centers |
| `Deployers & Platforms` | Companies deploying AI products |
| `AI Safety/Alignment` | Safety research organizations |
| `Think Tank/Policy Org` | Policy research and advocacy |
| `Government/Agency` | Government bodies and agencies |
| `Academic` | Universities and research institutions |
| `VC/Capital/Philanthropy` | Investors and funders |
| `Labor/Civil Society` | Unions, civil society organizations |
| `Ethics/Bias/Rights` | AI ethics and rights organizations |
| `Media/Journalism` | News and media organizations |
| `Political Campaign/PAC` | Political campaigns and PACs |

### Additional Categories

**DB Column:** `other_categories`
**Selection:** Multi-select tag dropdown
**Options:** Same as Primary Category
**Storage:** Comma-separated string

### Website

**DB Column:** `website`
**Type:** Free text (URL)

### Parent Organization

**DB Column:** `parent_org_id`
**Type:** Search autocomplete (looks up existing orgs in DB)
**Storage:** Integer FK to entity.id

### HQ/Primary Location

**DB Column:** `location`
**Type:** Search autocomplete (Photon/OpenStreetMap)
**Selection:** Multi-city tags allowed, includes "Remote" option

### Funding Model

**DB Column:** `funding_model`
**Selection:** Single-select dropdown
**Options:**
| Value | Description |
|-------|-------------|
| `Philanthropic` | Foundation/donor funded |
| `Government` | Government funded |
| `VC-backed` | Venture capital funded |
| `Corporate` | Corporate/commercial revenue |
| `Academic` | University/endowment funded |
| `Membership` | Member dues funded |
| `Self-funded` | Bootstrapped/founder funded |
| `Political/PAC` | Political action committees, Super PACs |
| `Mixed` | Multiple funding types |

### Regulatory Stance

**DB Column:** `belief_regulatory_stance`
**Selection:** Single-select dropdown
**(Same options as Person form)**

### Evidence Source

**DB Column:** `belief_evidence_source`
**Selection:** Single-select dropdown
**(Same options as Person form)**

### AGI Timeline Belief

**DB Column:** `belief_agi_timeline`
**Selection:** Single-select dropdown
**(Same options as Person form)**

### AI Risk Level

**DB Column:** `belief_ai_risk`
**Selection:** Single-select dropdown
**(Same options as Person form)**

### Key Concerns (Threat Models)

**DB Column:** `belief_threat_models`
**Selection:** Multi-select (top 3 recommended)
**(Same options as Person form)**

### Influence Type

**DB Column:** `influence_type`
**Selection:** Multi-select (all that apply)
**(Same options as Person form)**

### Twitter/X

**DB Column:** `twitter`
**Type:** Free text (handle)

### Bluesky

**DB Column:** `bluesky`
**Type:** Free text (handle)

### Notes

**DB Column:** `notes`, `notes_html`, `notes_mentions`
**Type:** Rich text editor with @mentions
**Purpose:** Org description, key people, relationships. **Edges are created via @mentions here.**

---

## Resource Form

### Submitter Relationship

**DB Column:** `submitter_relationship`
**Selection:** Single-select (pill toggle)
**Options:**
| Value | Label |
|-------|-------|
| `self` | I am the author |
| `external` | A resource I found |

### Title

**DB Column:** `resource_title`
**Type:** Free text (required)

### Author(s)

**DB Column:** `resource_author`
**Type:** Search autocomplete (looks up existing people in DB)

### Affiliated Organizations

**DB Column:** (stored via edges)
**Type:** Search autocomplete

### Resource Type

**DB Column:** `resource_type`
**Selection:** Single-select dropdown
**Options:**

- Essay
- Book
- Report
- Podcast
- Video
- Website
- Academic Paper
- News Article
- Substack/Newsletter

### URL

**DB Column:** `resource_url`
**Type:** Free text (URL, required)

### Year

**DB Column:** `resource_year`
**Type:** Free text (year)

### Category

**DB Column:** `resource_category`
**Selection:** Single-select dropdown
**Options:**

- AI Safety
- AI Governance
- AI Capabilities
- Labor & Economy
- National Security
- Industry Analysis
- Policy Proposal
- Technical
- Philosophy/Ethics

### Regulatory Stance

**DB Column:** `belief_regulatory_stance`
**Selection:** Single-select dropdown
**(Same options as Person form)**

### AGI Timeline Belief

**DB Column:** `belief_agi_timeline`
**Selection:** Single-select dropdown
**(Same options as Person form)**

### AI Risk Level

**DB Column:** `belief_ai_risk`
**Selection:** Single-select dropdown
**(Same options as Person form)**

### Key Argument

**DB Column:** `resource_key_argument`
**Type:** Free text (1-2 sentences summarizing the main argument)

### Notes

**DB Column:** `notes`, `notes_html`, `notes_mentions`
**Type:** Rich text editor with @mentions
**Purpose:** Why it matters, who it influenced, context

---

# Database Tables

## Table: `entity`

Stores approved entities displayed on the map.

| Column             | Type        | Description                               |
| ------------------ | ----------- | ----------------------------------------- |
| `id`               | SERIAL      | Primary key                               |
| `entity_type`      | VARCHAR(20) | `person` \| `organization` \| `resource`  |
| `name`             | TEXT        | Person/org name                           |
| `title`            | TEXT        | Job title (person) or tagline (org)       |
| `category`         | TEXT        | Primary category                          |
| `other_categories` | TEXT        | Comma-separated secondary categories      |
| `primary_org`      | TEXT        | Person's main organization (display name) |
| `other_orgs`       | TEXT        | Other affiliations (free text)            |
| `website`          | TEXT        | URL                                       |
| `funding_model`    | TEXT        | Org funding type                          |
| `parent_org_id`    | INTEGER     | FK → entity (parent org)                  |
| `location`         | TEXT        | City, State or multi-city                 |
| `influence_type`   | TEXT        | Comma-separated values                    |
| `twitter`          | TEXT        | Twitter/X handle                          |
| `bluesky`          | TEXT        | Bluesky handle                            |
| `notes`            | TEXT        | Plain text notes/bio                      |
| `notes_html`       | TEXT        | Rich text (TipTap HTML)                   |
| `thumbnail_url`    | TEXT        | Profile image URL                         |
| `status`           | VARCHAR(20) | `approved` \| `pending` \| `internal`     |
| `qa_approved`      | BOOLEAN     | Must be true to appear on map             |

### Resource-specific columns

| Column                  | Type        | Description             |
| ----------------------- | ----------- | ----------------------- |
| `resource_title`        | TEXT        | Resource title          |
| `resource_category`     | TEXT        | Resource category       |
| `resource_author`       | TEXT        | Author name             |
| `resource_type`         | TEXT        | Type of resource        |
| `resource_url`          | TEXT        | Link to resource        |
| `resource_year`         | VARCHAR(10) | Publication year        |
| `resource_key_argument` | TEXT        | Summary of key argument |

### Belief/stance columns

| Column                            | Type | Description               |
| --------------------------------- | ---- | ------------------------- |
| `belief_regulatory_stance`        | TEXT | Label value               |
| `belief_regulatory_stance_detail` | TEXT | Evidence/quotes           |
| `belief_evidence_source`          | TEXT | How stance was determined |
| `belief_agi_timeline`             | TEXT | Timeline belief label     |
| `belief_ai_risk`                  | TEXT | Risk level label          |
| `belief_threat_models`            | TEXT | Comma-separated concerns  |

### Crowdsourced score aggregates (trigger-maintained)

| Column                          | Type    | Description                           |
| ------------------------------- | ------- | ------------------------------------- |
| `belief_regulatory_stance_wavg` | REAL    | Weighted average of submission scores |
| `belief_regulatory_stance_wvar` | REAL    | Weighted variance                     |
| `belief_regulatory_stance_n`    | INTEGER | Number of submissions with score      |
| `belief_agi_timeline_wavg`      | REAL    | Weighted average                      |
| `belief_agi_timeline_wvar`      | REAL    | Weighted variance                     |
| `belief_agi_timeline_n`         | INTEGER | Count                                 |
| `belief_ai_risk_wavg`           | REAL    | Weighted average                      |
| `belief_ai_risk_wvar`           | REAL    | Weighted variance                     |
| `belief_ai_risk_n`              | INTEGER | Count                                 |
| `submission_count`              | INTEGER | Total approved submissions            |

**Submission weights:** `self=10`, `connector=2`, `external=1`

### Enrichment columns

| Column               | Type     | Description                                                                  |
| -------------------- | -------- | ---------------------------------------------------------------------------- |
| `notes_confidence`   | SMALLINT | 1-5 quality rating from enrichment                                           |
| `notes_sources`      | TEXT     | JSON array of sources (URLs or citations like "Senate testimony, July 2023") |
| `enrichment_version` | TEXT     | `v2`, `v2-insufficient`, `v2-auto`                                           |
| `notes_v1`           | TEXT     | Previous enrichment notes                                                    |

### Search

| Column          | Type     | Description                           |
| --------------- | -------- | ------------------------------------- |
| `search_vector` | TSVECTOR | Full-text search index (auto-updated) |

---

## Table: `submission`

Stores form submissions before/after admin review.

| Column                   | Type         | Description                                |
| ------------------------ | ------------ | ------------------------------------------ |
| `id`                     | SERIAL       | Primary key                                |
| `entity_type`            | VARCHAR(20)  | `person` \| `organization` \| `resource`   |
| `entity_id`              | INTEGER      | FK → entity (NULL for new, set on approve) |
| `submitter_email`        | TEXT         | Submitter's email                          |
| `submitter_relationship` | VARCHAR(20)  | `self` \| `connector` \| `external`        |
| `contributor_key_id`     | INTEGER      | FK → contributor_keys (API submissions)    |
| `status`                 | VARCHAR(20)  | `pending` \| `approved` \| `rejected`      |
| `llm_review`             | JSONB        | Claude Haiku quality review                |
| `resolution_notes`       | TEXT         | Admin notes                                |
| `submitted_at`           | TIMESTAMPTZ  | Submission timestamp                       |
| `reviewed_at`            | TIMESTAMPTZ  | Review timestamp                           |
| `reviewed_by`            | VARCHAR(200) | Admin identifier                           |

All entity fields are duplicated plus:

| Column                           | Type     | Description               |
| -------------------------------- | -------- | ------------------------- |
| `belief_regulatory_stance_score` | SMALLINT | Numeric score 1-7         |
| `belief_agi_timeline_score`      | SMALLINT | Numeric score 1-5         |
| `belief_ai_risk_score`           | SMALLINT | Numeric score 1-5         |
| `notes_mentions`                 | JSONB    | @mention data from TipTap |

---

## Table: `edge`

Stores relationships between entities. Direction matters: edges flow FROM `source_id` TO `target_id`.

| Column       | Type         | Description                                                              |
| ------------ | ------------ | ------------------------------------------------------------------------ |
| `id`         | SERIAL       | Primary key                                                              |
| `source_id`  | INTEGER      | FK → entity (ON DELETE CASCADE) — the "from" entity                      |
| `target_id`  | INTEGER      | FK → entity (ON DELETE CASCADE) — the "to" entity                        |
| `edge_type`  | VARCHAR(50)  | Relationship type (see Edge Types below)                                 |
| `role`       | VARCHAR(200) | Role/title in relationship (e.g., "CEO", "Board Chair")                  |
| `is_primary` | BOOLEAN      | Is this the person's main affiliation? Default FALSE                     |
| `start_date` | VARCHAR(20)  | When relationship began (YYYY or YYYY-MM). Optional                      |
| `end_date`   | VARCHAR(20)  | When relationship ended (NULL = ongoing). Optional                       |
| `evidence`   | TEXT         | Source quote supporting this relationship                                |
| `source_url` | VARCHAR(500) | Source reference — URL or citation (e.g., "Senate testimony, July 2023") |
| `confidence` | SMALLINT     | 1-5 confidence rating (from enrichment scripts)                          |
| `created_by` | VARCHAR(50)  | `system`, `migration`, `enrich-v2`, `admin`, `manual`                    |
| `created_at` | TIMESTAMPTZ  | Creation timestamp                                                       |

**Unique constraint:** `(source_id, target_id, edge_type)`

### How Edge Directionality Works

Every edge has a **source** and **target**. The edge type describes the relationship **from source's perspective**.

```
source_id  →  edge_type  →  target_id
```

**Example:** To encode "Sam Altman works at OpenAI":

- `source_id`: Sam Altman (person)
- `target_id`: OpenAI (org)
- `edge_type`: `employer`

The frontend displays this bidirectionally:

- Viewing Sam Altman: "Works at OpenAI"
- Viewing OpenAI: "Employs Sam Altman"

### Edge Direction Examples

| Edge                                                           | Meaning                         |
| -------------------------------------------------------------- | ------------------------------- |
| `Sam Altman (source)` → `OpenAI (target)` with `employer`      | "Sam works at OpenAI"           |
| `Google (source)` → `Anthropic (target)` with `funder`         | "Google funds Anthropic"        |
| `Anthropic (source)` → `OpenAI (target)` with `parent_company` | "OpenAI is parent of Anthropic" |

**Note on symmetric relationships:** For `collaborator`, `partner`, and similar symmetric relationships, create edges in **both directions** so the relationship is visible from either entity.

**Note on dates:** `start_date` and `end_date` are optional. Include when available from sources, but many relationships won't have precise dates. Format: "2019" or "2019-03".

### Edge Types by Entity Combination

**Person → Organization:**
| Type | Source | Target | Meaning |
|------|--------|--------|---------|
| `employer` | Person | Org | Person works at org |
| `founder` | Person | Org | Person founded org |
| `member` | Person | Org | Person is member of org |
| `advisor` | Person | Org | Person advises org |
| `funder` | Person | Org | Person funds org |
| `affiliated` | Person | Org | General affiliation |
| `critic` | Person | Org | Person publicly criticizes org |
| `supporter` | Person | Org | Person publicly supports org |

**Organization → Organization:**
| Type | Source | Target | Meaning |
|------|--------|--------|---------|
| `funder` | Org A | Org B | Org A funds Org B |
| `partner` | Org A | Org B | Orgs are partners (create both directions) |
| `parent_company` | Parent | Subsidiary | Parent owns subsidiary |
| `collaborator` | Org A | Org B | Orgs collaborate (create both directions) |
| `member` | Org A | Org B | Org A is member of Org B |

**Person → Person:**
| Type | Source | Target | Meaning |
|------|--------|--------|---------|
| `collaborator` | Person A | Person B | They collaborate (create both directions) |
| `advisor` | Advisor | Advisee | Source advises target |
| `funder` | Funder | Recipient | Source funds target |
| `critic` | Critic | Target | Source criticizes target |
| `supporter` | Supporter | Target | Source supports target |

**Resource edges:**
| Type | Source | Target | Meaning |
|------|--------|--------|---------|
| `author` | Person | Resource | Person authored the resource |
| `publisher` | Org | Resource | Org published the resource |

---

## Table: `source` (claims-pilot branch)

Stores source metadata for claims and edge evidence.

| Column               | Type    | Description                           |
| -------------------- | ------- | ------------------------------------- |
| `source_id`          | VARCHAR | Primary key (hash of URL)             |
| `url`                | VARCHAR | Source URL                            |
| `title`              | VARCHAR | Human-readable title                  |
| `source_type`        | VARCHAR | Type of source (see values below)     |
| `date_published`     | DATE    | Publication date                      |
| `author`             | VARCHAR | Author name if available              |
| `cached_excerpt`     | TEXT    | Excerpt/citation from source          |
| `resource_entity_id` | INTEGER | FK → entity (if source is a resource) |

**source_type values:**

- `hearing` - Congressional/government hearing
- `bill` - Legislation
- `tweet` - Twitter/X post
- `op_ed` - Opinion editorial
- `interview` - Interview transcript
- `press_release` - Official press release
- `floor_speech` - Congressional floor speech
- `letter` - Open letter or correspondence
- `report` - Research report
- `paper` - Academic paper
- `blog` - Blog post
- `podcast` - Podcast episode
- `video` - Video content
- `crowdsourced` - Mapping AI submission

---

## Table: `claim` (claims-pilot branch)

Stores extracted belief claims with citations.

| Column             | Type    | Description                             |
| ------------------ | ------- | --------------------------------------- |
| `claim_id`         | VARCHAR | Primary key (entity_dimension_source)   |
| `entity_id`        | INTEGER | FK → entity                             |
| `entity_name`      | VARCHAR | Denormalized name                       |
| `entity_type`      | VARCHAR | person/organization/resource            |
| `belief_dimension` | VARCHAR | Belief dimension (see values below)     |
| `stance`           | VARCHAR | Text label from scale                   |
| `stance_score`     | INTEGER | Numeric score (null for AGI definition) |
| `stance_label`     | VARCHAR | Short display label                     |
| `definition_used`  | TEXT    | How entity defined the term (for AGI)   |
| `citation`         | TEXT    | Verbatim quote from source              |
| `source_id`        | VARCHAR | FK → source                             |
| `date_stated`      | DATE    | When entity made statement              |
| `claim_type`       | VARCHAR | Type of claim (see values below)        |
| `confidence`       | VARCHAR | high/medium/low                         |
| `extracted_by`     | VARCHAR | exa+claude or db_fallback               |
| `extraction_model` | VARCHAR | Model used (e.g., claude-sonnet-4-6)    |
| `extraction_date`  | DATE    | When claim was extracted                |

**belief_dimension values:**

- `regulatory_stance` - Position on AI regulation
- `agi_timeline` - Expected AGI arrival
- `ai_risk_level` - Assessment of AI risk
- `agi_definition` - How they define AGI

**claim_type values:**

- `direct_statement` - Quote from the entity
- `authored_position` - Org published a position
- `inferred_from_action` - Co-sponsored bill, joined coalition
- `resource_content` - Extracted from resource itself
- `crowdsourced_submission` - From Mapping AI form

---

## Table: `edge_evidence` (claims-pilot branch)

Stores source attribution for edges/relationships.

| Column       | Type        | Description                              |
| ------------ | ----------- | ---------------------------------------- |
| `edge_id`    | INTEGER     | FK → edge                                |
| `source_id`  | VARCHAR     | FK → source                              |
| `citation`   | TEXT        | Verbatim quote supporting relationship   |
| `start_date` | DATE        | When relationship started                |
| `end_date`   | DATE        | When relationship ended (null = current) |
| `amount_usd` | NUMERIC     | Funding amount if funder edge            |
| `role_title` | VARCHAR     | Specific role/title                      |
| `confidence` | VARCHAR     | high/medium/low                          |
| `created_at` | TIMESTAMPTZ | When evidence was added                  |

---

# Field Mappings

## Form → Database

The contribute form sends camelCase. API maps to snake_case:

| Form Field               | DB Column                         | Notes           |
| ------------------------ | --------------------------------- | --------------- |
| `name`                   | `name`                            |                 |
| `title`                  | `title`                           |                 |
| `category`               | `category`                        |                 |
| `otherCategories`        | `other_categories`                | Comma-separated |
| `primaryOrg`             | `primary_org`                     |                 |
| `otherOrgs`              | `other_orgs`                      |                 |
| `website`                | `website`                         |                 |
| `fundingModel`           | `funding_model`                   |                 |
| `parentOrgId`            | `parent_org_id`                   | Integer FK      |
| `location`               | `location`                        |                 |
| `influenceType`          | `influence_type`                  | Comma-separated |
| `twitter`                | `twitter`                         |                 |
| `bluesky`                | `bluesky`                         |                 |
| `notes`                  | `notes`                           |                 |
| `notesHtml`              | `notes_html`                      |                 |
| `notesMentions`          | `notes_mentions`                  | JSONB           |
| `regulatoryStance`       | `belief_regulatory_stance`        | + `_score`      |
| `regulatoryStanceDetail` | `belief_regulatory_stance_detail` |                 |
| `evidenceSource`         | `belief_evidence_source`          |                 |
| `agiTimeline`            | `belief_agi_timeline`             | + `_score`      |
| `aiRiskLevel`            | `belief_ai_risk`                  | + `_score`      |
| `threatModels`           | `belief_threat_models`            | Comma-separated |
| `submitterEmail`         | `submitter_email`                 |                 |
| `submitterRelationship`  | `submitter_relationship`          | Normalized      |

### Resource-specific

| Form Field     | DB Column               |
| -------------- | ----------------------- |
| `title`        | `resource_title`        |
| `category`     | `resource_category`     |
| `author`       | `resource_author`       |
| `resourceType` | `resource_type`         |
| `url`          | `resource_url`          |
| `year`         | `resource_year`         |
| `keyArgument`  | `resource_key_argument` |

## Database → Frontend (map-data.json)

Export layer maps DB columns to frontend names:

| DB Column                         | Frontend Field             |
| --------------------------------- | -------------------------- |
| `belief_regulatory_stance`        | `regulatory_stance`        |
| `belief_regulatory_stance_detail` | `regulatory_stance_detail` |
| `belief_evidence_source`          | `evidence_source`          |
| `belief_agi_timeline`             | `agi_timeline`             |
| `belief_ai_risk`                  | `ai_risk_level`            |
| `belief_threat_models`            | `threat_models`            |
| `belief_regulatory_stance_wavg`   | `stance_score`             |
| `belief_agi_timeline_wavg`        | `timeline_score`           |
| `belief_ai_risk_wavg`             | `risk_score`               |
| `resource_title`                  | `title` (resources)        |
| `resource_url`                    | `url` (resources)          |
| `resource_author`                 | `author` (resources)       |

---

# Triggers

### `trg_before_submission_update`

When submission with `entity_id IS NULL` is approved:

1. Creates new entity row from submission data
2. Sets `submission.entity_id` to new entity ID
3. Sets `reviewed_at` timestamp

### `trg_after_submission_update`

After submission status changes to/from `approved`:

1. Calls `recalculate_entity_scores(entity_id)`
2. Recomputes weighted average belief scores

### `trg_entity_search`

On entity INSERT/UPDATE:

1. Updates `search_vector` tsvector

---

# Indexes

| Index                 | Table      | Columns             |
| --------------------- | ---------- | ------------------- |
| `idx_entity_type`     | entity     | entity_type         |
| `idx_entity_status`   | entity     | status              |
| `idx_entity_search`   | entity     | search_vector (GIN) |
| `idx_sub_entity`      | submission | entity_id           |
| `idx_sub_status`      | submission | status              |
| `idx_sub_type`        | submission | entity_type         |
| `idx_sub_contributor` | submission | contributor_key_id  |
| `idx_edge_source`     | edge       | source_id           |
| `idx_edge_target`     | edge       | target_id           |
