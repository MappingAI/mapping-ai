# Improved Extraction Prompt for discover-funding.js

## Current Issues

1. **No AI-relevance filter** - Extracts ALL funding relationships
2. **No entity involvement check** - Extracts tangential relationships where the searched entity isn't involved
3. **Generic names slip through** - "CHIPS Act", "federal government" etc.

## Improved Prompt

```javascript
const EXTRACTION_PROMPT = `You are extracting AI-RELATED funding relationships from search results about a specific entity.

For the entity "${entityName}", extract funding relationships where:
1. The entity is the FUNDER (giving money), OR
2. The entity is the RECIPIENT (receiving money)

CRITICAL RULES:
- The searched entity "${entityName}" MUST be either the funder OR recipient
- Do NOT extract relationships between two OTHER entities mentioned in the text
- Only extract relationships related to AI, ML, technology, or policy

AI-RELATED includes:
✓ AI/ML companies, research labs, safety orgs
✓ Tech companies with AI divisions (Google, Microsoft, Amazon, Meta, Nvidia)
✓ AI policy think tanks, governance orgs
✓ Semiconductor/chip manufacturing (AI infrastructure)
✓ AI ethics, safety, alignment research
✓ Universities doing AI/ML research
✓ Government AI programs (DARPA AI, NSF AI grants)

NOT AI-RELATED (skip these):
✗ General philanthropy (global health, poverty, climate - unless AI-focused)
✗ Non-tech acquisitions or corporate activities
✗ Political donations (unless specifically for AI policy)
✗ Media/journalism (unless AI-focused publication)
✗ General education (unless AI/CS/ML programs)

For each relationship found, return:
- funder_name: The ACTUAL ORGANIZATION OR PERSON that provided the money
- recipient_name: The ACTUAL ORGANIZATION OR PERSON that received the money
- amount_usd: Dollar amount if stated (number only, no symbols)
- amount_note: Context about the amount ("Series A", "grant", "annual budget")
- start_date: When funding started (YYYY-MM-DD or YYYY-MM or YYYY)
- end_date: When funding ended (if applicable)
- citation: A verbatim quote from the source supporting this claim (1-2 sentences)
- source_url: The URL where you found this information
- confidence: "high" (explicit statement), "medium" (clear implication), "low" (uncertain)
- ai_relevance: Brief explanation of why this is AI-related

VALID FUNDERS/RECIPIENTS:
✓ Organizations: companies, foundations, nonprofits, universities, government agencies
✓ People: individuals, philanthropists, investors
✗ NOT valid: legislation (CHIPS Act), programs (BEAD Program), tax credits, "federal government", "private sector", generic terms

Examples:
- "CHIPS Act funding" → funder should be "U.S. Department of Commerce" not "CHIPS Act"
- "government grant" → identify the specific agency (NSF, DARPA, NIH, etc.)
- "private investment" → only include if the specific investor is named

IMPORTANT:
- "${entityName}" MUST be either funder_name or recipient_name in every relationship
- Only extract relationships with clear evidence in the text
- The citation must be a VERBATIM quote from the text
- If no AI-related funding relationships involving "${entityName}" are found, return an empty array

Return JSON:
{
  "entity_name": "${entityName}",
  "relationships": [
    {
      "funder_name": "...",
      "recipient_name": "...",
      "amount_usd": 5000000,
      "amount_note": "Series A funding",
      "start_date": "2023",
      "end_date": null,
      "citation": "verbatim quote from source...",
      "source_url": "https://...",
      "confidence": "high",
      "ai_relevance": "AI safety research funding"
    }
  ]
}`
```

## Key Changes

1. **Added AI-relevance requirement** with clear examples
2. **Entity involvement check** - Searched entity MUST be funder or recipient
3. **Added `ai_relevance` field** - Forces model to explain why it's AI-related
4. **Clearer exclusion criteria** - What NOT to extract
5. **Repeated entity name** in prompt to reinforce the constraint

## Post-Processing Validation

Even with improved prompt, add server-side validation:

```javascript
// In processEntity(), after extraction:
for (const rel of extraction.relationships) {
  // VALIDATION 1: Entity must be involved
  const entityInvolved =
    rel.funder_name.toLowerCase().includes(entity.name.toLowerCase()) ||
    rel.recipient_name.toLowerCase().includes(entity.name.toLowerCase()) ||
    entity.name.toLowerCase().includes(rel.funder_name.toLowerCase()) ||
    entity.name.toLowerCase().includes(rel.recipient_name.toLowerCase())

  if (!entityInvolved) {
    console.log(`  ⊘ Skipped (entity not involved): ${rel.funder_name} → ${rel.recipient_name}`)
    continue
  }

  // VALIDATION 2: AI relevance check (basic keyword match)
  const AI_KEYWORDS = /\b(ai|artificial intelligence|machine learning|ml|deep learning|neural|llm|gpt|transformer|nlp|computer vision|robotics|autonomous|semiconductor|chip|gpu|safety|alignment|governance)\b/i

  const textToCheck = `${rel.funder_name} ${rel.recipient_name} ${rel.citation} ${rel.ai_relevance || ''}`
  if (!AI_KEYWORDS.test(textToCheck)) {
    console.log(`  ⊘ Skipped (not AI-related): ${rel.funder_name} → ${rel.recipient_name}`)
    continue
  }

  // ... proceed with storage
}
```

## Migration for Existing Data

For the 448 existing edges, run the AI-relevance filter script to classify them.
