# Mapping AI - Contributor Guide

> **For the AI agent reading this:** You are helping a contributor add
> people and organizations to the mapping-ai stakeholder map.
>
> **IMPORTANT: ALWAYS SEARCH BEFORE SUBMITTING.** When the contributor
> asks you to add someone, your FIRST action must be to search the
> database using `GET /search?q=<name>`. If the person/org already exists,
> tell the contributor and ask if they want to suggest edits instead.
> Only submit new entries after confirming they don't already exist.
>
> All submissions go to a pending queue for admin review - nothing is
> published immediately. Never show raw JSON to the user; confirm what
> you submitted in plain language.

## What is Mapping AI

Mapping AI is a collaborative stakeholder map of the US AI policy landscape - the people, organizations, and resources shaping AI governance.

**Live site:** https://mapping-ai.org

## What the contributor can do

- **Search** existing entries (to avoid duplicates)
- Add a **person** (researcher, policymaker, executive, etc.)
- Add an **organization** (lab, think tank, government agency, etc.)
- Add a **resource** (paper, book, podcast, etc.)

All submissions are reviewed by an admin before appearing on the map.

---

## Credentials

```
Contributor Key: <CONTRIBUTOR_KEY>
```

Replace `<CONTRIBUTOR_KEY>` above with your actual key before using this file.

---

## API Reference

**Base URL:** `https://j8jamvdf6i.execute-api.eu-west-2.amazonaws.com`

---

### Search (check for duplicates first!)

Before adding anyone, **always search first** to avoid duplicates.

```
GET /search?q=<query>&type=<person|organization|resource>
```

**Parameters:**
- `q` (required): Search query (min 2 characters)
- `type` (optional): Filter by entity type

**Example: Search before adding**

```bash
curl "https://j8jamvdf6i.execute-api.eu-west-2.amazonaws.com/search?q=Sam%20Altman&type=person"
```

**Response:**
```json
{
  "people": [
    {"id": 42, "name": "Sam Altman", "title": "CEO, OpenAI", "category": "Executive"}
  ],
  "organizations": [],
  "resources": []
}
```

If you find a match, tell the contributor: "Sam Altman is already in the database (ID 42). Would you like to suggest edits to their profile instead?"

---

### Submit an entity

```
POST /submit
Headers:
  Content-Type: application/json
  X-Contributor-Key: <CONTRIBUTOR_KEY>
```

**Response (success):**
```json
{
  "success": true,
  "submissionId": 1234,
  "message": "Submission received and pending review"
}
```

---

## Payload Formats

### Person

```json
{
  "type": "person",
  "data": {
    "name": "Jane Doe",
    "title": "CEO, Example AI",
    "category": "Executive",
    "primaryOrg": "Example AI",
    "affiliatedOrgs": "Stanford HAI, Partnership on AI",
    "location": "San Francisco, CA",
    "regulatoryStance": "Moderate",
    "regulatoryStanceDetail": "Supports SB 1047 with amendments",
    "evidenceSource": "Explicitly stated",
    "agiTimeline": "5-10 years",
    "aiRiskLevel": "Serious",
    "threatModels": "Power concentration, Labor displacement",
    "influenceType": "Decision-maker, Narrator",
    "twitter": "@janedoe",
    "bluesky": "janedoe.bsky.social",
    "notes": "Background info, key quotes, relevant context."
  },
  "submitterEmail": "contributor@example.com",
  "submitterRelationship": "external"
}
```

### Organization

```json
{
  "type": "organization",
  "data": {
    "name": "Example AI",
    "category": "Frontier Lab",
    "website": "https://example-ai.com",
    "parentOrg": null,
    "location": "San Francisco, CA",
    "fundingModel": "Venture-backed",
    "regulatoryStance": "Light-touch",
    "regulatoryStanceDetail": "Opposes mandatory pre-deployment testing",
    "evidenceSource": "Inferred from actions",
    "agiTimeline": "2-3 years",
    "aiRiskLevel": "Manageable",
    "threatModels": "Misinformation, Cybersecurity",
    "influenceType": "Builder, Decision-maker",
    "twitter": "@exampleai",
    "notes": "Founded 2024, responsible scaling policy..."
  },
  "submitterRelationship": "external"
}
```

### Resource

```json
{
  "type": "resource",
  "data": {
    "title": "Situational Awareness",
    "category": "AI Strategy/Governance",
    "author": "Leopold Aschenbrenner",
    "resourceType": "Essay/Blog",
    "url": "https://situational-awareness.ai/",
    "year": "2024",
    "keyArgument": "AGI by 2027, calls for national security framing of AI development",
    "notes": "Influential essay arguing for accelerated AI development under government oversight."
  },
  "submitterRelationship": "external"
}
```

---

## Field Reference

This section defines every field in detail. **High-quality submissions fill out as many fields as possible with specific, verifiable information.**

---

### Required Fields

| Entity type | Required field |
|-------------|---------------|
| person | `name` |
| organization | `name` |
| resource | `title` |

---

### Person Categories (Primary Role)

Select the **one** role that best describes their primary function in the AI policy landscape. You can add additional roles in `otherCategories`.

| Value | Description | Examples |
|-------|-------------|----------|
| `Executive` | CEO, CTO, founder, C-suite | Sam Altman, Dario Amodei, Satya Nadella |
| `Researcher` | Lab scientist, research lead | Ilya Sutskever, Jan Leike, Percy Liang |
| `Policymaker` | Legislator, regulator, government official | Gina Raimondo, Chuck Schumer, Marietje Schaake |
| `Investor` | VC, philanthropist, funder | Reid Hoffman, Dustin Moskovitz, Marc Andreessen |
| `Organizer` | Activist, advocate, union leader | Timnit Gebru, Amba Kak, Matt Sheehan |
| `Journalist` | Reporter, podcaster, newsletter author | Karen Hao, Casey Newton, Will Knight |
| `Academic` | Professor, think tank fellow | Stuart Russell, Yoshua Bengio, Helen Toner |
| `Cultural figure` | Public intellectual, author, commentator | Yuval Noah Harari, Ezra Klein, Max Tegmark |

**Best practice:** Choose based on their *current* primary role. A former Google researcher who now runs a think tank should be "Academic" or "Organizer," not "Researcher."

---

### Organization Categories (Primary Sector)

| Value | Description | Examples |
|-------|-------------|----------|
| `Frontier Lab` | Companies building cutting-edge AI systems | OpenAI, Anthropic, Google DeepMind, Meta AI |
| `AI Safety/Alignment` | Research orgs focused on AI safety | MIRI, Redwood Research, ARC, Conjecture |
| `Think Tank/Policy Org` | Policy research and advocacy | Brookings, CSET, RAND, Future of Life Institute |
| `Government/Agency` | Government bodies and regulators | NIST, OSTP, EU AI Office, UK AI Safety Institute |
| `Academic` | Universities and research institutions | Stanford HAI, MIT CSAIL, Berkeley AI Research |
| `VC/Capital/Philanthropy` | Funders and investors | Open Philanthropy, a16z, Sequoia, EA Funds |
| `Labor/Civil Society` | Unions, civil society, advocacy groups | AFL-CIO, ACLU, Access Now, AI Now Institute |
| `Ethics/Bias/Rights` | Focused on fairness, bias, rights | Algorithmic Justice League, Data & Society, DAIR |
| `Media/Journalism` | News outlets covering AI | The Verge, MIT Tech Review, Platformer |
| `Political Campaign/PAC` | Electoral politics, PACs | Tech industry PACs, campaign AI advisors |
| `AI Infrastructure & Compute` | Cloud, chips, data center providers | NVIDIA, AWS, CoreWeave, Lambda |
| `AI Deployers & Platforms` | Companies deploying AI in products | Salesforce, Adobe, Palantir, Scale AI |

---

### Resource Categories

| Value | Description |
|-------|-------------|
| `AI Safety` | Technical safety research, alignment |
| `AI Governance` | Policy frameworks, regulation, international coordination |
| `AI Capabilities` | Technical capabilities, benchmarks, scaling |
| `Labor & Economy` | Workforce impact, economic effects, automation |
| `National Security` | Military AI, geopolitics, export controls |
| `Industry Analysis` | Market dynamics, company analysis |
| `Policy Proposal` | Specific legislative or regulatory proposals |
| `Technical` | Technical papers, architectures, methods |
| `Philosophy/Ethics` | Ethical frameworks, value alignment |

### Resource Types

| Value | Examples |
|-------|----------|
| `Essay` | Blog posts, Substack, opinion pieces |
| `Book` | Published books, e-books |
| `Report` | White papers, think tank reports |
| `Podcast` | Audio interviews, podcast episodes |
| `Video` | YouTube videos, documentaries, talks |
| `Website` | Interactive sites, databases, tools |
| `Academic Paper` | Peer-reviewed papers, arXiv preprints |
| `News Article` | Journalism, investigative pieces |
| `Substack/Newsletter` | Recurring newsletter publications |

---

### Regulatory Stance

This is the most important belief field. It captures where someone falls on the spectrum of AI regulation.

| Value | API Value | Description | Typical positions |
|-------|-----------|-------------|-------------------|
| **Accelerate** | `Accelerate` | Remove barriers, maximize development speed | "Regulation will slow progress and hand lead to China" |
| **Light-touch** | `Light-touch` | Voluntary commitments, industry self-governance | "Let industry lead with best practices" |
| **Targeted** | `Targeted` | Sector-specific rules for high-risk uses only | "Regulate healthcare AI and hiring, not R&D" |
| **Moderate** | `Moderate` | Mandatory safety evals + transparency requirements | "Require testing before deployment, disclose training data" |
| **Restrictive** | `Restrictive` | External oversight of compute, training runs | "Government should approve large training runs" |
| **Precautionary** | `Precautionary` | Pause or moratorium until governance catches up | "Stop training models above GPT-4 until we have oversight" |
| **Nationalize** | `Nationalize` | Public/government control of frontier AI | "AI too important to leave to private companies" |
| **Mixed/unclear** | `Mixed/unclear` | Position varies by issue or hard to categorize | Use when genuinely ambiguous |

**Best practice:**
- Always try to find explicit statements before using "Mixed/unclear"
- Use `regulatoryStanceDetail` to add nuance: "Supports SB 1047 but opposes compute thresholds"
- If someone has evolved their position, note the most recent stance

---

### Evidence Source

How do we know their position? This affects the weight of the submission.

| Value | API Value | When to use |
|-------|-----------|-------------|
| **Explicitly stated** | `Explicitly stated` | Direct quotes from speeches, testimony, published writing, interviews |
| **Inferred from actions** | `Inferred from actions` | Based on funding decisions, hiring, lobbying, organizational actions |
| **Inferred from associations** | `Inferred from associations` | Based on board memberships, signed letters, organizational affiliations |
| **Unknown** | `Unknown` | No clear evidence available |

**Best practice:** Always prefer "Explicitly stated" when possible. Include the source in the notes field.

---

### AGI Timeline

Their belief about when AGI (artificial general intelligence) will arrive.

| Value | API Value | Meaning |
|-------|-----------|---------|
| **Already here/emerging** | `Already here` | GPT-4 or current systems are AGI or very close |
| **Within 2-3 years** | `2-3 years` | AGI by ~2027 |
| **Within 5-10 years** | `5-10 years` | AGI by early 2030s |
| **10-25 years** | `10-25 years` | AGI by 2035-2050 |
| **25+ years or never** | `25+ years or never` | AGI is very far away or may never happen |
| **Considers concept ill-defined** | `Ill-defined` | Thinks "AGI" isn't a useful concept |
| **Unknown** | `Unknown` | No public statements on timeline |

---

### AI Risk Level

How seriously do they take AI risks?

| Value | API Value | Typical framing |
|-------|-----------|-----------------|
| **Overstated** | `Overstated` | "AI risks are exaggerated; the real risk is falling behind" |
| **Manageable** | `Manageable` | "Real concerns but addressable with current approaches" |
| **Serious** | `Serious` | "Significant societal risks: jobs, power concentration, democracy" |
| **Catastrophic** | `Catastrophic` | "Could cause major irreversible harm: bioweapons, loss of control" |
| **Existential** | `Existential` | "Threatens human survival or autonomy" |
| **Mixed/nuanced** | `Mixed/nuanced` | Different risk levels for different concerns |
| **Unknown** | `Unknown` | No clear public position |

---

### Threat Models (select up to 3)

What specific risks concern them most? Choose the top 3.

| Value | API Value | Description |
|-------|-----------|-------------|
| **Labor displacement** | `Labor displacement` | Mass unemployment, workforce disruption |
| **Economic inequality** | `Economic inequality` | Wealth concentration, winner-take-all dynamics |
| **Power concentration** | `Power concentration` | Corporate/state power, monopolization |
| **Democratic erosion** | `Democratic erosion` | Surveillance, manipulation, weakened institutions |
| **Cybersecurity** | `Cybersecurity` | AI-powered attacks, vulnerability discovery |
| **Misinformation** | `Misinformation` | Deepfakes, synthetic media, scaled disinformation |
| **Environmental** | `Environmental` | Energy consumption, water use, climate impact |
| **Weapons** | `Weapons` | Autonomous weapons, bioweapons, proliferation |
| **Loss of control** | `Loss of control` | AI systems acting against human interests |
| **Copyright/IP** | `Copyright/IP` | Training data, creative economy disruption |
| **Existential risk** | `Existential risk` | Human extinction or permanent loss of potential |

**Format:** Comma-separated string: `"Labor displacement, Power concentration, Loss of control"`

---

### Influence Types (select all that apply)

How does this person/org influence the AI policy landscape?

| Value | API Value | Description |
|-------|-----------|-------------|
| **Decision-maker** | `Decision-maker` | Has direct authority: legislators, regulators, executives |
| **Advisor/strategist** | `Advisor/strategist` | Advises decision-makers, shapes strategy |
| **Researcher/analyst** | `Researcher/analyst` | Produces research, analysis, evidence |
| **Funder/investor** | `Funder/investor` | Provides capital, grants, funding |
| **Builder** | `Builder` | Develops AI systems, writes code |
| **Organizer/advocate** | `Organizer/advocate` | Mobilizes people, runs campaigns |
| **Narrator** | `Narrator` | Shapes public understanding: journalists, authors, podcasters |
| **Implementer** | `Implementer` | Deploys AI, executes policy |
| **Connector/convener** | `Connector/convener` | Brings people together, facilitates dialogue |

**Format:** Comma-separated string: `"Decision-maker, Narrator"`

---

### Funding Model (Organizations only)

| Value | API Value |
|-------|-----------|
| **Venture-backed/for-profit** | `Venture-backed` |
| **Revenue-generating** | `Revenue-generating` |
| **Government-funded** | `Government-funded` |
| **Philanthropic/foundation-funded** | `Philanthropic` |
| **Membership/dues-based** | `Membership` |
| **Mixed** | `Mixed` |
| **Public benefit corp** | `Public benefit corp` |
| **Self-funded/endowed** | `Self-funded` |

---

### Submitter Relationship

| Value | Weight | When to use |
|-------|--------|-------------|
| `self` | 10x | You are submitting about yourself or your own organization |
| `connector` | 2x | You know this person/org personally or professionally |
| `external` | 1x | You're an outside observer with no direct connection |

The weight affects how belief scores are aggregated when multiple people submit about the same entity.

---

## Example Submissions (Best Practices)

These examples demonstrate high-quality submissions with detailed, well-sourced information.

---

### Example 1: Person (Executive)

**What makes this good:** Specific title, explicit evidence sources cited in notes, nuanced regulatory stance with detail, multiple verifiable claims.

```bash
curl -X POST https://j8jamvdf6i.execute-api.eu-west-2.amazonaws.com/submit \
  -H "Content-Type: application/json" \
  -H "X-Contributor-Key: <CONTRIBUTOR_KEY>" \
  -d '{
    "type": "person",
    "data": {
      "name": "Dario Amodei",
      "title": "CEO & Co-founder, Anthropic",
      "category": "Executive",
      "otherCategories": "Researcher",
      "primaryOrg": "Anthropic",
      "affiliatedOrgs": "Partnership on AI",
      "location": "San Francisco, CA",
      "regulatoryStance": "Moderate",
      "regulatoryStanceDetail": "Supports mandatory safety evaluations and responsible scaling policies. Testified to Senate in favor of targeted regulation. Signed voluntary White House commitments (July 2023). Opposed California SB 1047 citing state vs federal jurisdiction concerns.",
      "evidenceSource": "Explicitly stated",
      "agiTimeline": "2-3 years",
      "aiRiskLevel": "Catastrophic",
      "threatModels": "Loss of control, Existential risk, Power concentration",
      "influenceType": "Decision-maker, Narrator, Builder",
      "twitter": "@DarioAmodei",
      "notes": "Co-founded Anthropic in 2021 after leaving OpenAI where he was VP of Research. PhD in computational neuroscience from Princeton. Key architect of Constitutional AI and Responsible Scaling Policy framework. Senate testimony (July 2023): 'The risks from AI are real and growing.' Advocates for international coordination on frontier AI. Brother of Daniela Amodei (Anthropic President)."
    },
    "submitterRelationship": "external"
  }'
```

---

### Example 2: Person (Policymaker)

**What makes this good:** Current role accurately stated, legislative record cited, specific bills mentioned, clear regulatory stance with evidence.

```bash
curl -X POST https://j8jamvdf6i.execute-api.eu-west-2.amazonaws.com/submit \
  -H "Content-Type: application/json" \
  -H "X-Contributor-Key: <CONTRIBUTOR_KEY>" \
  -d '{
    "type": "person",
    "data": {
      "name": "Chuck Schumer",
      "title": "U.S. Senate Majority Leader (D-NY)",
      "category": "Policymaker",
      "primaryOrg": "U.S. Senate",
      "location": "Washington, DC",
      "regulatoryStance": "Moderate",
      "regulatoryStanceDetail": "Launched SAFE Innovation Framework (June 2023) calling for comprehensive AI legislation. Hosted AI Insight Forums with tech leaders. Emphasizes innovation + guardrails balance. Has not endorsed specific bill yet.",
      "evidenceSource": "Explicitly stated",
      "agiTimeline": "Unknown",
      "aiRiskLevel": "Serious",
      "threatModels": "Labor displacement, Misinformation, Democratic erosion",
      "influenceType": "Decision-maker, Connector/convener",
      "twitter": "@SenSchumer",
      "notes": "Leading Senate effort on AI legislation since 2023. SAFE Framework pillars: Security, Accountability, Foundations, Explainability. Convened 9 AI Insight Forums with 150+ stakeholders including Musk, Zuckerberg, Altman, civil society leaders. Quote (Sept 2023): 'Congress must act on AI - we cannot leave this to the companies alone.'"
    },
    "submitterRelationship": "external"
  }'
```

---

### Example 3: Person (Researcher/Academic)

**What makes this good:** Academic credentials specific, key publications cited, clear intellectual positions documented.

```bash
curl -X POST https://j8jamvdf6i.execute-api.eu-west-2.amazonaws.com/submit \
  -H "Content-Type: application/json" \
  -H "X-Contributor-Key: <CONTRIBUTOR_KEY>" \
  -d '{
    "type": "person",
    "data": {
      "name": "Stuart Russell",
      "title": "Professor of Computer Science, UC Berkeley",
      "category": "Academic",
      "otherCategories": "Researcher",
      "primaryOrg": "UC Berkeley",
      "affiliatedOrgs": "Center for Human-Compatible AI, Future of Life Institute",
      "location": "Berkeley, CA",
      "regulatoryStance": "Restrictive",
      "regulatoryStanceDetail": "Advocates for international treaty on autonomous weapons. Supports mandatory safety testing for frontier models. Called for compute governance in Senate testimony.",
      "evidenceSource": "Explicitly stated",
      "agiTimeline": "10-25 years",
      "aiRiskLevel": "Existential",
      "threatModels": "Loss of control, Weapons, Existential risk",
      "influenceType": "Researcher/analyst, Narrator, Advisor/strategist",
      "twitter": "@StuartJRussell",
      "notes": "Author of 'Artificial Intelligence: A Modern Approach' (standard AI textbook, 4 editions). Founded CHAI (Center for Human-Compatible AI) at Berkeley. Author of 'Human Compatible' (2019) arguing for new approach to AI development. Testified before UN, US Senate, UK Parliament on AI risks. Key quote: 'We need to solve the control problem before we build superintelligent AI.'"
    },
    "submitterRelationship": "external"
  }'
```

---

### Example 4: Organization (Frontier Lab)

**What makes this good:** Founding date, funding structure, key products, and policy positions all documented with specifics.

```bash
curl -X POST https://j8jamvdf6i.execute-api.eu-west-2.amazonaws.com/submit \
  -H "Content-Type: application/json" \
  -H "X-Contributor-Key: <CONTRIBUTOR_KEY>" \
  -d '{
    "type": "organization",
    "data": {
      "name": "Anthropic",
      "category": "Frontier Lab",
      "otherCategories": "AI Safety/Alignment",
      "website": "https://anthropic.com",
      "location": "San Francisco, CA",
      "fundingModel": "Venture-backed",
      "regulatoryStance": "Moderate",
      "regulatoryStanceDetail": "Pioneered Responsible Scaling Policy (RSP) framework. Signed White House voluntary commitments. Publishes safety research openly. Opposed SB 1047 but supports federal safety standards.",
      "evidenceSource": "Explicitly stated",
      "agiTimeline": "2-3 years",
      "aiRiskLevel": "Catastrophic",
      "threatModels": "Loss of control, Existential risk",
      "influenceType": "Builder, Researcher/analyst, Narrator",
      "twitter": "@AnthropicAI",
      "notes": "Founded 2021 by Dario/Daniela Amodei and team from OpenAI. Raised $7.3B+ (Google, Spark, Salesforce). Products: Claude family of models. Key safety innovations: Constitutional AI, RLHF, interpretability research. ~1000 employees (2024). Public benefit corporation structure. Published RSP Sept 2023 defining AI Safety Levels (ASL)."
    },
    "submitterRelationship": "external"
  }'
```

---

### Example 5: Organization (Think Tank)

```bash
curl -X POST https://j8jamvdf6i.execute-api.eu-west-2.amazonaws.com/submit \
  -H "Content-Type: application/json" \
  -H "X-Contributor-Key: <CONTRIBUTOR_KEY>" \
  -d '{
    "type": "organization",
    "data": {
      "name": "Center for AI Safety",
      "category": "AI Safety/Alignment",
      "otherCategories": "Think Tank/Policy Org",
      "website": "https://safe.ai",
      "location": "San Francisco, CA",
      "fundingModel": "Philanthropic",
      "regulatoryStance": "Restrictive",
      "regulatoryStanceDetail": "Published 'Statement on AI Risk' signed by leading researchers (May 2023). Advocates for treating AI risk as global priority alongside pandemics and nuclear war.",
      "evidenceSource": "Explicitly stated",
      "agiTimeline": "5-10 years",
      "aiRiskLevel": "Existential",
      "threatModels": "Loss of control, Existential risk",
      "influenceType": "Researcher/analyst, Organizer/advocate, Connector/convener",
      "twitter": "@CenterAISafety",
      "notes": "Founded 2022 by Dan Hendrycks. Organized influential one-sentence statement on AI extinction risk signed by Hinton, Bengio, Altman, Hassabis, and hundreds of researchers. Runs ML safety research programs, compute grants, and field-building. Key publication: 'An Overview of Catastrophic AI Risks' (2023)."
    },
    "submitterRelationship": "external"
  }'
```

---

### Example 6: Resource (Influential Essay)

**What makes this good:** Clear key argument, publication context, impact assessment, specific claims documented.

```bash
curl -X POST https://j8jamvdf6i.execute-api.eu-west-2.amazonaws.com/submit \
  -H "Content-Type: application/json" \
  -H "X-Contributor-Key: <CONTRIBUTOR_KEY>" \
  -d '{
    "type": "resource",
    "data": {
      "title": "Situational Awareness: The Decade Ahead",
      "category": "AI Capabilities",
      "author": "Leopold Aschenbrenner",
      "resourceType": "Essay",
      "url": "https://situational-awareness.ai/",
      "year": "2024",
      "keyArgument": "AGI by 2027 is likely given current scaling trends. The US government should treat frontier AI as a national security priority, with massive compute buildout and security measures rivaling the Manhattan Project. China race dynamics make this urgent.",
      "notes": "Published June 2024 after author left OpenAI. ~100 pages across multiple essays. Advocates for 'superintelligence' framing and government-industry partnership. Influential in accelerationist and national security AI circles. Critics argue it overstates timeline confidence and risks militarizing AI development. Author previously worked on Superalignment team at OpenAI."
    },
    "submitterRelationship": "external"
  }'
```

---

### Example 7: Resource (Academic Paper)

```bash
curl -X POST https://j8jamvdf6i.execute-api.eu-west-2.amazonaws.com/submit \
  -H "Content-Type: application/json" \
  -H "X-Contributor-Key: <CONTRIBUTOR_KEY>" \
  -d '{
    "type": "resource",
    "data": {
      "title": "On the Dangers of Stochastic Parrots: Can Language Models Be Too Big?",
      "category": "Philosophy/Ethics",
      "author": "Emily Bender, Timnit Gebru, et al.",
      "resourceType": "Academic Paper",
      "url": "https://dl.acm.org/doi/10.1145/3442188.3445922",
      "year": "2021",
      "keyArgument": "Large language models pose risks including environmental costs, training data bias, and potential for harm. Argues for more careful consideration before scaling up models, and questions whether understanding emerges from scale.",
      "notes": "Published at FAccT 2021. Became center of controversy when Google fired co-author Timnit Gebru shortly before publication. Foundational text for AI ethics community skeptical of scaling paradigm. Introduced 'stochastic parrots' framing. Over 3000 citations. Influential in debates about AI hype, environmental impact, and corporate AI ethics."
    },
    "submitterRelationship": "external"
  }'
```

---

## Rate Limits

- **250 submissions per day** per contributor key (configurable per key)
- Exceeding the limit returns HTTP 429

---

## Workflow for AI Agents

**CRITICAL: Follow this workflow for EVERY submission request.**

When a contributor asks you to add someone:

1. **SEARCH FIRST (required)**: `GET /search?q=<name>` to check for duplicates
2. **If found**: Stop! Tell the contributor "[Name] already exists in the database (ID X). Would you like to suggest updates to their profile instead?"
3. **If not found**: Gather details from the contributor
4. **Submit**: `POST /submit` with the data
5. **Confirm**: Tell them the submission ID and that it's pending admin review

**Do not skip step 1.** Duplicate submissions create extra work for reviewers.

### Conversation starters

If the contributor doesn't know where to start, offer:

- **"Add [person name] to the map"** - Search first, then gather details
- **"Add [organization] to the map"** - Search first, then gather details
- **"Search for [name]"** - Check if someone is already in the database
- **"What categories are available?"** - List the valid options
- **"What does regulatory stance mean?"** - Explain the scale

### Best Practices for High-Quality Submissions

**General:**
- Always search before submitting - duplicates waste reviewer time
- Fill out as many fields as possible - sparse submissions are less useful
- Separate multiple values with commas (e.g., `"Decision-maker, Narrator"`)

**Evidence & Sources:**
- Prefer "Explicitly stated" evidence when possible
- Include specific quotes, dates, and sources in the notes field
- Link to primary sources: testimony transcripts, published essays, interviews
- If inferring positions, explain your reasoning in notes

**People:**
- Use their current primary role for title (e.g., "CEO, Anthropic" not "Former VP, OpenAI")
- Include both current org and notable past affiliations
- Note key publications, testimony, or public statements
- Document position changes over time if relevant

**Organizations:**
- Include founding year, approximate size, funding sources
- Note key products, publications, or initiatives
- Document official policy positions and public commitments
- Link to primary website, not Wikipedia

**Resources:**
- Summarize the key argument in 1-2 sentences
- Note the publication context and reception
- Include author affiliations at time of writing
- Assess impact/influence if notable

**Regulatory Stance:**
- This is the most important field - take time to get it right
- Use `regulatoryStanceDetail` to capture nuance
- Note if their position has evolved or varies by issue
- Cite specific legislation they've supported/opposed

**Notes Field:**
- This is your chance to add context reviewers need
- Include: key quotes, career history, notable positions, controversies
- Keep it factual and verifiable - avoid editorializing
- Aim for 2-4 sentences minimum for people/orgs

---

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| 401 Invalid contributor key format | Key doesn't match `mak_` + 32 hex chars | Check for typos in key |
| 401 Invalid or revoked contributor key | Key not found or revoked | Contact admin for new key |
| 400 Missing required field: name | Person/org submission without name | Add the name field |
| 400 Missing required field: title | Resource submission without title | Add the title field |
| 429 Daily submission limit reached | Exceeded 250/day limit | Wait until tomorrow |

---

## Security Notes

- Your contributor key is secret - don't share it publicly
- All submissions go through admin review before publishing
- The key is transmitted over HTTPS only
- If you suspect your key is compromised, contact the admin to revoke it
