#!/usr/bin/env node
/**
 * Schema / enum validator for enrichment drafts (Unit 4 of the plan).
 *
 * Checks a draft before it hits /submit so Haiku drift, stale templates, or
 * ad-hoc edits can't sneak an invalid row into the submission table. Runs
 * both as a CLI (stdin or --file) and as a library import from submit.js.
 *
 * Validation tiers:
 *   - errors   → block submission (exit 1 in CLI, throws via submit.js)
 *   - warnings → surface to caller but do not block (downstream features
 *                like quote-level sourcing + definition-space viz still want
 *                the row even when per-claim fields are incomplete)
 *
 * Per-claim source coverage is a warning, not an error: the brief says the
 * pipeline should "write data even when not perfect". The warnings still land
 * in the return object so agents can choose to patch the draft before submit.
 */
import 'dotenv/config'
import { readFile } from 'node:fs/promises'

import {
  STANCE_OPTIONS,
  TIMELINE_OPTIONS,
  RISK_OPTIONS,
  EVIDENCE_OPTIONS,
  PERSON_CATEGORIES,
  ORGANIZATION_CATEGORIES,
  RESOURCE_TYPES,
  SUBMITTER_RELATIONSHIPS,
  MIN_CONFIDENCE,
  MAX_CONFIDENCE,
  validateEnum,
} from './lib/index.js'

const VALID_TYPES = ['person', 'organization', 'resource']

function pushError(errors, field, error, extra = {}) {
  errors.push({ field, error, ...extra })
}

function pushWarning(warnings, field, warning, extra = {}) {
  warnings.push({ field, warning, ...extra })
}

/**
 * Return the category allow-list for an entity type, or null for unknown
 * types (caller will already have reported the type error).
 */
function categoriesForType(type) {
  if (type === 'person') return PERSON_CATEGORIES
  if (type === 'organization') return ORGANIZATION_CATEGORIES
  if (type === 'resource') return RESOURCE_TYPES
  return null
}

/**
 * Validate a single notesSources entry. url + retrieved_at are required on
 * every entry; per-claim fields produce warnings per the rules documented in
 * the plan's Unit 4 "per-claim field shape" section.
 */
function validateSource(source, index, draft, errors, warnings) {
  const path = `notesSources[${index}]`
  if (!source || typeof source !== 'object') {
    pushError(errors, path, 'notesSources entry must be an object')
    return
  }
  if (!source.url || typeof source.url !== 'string') {
    pushError(errors, `${path}.url`, 'notesSources entry must have a non-empty url')
  }
  if (!source.retrieved_at || typeof source.retrieved_at !== 'string') {
    pushError(errors, `${path}.retrieved_at`, 'notesSources entry must have retrieved_at')
  }

  // Per-claim warnings. The absence of these is not an error because the
  // pipeline explicitly tolerates partial evidence; downstream features (quote
  // UI, AGI definition-space viz, trajectory sparklines) just have less to
  // render when they're missing.
  if (source.field_name === 'agiTimeline') {
    if (!source.definition) {
      pushWarning(warnings, `${path}.definition`, 'agiTimeline claim missing definition', {
        hint: 'AGI timeline claims should capture the speaker\'s definition (e.g., "economically valuable tasks") so the definition-space viz can cluster them.',
      })
    }
    if (!source.quote) {
      pushWarning(warnings, `${path}.quote`, 'agiTimeline claim missing direct quote')
    }
  }

  if ((source.field_name === 'aiRiskLevel' || source.field_name === 'regulatoryStance') && !source.quote) {
    pushWarning(warnings, `${path}.quote`, `${source.field_name} claim missing direct quote`)
  }
}

/**
 * Validate a draft produced by research.js (or hand-crafted). Returns
 * { errors, warnings, valid } where `valid` is true iff errors is empty.
 */
export function validate(draft) {
  const errors = []
  const warnings = []

  if (!draft || typeof draft !== 'object') {
    pushError(errors, '(root)', 'draft must be an object')
    return { errors, warnings, valid: false }
  }

  // Short-circuit: research.js returns skipReason when a duplicate is
  // detected. Treat as not-an-error but not-valid; callers should re-run
  // with overrideDuplicate before submitting.
  if (draft.skipReason) {
    pushError(errors, 'skipReason', `draft was short-circuited: ${draft.skipReason}`, {
      hint: 'Re-run research with overrideDuplicate=true or resolve the duplicate first.',
    })
    return { errors, warnings, valid: false }
  }

  // Type.
  if (!draft.type || !VALID_TYPES.includes(draft.type)) {
    pushError(errors, 'type', 'type must be one of person|organization|resource', {
      value: draft.type,
      allowed: VALID_TYPES,
    })
  }

  // Name / title. Resources may carry `title` in place of `name`; accept
  // either but require one.
  const nameField = draft.type === 'resource' ? draft.title || draft.name : draft.name
  if (!nameField || typeof nameField !== 'string' || nameField.trim() === '') {
    const field = draft.type === 'resource' ? 'title' : 'name'
    pushError(errors, field, `${field} is required and must be a non-empty string`)
  }

  // Category against the right enum for the type.
  const categoryList = categoriesForType(draft.type)
  if (categoryList && draft.category) {
    const err = validateEnum('category', draft.category, categoryList)
    if (err) errors.push(err)
  }

  // Belief enums.
  const enumChecks = [
    ['regulatoryStance', draft.regulatoryStance, STANCE_OPTIONS],
    ['agiTimeline', draft.agiTimeline, TIMELINE_OPTIONS],
    ['aiRiskLevel', draft.aiRiskLevel, RISK_OPTIONS],
    ['evidenceSource', draft.evidenceSource, EVIDENCE_OPTIONS],
    ['submitterRelationship', draft.submitterRelationship, SUBMITTER_RELATIONSHIPS],
  ]
  for (const [field, value, allowed] of enumChecks) {
    const err = validateEnum(field, value, allowed)
    if (err) errors.push(err)
  }

  // Confidence: nullable, but when set must be in [1,5].
  if (draft.notesConfidence != null) {
    const n = Number(draft.notesConfidence)
    if (!Number.isInteger(n) || n < MIN_CONFIDENCE || n > MAX_CONFIDENCE) {
      pushError(
        errors,
        'notesConfidence',
        `notesConfidence must be an integer in [${MIN_CONFIDENCE}, ${MAX_CONFIDENCE}]`,
        {
          value: draft.notesConfidence,
        },
      )
    }
  }

  // notesSources: array with per-entry shape checks + per-claim warnings.
  if (draft.notesSources != null) {
    if (!Array.isArray(draft.notesSources)) {
      pushError(errors, 'notesSources', 'notesSources must be an array when present')
    } else {
      draft.notesSources.forEach((s, i) => validateSource(s, i, draft, errors, warnings))
    }
  }

  return { errors, warnings, valid: errors.length === 0 }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--file') args.file = argv[++i]
    else if (a === '--stdin') args.stdin = true
    else if (a === '--help' || a === '-h') args.help = true
  }
  return args
}

function printHelp() {
  process.stdout.write(
    [
      'Usage: node scripts/enrich/validate.js [--file draft.json | --stdin]',
      '',
      'Prints JSON { errors, warnings, valid }. Exits 1 when errors is non-empty.',
      '',
    ].join('\n'),
  )
}

async function readInput(args) {
  if (args.file) return JSON.parse(await readFile(args.file, 'utf8'))
  if (args.stdin || !process.stdin.isTTY) {
    const chunks = []
    for await (const chunk of process.stdin) chunks.push(chunk)
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  }
  throw new Error('No input: pass --file <path> or pipe JSON on stdin.')
}

/**
 * Drafts from research.js arrive as the full { draft, sources, ... } envelope
 * or as a bare draft. Unwrap so callers can pipe either shape.
 */
function unwrapDraft(raw) {
  if (raw && typeof raw === 'object' && raw.draft && raw.draft.type) return raw.draft
  return raw
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    printHelp()
    process.exit(0)
  }
  const input = unwrapDraft(await readInput(args))
  const result = validate(input)
  process.stdout.write(JSON.stringify(result, null, 2) + '\n')
  process.exit(result.valid ? 0 : 1)
}

const invokedAsScript = import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('validate.js')
if (invokedAsScript) {
  main().catch((err) => {
    process.stderr.write(`validate.js error: ${err.message}\n`)
    process.exit(1)
  })
}
