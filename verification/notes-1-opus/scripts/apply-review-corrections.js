#!/usr/bin/env node

/**
 * Apply Manual Review Corrections
 *
 * Updates note_correction records based on manual review findings:
 * 1. Alex Bores (id=97) - restore "succeed Jerry Nadler"
 * 2. CLTR (id=230) - restore "heart of Whitehall" and vision language
 * 3. Conjecture (id=220) - remove "Cognitive Emulation" from removed_claims
 */

import pg from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../../../.env') })

const pool = new pg.Pool({
  connectionString: process.env.STAGING_DATABASE_URL,
  connectionTimeoutMillis: 10000,
})

const corrections = [
  {
    entity_id: 97,
    entity_name: 'Alex Bores',
    description: 'Restore "succeed Jerry Nadler" claim',
    actions: {
      // Add to verified_notes
      verified_notes_append: ' to succeed Jerry Nadler',
      verified_notes_insert_after: 'in October 2025',
      // Remove from removed_claims
      remove_claims_containing: ['succeed Jerry Nadler'],
    }
  },
  {
    entity_id: 230,
    entity_name: 'Centre for Long-Term Resilience',
    description: 'Restore "heart of Whitehall" and vision language',
    actions: {
      // Replace verified_notes with corrected version
      verified_notes_replace: `The Centre for Long-Term Resilience (CLTR) is an independent think tank with a mission to transform global resilience to extreme risks. Founded in 2019, CLTR has a vision for a safe and flourishing world with high resilience to extreme risks. They are based in the heart of Whitehall and are independent and non-partisan, ensuring that Government receives genuinely impartial thinking. Their core focus areas are AI risk, biological risk and government risk management.`,
      // Remove from removed_claims
      remove_claims_containing: ['heart of Whitehall', 'vision for a safe'],
    }
  },
  {
    entity_id: 220,
    entity_name: 'Conjecture',
    description: 'Remove "Cognitive Emulation" from removed_claims (already in verified_notes)',
    actions: {
      // Just remove from removed_claims, verified_notes already has it
      remove_claims_containing: ['Cognitive Emulation'],
    }
  },
]

async function applyCorrections() {
  console.log('Applying manual review corrections...\n')

  for (const correction of corrections) {
    console.log(`\n${'='.repeat(50)}`)
    console.log(`[${correction.entity_id}] ${correction.entity_name}`)
    console.log(`Action: ${correction.description}`)
    console.log('='.repeat(50))

    // Get current record
    const { rows } = await pool.query(
      `SELECT id, verified_notes, removed_claims FROM note_correction
       WHERE entity_id = $1 AND pipeline = 'notes-1-opus'`,
      [correction.entity_id]
    )

    if (rows.length === 0) {
      console.log('  ⚠️  No note_correction record found, skipping')
      continue
    }

    const record = rows[0]
    console.log(`  Current verified_notes length: ${record.verified_notes?.length || 0}`)
    console.log(`  Current removed_claims count: ${record.removed_claims?.length || 0}`)

    let newVerifiedNotes = record.verified_notes
    let newRemovedClaims = record.removed_claims || []

    // Apply verified_notes changes
    if (correction.actions.verified_notes_replace) {
      newVerifiedNotes = correction.actions.verified_notes_replace
      console.log('  ✏️  Replaced verified_notes')
    } else if (correction.actions.verified_notes_append && correction.actions.verified_notes_insert_after) {
      const insertPoint = newVerifiedNotes.indexOf(correction.actions.verified_notes_insert_after)
      if (insertPoint !== -1) {
        const insertPos = insertPoint + correction.actions.verified_notes_insert_after.length
        newVerifiedNotes = newVerifiedNotes.slice(0, insertPos) +
                          correction.actions.verified_notes_append +
                          newVerifiedNotes.slice(insertPos)
        console.log(`  ✏️  Inserted "${correction.actions.verified_notes_append}" after "${correction.actions.verified_notes_insert_after}"`)
      } else {
        console.log(`  ⚠️  Could not find insert point: "${correction.actions.verified_notes_insert_after}"`)
      }
    }

    // Remove claims from removed_claims
    if (correction.actions.remove_claims_containing && newRemovedClaims.length > 0) {
      const originalCount = newRemovedClaims.length
      for (const substring of correction.actions.remove_claims_containing) {
        newRemovedClaims = newRemovedClaims.filter(rc =>
          !rc.claim.toLowerCase().includes(substring.toLowerCase())
        )
      }
      const removedCount = originalCount - newRemovedClaims.length
      console.log(`  🗑️  Removed ${removedCount} claims from removed_claims`)
    }

    // Update the record
    await pool.query(
      `UPDATE note_correction
       SET verified_notes = $1,
           verified_notes_length = $2,
           removed_claims = $3,
           removed_claim_count = $4
       WHERE id = $5`,
      [
        newVerifiedNotes,
        newVerifiedNotes.length,
        JSON.stringify(newRemovedClaims),
        newRemovedClaims.length,
        record.id
      ]
    )

    console.log(`  ✅ Updated (id=${record.id})`)
    console.log(`  New verified_notes length: ${newVerifiedNotes.length}`)
    console.log(`  New removed_claims count: ${newRemovedClaims.length}`)
  }

  console.log('\n' + '='.repeat(50))
  console.log('DONE - All corrections applied')
  console.log('='.repeat(50))

  await pool.end()
}

// Dry run mode
async function dryRun() {
  console.log('DRY RUN - Showing what would be changed\n')

  for (const correction of corrections) {
    console.log(`\n[${correction.entity_id}] ${correction.entity_name}`)
    console.log(`  Action: ${correction.description}`)

    const { rows } = await pool.query(
      `SELECT id, verified_notes, removed_claims FROM note_correction
       WHERE entity_id = $1 AND pipeline = 'notes-1-opus'`,
      [correction.entity_id]
    )

    if (rows.length === 0) {
      console.log('  Status: No record found')
      continue
    }

    const record = rows[0]
    console.log(`  Current removed_claims:`)
    for (const rc of (record.removed_claims || [])) {
      console.log(`    - "${rc.claim}" (${rc.reason})`)
    }
  }

  await pool.end()
}

// Main
const isDryRun = process.argv.includes('--dry-run')
if (isDryRun) {
  dryRun().catch(console.error)
} else {
  applyCorrections().catch(console.error)
}
