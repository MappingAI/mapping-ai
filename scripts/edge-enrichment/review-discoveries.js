#!/usr/bin/env node
/**
 * CLI for reviewing pending edge discoveries and entity suggestions
 *
 * Usage:
 *   node scripts/edge-enrichment/review-discoveries.js --edges
 *   node scripts/edge-enrichment/review-discoveries.js --entities
 *   node scripts/edge-enrichment/review-discoveries.js (both)
 */
import readline from 'readline'
import { getConnections, closeConnections } from './lib/db.js'

const args = process.argv.slice(2)
const flags = {
  edges: args.includes('--edges'),
  entities: args.includes('--entities'),
  stats: args.includes('--stats'),
}

// If no specific flag, show both
if (!flags.edges && !flags.entities && !flags.stats) {
  flags.stats = true
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve)
  })
}

async function showStats(neon) {
  console.log('\n=== Discovery Statistics ===\n')

  // Entity suggestions
  const entityStats = await neon.query(`
    SELECT status, COUNT(*) as count
    FROM entity_suggestion
    GROUP BY status
    ORDER BY count DESC
  `)

  console.log('Entity Suggestions:')
  for (const row of entityStats.rows) {
    console.log(`  ${row.status}: ${row.count}`)
  }

  // Most-seen suggestions
  const topSuggestions = await neon.query(`
    SELECT extracted_name, times_seen, seen_as_funder, seen_as_recipient, potential_duplicates
    FROM entity_suggestion
    WHERE status = 'pending'
    ORDER BY times_seen DESC
    LIMIT 10
  `)

  if (topSuggestions.rows.length > 0) {
    console.log('\nTop Pending Entity Suggestions (by frequency):')
    for (const row of topSuggestions.rows) {
      const roles = []
      if (row.seen_as_funder) roles.push('funder')
      if (row.seen_as_recipient) roles.push('recipient')
      const dupeWarning = row.potential_duplicates ? ' [has potential duplicates]' : ''
      console.log(`  ${row.extracted_name} (seen ${row.times_seen}x as ${roles.join(', ')})${dupeWarning}`)
    }
  }

  // Edge discoveries
  const edgeStats = await neon.query(`
    SELECT status, COUNT(*) as count
    FROM edge_discovery
    GROUP BY status
    ORDER BY count DESC
  `)

  console.log('\nEdge Discoveries:')
  for (const row of edgeStats.rows) {
    console.log(`  ${row.status}: ${row.count}`)
  }

  // Ready for review
  const readyForReview = await neon.query(`
    SELECT COUNT(*) as count
    FROM edge_discovery
    WHERE status = 'pending_review'
  `)
  console.log(`\nEdges ready for review: ${readyForReview.rows[0].count}`)

  // Waiting on entities
  const waitingOnEntities = await neon.query(`
    SELECT COUNT(*) as count
    FROM edge_discovery
    WHERE status = 'pending_entities'
  `)
  console.log(`Edges waiting on entity resolution: ${waitingOnEntities.rows[0].count}`)
}

async function reviewEntities(neon, rds) {
  console.log('\n=== Reviewing Entity Suggestions ===\n')

  const pending = await neon.query(`
    SELECT *
    FROM entity_suggestion
    WHERE status = 'pending'
    ORDER BY times_seen DESC, first_seen_at
    LIMIT 20
  `)

  if (pending.rows.length === 0) {
    console.log('No pending entity suggestions.')
    return
  }

  console.log(`Found ${pending.rows.length} pending suggestions\n`)

  for (const suggestion of pending.rows) {
    console.log('─'.repeat(60))
    console.log(`Name: ${suggestion.extracted_name}`)
    console.log(`Type: ${suggestion.entity_type || 'unknown'}`)
    console.log(`Times seen: ${suggestion.times_seen}`)
    console.log(`Roles: ${suggestion.seen_as_funder ? 'funder' : ''} ${suggestion.seen_as_recipient ? 'recipient' : ''}`)
    console.log(`Context: ${suggestion.context || 'none'}`)
    console.log(`Citation: ${suggestion.citation || 'none'}`)
    console.log(`Source: ${suggestion.source_url || 'none'}`)

    // Show potential duplicates
    if (suggestion.potential_duplicates) {
      const dupes = JSON.parse(suggestion.potential_duplicates)
      if (dupes.length > 0) {
        console.log('\nPotential Duplicates:')
        for (const dupe of dupes) {
          console.log(`  - [${dupe.entity_id}] ${dupe.name} (${Math.round(dupe.similarity * 100)}% similar)`)
        }
      }
    }

    console.log('')
    const action = await ask('[a]pprove, [r]eject, [d]uplicate of ID, [s]kip, [q]uit: ')

    if (action === 'q') break

    if (action === 'a') {
      if (!suggestion.duplicate_check_done && suggestion.potential_duplicates) {
        const confirm = await ask('Confirm this is NOT a duplicate? [y/n]: ')
        if (confirm !== 'y') {
          console.log('Skipping - please confirm not a duplicate or mark as duplicate')
          continue
        }
      }
      await neon.query(
        `UPDATE entity_suggestion
         SET status = 'approved', duplicate_check_done = true, reviewed_at = NOW()
         WHERE suggestion_id = $1`,
        [suggestion.suggestion_id]
      )
      console.log('Approved!')

      // Update any edge_discoveries waiting on this suggestion
      await updateEdgeDiscoveryStatus(neon, suggestion.suggestion_id)
    } else if (action === 'r') {
      const notes = await ask('Rejection reason (optional): ')
      await neon.query(
        `UPDATE entity_suggestion
         SET status = 'rejected', review_notes = $2, reviewed_at = NOW()
         WHERE suggestion_id = $1`,
        [suggestion.suggestion_id, notes || null]
      )
      console.log('Rejected.')
    } else if (action.startsWith('d')) {
      const dupeId = parseInt(action.slice(1).trim()) || (await ask('Enter duplicate entity ID: '))
      if (dupeId) {
        await neon.query(
          `UPDATE entity_suggestion
           SET status = 'duplicate', duplicate_of_id = $2, reviewed_at = NOW()
           WHERE suggestion_id = $1`,
          [suggestion.suggestion_id, dupeId]
        )
        console.log(`Marked as duplicate of entity ${dupeId}`)

        // Link to existing entity in edge_discoveries
        await linkSuggestionToEntity(neon, suggestion.suggestion_id, dupeId)
      }
    } else if (action === 's') {
      console.log('Skipped.')
    }
  }
}

async function reviewEdges(neon) {
  console.log('\n=== Reviewing Edge Discoveries ===\n')

  const pending = await neon.query(`
    SELECT d.*, s.url as source_url_full, s.title as source_title
    FROM edge_discovery d
    JOIN source s ON d.source_id = s.source_id
    WHERE d.status = 'pending_review'
    ORDER BY d.created_at
    LIMIT 20
  `)

  if (pending.rows.length === 0) {
    console.log('No edges ready for review.')
    console.log('(Edges with status "pending_entities" need entity resolution first)')
    return
  }

  console.log(`Found ${pending.rows.length} edges ready for review\n`)

  for (const edge of pending.rows) {
    console.log('─'.repeat(60))
    console.log(`${edge.source_entity_name} —[${edge.edge_type}]→ ${edge.target_entity_name}`)
    console.log(`Amount: ${edge.amount_usd ? `$${edge.amount_usd.toLocaleString()}` : 'unknown'} ${edge.amount_note || ''}`)
    console.log(`Dates: ${edge.start_date || '?'} - ${edge.end_date || 'present'}`)
    console.log(`Confidence: ${edge.confidence}`)
    console.log(`Citation: "${edge.citation}"`)
    console.log(`Source: ${edge.source_url_full}`)
    console.log(`Entity IDs: ${edge.source_entity_id} → ${edge.target_entity_id}`)
    console.log('')

    const action = await ask('[a]pprove, [r]eject, [s]kip, [q]uit: ')

    if (action === 'q') break

    if (action === 'a') {
      await neon.query(
        `UPDATE edge_discovery
         SET status = 'approved', reviewed_at = NOW()
         WHERE discovery_id = $1`,
        [edge.discovery_id]
      )
      console.log('Approved! Run promote-discoveries.js to create the edge.')
    } else if (action === 'r') {
      const notes = await ask('Rejection reason (optional): ')
      await neon.query(
        `UPDATE edge_discovery
         SET status = 'rejected', review_notes = $2, reviewed_at = NOW()
         WHERE discovery_id = $1`,
        [edge.discovery_id, notes || null]
      )
      console.log('Rejected.')
    } else if (action === 's') {
      console.log('Skipped.')
    }
  }
}

async function updateEdgeDiscoveryStatus(neon, suggestionId) {
  // Update edges where this was the source suggestion
  await neon.query(
    `UPDATE edge_discovery
     SET status = CASE
       WHEN target_entity_id IS NOT NULL OR target_suggestion_id IS NULL THEN 'pending_review'
       ELSE status
     END
     WHERE source_suggestion_id = $1 AND status = 'pending_entities'`,
    [suggestionId]
  )

  // Update edges where this was the target suggestion
  await neon.query(
    `UPDATE edge_discovery
     SET status = CASE
       WHEN source_entity_id IS NOT NULL OR source_suggestion_id IS NULL THEN 'pending_review'
       ELSE status
     END
     WHERE target_suggestion_id = $1 AND status = 'pending_entities'`,
    [suggestionId]
  )
}

async function linkSuggestionToEntity(neon, suggestionId, entityId) {
  // When a suggestion is marked as duplicate, link all edge_discoveries to the real entity
  await neon.query(
    `UPDATE edge_discovery
     SET source_entity_id = $2,
         source_suggestion_id = NULL,
         status = CASE
           WHEN target_entity_id IS NOT NULL THEN 'pending_review'
           ELSE status
         END
     WHERE source_suggestion_id = $1`,
    [suggestionId, entityId]
  )

  await neon.query(
    `UPDATE edge_discovery
     SET target_entity_id = $2,
         target_suggestion_id = NULL,
         status = CASE
           WHEN source_entity_id IS NOT NULL THEN 'pending_review'
           ELSE status
         END
     WHERE target_suggestion_id = $1`,
    [suggestionId, entityId]
  )
}

async function main() {
  const { rds, neon } = await getConnections()
  console.log('Connected to databases')

  try {
    if (flags.stats) {
      await showStats(neon)
    }

    if (flags.entities) {
      await reviewEntities(neon, rds)
    }

    if (flags.edges) {
      await reviewEdges(neon)
    }
  } finally {
    rl.close()
    await closeConnections()
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  rl.close()
  process.exit(1)
})
