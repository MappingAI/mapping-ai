---
date: 2026-05-10
topic: verification-enrichment-pipeline
---

# Verification & Enrichment Pipeline

## Problem Frame

The stakeholder map has ~1,900 entities seeded primarily through LLM-assisted enrichment scripts that synthesized facts from training data without source grounding. This produced hallucinated facts (fabricated subsidiaries, invented multi-country operations), misattributed beliefs (statements about one person attributed to another from the same interview), and inflated stances (regulatory positions assigned to entities with no public position). The existing verification scripts (`deep-quality-review.js`, `quality-pass.js`) compound the problem by asking the same model family to "verify" data from parametric memory, confirming its own confabulations.

Separately, the allowed values for key fields (stance, timeline, risk) are inconsistent across scripts, meaning different enrichment runs seeded data against different schemas.

Public feedback (tracked in [critical feedback doc](https://docs.google.com/document/d/1-M4lbeEtU2fhR0SVL6uF_C4h5goZE35baEuZTI68_z4)) has flagged specific errors (METR, LawAI, EquiStamp) and questioned the methodology of LLM-assisted research without adequate human verification.

## Requirements

### Verification methodology

- R1. **Source-grounded verification.** Every non-trivial field verification must be backed by a retrieved web source. The system must never verify a claim solely from LLM training data. "No source found" is a valid and useful result (maps to "flag_for_human" or "remove").

- R2. **Attribution chain tracking.** For belief/stance fields, the system must distinguish between first-person statements (the entity speaking/writing about their own views), third-party characterizations (a journalist or interviewer describing the entity's views), and org-level statements (an organization's official position). Misattribution from interviews (Person A describes Person B's views, attributed to A) must be explicitly caught.

- R3. **Decision thresholds.** The system must apply distinct confidence thresholds per action:
  - **Auto-correct**: Requires 1+ first-person source (for belief fields) or primary source (for factual fields) that directly contradicts the DB value.
  - **Confirm**: Evidence supports the current DB value.
  - **Flag for human**: Conflicting evidence, only third-party sources, or minimal web presence.
  - **Remove**: Zero supporting evidence found. Better to show nothing than fabricated data.

- R4. **Enrichment in same pass.** When the verification agent searches for sources, it should also capture new information: missing fields, updated titles/roles, new relationships, recent publications. Enrichment output uses the same structured format as corrections.

### Agent architecture

- R5. **Claude managed agent sessions.** Verification runs as Claude multi-agent sessions (per [managed agents docs](https://platform.claude.com/docs/en/managed-agents/multi-agent)) with built-in `web_search` tool. No separate Exa integration for the verification pipeline.

- R6. **One entity per session.** Each managed agent session verifies and enriches a single entity. Cross-entity attribution checks are handled by the attribution rules in the system prompt, not by batching related entities.

- R7. **Orchestrator dispatches sessions.** A lightweight orchestrator pulls entities from a priority queue and spawns managed agent sessions. Priority order:
  1. New submissions (verify on arrival)
  2. Entities with community downvotes or field correction notes
  3. Unverified entities (never checked)
  4. Stale entities (last verified > N days ago)
  5. Re-verify after related entity changes

- R8. **Structured output.** Each agent session returns a JSON object per entity containing: field-level verdicts (action, proposed value, confidence, evidence with source URLs, attribution type, reasoning), discovered edges, and enrichment additions.

### Data model

- R9. **Claims + sources tables.** Introduce a `source` table (URL, title, source type, excerpt, retrieval metadata) and a `claim` table (entity_id, field_name, claimed_value, source_id, attribution_type, speaker, subject, confidence, status, created_by, created_at). Multiple claims can exist per field, allowing conflicting evidence to coexist.

- R10. **Unified correction flow.** All corrections flow through claims regardless of origin: verification agent output, form submissions, field notes from community members, admin edits. Each becomes a claim with appropriate source and attribution metadata.

- R11. **Canonical field values.** Reconcile the inconsistent allowed values across scripts into a single canonical set defined in one place. The DB schema, all prompts, form dropdowns, and export pipeline must reference this single definition. Current inconsistencies to resolve:
  - Regulatory stance: CLAUDE.md lists 5 values, scripts use 6-8 different values
  - Timeline and risk: similar drift across scripts
  - `belief_evidence_source` field: replace with per-claim `attribution_type` in the claims model

### Infrastructure

- R12. **Continuous operation.** The orchestrator runs 24/7 on a serverless platform (Modal or similar). It processes the priority queue continuously, with backpressure to manage API costs.

- R13. **Corrections staging.** Verification results write to the claims table, not directly to the entity table. High-confidence corrections can be auto-accepted (with the claim status set to `accepted`), but entity field updates happen through a reconciliation step, not direct UPDATE statements.

### Testing and validation

- R14. **Known-error test set.** Before broad deployment, validate the agent against entities from the critical feedback doc where the correct values are already known (METR, LawAI, EquiStamp, plus other reported errors). The agent must catch and correctly flag these errors.

- R15. **Accuracy measurement.** Track precision (what fraction of proposed corrections are actually correct) and recall (what fraction of known errors does it catch) against the test set. Define minimum thresholds before enabling auto-accept.

## Success Criteria

- Verification agent catches the specific errors reported in the critical feedback doc (METR locations, LawAI offices, fabricated subsidiaries, misattributed stances)
- Every field correction has a traceable source URL and attribution chain
- No more silent direct-UPDATE mutations to entity fields. All changes flow through claims with audit trail
- Belief field corrections require first-person source evidence, not third-party characterizations
- Field value inconsistencies across scripts are eliminated by a single canonical definition

## Scope Boundaries

- **In scope**: Verification agent prompts, claims/sources schema, orchestrator, testing harness, field value canonicalization
- **Not in scope**: Rewriting the Contribute form submission flow (it will feed into claims, but form UX stays the same)
- **Not in scope**: Rewriting the map export pipeline (it still reads from entity table; reconciliation updates entity from claims)
- **Not in scope**: Migrating existing enrichment scripts to managed agents (they can be deprecated once the pipeline replaces them)

## Key Decisions

- **Managed agents with web_search over Exa pipeline**: Agents search iteratively and contextually rather than receiving pre-fetched search results. Eliminates a separate integration and lets the agent refine queries when initial results are insufficient.
- **One entity per session**: Simpler, cheaper, parallelizable. Cross-entity attribution is handled by prompt rules, not session batching.
- **Verification + enrichment combined**: Avoids redundant web searches. When verifying, the agent naturally discovers new information.
- **Known-error test set for validation**: Start with entities where ground truth is known from public feedback before expanding coverage.

## Dependencies / Assumptions

- Claude managed agent sessions support `web_search` as a built-in tool
- Modal (or chosen platform) can run long-lived orchestrator processes that spawn API calls
- Neon Postgres can handle the additional claims + sources tables on the production branch

## Outstanding Questions

### Deferred to Planning

- [Affects R9, R10, R13][Architecture] Should the entity table become a materialized view derived from accepted claims, or should claims exist alongside the entity table with a reconciliation step? **Working assumption**: start with hybrid (claims alongside, reconciliation syncs to entity) to minimize disruption to existing form/admin/export code. Planner should evaluate whether the cleaner derived model is feasible given current update paths.

- [Affects R12][Needs research] Modal vs alternatives (Fly.io, Railway, simple cron on existing Cloudflare Worker) for the orchestrator. Evaluate cost, cold start, and long-running process support.
- [Affects R7][Technical] Exact priority queue implementation: Postgres-backed queue vs external (BullMQ, etc.). Depends on orchestrator platform choice.
- [Affects R11][Technical] Define the canonical allowed values for all enum fields. Requires auditing every script, form, and export path.
- [Affects R9][Technical] Schema design for the claims-pilot Neon branch tables vs fresh design. Check if existing tables on that branch are usable or should be replaced.
- [Affects R8][Needs research] Token/cost budget per entity verification session. Profile a few runs to estimate.
- [Affects R15][Technical] Specific precision/recall thresholds for auto-accept. Depends on test set results.
- [Affects R2][Needs research] How well does the attribution chain prompt actually work in practice? Test with known interview-misattribution cases before trusting it.

## Next Steps

`/ce:plan` for structured implementation planning.
