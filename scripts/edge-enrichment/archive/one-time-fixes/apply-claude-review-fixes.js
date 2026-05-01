#!/usr/bin/env node
/**
 * Apply Claude.ai Review Fixes to combined-v4 Entities
 *
 * Fixes identified in manual review:
 * - 7 duplicates to delete and remap edges
 * - Category/secondary category fixes
 * - Stance corrections
 * - Name standardizations
 * - Importance adjustments
 * - Funding model corrections
 *
 * Usage:
 *   node scripts/edge-enrichment/post-process/apply-claude-review-fixes.js --dry-run
 *   node scripts/edge-enrichment/post-process/apply-claude-review-fixes.js --apply
 */
import 'dotenv/config'
import pg from 'pg'

const rds = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

const neon = new pg.Pool({
  connectionString: process.env.PILOT_DB,
  ssl: { rejectUnauthorized: false }
})

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const apply = args.includes('--apply')

if (!dryRun && !apply) {
  console.log('Usage: node apply-claude-review-fixes.js [--dry-run | --apply]')
  process.exit(1)
}

// ═══════════════════════════════════════════════════════════════════════════
// DUPLICATES TO DELETE (remap edges to existing entity)
// ═══════════════════════════════════════════════════════════════════════════
const DUPLICATES = [
  { deleteId: 2085, keepId: 52, name: 'Daron Acemoglu' },
  { deleteId: 2119, keepId: 1131, name: 'DAF-MIT AI Accelerator' },
  { deleteId: 2064, keepId: 429, name: 'Institute for Law & AI (LawAI)' },
  { deleteId: 2101, keepId: 302, name: 'Lightcone Infrastructure' },
  { deleteId: 2092, keepId: 203, name: 'London Initiative for Safe AI (LISA)' },
  { deleteId: 2278, keepId: 136, name: 'Tarbell Center for AI Journalism' },
  { deleteId: 2114, keepId: 194, name: 'MARS Programme' },
]

// ═══════════════════════════════════════════════════════════════════════════
// FIELD UPDATES
// ═══════════════════════════════════════════════════════════════════════════
const FIELD_UPDATES = [
  // Category fixes
  { id: 2053, field: 'category', value: 'Frontier Lab', note: 'Hugging Face: primary is Frontier Lab not Infrastructure' },
  { id: 2053, field: 'other_categories', value: 'Infrastructure & Compute', note: 'Hugging Face: Infrastructure as secondary' },
  { id: 2065, field: 'other_categories', value: null, note: 'Intel: remove wrong Frontier Lab secondary' },
  { id: 2037, field: 'other_categories', value: null, note: 'Accel: remove wrong Infrastructure secondary' },
  { id: 2101, field: 'other_categories', value: null, note: 'Lightcone: remove wrong Infrastructure secondary' }, // if not deleted
  { id: 2108, field: 'category', value: 'Academic', note: 'Los Alamos: Academic primary for national lab' },
  { id: 2108, field: 'other_categories', value: 'Government/Agency', note: 'Los Alamos: Gov as secondary' },
  { id: 2144, field: 'other_categories', value: null, note: 'NIH: remove wrong VC/Philanthropy secondary' },
  { id: 2156, field: 'other_categories', value: 'Deployers & Platforms', note: 'Nebius: fix VC-backed to proper category' },
  { id: 2163, field: 'other_categories', value: null, note: 'NY State: remove wrong Funder/investor (influence_type)' },
  { id: 2248, field: 'other_categories', value: null, note: 'Sierra: remove wrong Frontier Lab secondary' },
  { id: 2249, field: 'other_categories', value: null, note: 'SigIQ: remove wrong AI Safety secondary' },
  { id: 2258, field: 'other_categories', value: null, note: 'South Park Commons: remove Connector/convener (influence_type)' },

  // Funding model fixes
  { id: 2037, field: 'funding_model', value: 'Corporate/commercial', note: 'Accel: VC fund structure' }, // keeping as-is per schema
  { id: 2163, field: 'funding_model', value: 'Government (U.S. federal)', note: 'NY State: should be state but no enum for it' },
  { id: 2318, field: 'funding_model', value: 'Corporate/commercial', note: 'Waymo: Alphabet subsidiary' },

  // Stance fixes
  { id: 2301, field: 'belief_regulatory_stance', value: 'Moderate', note: 'UK Government: updated from stale 2017 Light-touch' },
  { id: 2085, field: 'belief_ai_risk', value: 'Serious', note: 'Acemoglu: not Catastrophic, focuses on labor/power' }, // if not deleted
  { id: 2216, field: 'belief_regulatory_stance', value: 'Mixed/unclear', note: 'Renaissance Philanthropy: Obama OSTP veterans' },
  { id: 2254, field: 'belief_regulatory_stance', value: 'Mixed/unclear', note: 'SEE: fiscal sponsor has no stance' },
  { id: 2254, field: 'belief_ai_risk', value: 'Unknown', note: 'SEE: fiscal sponsor has no view' },
  { id: 2100, field: 'belief_regulatory_stance', value: 'Mixed/unclear', note: 'Leverhulme Trust: broad funder, one AI safety grant' },
  { id: 2100, field: 'belief_ai_risk', value: 'Serious', note: 'Leverhulme: not Existential from one grant' },
  { id: 2060, field: 'belief_agi_timeline', value: 'Unknown', note: 'Ineffable Intelligence: no timeline statement found' },

  // Importance fixes
  { id: 2069, field: 'importance', value: 3, note: 'Jane Street: quant firm, 4 too high' },
  { id: 2153, field: 'importance', value: 3, note: 'NSERC: Canadian, limited US influence' },
  { id: 2220, field: 'importance', value: 2, note: 'Richard King Mellon: regional Pittsburgh philanthropy' },
  { id: 2171, field: 'importance', value: 1, note: 'MacArthur Network: defunct 2018' },

  // Name standardizations
  { id: 2327, field: 'name', value: 'fal', note: 'fal.ai → fal (company name not domain)' },
  { id: 2249, field: 'name', value: 'SigIQ', note: 'SigIQ.ai → SigIQ' },

  // Twitter/website fixes
  { id: 2301, field: 'twitter', value: 'ABORDHEO', note: 'UK Government: use @10DowningStreet equivalent' },
  { id: 2173, field: 'website', value: 'https://www.whitehouse.gov/ostp/', note: 'OSTP: canonical URL' },

  // Title fix
  { id: 2079, field: 'title', value: 'Individual donor and philanthropist', note: 'Julie Carson: remove spousal reference' },
]

// ═══════════════════════════════════════════════════════════════════════════
// NOTES TO FLAG (for manual verification - don't auto-fix)
// ═══════════════════════════════════════════════════════════════════════════
const NOTES_TO_VERIFY = [
  { id: 2053, issue: 'Hugging Face Series C lead investor: Lux Capital vs a16z - verify' },
  { id: 2065, issue: 'Intel $135M Element AI investment - may be total round not Intel share' },
  { id: 2102, issue: 'CRITICAL: Greg Colbourn is NOT a Lightspeed partner - remove PauseAI claim' },
  { id: 2102, issue: 'CRITICAL: SSI $2B Series B at $32B - verify, public reports say $1B at $5B' },
  { id: 2060, issue: 'Ineffable $1.1B seed at $5.1B - verify record-breaking claim' },
  { id: 2074, issue: 'Knight Foundation $27M - may be total initiative not Knight alone' },
  { id: 2157, issue: 'Neel Nanda $250K Manifund grant - unusually large, verify' },
  { id: 2163, issue: 'NY State $300M Stony Brook quantum - single source (stonybrook.edu)' },
  { id: 2210, issue: 'RTX Ventures led Impulse Space Series A - conflicting reports' },
  { id: 2212, issue: 'Rad AI CEO "Doktor Gurson" - verify name (may be Dr. misread)' },
  { id: 2282, issue: 'Tencent $300M in DST for 10.26% - verify old transaction' },
  { id: 2282, issue: 'Tencent 20% DeepSeek offer - unverified rumor' },
  { id: 2038, issue: 'AMP PBC $1.3B first fund - verify against SEC filings' },
  { id: 2181, issue: 'OECD $2.4M Gates Foundation DPI - verify amount' },
  { id: 2240, issue: 'Schmidt Sciences founding year 2024 vs 2022 - verify' },
  { id: 2127, issue: 'Max Chiswick deceased Jan 2025 - flag for policy decision' },
  { id: 2050, issue: 'Grok Ventures 2024 climate pivot - may reduce AI relevance' },
  { id: 2171, issue: 'MacArthur Network defunct 2018 - add note about historical status' },
]

async function main() {
  console.log(`\n${'='.repeat(70)}`)
  console.log(`CLAUDE.AI REVIEW FIXES - ${dryRun ? 'DRY RUN' : 'APPLYING'}`)
  console.log(`${'='.repeat(70)}\n`)

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 1: Handle duplicates
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n📋 STEP 1: DUPLICATE ENTITIES\n')

  for (const dupe of DUPLICATES) {
    console.log(`  ${dupe.name}:`)
    console.log(`    DELETE #${dupe.deleteId} → KEEP #${dupe.keepId}`)

    // Check edges in Neon that reference the duplicate
    const edgesRes = await neon.query(`
      SELECT COUNT(*) as cnt FROM edge_discovery
      WHERE source_entity_id = $1 OR target_entity_id = $1
    `, [dupe.deleteId])
    console.log(`    Edges to remap: ${edgesRes.rows[0].cnt}`)

    // Check edges in RDS (uses source_id/target_id)
    const rdsEdgesRes = await rds.query(`
      SELECT COUNT(*) as cnt FROM edge
      WHERE source_id = $1 OR target_id = $1
    `, [dupe.deleteId])
    console.log(`    RDS edges to remap: ${rdsEdgesRes.rows[0].cnt}`)

    if (apply) {
      // Remap edges in Neon
      await neon.query(`
        UPDATE edge_discovery SET source_entity_id = $1 WHERE source_entity_id = $2
      `, [dupe.keepId, dupe.deleteId])
      await neon.query(`
        UPDATE edge_discovery SET target_entity_id = $1 WHERE target_entity_id = $2
      `, [dupe.keepId, dupe.deleteId])

      // Remap edges in RDS (uses source_id/target_id)
      await rds.query(`
        UPDATE edge SET source_id = $1 WHERE source_id = $2
      `, [dupe.keepId, dupe.deleteId])
      await rds.query(`
        UPDATE edge SET target_id = $1 WHERE target_id = $2
      `, [dupe.keepId, dupe.deleteId])

      // Delete the duplicate entity
      await rds.query(`DELETE FROM entity WHERE id = $1`, [dupe.deleteId])
      console.log(`    ✅ Remapped and deleted`)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2: Apply field updates
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n📋 STEP 2: FIELD UPDATES\n')

  // Filter out updates for entities we're deleting
  const deleteIds = new Set(DUPLICATES.map(d => d.deleteId))
  const validUpdates = FIELD_UPDATES.filter(u => !deleteIds.has(u.id))

  for (const update of validUpdates) {
    console.log(`  #${update.id}: ${update.field} = ${JSON.stringify(update.value)}`)
    console.log(`    Note: ${update.note}`)

    if (apply) {
      await rds.query(
        `UPDATE entity SET ${update.field} = $1 WHERE id = $2`,
        [update.value, update.id]
      )
      console.log(`    ✅ Applied`)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 3: Print notes requiring manual verification
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n📋 STEP 3: NOTES REQUIRING MANUAL VERIFICATION\n')
  console.log('  These issues were flagged but NOT auto-fixed:\n')

  for (const note of NOTES_TO_VERIFY) {
    const isDeleted = deleteIds.has(note.id)
    const prefix = isDeleted ? '  [DELETED]' : '  '
    console.log(`${prefix}#${note.id}: ${note.issue}`)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────────────────────────────────
  console.log(`\n${'='.repeat(70)}`)
  console.log('SUMMARY')
  console.log(`${'='.repeat(70)}`)
  console.log(`  Duplicates to delete: ${DUPLICATES.length}`)
  console.log(`  Field updates: ${validUpdates.length}`)
  console.log(`  Notes to verify manually: ${NOTES_TO_VERIFY.length}`)

  if (dryRun) {
    console.log('\n  ⚠️  DRY RUN - no changes made. Use --apply to execute.\n')
  } else {
    console.log('\n  ✅ All fixes applied.\n')
  }

  await rds.end()
  await neon.end()
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
