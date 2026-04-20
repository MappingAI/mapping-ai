#!/usr/bin/env node
/**
 * Batch import expert-curated submissions from a CSV.
 *
 * Designed for the Texas-submissions workflow: a trusted contributor has
 * done the research, classified the beliefs, and provided source URLs. The
 * pipeline does NOT re-research (no Exa calls, no classifier) — it trusts
 * the input, validates enum values, and submits one row at a time through
 * `/submit` + `/admin` auto-approve (same path as the interactive skill).
 *
 * Usage:
 *   node scripts/enrich/batch-import.js --file <path.csv>             # dry-run (default)
 *   node scripts/enrich/batch-import.js --file <path.csv> --execute   # POST to prod
 *   node scripts/enrich/batch-import.js --file <path.csv> --limit 3   # first N rows only
 *
 * Expected CSV columns (header row required):
 *   id                          -- numeric entity_id for edits, or "new" for creates
 *   name                        -- entity name (or title for resources)
 *   title                       -- person/org title
 *   category                    -- see lib/schema enum sets
 *   primary_org                 -- free text
 *   location                    -- free text
 *   twitter                     -- @handle or handle
 *   bluesky                     -- handle.bsky.social or custom
 *   belief_regulatory_stance    -- STANCE_OPTIONS
 *   belief_evidence_source      -- EVIDENCE_OPTIONS
 *   belief_agi_timeline         -- TIMELINE_OPTIONS
 *   belief_ai_risk              -- RISK_OPTIONS
 *   belief_threat_models        -- free text
 *   influence_type              -- comma-separated list
 *   notes                       -- neutral biographical notes
 *   enrichment_contribution     -- submitter's reasoning + evidence (goes into notesHtml)
 *   enrichment_sources          -- pipe-delimited URLs
 *   insider_opinion             -- submitter's personal assessment (distinct from notes)
 *
 * Exit codes: 0 on full success, 1 if any row failed validation or submission.
 */
import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'

import { validate } from './validate.js'
import { submit } from './submit.js'
import { buildSubmitPayload, CURRENT_ENRICHMENT_VERSION } from './lib/index.js'

const SUBMITTER_DEFAULT = 'connector' // expert in our network = connector weight

/**
 * Cheap RFC-4180-ish CSV parser. Handles quoted fields with embedded commas
 * and doubled quotes. No external dependency so the script stays single-file.
 * For more complex CSV use the `csv-parse` npm package.
 */
export function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        field += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      field = ''
      if (row.length > 1 || row[0] !== '') rows.push(row)
      row = []
    } else {
      field += ch
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    if (row.length > 1 || row[0] !== '') rows.push(row)
  }
  return rows
}

/**
 * Convert parsed CSV rows (including header) into an array of objects.
 */
export function rowsToObjects(rows) {
  if (rows.length === 0) return []
  const [header, ...body] = rows
  return body.map((r) => {
    const obj = {}
    for (let i = 0; i < header.length; i++) obj[header[i]] = r[i] ?? ''
    return obj
  })
}

function cleanTwitter(raw) {
  if (!raw) return null
  return raw.replace(/^@/, '').trim() || null
}

/**
 * Build a notesSources array from a pipe-delimited URL list.
 * Each URL becomes one provenance entry; retriever="expert-provided" marks
 * that this came from a human curator rather than Exa/web-search.
 */
function buildSources(pipeDelimited) {
  if (!pipeDelimited) return []
  return pipeDelimited
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((url) => ({
      url,
      snippet: null,
      retrieved_at: new Date().toISOString(),
      retriever: 'expert-provided',
      field_name: null,
      quote: null,
      claim_date: null,
      definition: null,
    }))
}

/**
 * Build an HTML blob that preserves the three expert-curated text fields as
 * labelled sections so a reviewer can tell them apart on the admin dashboard.
 */
function buildNotesHtml({ notes, enrichment_contribution, insider_opinion }) {
  const parts = []
  if (notes?.trim()) parts.push(`<h4>Biographical notes</h4>\n<p>${escapeHtml(notes)}</p>`)
  if (enrichment_contribution?.trim()) {
    parts.push(`<h4>Enrichment rationale (submitter)</h4>\n<p>${escapeHtml(enrichment_contribution)}</p>`)
  }
  if (insider_opinion?.trim()) {
    parts.push(`<h4>Insider opinion (submitter)</h4>\n<blockquote>${escapeHtml(insider_opinion)}</blockquote>`)
  }
  return parts.length ? parts.join('\n') : null
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * Turn one CSV row into a draft submission object. Trusts the row — no Exa,
 * no classifier. Enum validation still runs via validate.js downstream.
 */
export function csvRowToDraft(row, { submitterRelationship = SUBMITTER_DEFAULT } = {}) {
  const id = row.id?.trim()
  const isEdit = id && id !== 'new' && /^\d+$/.test(id)

  const type = row.entity_type?.trim() || 'person' // CSV default, override by adding entity_type column
  const name = row.name?.trim() || null
  if (!name) throw new Error(`row has no name: ${JSON.stringify(row)}`)

  const notesSources = buildSources(row.enrichment_sources)
  const notesHtml = buildNotesHtml({
    notes: row.notes,
    enrichment_contribution: row.enrichment_contribution,
    insider_opinion: row.insider_opinion,
  })

  // Confidence heuristic: if evidence_source says "Explicitly stated" and
  // at least 2 sources were provided, call it 4; if "Inferred" with sources,
  // call it 3; bare inferred with no sources, call it 2. Submitters can
  // tune manually via a future notes_confidence column in the CSV.
  const hasSources = notesSources.length >= 2
  const explicit = row.belief_evidence_source?.trim() === 'Explicitly stated'
  const notesConfidence = explicit && hasSources ? 4 : explicit ? 3 : hasSources ? 3 : 2

  const draft = {
    type,
    entityId: isEdit ? parseInt(id, 10) : null,
    name,
    title: row.title?.trim() || null,
    category: row.category?.trim() || null,
    primaryOrg: row.primary_org?.trim() || null,
    location: row.location?.trim() || null,
    twitter: cleanTwitter(row.twitter),
    bluesky: row.bluesky?.trim() || null,
    regulatoryStance: row.belief_regulatory_stance?.trim() || null,
    evidenceSource: row.belief_evidence_source?.trim() || null,
    agiTimeline: row.belief_agi_timeline?.trim() || null,
    aiRiskLevel: row.belief_ai_risk?.trim() || null,
    threatModels: row.belief_threat_models?.trim() || null,
    influenceType: row.influence_type?.trim() || null,
    notes: null, // derived from notesHtml by buildSubmitPayload
    notesHtml,
    notesSources,
    notesConfidence,
    enrichmentVersion: `${CURRENT_ENRICHMENT_VERSION}-batch-import`,
    submitterRelationship,
    submitterEmail: row.submitter_email?.trim() || null,
  }

  return { draft, isEdit, rowId: id }
}

async function main(argv = process.argv.slice(2)) {
  const { values } = parseArgs({
    args: argv,
    options: {
      file: { type: 'string' },
      execute: { type: 'boolean', default: false },
      'no-prompt': { type: 'boolean', default: true }, // batch mode is non-interactive by default
      limit: { type: 'string' },
      relationship: { type: 'string', default: SUBMITTER_DEFAULT },
    },
    allowPositionals: false,
  })

  if (!values.file) {
    console.error(
      'Usage: node scripts/enrich/batch-import.js --file <csv> [--execute] [--limit N] [--relationship self|connector|external]',
    )
    process.exit(2)
  }

  const text = await readFile(values.file, 'utf8')
  const rows = rowsToObjects(parseCsv(text))
  const limited = values.limit ? rows.slice(0, parseInt(values.limit, 10)) : rows

  const mode = values.execute ? 'EXECUTE' : 'DRY-RUN'
  console.error(`[${mode}] Processing ${limited.length} row(s) from ${values.file}\n`)

  const results = { processed: 0, validated: 0, submitted: 0, errors: [], warnings: [] }

  for (const row of limited) {
    const { draft, isEdit, rowId } = csvRowToDraft(row, { submitterRelationship: values.relationship })
    const label = `${isEdit ? `#${rowId}` : 'new'} ${draft.name}`
    results.processed++

    // 1) Validate
    const v = validate(draft)
    if (v.warnings.length) {
      results.warnings.push({ label, warnings: v.warnings })
    }
    if (!v.valid) {
      console.error(`✗ ${label}  [validation failed]`)
      for (const err of v.errors) console.error(`  - ${err.field ?? ''}: ${err.error}`)
      results.errors.push({ label, errors: v.errors })
      continue
    }
    results.validated++

    // 2) Submit
    try {
      const result = await submit(draft, {
        execute: values.execute,
        noPrompt: true, // batch mode
      })
      if (values.execute) {
        results.submitted++
        console.error(`✓ ${label}  [submission ${result.submissionId} approved: ${result.approved}]`)
      } else {
        // Dry-run — show the payload summary
        const payload = buildSubmitPayload(draft)
        console.error(
          `~ ${label}  [dry-run OK, payload size ${JSON.stringify(payload).length}B, ${draft.notesSources.length} sources]`,
        )
      }
    } catch (err) {
      console.error(`✗ ${label}  [submit failed]: ${err.message}`)
      results.errors.push({ label, submitError: err.message })
    }
  }

  console.error('\n' + '─'.repeat(60))
  console.error(`Summary:`)
  console.error(`  Processed: ${results.processed}`)
  console.error(`  Validated: ${results.validated}`)
  if (values.execute) console.error(`  Submitted: ${results.submitted}`)
  console.error(`  Warnings:  ${results.warnings.length}`)
  console.error(`  Errors:    ${results.errors.length}`)
  if (results.warnings.length > 0) {
    console.error(`\nWarnings detail:`)
    for (const w of results.warnings) {
      console.error(`  ${w.label}:`)
      for (const warn of w.warnings) console.error(`    - ${warn.field ?? ''}: ${warn.message ?? warn.error}`)
    }
  }

  // Print JSON summary to stdout for piping
  console.log(JSON.stringify(results, null, 2))
  process.exit(results.errors.length ? 1 : 0)
}

// Only run when invoked as a script, not when imported for tests.
const isMain = import.meta.url === `file://${process.argv[1]}`
if (isMain) {
  main().catch((err) => {
    console.error('Fatal:', err.stack || err.message)
    process.exit(2)
  })
}
