# Enrichment Prompt Improvements for v3

## Problems Identified in v2

### 1. Entity Evaluation Too Permissive
- "relevant to AI policy/research/industry" is vague
- Created entities from tangential mentions (Etsy, Port of Montreal)
- Didn't distinguish "uses AI" from "shapes AI ecosystem"

### 2. Edge Type Confusion
- Person → Org with "funded_by" (wrong direction)
- Org → Org with "employed_by" (nonsensical)
- "subsidiary_of" used for unrelated relationships

### 3. Duplicate Creation
- Didn't match existing entities well
- Created "Allen Institute for Artificial Intelligence" when "Allen Institute for AI" existed

---

## Proposed Improvements

### A. Entity Evaluation Prompt (v3)

```
You are deciding whether to add an entity to a database mapping the AI POLICY ECOSYSTEM.

## CANDIDATE
Name: ${targetName}
Type: ${targetType}

## EVIDENCE
Quote: "${sourceQuote}"
Source: ${sourceUrl}

## WHAT BELONGS IN THIS DATABASE

This database maps STAKEHOLDERS who actively SHAPE the AI ecosystem:

✓ INCLUDE (AI is their PRIMARY focus):
- Researchers/scientists doing AI/ML research
- Executives/employees at AI companies (labs, safety orgs, AI startups)
- Policymakers working on AI legislation/regulation
- Journalists who primarily cover AI/tech
- Investors who fund AI companies
- Advocates/organizers focused on AI issues
- Think tanks/NGOs doing AI policy work
- Government agencies with AI-specific mandates

✗ EXCLUDE (AI is NOT their primary focus):
- Companies that merely USE AI products (customers)
- General government agencies (IRS, EPA, DMV)
- Universities/schools without AI-specific programs
- Journalists who wrote one article mentioning AI
- Politicians mentioned in AI context but not working on AI policy
- General hospitals, banks, retailers, etc.

## THE KEY QUESTION
Does this entity have AI as a CENTRAL part of their work, mission, or identity?
NOT: "Was this entity mentioned in an AI-related article?"

## STRICT RULES
- Base decision ONLY on the quote provided
- The quote must show AI is CENTRAL to the entity, not just mentioned
- If uncertain, answer NO - we can add later if needed

Return JSON:
{
  "entity_exists": true | false,
  "ai_is_primary_focus": true | false,
  "reasoning": "<Explain: What specific words show AI is their PRIMARY focus? Or why not?>",
  "category": "<Category>",
  "confidence": <1-5>,
  "should_create": true | false
}

should_create = true ONLY IF:
- entity_exists = true AND
- ai_is_primary_focus = true AND
- confidence >= 4
```

### B. Edge Extraction Improvements

Add semantic validation rules to the prompt:

```
## EDGE TYPE RULES (MUST FOLLOW)

For PERSON → ORGANIZATION edges, use:
- employed_by: Person works/worked at org
- founded: Person founded the org
- advises: Person advises the org
- board_member: Person is on org's board
- invested_in: Person invested money in org
- affiliated: Person has loose affiliation (fellow, visiting, etc.)

For PERSON → PERSON edges, use:
- co_founded_with: Co-founded same org
- collaborator: Work/research together
- mentor_of / mentored_by: Mentorship relationship
- former_colleague: Worked together in past
- critic_of / supporter_of: Public disagreement/support

For ORGANIZATION → ORGANIZATION edges, use:
- subsidiary_of: Child org of parent
- funded_by: Receives funding from
- partner_of: Formal partnership
- spun_out_from: Originated from
- affiliated: Loose institutional connection

## FORBIDDEN EDGE TYPES
- Person CANNOT have: subsidiary_of, funded_by (as source)
- Org → Org CANNOT use: employed_by, founded, advises, board_member
- If the relationship doesn't fit these types, use "affiliated"

## DIRECTION MATTERS
- "X works at Y" → X employed_by Y (not Y employed_by X)
- "X funded Y" → Y funded_by X (the recipient points to funder)
- "X is subsidiary of Y" → X subsidiary_of Y (child points to parent)
```

### C. Pre-creation Duplicate Check

Before creating an entity, check against common aliases:

```javascript
// Before creating, check if entity already exists
const existingMatch = findEntityMatch(targetName, allEntities);
if (existingMatch) {
  console.log(`Matched "${targetName}" to existing [${existingMatch.entity.id}] ${existingMatch.entity.name}`);
  return existingMatch.entity;
}
```

---

## Implementation Checklist

- [ ] Update `buildEntityEvaluationPrompt()` with v3 prompt
- [ ] Add edge type validation in `processEdges()`
- [ ] Add pre-creation duplicate check
- [ ] Test on 10 entities before full run
- [ ] Log entities that fail AI-relevance check for review
