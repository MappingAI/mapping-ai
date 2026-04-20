/**
 * Fuzzy name matching for duplicate detection.
 *
 * Wraps the existing scripts/lib/org-matching.js DUPLICATE_GROUPS aliases
 * and adds a generic name-similarity score that works for people and
 * resources too. The skill uses this before creating anything new, to
 * refuse duplicate submissions without explicit override.
 */
import { DUPLICATE_GROUPS } from '../../lib/org-matching.js'

// Flatten DUPLICATE_GROUPS into { alias -> canonicalName }.
const ORG_ALIAS_MAP = (() => {
  const map = new Map()
  for (const group of DUPLICATE_GROUPS) {
    const [canonical, ...aliases] = group
    for (const alias of aliases) map.set(alias.toLowerCase(), canonical)
    map.set(canonical.toLowerCase(), canonical)
  }
  return map
})()

/**
 * Canonicalise an org name via the alias table. Returns the input if no
 * alias is known.
 */
export function canonicalOrgName(raw) {
  if (!raw) return raw
  return ORG_ALIAS_MAP.get(raw.toLowerCase()) ?? raw
}

// Cheap Levenshtein-like similarity: lower-case, drop punctuation, compare
// by shared tokens. Returns 0–1. Good enough for first-pass dedup; falls
// back to caller's judgement for close calls.
export function nameSimilarity(a, b) {
  if (!a || !b) return 0
  const norm = (s) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .split(/\s+/)
      .filter(Boolean)
  const ta = new Set(norm(a))
  const tb = new Set(norm(b))
  if (ta.size === 0 || tb.size === 0) return 0
  let inter = 0
  for (const t of ta) if (tb.has(t)) inter++
  return (2 * inter) / (ta.size + tb.size) // Dice coefficient
}

/**
 * Match a candidate name against an array of existing entity rows. Returns
 * the top hits sorted by descending similarity. `SIM_HIGH` and `SIM_LOW` are
 * soft thresholds the caller can use to decide: ≥ high = almost certainly
 * a duplicate, ≥ low = worth showing, < low = no match.
 */
export const SIM_HIGH = 0.85
export const SIM_LOW = 0.55

export function findMatches(candidate, entities, { entityType = null, limit = 5 } = {}) {
  const target = canonicalOrgName(candidate)
  const scored = entities
    .filter((e) => !entityType || e.entity_type === entityType)
    .map((e) => ({
      entity: e,
      similarity: Math.max(nameSimilarity(target, e.name), nameSimilarity(candidate, e.name)),
    }))
    .filter((s) => s.similarity >= SIM_LOW)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
  return scored
}
