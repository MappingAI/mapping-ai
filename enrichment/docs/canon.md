# Canonical Field Values

Quick reference for all valid field values. Source of truth: `ONBOARDING.md` §Reference.

---

## Entity Types

| Value | Description |
|-------|-------------|
| `person` | Individual |
| `organization` | Company, agency, nonprofit, etc. |
| `resource` | Paper, report, book, podcast, etc. |

## Person Categories

| Value |
|-------|
| Executive |
| Researcher |
| Policymaker |
| Investor |
| Organizer |
| Journalist |
| Academic |
| Cultural figure |

## Organization Categories

| Value |
|-------|
| Frontier Lab |
| Infrastructure & Compute |
| Deployers & Platforms |
| AI Safety/Alignment |
| Think Tank/Policy Org |
| Government/Agency |
| Academic |
| VC/Capital/Philanthropy |
| Labor/Civil Society |
| Ethics/Bias/Rights |
| Media/Journalism |
| Political Campaign/PAC |

## Resource Types

| Value |
|-------|
| Essay |
| Book |
| Report |
| Podcast |
| Video |
| Website |
| Academic Paper |
| News Article |
| Substack/Newsletter |

## Resource Categories

| Value |
|-------|
| AI Safety |
| AI Governance |
| AI Capabilities |
| Labor & Economy |
| National Security |
| Industry Analysis |
| Policy Proposal |
| Technical |
| Philosophy/Ethics |

## Influence Types

Comma-separated, pick any that apply.

| Value | Description |
|-------|-------------|
| Decision-maker | Legislator, regulator, or other formal authority who makes binding decisions |
| Advisor/strategist | Shapes strategy or advises decision-makers (inside or outside government) |
| Researcher/analyst | Produces research, analysis, or evidence on AI |
| Funder/investor | Provides capital — grants, VC, philanthropy |
| Builder | Develops AI systems, models, or products |
| Organizer/advocate | Organizes campaigns, advocacy, or coalitions |
| Narrator | Journalist, author, podcaster, or commentator shaping the public story |
| Implementer | Executes policy or deploys AI in an operational setting |
| Connector/convener | Hosts events, facilitates networks, bridges communities |

---

## Edge Types

12 canonical types. Direction matters for queries and display.

| Type | Direction | Example | Reverse display |
|------|-----------|---------|-----------------|
| `employer` | person → org | Altman → OpenAI | "OpenAI employs Altman" |
| `founder` | person → org | Amodei → Anthropic | "Anthropic founded by Amodei" |
| `funder` | funder → recipient | a16z → Anthropic | "Anthropic funded by a16z" |
| `parent_company` | parent → child | Anthropic → Anthropic Institute | "Anthropic Institute subsidiary of Anthropic" |
| `advisor` | advisor → advisee | Bengio → Stanford HAI | "Stanford HAI advised by Bengio" |
| `member` | person → org | Hendrycks → CAIS | "CAIS has member Hendrycks" |
| `author` | person → resource | Bengio → paper | "Paper authored by Bengio" |
| `publisher` | org → resource | Brookings → report | "Report published by Brookings" |
| `collaborator` | person → person | symmetric — pick one direction |
| `partner` | org → org | symmetric — pick one direction |
| `critic` | critic → target | Gebru → Google | "Google criticized by Gebru" |
| `supporter` | supporter → target | Hoffman → OpenAI | "OpenAI supported by Hoffman" |

### Legacy → Canonical Mapping

| Legacy | Count | → Canonical | Notes |
|--------|------:|-------------|-------|
| `employed_by` | 518 | `employer` | Flip direction |
| `person_organization` | 72 | `employer` | Flip direction |
| `founded` | 118 | `founder` | Keep direction |
| `co_founded_with` | 71 | `founder` | Set role="Co-founder" |
| `funded_by` | 79 | `funder` | Flip direction |
| `invested_in` | 45 | `funder` | Keep direction, rename |
| `subsidiary_of` | 116 | `parent_company` | Flip direction |
| `spun_out_from` | 13 | `parent_company` | Flip direction |
| `advises` | 26 | `advisor` | Keep direction |
| `mentored_by` | 15 | `advisor` | Flip direction, role="Mentor" |
| `mentor_of` | 1 | `advisor` | Role="Mentor" |
| `board_member` | 36 | `member` | Role="Board Member" |
| `former_colleague` | 26 | `collaborator` | Set end_date |
| `partner_of` | 155 | `partner` | Rename |
| `authored_by` | 30 | `author` | Flip direction |
| `published_by` | 16 | `publisher` | Flip direction |
| `critic_of` | 22 | `critic` | Rename |
| `supporter_of` | 19 | `supporter` | Rename |
| `affiliated` | 585 | **Manual review** | Mixed: member, advisor, employer |
| `affiliated_with` | 7 | **Manual review** | Same as affiliated |
| `mentioned` | 1 | **Drop?** | Weak relationship |

---

## Belief Fields

### `belief_regulatory_stance`

| Value | Meaning |
|-------|---------|
| Accelerate | Minimal/no regulation |
| Light-touch | Voluntary, self-governance |
| Targeted | Sector-specific rules, not broad R&D restrictions |
| Moderate | Mandatory safety evals + transparency |
| Restrictive | External oversight of compute, training runs |
| Precautionary | Pause/moratorium until governance catches up |
| Nationalize | Public control |
| Mixed/unclear | |
| Other | Describe in notes |

### `belief_agi_timeline`

| Value | Meaning |
|-------|---------|
| Already here | Already here/emerging |
| 2-3 years | |
| 5-10 years | |
| 10-25 years | |
| 25+ years or never | |
| Ill-defined | Considers the concept ill-defined |
| Unknown | Not publicly stated |

### `belief_ai_risk`

| Value | Meaning |
|-------|---------|
| Overstated | Hype will fade |
| Manageable | Real but manageable |
| Serious | Serious societal risks (labor, power, democracy) |
| Catastrophic | Potentially catastrophic (bioweapons, loss of control) |
| Existential | Threatens humanity's survival |
| Mixed/nuanced | Describe in notes |
| Unknown | Not publicly stated |

### `belief_evidence_source`

| Value | Meaning |
|-------|---------|
| Explicitly stated | Speeches, testimony, writing |
| Inferred | From actions/funding/affiliations |
| Unknown | |

### `belief_threat_models`

Comma-separated, pick up to 3.

| Value |
|-------|
| Labor displacement |
| Economic inequality |
| Power concentration |
| Democratic erosion |
| Cybersecurity |
| Misinformation |
| Environmental |
| Weapons |
| Loss of control |
| Copyright/IP |
| Existential risk |
