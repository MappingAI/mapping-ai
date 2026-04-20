/**
 * Haiku-powered classifier.
 *
 * Takes a seed (name + type) plus a bundle of evidence snippets and returns
 * structured enum values + short reasoning + confidence. The prompt lives in
 * .claude/skills/enrich/references/belief-rubric.md and is read at runtime
 * so rubric tuning doesn't require a code deploy.
 *
 * When ANTHROPIC_API_KEY is missing, falls back to a deterministic "needs
 * review" response so the rest of the pipeline still works (the caller just
 * has to edit the draft before submitting).
 */
import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import {
  STANCE_OPTIONS,
  TIMELINE_OPTIONS,
  RISK_OPTIONS,
  EVIDENCE_OPTIONS,
  PERSON_CATEGORIES,
  ORGANIZATION_CATEGORIES,
  RESOURCE_TYPES,
  KEY_CONCERNS,
  CURRENT_ENRICHMENT_VERSION,
  validateEnum,
} from './schema.js'

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const HAIKU_MODEL = 'claude-haiku-4-5-20251001'

// Path to the belief rubric inside the skill's references/ directory.
// Resolved from the project root so it works regardless of cwd.
function rubricPath() {
  return resolve(process.cwd(), '.claude/skills/enrich/references/belief-rubric.md')
}

async function readRubric() {
  try {
    return await readFile(rubricPath(), 'utf8')
  } catch {
    return '' // skill not installed yet; fall through with a bare prompt
  }
}

function categoriesFor(type) {
  if (type === 'person') return PERSON_CATEGORIES
  if (type === 'organization') return ORGANIZATION_CATEGORIES
  if (type === 'resource') return RESOURCE_TYPES
  return []
}

/**
 * Build the classification prompt. Returns a single-message user prompt.
 * The prompt asks Haiku to respond with strict JSON so we can parse without
 * markdown-stripping gymnastics.
 */
function buildPrompt({ name, entityType, evidenceText, rubric }) {
  const categories = categoriesFor(entityType).join(', ')
  return `You are classifying a stakeholder in a U.S. AI-policy map. Use the rubric below.

Entity name: ${name}
Entity type: ${entityType}

Evidence (from Exa or web search):
${evidenceText || '(no evidence provided)'}

Rubric:
${rubric || '(no rubric loaded; use best judgement)'}

Respond in strict JSON only, with these keys:
{
  "category": <one of: ${categories}>,
  "otherCategories": <comma-separated string of secondary ${entityType} categories, or empty>,
  "regulatoryStance": <one of: ${STANCE_OPTIONS.join(', ')}>,
  "agiTimeline": <one of: ${TIMELINE_OPTIONS.join(', ')}>,
  "aiRiskLevel": <one of: ${RISK_OPTIONS.join(', ')}>,
  "evidenceSource": <one of: ${EVIDENCE_OPTIONS.join(', ')}>,
  "threatModels": <short sentence list using phrases like: ${KEY_CONCERNS.join(', ')}>,
  "confidence": <integer 1-5. 5 = multiple primary sources directly stating this. 1 = no evidence, speculative>,
  "reasoning": <one short paragraph citing which evidence points support each classification>,
  "claims": [
    {
      "field_name": <one of: agiTimeline, regulatoryStance, aiRiskLevel, evidenceSource, threatModels, category>,
      "quote": <direct quoted text from the source that supports this claim; exact wording, not paraphrase>,
      "url": <URL of the source>,
      "claim_date": <ISO date YYYY-MM-DD the speaker made the claim, if discoverable from the source; null if unknown>,
      "definition": <free-text note on what the speaker meant, especially for AGI claims where definitions vary; null if not relevant. Examples: "economically valuable tasks", "self-improvement / ASI-level", "Turing test", "human-level cognition">
    }
  ]
}

For "claims": include one entry per dated, directly-quoted statement you can attach to a belief field. This is load-bearing for downstream features (quote-level sourcing UI, AGI definition-space viz, belief-trajectory sparklines). If you can't find a direct quote, omit that claim entry rather than fabricating one. Multiple claims per field (e.g., two dated timeline quotes) are fine and encouraged — they make trajectory views possible.

If the evidence is too thin to classify confidently, use "Unknown" / "Ill-defined" / "Mixed/nuanced" values rather than guessing, and return confidence: 1 or 2.
Do not add keys beyond the set above. No markdown fences, no commentary outside the JSON.`
}

function parseHaikuJson(text) {
  if (!text) return null
  const cleaned = text
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    return null
  }
}

/**
 * Classify an entity. Returns the structured fields above, plus
 * `enrichmentVersion` for the submission record.
 *
 * Callers pass `evidenceText` already assembled from their Exa/WebSearch
 * results (see research.js).
 */
export async function classifyEntity({ name, entityType, evidenceText }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      category: null,
      regulatoryStance: 'Mixed/unclear',
      agiTimeline: 'Unknown',
      aiRiskLevel: 'Unknown',
      evidenceSource: 'Unknown',
      threatModels: null,
      confidence: 1,
      reasoning: 'ANTHROPIC_API_KEY missing — classifier skipped. Edit the draft before submitting.',
      enrichmentVersion: CURRENT_ENRICHMENT_VERSION,
      warning: 'no-classifier',
    }
  }

  const rubric = await readRubric()
  const prompt = buildPrompt({ name, entityType, evidenceText, rubric })

  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: HAIKU_MODEL,
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(30000),
  })
  if (!res.ok) {
    throw new Error(`Haiku classification failed: ${res.status} ${res.statusText}`)
  }
  const json = await res.json()
  const parsed = parseHaikuJson(json.content?.[0]?.text)
  if (!parsed) {
    throw new Error('Haiku classifier returned unparsable JSON')
  }

  // Validate each enum value. If any are off-enum, surface them as warnings
  // so the caller can decide whether to retry or edit by hand.
  const enumWarnings = []
  const allowedCategory = categoriesFor(entityType)
  const catError = validateEnum('category', parsed.category, allowedCategory)
  if (catError) enumWarnings.push(catError)
  ;['regulatoryStance', 'agiTimeline', 'aiRiskLevel', 'evidenceSource'].forEach((field) => {
    const allowed =
      field === 'regulatoryStance'
        ? STANCE_OPTIONS
        : field === 'agiTimeline'
          ? TIMELINE_OPTIONS
          : field === 'aiRiskLevel'
            ? RISK_OPTIONS
            : EVIDENCE_OPTIONS
    const err = validateEnum(field, parsed[field], allowed)
    if (err) enumWarnings.push(err)
  })

  // Normalise the claims array into the notes_sources shape consumers expect.
  // Each claim becomes a source entry with field_name + quote + claim_date +
  // definition preserved alongside the URL. Downstream features
  // (quote-level sourcing UI, AGI definition-space viz, sparklines) depend
  // on these per-claim fields being present.
  const rawClaims = Array.isArray(parsed.claims) ? parsed.claims : []
  const claimSources = rawClaims
    .filter((c) => c && typeof c.url === 'string' && c.url.length > 0)
    .map((c) => ({
      url: c.url,
      snippet: c.quote ?? null,
      retrieved_at: new Date().toISOString(),
      retriever: 'classifier',
      field_name: c.field_name ?? null,
      quote: c.quote ?? null,
      claim_date: c.claim_date ?? null,
      definition: c.definition ?? null,
    }))

  return {
    category: parsed.category ?? null,
    otherCategories: parsed.otherCategories ?? null,
    regulatoryStance: parsed.regulatoryStance ?? null,
    agiTimeline: parsed.agiTimeline ?? null,
    aiRiskLevel: parsed.aiRiskLevel ?? null,
    evidenceSource: parsed.evidenceSource ?? null,
    threatModels: parsed.threatModels ?? null,
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : null,
    reasoning: parsed.reasoning ?? null,
    claims: claimSources,
    enrichmentVersion: CURRENT_ENRICHMENT_VERSION,
    enumWarnings: enumWarnings.length ? enumWarnings : null,
  }
}
