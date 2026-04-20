/**
 * Canonical tag lists for the Resources surface.
 *
 * `TOPIC_CORE` is the curated set surfaced as default filter chips in the
 * Library and as the primary searchable options in the ResourceForm topic
 * TagInput. Contributor-added emergent tags are not listed here; they are
 * aggregated at runtime from `map-data.json` (any tag present on at least
 * one resource that is not in TOPIC_CORE).
 *
 * Admins promote an emergent tag into the core by adding it to this list
 * and shipping a release. Merging synonyms is a SQL admin task in Phase 1
 * (see Admin runbook in the Phase 1 plan).
 *
 * `FORMAT_TAGS` is a closed set. Adding a new format is an intentional
 * editorial decision, not a contributor-driven path, so we keep it here.
 */

export const TOPIC_CORE: readonly string[] = [
  'AI Safety',
  'Alignment',
  'AGI Governance',
  'Policy Proposal',
  'Regulatory Analysis',
  'Compute',
  'National Security',
  'Economics',
  'Foundational',
  'AGI Timeline',
  'Existential Risk',
  'Forecasting',
  'Empirical Research',
  'Deployment',
  'Accelerationism',
  'Ecosystem Map',
]

export const FORMAT_TAGS: readonly string[] = [
  'Book',
  'Essay',
  'Academic Paper',
  'Podcast',
  'Video',
  'Report',
  'News Article',
  'Interview',
  'Series',
  'Scenario',
  'Policy Document',
  'Index',
  'Interactive Map',
]

/**
 * Belief vocabularies used by the advocated_* fields on resources.
 * These mirror the label vocabularies used for author/org beliefs so the
 * same filter UIs can render both. Values are the display strings written
 * to DB columns; see `api/export-map.js` STANCE_SCORES / TIMELINE_SCORES /
 * RISK_SCORES for the ordinal mapping used by the Plot view.
 */
export const ADVOCATED_STANCE_OPTIONS: readonly string[] = [
  'Accelerate',
  'Light-touch',
  'Targeted',
  'Moderate',
  'Restrictive',
  'Precautionary',
  'Nationalize',
]

export const ADVOCATED_TIMELINE_OPTIONS: readonly string[] = [
  'Already here',
  '2-3 years',
  '5-10 years',
  '10-25 years',
  '25+ years or never',
]

export const ADVOCATED_RISK_OPTIONS: readonly string[] = [
  'Overstated',
  'Manageable',
  'Serious',
  'Catastrophic',
  'Existential',
]

/**
 * Normalize a contributor-submitted tag: trim whitespace, collapse internal
 * runs, and reject empties. Returns `null` for unusable input so callers can
 * skip rather than add garbage.
 *
 * This is Phase 1's emergent-tag hygiene layer. Admin-side merge tooling
 * ships in Phase 2.
 */
export function normalizeTag(raw: string): string | null {
  if (typeof raw !== 'string') return null
  const cleaned = raw
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^["']|["']$/g, '')
  if (!cleaned) return null
  if (cleaned.length > 80) return null
  return cleaned
}

/**
 * Find a case-insensitive match for a proposed tag against a known list.
 * Used by ResourceForm to suggest "did you mean AI Safety?" before accepting
 * a fresh emergent tag that duplicates an existing spelling. Returns the
 * canonical spelling (from `known`) when a match is found, else null.
 */
export function findCanonicalTag(proposed: string, known: readonly string[]): string | null {
  const normalized = normalizeTag(proposed)
  if (!normalized) return null
  const lower = normalized.toLowerCase()
  for (const k of known) {
    if (k.toLowerCase() === lower) return k
  }
  return null
}
