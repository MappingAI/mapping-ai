/**
 * Enum constants + edge vocabulary for the enrichment skill.
 *
 * Single source of truth imported by research, validate, submit, and classify.
 * Values are copied rather than re-imported from api/submit.js because Lambda
 * code isn't in the default Node module resolution path when running scripts
 * outside SAM; if `api/submit.js` ever ships as an ES module with an explicit
 * exports map, switch to re-export instead.
 *
 * KEEP SYNCHRONIZED with api/submit.js + api/export-map.js + scripts/migrate.js.
 * A drift here is exactly the failure class this module is meant to prevent,
 * so lib.test.ts asserts parity against api/submit.js at runtime.
 */

// Person categories (primary role).
export const PERSON_CATEGORIES = [
  'Executive',
  'Researcher',
  'Policymaker',
  'Investor',
  'Organizer',
  'Journalist',
  'Academic',
  'Cultural figure',
]

// Organization categories (sector).
export const ORGANIZATION_CATEGORIES = [
  'Frontier Lab',
  'AI Safety/Alignment',
  'Think Tank/Policy Org',
  'Government/Agency',
  'Academic',
  'VC/Capital/Philanthropy',
  'Labor/Civil Society',
  'Ethics/Bias/Rights',
  'Media/Journalism',
  'Political Campaign/PAC',
  'AI Infrastructure & Compute',
  'AI Deployers & Platforms',
]

// Resource type (from contribute/ResourceForm).
export const RESOURCE_TYPES = [
  'Essay',
  'Book',
  'Report',
  'Podcast',
  'Video',
  'Website',
  'Academic Paper',
  'News Article',
  'Substack/Newsletter',
]

// Regulatory stance → ordinal score (for trigger-maintained aggregates).
// NULL score = Mixed/unclear or Other; see api/submit.js STANCE_SCORES.
export const STANCE_SCORES = {
  Accelerate: 1,
  'Light-touch': 2,
  Targeted: 3,
  Moderate: 4,
  Restrictive: 5,
  Precautionary: 6,
  Nationalize: 7,
}
export const STANCE_OPTIONS = [...Object.keys(STANCE_SCORES), 'Mixed/unclear', 'Other']

// AGI timeline → ordinal score.
export const TIMELINE_SCORES = {
  'Already here': 1,
  '2-3 years': 2,
  '5-10 years': 3,
  '10-25 years': 4,
  '25+ years or never': 5,
}
export const TIMELINE_OPTIONS = [...Object.keys(TIMELINE_SCORES), 'Ill-defined', 'Unknown']

// AI risk level → ordinal score.
export const RISK_SCORES = {
  Overstated: 1,
  Manageable: 2,
  Serious: 3,
  Catastrophic: 4,
  Existential: 5,
}
export const RISK_OPTIONS = [...Object.keys(RISK_SCORES), 'Mixed/nuanced', 'Unknown']

// Evidence source labels.
export const EVIDENCE_OPTIONS = ['Explicitly stated', 'Inferred', 'Unknown']

// Key-concerns checkbox set (free-selection, not an enum score).
export const KEY_CONCERNS = [
  'Labor displacement',
  'Economic inequality',
  'Power concentration',
  'Democratic erosion',
  'Cybersecurity',
  'Misinformation',
  'Environmental',
  'Weapons',
  'Loss of control',
  'Copyright/IP',
  'Existential risk',
]

// Submitter relationship → weight used by recalculate_entity_scores.
export const SUBMITTER_RELATIONSHIPS = ['self', 'connector', 'external']

// Canonical edge types + aliases.
// The canonical value is used when writing new edges; aliases are recognised
// on read so legacy edges (e.g. 'author' instead of 'authored_by') still
// resolve correctly. Any new edge-producing code SHOULD use the canonical name.
export const EDGE_TYPES_CANONICAL = [
  'affiliated', // person ↔ org, person ↔ person (professional tie, unspecified role)
  'employed_by', // person → org (explicit employment)
  'authored_by', // resource → person (author attribution)
  'funder', // org → person/org/resource (funding relationship)
  'critic', // person/org → person/org/resource (public critic)
  'collaborator', // person ↔ person (joint work)
  'former_colleague', // person ↔ person (past joint org)
  'subsidiary_of', // org → org (parent/child)
  'publisher', // org → resource (publishing org for a report etc.)
]

export const EDGE_TYPE_ALIASES = {
  author: 'authored_by', // legacy single-source variant
  affiliation: 'affiliated',
  employed: 'employed_by',
}

export function canonicalEdgeType(raw) {
  if (!raw) return null
  if (EDGE_TYPES_CANONICAL.includes(raw)) return raw
  if (EDGE_TYPE_ALIASES[raw]) return EDGE_TYPE_ALIASES[raw]
  return raw // pass through unknown types so legacy behavior is preserved
}

// Validate a raw enum value and produce a structured error if it doesn't match.
export function validateEnum(field, value, allowedSet) {
  if (value == null || value === '') return null // optional fields are fine
  if (!allowedSet.includes(value)) {
    return {
      field,
      value,
      error: `unknown ${field} value`,
      allowed: allowedSet,
    }
  }
  return null
}

// Map a submission field name to the allowed-values list it validates against.
// Used by scripts/enrich/validate.js so agents get a clear "here are your
// options" message when Haiku produces something off-enum.
export const SUBMISSION_ENUM_FIELDS = {
  category: null, // depends on entityType; resolved separately in validate.js
  regulatoryStance: STANCE_OPTIONS,
  agiTimeline: TIMELINE_OPTIONS,
  aiRiskLevel: RISK_OPTIONS,
  evidenceSource: EVIDENCE_OPTIONS,
  resourceType: RESOURCE_TYPES,
  submitterRelationship: SUBMITTER_RELATIONSHIPS,
}

// Confidence: 1 (speculative) to 5 (fully verified against primary sources).
export const MIN_CONFIDENCE = 1
export const MAX_CONFIDENCE = 5

// Enrichment version tag: prefix with YYYY-MM-DD so re-enrichments can be
// filtered by run date. Consumers bump this when changing the Haiku prompt.
export const CURRENT_ENRICHMENT_VERSION = 'enrichment-skill-v1-2026-04-20'
