#!/usr/bin/env node
/**
 * Post-processing Step 0: Clean up orphan edges and suggestions
 *
 * 1. FIRST: Fuzzy match to rescue edges where entity names match RDS (different spelling)
 * 2. THEN: Delete edge discoveries where NEITHER source nor target exists in RDS
 *    (These were noise extracted from search results, not directly related to searched entities)
 * 3. FINALLY: Delete entity suggestions that are only referenced by those deleted edges
 *
 * Run this BEFORE the other post-processing scripts.
 *
 * Usage:
 *   node scripts/edge-enrichment/post-process-0-cleanup-orphans.js --dry-run
 *   node scripts/edge-enrichment/post-process-0-cleanup-orphans.js --apply
 */
import 'dotenv/config'
import pg from 'pg'
import fs from 'fs'

const neon = new pg.Pool({
  connectionString: process.env.PILOT_DB,
  ssl: { rejectUnauthorized: false }
})

const rds = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

function normalize(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '')
}

// Strip common suffixes for better matching (iteratively to handle "Group Corp" etc)
function normalizeWithSuffixStrip(str) {
  let result = str.toLowerCase()
  // Keep stripping suffixes until none remain
  const suffixPattern = /\s+(group|corp|corporation|inc|llc|ltd|co|company)\.?$/i
  while (suffixPattern.test(result)) {
    result = result.replace(suffixPattern, '')
  }
  return result.replace(/[^a-z0-9]/g, '')
}

// Manual mappings for well-known entities that fuzzy match won't catch
const MANUAL_MAPPINGS = {
  'goldman sachs': 'goldman sachs',  // placeholder - check if exists in RDS
  'jpmorgan chase': 'jpmorgan chase',
  'chan zuckerberg initiative': 'chan zuckerberg initiative',
  'meta platforms': 'meta',
  'alphabet': 'google',
  'alphabet inc': 'google',
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const apply = process.argv.includes('--apply')

  if (!dryRun && !apply) {
    console.log('Usage:')
    console.log('  --dry-run  Show what would be changed without making changes')
    console.log('  --apply    Actually apply the changes')
    process.exit(1)
  }

  console.log(`=== CLEANUP ORPHAN EDGES & SUGGESTIONS ===`)
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'APPLYING CHANGES'}\n`)

  // ============================================
  // STEP 1: Fuzzy match rescue
  // ============================================
  console.log('--- STEP 1: FUZZY MATCH RESCUE ---\n')

  // Build normalized lookup from RDS entities
  const rdsEntities = await rds.query('SELECT id, name FROM entity')
  const normalizedMap = new Map()
  const suffixStrippedMap = new Map()
  for (const r of rdsEntities.rows) {
    normalizedMap.set(normalize(r.name), { id: r.id, name: r.name })
    // Also add suffix-stripped version for better matching
    const stripped = normalizeWithSuffixStrip(r.name)
    if (!suffixStrippedMap.has(stripped)) {
      suffixStrippedMap.set(stripped, { id: r.id, name: r.name })
    }
  }

  // Find edges where neither exists but could be fuzzy matched
  const neitherEdges = await neon.query(`
    SELECT discovery_id, source_entity_name, target_entity_name,
           source_suggestion_id, target_suggestion_id
    FROM edge_discovery
    WHERE source_entity_id IS NULL AND target_entity_id IS NULL
  `)

  let rescuedBoth = 0
  let rescuedSource = 0
  let rescuedTarget = 0
  const rescueDetails = []

  for (const edge of neitherEdges.rows) {
    // Try multiple matching strategies
    const sourceNorm = normalize(edge.source_entity_name)
    const targetNorm = normalize(edge.target_entity_name)
    const sourceStripped = normalizeWithSuffixStrip(edge.source_entity_name)
    const targetStripped = normalizeWithSuffixStrip(edge.target_entity_name)

    // Match: exact normalized OR suffix-stripped
    const sourceMatch = normalizedMap.get(sourceNorm) || suffixStrippedMap.get(sourceStripped)
    const targetMatch = normalizedMap.get(targetNorm) || suffixStrippedMap.get(targetStripped)

    if (sourceMatch || targetMatch) {
      rescueDetails.push({
        discoveryId: edge.discovery_id,
        sourceName: edge.source_entity_name,
        targetName: edge.target_entity_name,
        sourceMatch,
        targetMatch
      })

      if (sourceMatch && targetMatch) rescuedBoth++
      else if (sourceMatch) rescuedSource++
      else if (targetMatch) rescuedTarget++
    }
  }

  console.log(`Edges that can be rescued via fuzzy matching:`)
  console.log(`  Both entities match: ${rescuedBoth}`)
  console.log(`  Source matches: ${rescuedSource}`)
  console.log(`  Target matches: ${rescuedTarget}`)
  console.log(`  Total: ${rescueDetails.length}`)

  if (rescueDetails.length > 0) {
    console.log(`\nSample rescues:`)
    for (const r of rescueDetails.slice(0, 10)) {
      const srcInfo = r.sourceMatch ? ` → "${r.sourceMatch.name}" (id:${r.sourceMatch.id})` : ' [no match]'
      const tgtInfo = r.targetMatch ? ` → "${r.targetMatch.name}" (id:${r.targetMatch.id})` : ' [no match]'
      console.log(`  "${r.sourceName}"${srcInfo}`)
      console.log(`  "${r.targetName}"${tgtInfo}`)
      console.log()
    }
  }

  if (!dryRun && rescueDetails.length > 0) {
    console.log(`Applying fuzzy match updates...`)
    for (const r of rescueDetails) {
      if (r.sourceMatch) {
        await neon.query(`
          UPDATE edge_discovery
          SET source_entity_id = $1
          WHERE discovery_id = $2
        `, [r.sourceMatch.id, r.discoveryId])
      }
      if (r.targetMatch) {
        await neon.query(`
          UPDATE edge_discovery
          SET target_entity_id = $1
          WHERE discovery_id = $2
        `, [r.targetMatch.id, r.discoveryId])
      }
    }
    console.log(`Updated ${rescueDetails.length} edges`)
  }

  // ============================================
  // STEP 2: Delete remaining tangential edges
  // ============================================
  console.log(`\n--- STEP 2: DELETE TANGENTIAL EDGES ---\n`)

  // Count edges where neither entity exists (after fuzzy matching)
  const neitherExists = await neon.query(`
    SELECT COUNT(*) as count
    FROM edge_discovery
    WHERE source_entity_id IS NULL AND target_entity_id IS NULL
  `)
  console.log(`Edge discoveries where NEITHER entity exists: ${neitherExists.rows[0].count}`)

  // Find entity suggestions that would become orphaned
  // (only referenced by "neither exists" edges)
  const orphanedSuggestions = await neon.query(`
    SELECT s.suggestion_id, s.extracted_name, s.times_seen
    FROM entity_suggestion s
    WHERE NOT EXISTS (
      SELECT 1 FROM edge_discovery d
      WHERE (d.source_suggestion_id = s.suggestion_id OR d.target_suggestion_id = s.suggestion_id)
        AND (d.source_entity_id IS NOT NULL OR d.target_entity_id IS NOT NULL)
    )
  `)
  console.log(`Entity suggestions that will become orphaned: ${orphanedSuggestions.rows.length}`)

  // Safety check: verify orphaned suggestions aren't used by other edges
  const safetyCheck = await neon.query(`
    SELECT COUNT(*) as count
    FROM entity_suggestion s
    WHERE NOT EXISTS (
      SELECT 1 FROM edge_discovery d
      WHERE (d.source_suggestion_id = s.suggestion_id OR d.target_suggestion_id = s.suggestion_id)
        AND (d.source_entity_id IS NOT NULL OR d.target_entity_id IS NOT NULL)
    )
    AND EXISTS (
      SELECT 1 FROM edge_discovery d2
      WHERE (d2.source_suggestion_id = s.suggestion_id OR d2.target_suggestion_id = s.suggestion_id)
        AND (d2.source_entity_id IS NOT NULL OR d2.target_entity_id IS NOT NULL)
    )
  `)
  if (parseInt(safetyCheck.rows[0].count) > 0) {
    console.log(`\n⚠️ WARNING: ${safetyCheck.rows[0].count} suggestions would break other edges!`)
    console.log(`Aborting to prevent data loss.`)
    process.exit(1)
  }
  console.log(`\n✅ Safety check passed: orphaned suggestions are not used by other edges`)

  // Show sample of what will be deleted
  console.log(`\n--- SAMPLE: Edges to delete ---\n`)
  const sampleEdges = await neon.query(`
    SELECT source_entity_name, target_entity_name, SUBSTRING(citation, 1, 60) as citation
    FROM edge_discovery
    WHERE source_entity_id IS NULL AND target_entity_id IS NULL
    LIMIT 10
  `)
  for (const r of sampleEdges.rows) {
    console.log(`  ${r.source_entity_name} → ${r.target_entity_name}`)
    console.log(`    "${r.citation}..."`)
  }

  console.log(`\n--- SAMPLE: Entity suggestions to delete ---\n`)
  const sampleSuggestions = orphanedSuggestions.rows.slice(0, 10)
  for (const r of sampleSuggestions) {
    console.log(`  "${r.extracted_name}" (seen ${r.times_seen}x)`)
  }

  // ============================================
  // STEP 3: Delete orphaned entity suggestions
  // ============================================

  if (!dryRun) {
    console.log(`\n--- STEP 3: EXPORT & DELETE ---\n`)

    // Export data before deletion (for potential recovery)
    const toDelete = await neon.query(`
      SELECT * FROM edge_discovery
      WHERE source_entity_id IS NULL AND target_entity_id IS NULL
    `)
    const exportPath = `data/edge-enrichment/deleted-orphan-edges-${new Date().toISOString().slice(0,10)}.json`
    fs.writeFileSync(exportPath, JSON.stringify(toDelete.rows, null, 2))
    console.log(`Exported ${toDelete.rows.length} edges to ${exportPath}`)

    // Delete the edges
    const deletedEdges = await neon.query(`
      DELETE FROM edge_discovery
      WHERE source_entity_id IS NULL AND target_entity_id IS NULL
      RETURNING discovery_id
    `)
    console.log(`Deleted ${deletedEdges.rowCount} edge discoveries`)

    // Export and delete orphaned entity suggestions
    const suggestionIds = orphanedSuggestions.rows.map(r => r.suggestion_id)
    if (suggestionIds.length > 0) {
      // Export suggestions before deletion
      const suggestionsExportPath = `data/edge-enrichment/deleted-orphan-suggestions-${new Date().toISOString().slice(0,10)}.json`
      fs.writeFileSync(suggestionsExportPath, JSON.stringify(orphanedSuggestions.rows, null, 2))
      console.log(`Exported ${orphanedSuggestions.rows.length} suggestions to ${suggestionsExportPath}`)

      const deletedSuggestions = await neon.query(`
        DELETE FROM entity_suggestion
        WHERE suggestion_id = ANY($1)
        RETURNING suggestion_id
      `, [suggestionIds])
      console.log(`Deleted ${deletedSuggestions.rowCount} orphaned entity suggestions`)
    }
  }

  // ============================================
  // SUMMARY
  // ============================================
  console.log(`\n--- FINAL STATE ---\n`)

  const remainingEdges = await neon.query(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE source_entity_id IS NOT NULL AND target_entity_id IS NOT NULL) as both_exist,
      COUNT(*) FILTER (WHERE source_entity_id IS NOT NULL AND target_entity_id IS NULL) as source_only,
      COUNT(*) FILTER (WHERE source_entity_id IS NULL AND target_entity_id IS NOT NULL) as target_only,
      COUNT(*) FILTER (WHERE source_entity_id IS NULL AND target_entity_id IS NULL) as neither
    FROM edge_discovery
  `)
  const e = remainingEdges.rows[0]

  if (dryRun) {
    console.log(`Edge discoveries (after changes would be applied):`)
    console.log(`  - Both entities exist: ${e.both_exist} (ready to promote)`)
    console.log(`  - Source exists, target new: ${e.source_only}`)
    console.log(`  - Target exists, source new: ${e.target_only}`)
    console.log(`  - Neither exists (to delete): ${e.neither}`)
    console.log(`  - Total after cleanup: ${parseInt(e.total) - parseInt(e.neither)}`)
  } else {
    console.log(`Edge discoveries: ${e.total}`)
    console.log(`  - Both entities exist: ${e.both_exist} (ready to promote)`)
    console.log(`  - Source exists, target new: ${e.source_only}`)
    console.log(`  - Target exists, source new: ${e.target_only}`)
  }

  const remainingSuggestions = await neon.query(`SELECT COUNT(*) as count FROM entity_suggestion`)
  const orphanCount = dryRun ? orphanedSuggestions.rows.length : 0
  console.log(`\nEntity suggestions: ${dryRun ? parseInt(remainingSuggestions.rows[0].count) - orphanCount : remainingSuggestions.rows[0].count}`)

  if (dryRun) {
    console.log(`\nRun with --apply to execute these changes.`)
  }

  await neon.end()
  await rds.end()
  console.log(`\n=== DONE ===`)
}

main().catch(console.error)
