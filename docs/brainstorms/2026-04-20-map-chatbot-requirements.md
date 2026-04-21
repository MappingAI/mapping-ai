---
date: 2026-04-20
topic: map-chatbot
---

# Collaborative Map Chatbot ("Ask the Map")

## Problem Frame

Visitors to mapping-ai.org face three overlapping problems:

1. **Research is shallow.** The current `/semantic-search` endpoint stuffs the entire entity list (~45KB) into a single Haiku prompt, is slow (frequent 504s at 25s timeout), over-indexes on notes field text, and cannot reason about relationships (see `docs/brainstorms/2026-04-07-graph-context-search-requirements.md`). Queries like "critics of OpenAI" or "people at frontier labs AND think tanks AND government" return weak or empty results.
2. **The map is intimidating.** New visitors see 400+ nodes and don't know where to start. The existing sidebar controls (filter chips, view toggle, plot axes) are scannable but not self-explaining.
3. **Power-users want analysis.** Crossing attributes with relationships with belief dimensions (e.g. "how do funders of AI safety differ in stance from critics") requires the Insights page, the map, and manual cross-reference.

A conversational assistant that also **acts on the map** — highlighting, filtering, switching views, zooming — collapses all three jobs into one surface. The chatbot becomes both a research tool that shows its work and an onboarding docent that teaches the map by driving it.

PR #23 is a proof-of-concept for the Q&A piece (tool-use over 4 data tools, 2 UI directives); this brainstorm generalizes and scopes a clean v1.

## Requirements

### Core conversational behavior

- **R1.** Users open an "Ask the map" slide-in panel from `map.html` and type natural-language questions. The panel coexists with the existing search bar and filter chips (additive, not replacement) so fast direct lookups stay fast.
- **R2.** Responses stream token-by-token so the first words appear within ~1s. Tool calls run transparently; the UI shows a "Searching entities…" / "Looking up connections…" status while tools execute.
- **R3.** Within a single tab session, the chatbot remembers earlier turns ("those three people you mentioned — which are at frontier labs?"). Memory is stored in `sessionStorage` and wiped on tab close. No DB persistence in v1.
- **R4.** The chatbot must stay grounded in the database. It explicitly refuses to speculate about entities or relationships not present; it cites entity names for any factual claim. It does not browse the live web.

### Knowledge the chatbot can access

- **R5.** Structured entity fields: name, entity_type, category, other_categories, primary_org, other_orgs, title, location, website, belief dimensions (stance / timeline / risk / threat_models / evidence_source), submission_count.
- **R6.** Edge data: affiliations (person↔org), relationships (funder, critic, collaborator, authored_by, parent_org), including edge_type and direction.
- **R7.** Notes content (`notes_html`) via semantic retrieval: chunked, embedded, stored in pgvector, retrieved on demand by a `search_notes` tool. This is the mechanism for substantive answers ("what has Anthropic said about preemption"). Embeddings regenerate on submission approval/edit so notes stay fresh.

### Map-driving behavior (collaborative feel)

- **R8.** The chatbot emits structured UI directives the client applies to the live map. The full sidebar control surface is exposed as tools:
  - `highlight_on_map(entity_ids[])` — dim unmatched, highlight matched
  - `clear_highlight()`
  - `zoom_to(entity_id | cluster_name)`
  - `set_view(mode: network|plot, sub_view?)` — e.g. switch to plot, pick axes
  - `set_plot_axes(x, y?)` — `regulatory_stance | agi_timeline | ai_risk_level`
  - `set_filters({categories?, source_types?, stance?})` — drive the filter chips
  - `open_detail(entity_id)` — open the existing node detail panel
- **R9.** Every directive is idempotent and reversible. A single "Reset map" button in the chat panel clears all highlights/filters/view changes applied by the bot.
- **R10.** Map state changes from the bot are visually attributed (small "Applied by assistant" chip on the map) so users understand what the bot just did.

### Access, cost, and abuse

- **R11.** Publicly accessible — no login required — but per-IP rate limited: 10 conversations/day, max 8 tool iterations/turn, max 25s per turn, max 512 output tokens per turn. Limits enforced in Lambda via DynamoDB or similar before the model is called.
- **R12.** All tools are read-only in v1. The bot cannot create, edit, or delete entities/edges, approve submissions, or write to any persistent store. This bounds abuse and simplifies the safety review.
- **R13.** When a limit is hit, the panel shows a clear "daily limit reached — try again tomorrow, or [submit an entry] to help the map" message. No silent failures.

### Quality and trust

- **R14.** For any response that names entities, those names must pass a post-hoc allowlist check against `map-data.json`. Hallucinated names are stripped before render (same guard as current `/semantic-search`).
- **R15.** Each answer includes visible provenance for substantive claims: entity name + short quote/snippet from notes when a note was retrieved. Users can see what the bot read.
- **R16.** The bot politely refuses requests outside scope: code generation, policy advocacy/debate, writing articles, opinions about people. In-scope refusals link to `/contribute` ("I can't speculate — do you want to submit what you know?").

## Success Criteria

- **Query parity + better.** Every query the existing `/semantic-search` handles correctly is at least as good via the chatbot; the known failure cases ("critics of OpenAI", multi-affiliation intersection, "funders of AI safety", "tell me about X") now succeed and are visually reflected on the map.
- **First-token latency.** ≤1.5s median from send to first streamed token; ≤10s median to full response + map update on realistic queries.
- **Map shows the answer.** On any query that names or filters entities, the map reflects the answer without the user clicking anything. On queries that don't (e.g. "what is this map?"), the bot explains and optionally offers a demo ("Want me to show you how filters work?").
- **Cost is predictable.** At rate-limit cap, projected monthly cost is <$50 at 1,000 active visitors/month. Actual spend is monitored with a hard budget alert.
- **/semantic-search can be deprecated.** After v1 stabilizes, the existing endpoint is either removed or redirected to the chatbot, and the sidebar "AI search" button is replaced by the chat affordance.

## Scope Boundaries

**In scope (v1):**

- Slide-in chat panel on `map.html` only
- Streaming responses via Lambda response streaming + SSE
- Tool-use loop with read-only data tools and read-only UI directives
- Notes embeddings stored in pgvector on the existing RDS instance
- Session memory (`sessionStorage`)
- Per-IP rate limiting

**Out of scope (phase 2 / later):**

- Guided narrated walkthroughs (bot queues a sequence of tool calls with pauses + commentary)
- Shareable conversation URLs / persistent chat history
- Cross-page assistant surface (contribute / insights / about / home)
- Custom LLM-generated visualizations beyond the existing map/plot views (blocked on extracting viz-kit from `map.html`)
- Voice input/output
- Write tools (suggest edits, create draft submissions)
- Live web retrieval via Exa
- Exporting results as CSV/report
- Multi-user / synchronous collaboration on one chat

## Key Decisions

- **Tool-use loop over prompt-stuffing.** The existing `/semantic-search` failure mode is the 45KB context. PR #23's architecture (keyword prefilter → ≤30 candidates → LLM reasons) is the right shape and must be the basis of v1. Do not regress to dumping `map-data.json` into context.
- **Embeddings are worth the infra cost.** Notes_html is where the substantive content lives; Postgres tsvector alone misses paraphrased queries ("who worries about existential risk"). pgvector is a single extension and the corpus is small (~500 entities, low thousands of chunks).
- **Read-only in v1.** No write tools. Bounds abuse surface, simplifies safety review, and preserves the human-curated admin approval flow.
- **Additive panel, not a search-bar replacement.** The chip-based filter UI teaches users what's possible and is faster for direct lookups. The chatbot is a second affordance for intent-driven questions.
- **Grounded, not general.** The bot refuses requests outside the map's scope. This is both a cost control and a product positioning choice (it's a map assistant, not a ChatGPT wrapper).
- **Public with rate limits, not gated.** Preserves the "public good" feel of the site; rate limits + hard budget cap bound worst-case cost.
- **Model: Claude Haiku 4.5 (`claude-haiku-4-5-20251001`).** Matches PR #23; cheap enough to serve publicly; strong enough for tool-use. Revisit if quality insufficient on belief-dimension reasoning.

## Dependencies / Assumptions

- RDS PostgreSQL 17 supports pgvector (it does, as of PG 16+). A migration adds the extension and a `note_chunk` table with embeddings.
- `map-data.json` continues to be the source of truth for the entity/edge lookup used by data tools; the in-Lambda cache pattern from `/semantic-search` and PR #23 is reused.
- AWS Lambda response streaming is used (not a new dependency — already supported by API Gateway HTTP API for Lambda).
- The existing `ANTHROPIC_SEMANTIC_SEARCH_KEY` can be reused, or a new `ANTHROPIC_CHAT_KEY` added for cost attribution.
- The existing map.html `_vs` canvas state model and filter/view controls are refactorable into imperative functions the chatbot's UI directives can call. Planning confirms this is feasible without reorganizing the whole file.

## Outstanding Questions

### Resolve Before Planning

(None. Scope, behavior, and success criteria are pinned.)

### Deferred to Planning

- [Affects R2][Technical] Do we use Lambda response streaming with API Gateway HTTP API (supported) or switch to a Lambda Function URL for simpler SSE? Trade off: FURLs are simpler for streaming but bypass existing API Gateway auth/rate-limit infra.
- [Affects R7][Technical][Needs research] Which embedding model — Voyage `voyage-3-lite`, OpenAI `text-embedding-3-small`, or a local model? Voyage and Anthropic have a partnership; OpenAI is cheapest. Plan should benchmark recall on 10–20 known-answer queries.
- [Affects R7][Technical] Chunk size / overlap for notes_html. Notes range from 1 sentence to several paragraphs with HTML structure — probably chunk by paragraph, fall back to sentence.
- [Affects R8][Technical] How to structure the tool schema so the chatbot consistently emits UI directives at the right moment (vs just answering in text). Likely via a system prompt instructing "emit highlight_on_map whenever you name a set of entities" + a final-turn directive synthesis pass.
- [Affects R11][Technical] Rate-limit store: DynamoDB table with TTL, Redis, or Lambda-local in-memory (sufficient if a single Lambda warm instance serves most traffic, but not safe). Probably DynamoDB given AWS-first stack.
- [Affects R14][Technical] Post-hoc name validation: do we re-validate streamed tokens (hard) or validate at tool-directive time (easier, since UI directives reference IDs not names)? Likely: IDs in directives, text claims cross-checked at end-of-turn.
- [Affects R15][UX] How to render provenance inline — collapsible footnotes, hover cards, or a sidebar "Sources" list? Probably footnotes.

## Next Steps

→ `/ce:plan` for structured implementation planning
