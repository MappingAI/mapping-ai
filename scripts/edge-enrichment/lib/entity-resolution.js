/**
 * Entity resolution pipeline for edge enrichment
 * Resolves extracted names to RDS entity IDs
 *
 * Pipeline: exact → normalized → alias → fuzzy → suggestion
 */
import crypto from 'crypto'

// Suffixes to strip when normalizing names
const STRIP_SUFFIXES = [
  ', Inc.',
  ', Inc',
  ' Inc.',
  ' Inc',
  ', LLC',
  ' LLC',
  ', L.L.C.',
  ' L.L.C.',
  ', Corp.',
  ', Corp',
  ' Corp.',
  ' Corp',
  ', Ltd.',
  ', Ltd',
  ' Ltd.',
  ' Ltd',
  ', Co.',
  ', Co',
  ' Co.',
  ' Co',
  ', LP',
  ' LP',
  ', L.P.',
  ' L.P.',
  ', PBC',
  ' PBC',
  ' Foundation',
  ' Institute',
  ' Organization',
  ' Association',
  ' Initiative',
  ' Project',
]

/**
 * Normalize a name for matching
 * Strips common suffixes and lowercases
 */
export function normalizeName(name) {
  if (!name) return ''
  let n = name.trim()
  for (const suffix of STRIP_SUFFIXES) {
    if (n.toLowerCase().endsWith(suffix.toLowerCase())) {
      n = n.slice(0, -suffix.length).trim()
    }
  }
  return n.toLowerCase()
}

/**
 * Generate suggestion ID from name
 */
export function suggestionId(name) {
  return 'suggestion-' + crypto.createHash('sha256').update(name.toLowerCase().trim()).digest('hex').slice(0, 12)
}

/**
 * Resolve an extracted name to an entity ID
 *
 * @param {string} extractedName - The name extracted by Claude
 * @param {Pool} rds - RDS connection pool
 * @param {Pool} neon - Neon connection pool
 * @param {Object[]} entityCache - Optional pre-loaded entity cache
 * @returns {Object} { id, name, confidence } or null if not found
 */
export async function resolveEntity(extractedName, rds, neon, entityCache = null) {
  if (!extractedName || extractedName.trim() === '') return null

  const normalized = normalizeName(extractedName)

  // Use cache if provided, otherwise query
  let entities = entityCache
  if (!entities) {
    const result = await rds.query(`
      SELECT id, name, entity_type
      FROM entity
      WHERE status = 'approved'
        AND entity_type IN ('person', 'organization')
    `)
    entities = result.rows
  }

  // Step 1: Exact match (case-insensitive)
  for (const entity of entities) {
    if (entity.name.toLowerCase() === extractedName.toLowerCase()) {
      return { id: entity.id, name: entity.name, confidence: 'exact' }
    }
  }

  // Step 2: Normalized match
  for (const entity of entities) {
    if (normalizeName(entity.name) === normalized) {
      return { id: entity.id, name: entity.name, confidence: 'normalized' }
    }
  }

  // Step 3: Alias lookup
  const alias = await neon.query(`SELECT entity_id, canonical FROM entity_alias WHERE LOWER(alias) = $1`, [
    extractedName.toLowerCase(),
  ])
  if (alias.rows.length === 1) {
    return { id: alias.rows[0].entity_id, name: alias.rows[0].canonical, confidence: 'alias' }
  }

  // Step 4: Fuzzy match using string similarity
  // We'll use a simple approach since pg_trgm might not be available
  let bestMatch = null
  let bestSimilarity = 0

  for (const entity of entities) {
    const sim = stringSimilarity(extractedName.toLowerCase(), entity.name.toLowerCase())
    if (sim > bestSimilarity) {
      bestSimilarity = sim
      bestMatch = entity
    }
  }

  if (bestSimilarity >= 0.85) {
    return { id: bestMatch.id, name: bestMatch.name, confidence: 'fuzzy_high', similarity: bestSimilarity }
  }

  // Step 5: No match - return potential fuzzy matches for suggestion
  if (bestSimilarity >= 0.6) {
    return {
      id: null,
      potentialMatch: { id: bestMatch.id, name: bestMatch.name, similarity: bestSimilarity },
      confidence: 'unresolved',
    }
  }

  return { id: null, confidence: 'unresolved' }
}

/**
 * Simple string similarity (Dice coefficient on bigrams)
 */
function stringSimilarity(a, b) {
  if (a === b) return 1
  if (a.length < 2 || b.length < 2) return 0

  const bigramsA = new Set()
  for (let i = 0; i < a.length - 1; i++) {
    bigramsA.add(a.slice(i, i + 2))
  }

  let intersectionCount = 0
  for (let i = 0; i < b.length - 1; i++) {
    const bigram = b.slice(i, i + 2)
    if (bigramsA.has(bigram)) {
      intersectionCount++
      bigramsA.delete(bigram) // Count each bigram only once
    }
  }

  return (2 * intersectionCount) / (a.length - 1 + (b.length - 1))
}

/**
 * Find potential duplicates for an entity suggestion
 */
export async function findPotentialDuplicates(name, rds, threshold = 0.6) {
  const result = await rds.query(`
    SELECT id, name, entity_type
    FROM entity
    WHERE status = 'approved'
      AND entity_type IN ('person', 'organization')
  `)

  const duplicates = []
  for (const entity of result.rows) {
    const sim = stringSimilarity(name.toLowerCase(), entity.name.toLowerCase())
    if (sim >= threshold) {
      duplicates.push({
        entity_id: entity.id,
        name: entity.name,
        entity_type: entity.type,
        similarity: Math.round(sim * 100) / 100,
      })
    }
  }

  return duplicates.sort((a, b) => b.similarity - a.similarity).slice(0, 5)
}

/**
 * Create or update an entity suggestion
 */
export async function createOrUpdateSuggestion(neon, rds, suggestionData) {
  const sid = suggestionId(suggestionData.extracted_name)

  // Find potential duplicates
  const duplicates = await findPotentialDuplicates(suggestionData.extracted_name, rds)

  await neon.query(
    `INSERT INTO entity_suggestion (
      suggestion_id, extracted_name, entity_type, context,
      source_url, source_id, citation,
      seen_as_funder, seen_as_recipient, potential_duplicates
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (extracted_name) DO UPDATE SET
      times_seen = entity_suggestion.times_seen + 1,
      last_seen_at = NOW(),
      seen_as_funder = entity_suggestion.seen_as_funder OR EXCLUDED.seen_as_funder,
      seen_as_recipient = entity_suggestion.seen_as_recipient OR EXCLUDED.seen_as_recipient,
      context = COALESCE(entity_suggestion.context, EXCLUDED.context),
      potential_duplicates = COALESCE(EXCLUDED.potential_duplicates, entity_suggestion.potential_duplicates)`,
    [
      sid,
      suggestionData.extracted_name,
      suggestionData.entity_type || null,
      suggestionData.context || null,
      suggestionData.source_url || null,
      suggestionData.source_id || null,
      suggestionData.citation || null,
      suggestionData.seen_as_funder || false,
      suggestionData.seen_as_recipient || false,
      duplicates.length > 0 ? JSON.stringify(duplicates) : null,
    ]
  )

  return sid
}

/**
 * Load all entities for caching (reduces queries)
 */
export async function loadEntityCache(rds) {
  const result = await rds.query(`
    SELECT id, name, entity_type
    FROM entity
    WHERE status = 'approved'
      AND entity_type IN ('person', 'organization')
  `)
  return result.rows
}
