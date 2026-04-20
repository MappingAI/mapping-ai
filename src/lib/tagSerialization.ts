import type { Tag, TagSearchResult } from '../components/TagInput'
import { normalizeTag, findCanonicalTag } from './resourceTaxonomy'

/**
 * Convert TagInput Tag[] → string[] suitable for the Postgres TEXT[] column.
 * Normalizes each label (trim, collapse whitespace, strip surrounding quotes),
 * drops empties and duplicates.
 */
export function tagsToStringArray(tags: Tag[] | null | undefined): string[] {
  if (!tags || !Array.isArray(tags)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const tag of tags) {
    const label = normalizeTag(String(tag.label ?? ''))
    if (!label) continue
    const key = label.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(label)
  }
  return out
}

/**
 * Convert a string[] (e.g. from an existing entity's topic_tags) → Tag[]
 * suitable for seeding a TagInput.
 */
export function stringArrayToTags(values: readonly string[] | null | undefined): Tag[] {
  if (!values || !Array.isArray(values)) return []
  return values.map((v, i) => ({ id: `tag:${v}:${i}`, label: v }))
}

/**
 * Build a TagInput searchFn for a tag vocabulary that is a union of a curated
 * core list plus any emergent tags already in use across the cache. Matches
 * are case-insensitive and return the canonical spelling.
 *
 * If the query produces a normalized value that does NOT match anything in
 * `canonical` or `emergent`, the resulting list includes a synthetic "+ new tag"
 * entry so the contributor can adopt it. The synthetic entry's id is
 * `new:<normalized>` so the caller can distinguish emergent additions from
 * existing matches.
 */
export function buildTagSearch(options: {
  canonical: readonly string[]
  emergent: readonly string[]
  alreadySelected: readonly string[]
}): (query: string) => TagSearchResult[] {
  const { canonical, emergent, alreadySelected } = options
  const selectedLower = new Set(alreadySelected.map((s) => s.toLowerCase()))
  const canonicalSet = new Set(canonical.map((s) => s.toLowerCase()))

  return (query: string): TagSearchResult[] => {
    const raw = (query ?? '').trim()
    if (!raw) return []
    const lower = raw.toLowerCase()

    const matchingCanonical = canonical
      .filter((t) => t.toLowerCase().includes(lower))
      .filter((t) => !selectedLower.has(t.toLowerCase()))
      .slice(0, 8)
      .map((t) => ({ id: `tag:${t}`, label: t, detail: 'core' }))

    const matchingEmergent = emergent
      .filter((t) => t.toLowerCase().includes(lower))
      .filter((t) => !canonicalSet.has(t.toLowerCase()))
      .filter((t) => !selectedLower.has(t.toLowerCase()))
      .slice(0, 8)
      .map((t) => ({ id: `tag:${t}`, label: t, detail: 'emergent' }))

    const results: TagSearchResult[] = [...matchingCanonical, ...matchingEmergent]

    // Offer a "+ add as new" entry only if the normalized query is not already
    // a canonical or emergent match and is not already selected.
    const normalized = normalizeTag(raw)
    if (normalized) {
      const existingCanonical = findCanonicalTag(normalized, canonical)
      const existingEmergent = findCanonicalTag(normalized, emergent)
      const alreadyInResults = results.some((r) => r.label.toLowerCase() === normalized.toLowerCase())
      const alreadySelectedHere = selectedLower.has(normalized.toLowerCase())
      if (!existingCanonical && !existingEmergent && !alreadyInResults && !alreadySelectedHere) {
        results.push({
          id: `new:${normalized}`,
          label: normalized,
          detail: '+ new tag',
          isPending: true,
        })
      }
    }

    return results
  }
}
