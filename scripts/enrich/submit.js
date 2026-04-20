#!/usr/bin/env node
/**
 * Submit orchestrator for the enrichment skill (Unit 4 of the plan).
 *
 * Two-step write path:
 *   1. POST /submit with CONTRIBUTOR_KEY  → capture submissionId
 *   2. POST /admin   action=approve       → entity row created, map refreshed
 *
 * Guarantees:
 *   - Default is --dry-run. --execute required to actually POST.
 *   - Validation failures block the whole flow (no half-writes).
 *   - If /submit succeeds but /admin fails we surface the orphaned
 *     submissionId so a human can finish approval by hand. We never retry
 *     /submit on /admin failure (that would create a duplicate).
 *   - Destructive ops (action=merge|delete on the draft) require --confirm.
 *   - Headless mode (--execute --no-prompt): validation errors abort with
 *     exit 1 and a structured JSON error on stderr.
 */
import 'dotenv/config'
import { readFile } from 'node:fs/promises'

import { approveSubmission, buildSubmitPayload, submitDraft } from './lib/index.js'
import { validate } from './validate.js'

const DESTRUCTIVE_ACTIONS = new Set(['merge', 'delete'])

/**
 * Submit a draft. Returns a structured result that callers can pretty-print
 * or fold into a batch summary.
 *
 * Shape (happy path):
 *   { submissionId, entityId?, approved: true, warnings }
 * Shape (dry-run):
 *   { dryRun: true, payload, warnings }
 * Shape (/admin failure after /submit success):
 *   { submissionId, approved: false, error, warnings, needsManualApproval: true }
 */
export async function submit(draft, { execute = false, noPrompt = false, confirm = false } = {}) {
  void noPrompt // reserved: headless mode toggles CLI-only prompting, no runtime difference here

  if (!draft || typeof draft !== 'object') {
    throw new Error('submit: draft must be an object')
  }

  const action = draft.action || null
  if (action && DESTRUCTIVE_ACTIONS.has(action) && !confirm) {
    throw new Error(
      `Destructive action "${action}" requires --confirm (or confirm: true). ` +
        'Merge and delete are not re-runnable; pass --confirm once you are sure.',
    )
  }

  // Validation gate. Skip the skipReason short-circuit (duplicate detection)
  // so the caller gets a clear error from submit rather than validate.
  const validation = validate(draft)
  if (!validation.valid) {
    const err = new Error(`Draft failed validation: ${validation.errors.length} error(s)`)
    err.errors = validation.errors
    err.warnings = validation.warnings
    throw err
  }

  const warnings = validation.warnings

  if (!execute) {
    const { payload } = await submitDraft(draft, { dryRun: true })
    return { dryRun: true, payload, warnings }
  }

  // --- Live path -----------------------------------------------------------
  const submitRes = await submitDraft(draft, { dryRun: false })
  const submissionId = submitRes.submissionId
  if (!submissionId) {
    throw new Error(`/submit did not return a submissionId: ${JSON.stringify(submitRes)}`)
  }

  // From here on, /submit has already written a pending row. Any failure
  // must preserve submissionId so a human can complete approval.
  try {
    await approveSubmission(submissionId, { dryRun: false })
  } catch (err) {
    return {
      submissionId,
      approved: false,
      needsManualApproval: true,
      error: err.message,
      warnings,
    }
  }

  // /admin approve does not currently echo the new entity id. Surface the
  // field explicitly so callers can see it's unresolved and log their own
  // lookup if they need the id.
  return { submissionId, entityId: null, approved: true, warnings }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { execute: false, noPrompt: false, confirm: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--file') args.file = argv[++i]
    else if (a === '--stdin') args.stdin = true
    else if (a === '--execute') args.execute = true
    else if (a === '--no-prompt') args.noPrompt = true
    else if (a === '--confirm') args.confirm = true
    else if (a === '--help' || a === '-h') args.help = true
  }
  return args
}

function printHelp() {
  process.stdout.write(
    [
      'Usage: node scripts/enrich/submit.js [--file draft.json | --stdin] [--execute] [--no-prompt] [--confirm]',
      '',
      '  --execute     POST for real. Without this flag, prints the dry-run payload.',
      '  --no-prompt   Headless mode. Validation failures exit 1 with a structured',
      '                JSON error on stderr (for scripted re-enrichment loops).',
      '  --confirm     Required when the draft carries a destructive action',
      '                (merge, delete). Ignored otherwise.',
      '',
      'Env vars:',
      '  CONTRIBUTOR_KEY  required for /submit (mak_<32hex>)',
      '  ADMIN_KEY        required for /admin approve',
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
  const draft = unwrapDraft(await readInput(args))

  try {
    const result = await submit(draft, { execute: args.execute, noPrompt: args.noPrompt, confirm: args.confirm })
    process.stdout.write(JSON.stringify(result, null, 2) + '\n')
    if (result.needsManualApproval) process.exit(2)
    process.exit(0)
  } catch (err) {
    const payload = {
      ok: false,
      error: err.message,
      errors: err.errors || null,
      warnings: err.warnings || null,
    }
    // Headless mode: structured JSON on stderr so a wrapping script can
    // aggregate per-entity failures across a batch.
    if (args.noPrompt) {
      process.stderr.write(JSON.stringify(payload) + '\n')
    } else {
      process.stderr.write(`submit.js error: ${err.message}\n`)
      if (err.errors) process.stderr.write(JSON.stringify(err.errors, null, 2) + '\n')
    }
    process.exit(1)
  }
}

// buildSubmitPayload is re-exported for callers that already have a validated
// draft and just want the /submit wire shape without going through this
// wrapper (e.g. tests asserting the integration contract).
export { buildSubmitPayload }

const invokedAsScript = import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('submit.js')
if (invokedAsScript) {
  main()
}
