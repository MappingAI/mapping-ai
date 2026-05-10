# Full Entity Schema Reference

This document defines the complete schema for entities, edges, and sources. Use this for verification pipelines to ensure data quality and detect hallucinations.

**Ground truth**: The contribute forms (`src/contribute/*Form.tsx`) define field constraints. This document reflects those constraints.

---

## Constraint Types

| Constraint | Meaning | Verification |
|------------|---------|--------------|
| `SELECT_1` | Exactly one value from list, or null | Value must be in allowed list |
| `SELECT_MULTIPLE` | Zero or more values from list | Each value must be in allowed list |
| `SELECT_UP_TO_3` | Maximum 3 values from list | Max 3 values, each in allowed list |
| `FREEFORM_TEXT` | Any string | No validation needed |
| `FREEFORM_URL` | Valid URL | Must start with http:// or https:// |
| `INTEGER` | Numeric ID | Must be valid entity ID |
| `BOOLEAN` | true/false | Must be boolean |
| `DATE` | Date value | Format: YYYY-MM-DD |

---

# Entity Fields

## Person

### Core Identity

| Field | DB Column | Constraint | Required |
|-------|-----------|------------|----------|
| Name | `name` | FREEFORM_TEXT | Yes |
| Title | `title` | FREEFORM_TEXT | No |
| Primary Role | `category` | SELECT_1 | No |
| Other Roles | `other_categories` | SELECT_MULTIPLE | No |

**category** valid values:
- `Executive` - C-suite and senior leadership
- `Researcher` - AI/ML researchers
- `Policymaker` - Elected officials and regulators
- `Investor` - VCs and angel investors
- `Organizer` - Activists and community organizers
- `Journalist` - Reporters and media figures
- `Academic` - Professors and academic researchers
- `Cultural figure` - Public intellectuals, authors

### Affiliations

| Field | DB Column | Constraint |
|-------|-----------|------------|
| Primary Organization | `primary_org` | FREEFORM_TEXT |
| Other Organizations | `other_orgs` | FREEFORM_TEXT |
| Location | `location` | FREEFORM_TEXT (multi-city) |

### Beliefs

| Field | DB Column | Constraint |
|-------|-----------|------------|
| Regulatory Stance | `belief_regulatory_stance` | SELECT_1 |
| Stance Detail | `belief_regulatory_stance_detail` | FREEFORM_TEXT |
| Evidence Source | `belief_evidence_source` | SELECT_1 |
| AGI Timeline | `belief_agi_timeline` | SELECT_1 |
| AI Risk Level | `belief_ai_risk` | SELECT_1 |
| Threat Models | `belief_threat_models` | SELECT_UP_TO_3 |

**belief_regulatory_stance** valid values (ordered most permissive to most restrictive):
1. `Accelerate` - Actively opposes regulation, wants faster AI development
2. `Light-touch` - Prefers minimal regulation, industry self-governance
3. `Targeted` - Supports narrow, specific regulations for identified harms
4. `Moderate` - Supports balanced regulation with cost-benefit analysis
5. `Precautionary` - Supports proactive regulation before harms manifest
6. `Restrictive` - Supports significant constraints on AI development/deployment
7. `Nationalize` - Supports government control/ownership of AI development
8. `Mixed/unclear` - Position is inconsistent or cannot be determined
9. `Other` - Describe in notes

**belief_evidence_source** valid values:
- `Explicitly stated` - Position comes from direct quotes, official statements, published positions
- `Inferred` - Position derived from actions, funding patterns, affiliations
- `Unknown` - Cannot determine evidence basis

**belief_agi_timeline** valid values:
1. `Already here` - Believes AGI capabilities already exist
2. `2-3 years` - Expects AGI within 2-3 years
3. `5-10 years` - Expects AGI within 5-10 years
4. `10-25 years` - Expects AGI within 10-25 years
5. `25+ years or never` - Expects AGI 25+ years away or believes it won't happen
6. `Ill-defined` - Believes AGI is not a coherent/useful concept
7. `Unknown` - Timeline belief cannot be determined from available evidence
8. `Mixed/unclear` - Has stated conflicting timelines

**belief_ai_risk** valid values (form order, lowest to highest concern):
1. `Overstated` - Believes AI risks are exaggerated by others
2. `Manageable` - AI poses risks that can be addressed with reasonable measures
3. `Serious` - AI poses significant risks requiring major intervention
4. `Catastrophic` - AI poses civilizational-scale risks but not necessarily extinction
5. `Existential` - AI poses risk of human extinction or permanent disempowerment
6. `Mixed/nuanced` - Has nuanced position that doesn't fit categories
7. `Unknown` - Risk assessment cannot be determined

**belief_threat_models** valid values (pick up to 3):
- `Labor displacement` - AI eliminating jobs
- `Economic inequality` - AI worsening wealth/income gaps
- `Power concentration` - AI benefits accruing to few actors
- `Democratic erosion` - AI undermining democratic institutions
- `Cybersecurity` - AI-enabled attacks
- `Misinformation` - AI-generated false content
- `Environmental` - AI's energy/resource consumption
- `Weapons` - AI enabling weapon development
- `Loss of control` - AI systems acting against human intent
- `Copyright/IP` - AI infringing intellectual property
- `Existential risk` - Risk of human extinction

### Influence & Contact

| Field | DB Column | Constraint |
|-------|-----------|------------|
| Influence Type | `influence_type` | SELECT_MULTIPLE |
| Twitter/X | `twitter` | FREEFORM_TEXT |
| Bluesky | `bluesky` | FREEFORM_TEXT |
| Website | `website` | FREEFORM_URL |

**influence_type** valid values (no limit):
- `Decision-maker` - Has authority over key AI decisions
- `Researcher/analyst` - Produces research or analysis
- `Builder` - Creates AI systems or tools
- `Narrator` - Shapes public discourse and narratives
- `Connector/convener` - Brings stakeholders together
- `Advisor/strategist` - Provides strategic counsel
- `Funder/investor` - Provides capital or grants
- `Organizer/advocate` - Mobilizes people or campaigns
- `Implementer` - Executes or deploys AI systems

### Notes

| Field | DB Column | Constraint |
|-------|-----------|------------|
| Notes (HTML) | `notes_html` | FREEFORM_TEXT (rich text) |

### Verification (DB only)

| Field | DB Column | Type | Description |
|-------|-----------|------|-------------|
| Field Verification | `field_verification` | JSONB | Per-field verification status from verify-all.js |

The `field_verification` column stores a JSON object with status for each field:
```json
{
  "name": {"status": "verified", "checked_at": "2026-05-10"},
  "category": {"status": "unverified", "checked_at": "2026-05-10"},
  ...
}
```

Status values: `verified`, `unverified`, `inferred`

---

## Organization

### Core Identity

| Field | DB Column | Constraint | Required |
|-------|-----------|------------|----------|
| Name | `name` | FREEFORM_TEXT | Yes |
| Primary Category | `category` | SELECT_1 | No |
| Other Categories | `other_categories` | SELECT_MULTIPLE | No |

**category** valid values:
- `Frontier Lab` - Leading AI research labs (OpenAI, Anthropic, DeepMind, etc.)
- `AI Safety/Alignment` - Organizations focused on AI safety research
- `Think Tank/Policy Org` - Policy research and advocacy organizations
- `Government/Agency` - Government bodies and agencies
- `Academic` - Universities and academic institutions
- `VC/Capital/Philanthropy` - Investors and funders
- `Labor/Civil Society` - Labor unions and civil society organizations
- `Ethics/Bias/Rights` - AI ethics and civil rights organizations
- `Media/Journalism` - News and media organizations
- `Political Campaign/PAC` - Political action committees
- `AI Infrastructure & Compute` - Cloud, chips, and infrastructure providers
- `Deployers & Platforms` - Companies deploying AI in products

### Structure

| Field | DB Column | Constraint |
|-------|-----------|------------|
| Parent Organization | `parent_org_id` | INTEGER (FK to entity) |
| Website | `website` | FREEFORM_URL |
| Location | `location` | FREEFORM_TEXT |
| Funding Model | `funding_model` | SELECT_MULTIPLE |

**funding_model** valid values:
- `Venture-backed` - Venture capital funded
- `Revenue-generating` - Commercial/corporate revenue
- `Government-funded` - Government funded
- `Philanthropic` - Foundation/donor funded
- `Membership` - Member dues funded
- `Mixed` - Multiple funding types
- `Public benefit` - Public benefit corporation
- `Self-funded` - Bootstrapped/founder funded
- `Other` - Describe in notes

### Beliefs

Organizations have limited belief fields in the contribute form:

| Field | DB Column | Constraint |
|-------|-----------|------------|
| Regulatory Stance | `belief_regulatory_stance` | SELECT_1 |
| Stance Detail | `belief_regulatory_stance_detail` | FREEFORM_TEXT |

**Note**: The org form only includes regulatory stance. Other belief fields (AGI timeline, AI risk, threat models) exist in the database but are not collected via the contribute form. Be careful about attributing beliefs to organizations - individual employee views do not equal organizational positions.

### Contact

| Field | DB Column | Constraint |
|-------|-----------|------------|
| Twitter/X | `twitter` | FREEFORM_TEXT |
| Bluesky | `bluesky` | FREEFORM_TEXT |

### Notes

| Field | DB Column | Constraint |
|-------|-----------|------------|
| Notes (HTML) | `notes_html` | FREEFORM_TEXT (rich text) |

---

## Resource

### Core Identity

| Field | DB Column | Constraint | Required |
|-------|-----------|------------|----------|
| Title | `resource_title` | FREEFORM_TEXT | Yes |
| Type | `resource_type` | SELECT_1 | No |
| URL | `resource_url` | FREEFORM_URL | No |
| Year | `resource_year` | FREEFORM_TEXT | No |
| Author | `resource_author` | FREEFORM_TEXT | No |
| Key Argument | `resource_key_argument` | FREEFORM_TEXT | No |

**resource_type** valid values:
- `Essay` - Opinion pieces, blog posts, long-form articles
- `Book` - Published books
- `Report` - Research reports, white papers
- `Podcast` - Audio content
- `Video` - Video content
- `Website` - Websites, tools, databases
- `Academic Paper` - Peer-reviewed research
- `News Article` - Journalism, news coverage
- `Substack/Newsletter` - Newsletter content

### Affiliation

| Field | DB Column | Constraint |
|-------|-----------|------------|
| Primary Organization | `primary_org` | FREEFORM_TEXT |

### Advocated Positions (DB only, not in form)

These columns exist in the database but are NOT exposed in the contribute form:
- `advocated_stance` - What regulatory stance the resource argues for
- `advocated_timeline` - What AGI timeline the resource argues for
- `advocated_risk` - What risk level the resource argues for

These are populated by enrichment scripts, not user submissions.

### Notes

| Field | DB Column | Constraint |
|-------|-----------|------------|
| Notes (HTML) | `notes_html` | FREEFORM_TEXT (rich text) |

---

# Edge Fields

Edges represent relationships between entities. Direction matters.

## How Directionality Works

Every edge has a **source** and **target**. The edge type describes the relationship **from source's perspective**.

```
source_id  →  edge_type  →  target_id
```

**Example:** "Sam Altman works at OpenAI"
- `source_id`: Sam Altman (person)
- `target_id`: OpenAI (org)
- `edge_type`: `employer`

The frontend displays bidirectionally:
- Viewing Sam Altman: "Works at OpenAI"
- Viewing OpenAI: "Employs Sam Altman"

## Edge Table Schema

| Field | DB Column | Type | Description |
|-------|-----------|------|-------------|
| Source Entity | `source_id` | INTEGER | FK to entity (required) |
| Target Entity | `target_id` | INTEGER | FK to entity (required) |
| Edge Type | `edge_type` | TEXT | Relationship type (see below) |
| Role | `role` | TEXT | Specific role/title in relationship |
| Is Primary | `is_primary` | BOOLEAN | Is this the primary affiliation? (default false) |
| Start Date | `start_date` | VARCHAR | When relationship started (YYYY or YYYY-MM) |
| End Date | `end_date` | VARCHAR | When relationship ended (null = ongoing) |
| Confidence | `confidence` | SMALLINT | 1-5 confidence rating |
| Evidence | `evidence` | TEXT | Quote/citation supporting relationship |
| Source URL | `source_url` | VARCHAR | URL or citation reference |
| Created By | `created_by` | VARCHAR | system, migration, enrich-v2, admin, manual |
| Created At | `created_at` | TIMESTAMPTZ | Creation timestamp |

## Edge Types by Entity Combination

### Person → Organization

| Type | Meaning |
|------|---------|
| `employer` | Person works at org |
| `founder` | Person founded org |
| `member` | Person is member of org |
| `advisor` | Person advises org |
| `funder` | Person funds org |
| `affiliated` | General affiliation |
| `critic` | Person publicly criticizes org |
| `supporter` | Person publicly supports org |

### Organization → Organization

| Type | Meaning |
|------|---------|
| `funder` | Org A funds Org B |
| `partner` | Orgs are partners (create both directions) |
| `parent_company` | Source owns target as subsidiary |
| `collaborator` | Orgs collaborate (create both directions) |
| `member` | Org A is member of Org B |

### Person → Person

| Type | Meaning |
|------|---------|
| `collaborator` | They collaborate (create both directions) |
| `advisor` | Source advises target |
| `funder` | Source funds target |
| `critic` | Source criticizes target |
| `supporter` | Source supports target |

### Resource Edges

| Type | Source | Target | Meaning |
|------|--------|--------|---------|
| `author` | Person | Resource | Person authored the resource |
| `publisher` | Org | Resource | Org published the resource |

**Symmetric relationships:** For `collaborator`, `partner`, etc., create edges in **both directions**.

---

# Source Table

Stores source metadata for claims and edge evidence.

| Field | DB Column | Type | Required | Description |
|-------|-----------|------|----------|-------------|
| Source ID | `source_id` | TEXT | Yes | Primary key (hash of URL) |
| URL | `url` | TEXT | Yes | Source URL |
| Title | `title` | TEXT | No | Human-readable title |
| Type | `source_type` | TEXT | No | Type of source (see values below) |
| Published Date | `date_published` | DATE | No | Publication date |
| Author | `author` | TEXT | No | Author name |
| Publisher | `publisher` | TEXT | No | Publishing organization |
| Excerpt | `cached_excerpt` | TEXT | No | Excerpt/citation from source |
| Resource Entity ID | `resource_entity_id` | INTEGER | No | FK to entity (if source is a resource) |
| Last Verified At | `last_verified_at` | TIMESTAMPTZ | No | When URL was last checked |
| Created At | `created_at` | TIMESTAMPTZ | No | Creation timestamp |

**source_type** valid values:
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

# Claim Table

Stores extracted belief claims with citations.

| Field | DB Column | Type | Required | Description |
|-------|-----------|------|----------|-------------|
| Claim ID | `claim_id` | TEXT | Yes | Primary key (entity_dimension_source) |
| Entity ID | `entity_id` | INTEGER | Yes | FK to entity |
| Entity Name | `entity_name` | TEXT | No | Denormalized name |
| Entity Type | `entity_type` | TEXT | No | person/organization/resource |
| Belief Dimension | `belief_dimension` | TEXT | Yes | Belief dimension (see below) |
| Stance | `stance` | TEXT | No | Text label from scale |
| Stance Score | `stance_score` | INTEGER | No | Numeric score (null for AGI definition) |
| Stance Label | `stance_label` | TEXT | No | Short display label |
| Definition Used | `definition_used` | TEXT | No | How entity defined the term (for AGI) |
| Citation | `citation` | TEXT | Yes | Verbatim quote from source |
| Source ID | `source_id` | TEXT | No | FK to source |
| Date Stated | `date_stated` | DATE | No | When entity made statement |
| Claim Type | `claim_type` | TEXT | No | Type of claim (see below) |
| Confidence | `confidence` | TEXT | No | high/medium/low |
| Extracted By | `extracted_by` | TEXT | No | exa+claude or db_fallback |
| Extraction Model | `extraction_model` | TEXT | No | Model used (e.g., claude-sonnet-4-6) |
| Extraction Date | `extraction_date` | DATE | No | When claim was extracted |
| Supersedes | `supersedes` | TEXT | No | Claim ID this replaces |
| Created At | `created_at` | TIMESTAMPTZ | No | Creation timestamp |

**belief_dimension** valid values:
- `regulatory_stance` - Position on AI regulation
- `agi_timeline` - Expected AGI arrival
- `ai_risk_level` - Assessment of AI risk
- `agi_definition` - How they define AGI

**claim_type** valid values:
- `direct_statement` - Quote from the entity
- `authored_position` - Org published a position
- `inferred_from_action` - Co-sponsored bill, joined coalition
- `resource_content` - Extracted from resource itself
- `crowdsourced_submission` - From Mapping AI form

---

# Edge Evidence Table

Stores source attribution for edges/relationships.

| Field | DB Column | Type | Required | Description |
|-------|-----------|------|----------|-------------|
| Evidence ID | `evidence_id` | TEXT | Yes | Primary key |
| Edge ID | `edge_id` | INTEGER | Yes | FK to edge |
| Source ID | `source_id` | TEXT | Yes | FK to source |
| Citation | `citation` | TEXT | Yes | Verbatim quote supporting relationship |
| Start Date | `start_date` | DATE | No | When relationship started |
| End Date | `end_date` | DATE | No | When relationship ended (null = current) |
| Amount USD | `amount_usd` | NUMERIC | No | Funding amount if funder edge |
| Amount Note | `amount_note` | TEXT | No | Context about the amount |
| Role Title | `role_title` | TEXT | No | Specific role/title |
| Confidence | `confidence` | TEXT | No | high/medium/low |
| Extracted By | `extracted_by` | TEXT | No | Tool/script that extracted this |
| Extraction Model | `extraction_model` | TEXT | No | Model used for extraction |
| Extraction Date | `extraction_date` | DATE | No | When evidence was extracted |
| Created At | `created_at` | TIMESTAMPTZ | No | Creation timestamp |

---