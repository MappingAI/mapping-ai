# Exa / WebSearch query templates

Templates used by `scripts/enrich/research.js` to build the research loop. Defaults below match `QUERY_TEMPLATES` in `research.js`; edit this file when calibration surfaces better queries for a given entity type. Code updates can follow.

## Guidance

- Fire **3–5 queries** per entity. Fewer and classifier evidence is thin. More and the Haiku prompt exceeds useful context.
- Use `num_results: 5` per query (Exa default). Dedupe by URL across queries.
- Prefer `type: "keyword"` for name-based lookups; `type: "neural"` for topical or "find similar" probes.
- `include_domains` filters help when you know the credible sources (e.g., `arxiv.org`, `cset.georgetown.edu`, `lesswrong.com`, `substack.com`, `nytimes.com`, `linkedin.com`). Skip for first-pass discovery.
- Timestamp each result with `retrieved_at = new Date().toISOString()` — this is the retrieval time, not the speaker's claim date.

## Person

| Query template                           | Purpose                                                                                                                       |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `"<name>" AI policy stance`              | Surfaces regulatory-stance quotes.                                                                                            |
| `"<name>" Twitter Bluesky handle`        | Finds social-media identities for bidirectional linking.                                                                      |
| `"<name>" bio affiliation`               | Confirms primary org + category (researcher / executive / policymaker).                                                       |
| `"<name>" AGI timeline quote year`       | Targeted: surfaces dated AGI quotes. Load-bearing for feature 2 (definition-space viz) and feature 3 (trajectory sparklines). |
| `"<name>" published policy` _(optional)_ | Finds long-form policy writing when the person has bylines.                                                                   |

Credible domain hint when searching for affiliations:

```
include_domains: ["linkedin.com", "<primary_org>.org", "arxiv.org", "nytimes.com", "theatlantic.com", "80000hours.org", "substack.com"]
```

## Organization

| Query template                                   | Purpose                                |
| ------------------------------------------------ | -------------------------------------- |
| `"<org>" mission AI`                             | Mission statement + self-description.  |
| `"<org>" funding leadership`                     | Founders, board, funders.              |
| `"<org>" website AI policy position`             | Public position statements or RSPs.    |
| `"<org>" founded year headquarters` _(optional)_ | Disambiguates orgs with similar names. |
| `"<org>" criticism controversy` _(optional)_     | Surfaces critic-edge candidates.       |

Credible domain hint:

```
include_domains: ["<org>.org", "<org>.com", "wikipedia.org", "bloomberg.com", "ft.com", "theinformation.com"]
```

## Resource

| Query template                          | Purpose                                                                 |
| --------------------------------------- | ----------------------------------------------------------------------- |
| `"<title>" author publisher`            | Author attribution + publisher (→ `authored_by` and `publisher` edges). |
| `"<title>" review citation`             | Third-party reception + scope.                                          |
| `"<title>" abstract key argument`       | Core thesis for `resource_key_argument`.                                |
| `"<title>" author website` _(optional)_ | Canonical hosted version + year.                                        |

Credible domain hint:

```
include_domains: ["arxiv.org", "ssrn.com", "substack.com", "goodreads.com", "ycombinator.com", "amazon.com", "jstor.org"]
```

## Re-verify mode

When `research.js --mode=reverify --entity-id=N`, fetch the current entity and build queries tuned to surface _changes_ since last run. Add a year-bounded query:

| Query template                                                                    | Purpose                                               |
| --------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `"<name>" <current year - 1>..<current year>` (Exa `start_published_date` filter) | Fetch sources published since the last enrichment.    |
| `"<name>" recent statement <field>`                                               | When a specific field seems stale, probe it directly. |

## Fallback path

If Exa MCP is absent and `EXA_API_KEY` is unset, `research.js` falls back to `WebSearch` / `WebFetch`. Built-in WebSearch has no snippet extraction — each result lands in `notesSources` with a skeletal snippet. The draft carries `retriever: "web-search"` so reviewers know evidence quality is degraded. Prefer installing the Exa MCP plugin when working on enrichment.

## What to NOT query

- Avoid queries that pull speculative commentary (`"<name>" AGI doomer`). They return forum noise that degrades classifier accuracy.
- Avoid crowd-sourced rating sites for stance classification — use primary sources.
- Don't query for contact information (email, phone); the skill doesn't need it and storing it is out of scope.

## Budgeting

Each skill invocation should burn:

- 3–5 Exa queries (≤5 seconds each) → roughly 15–25 seconds of retrieval
- 1 Haiku call with ~8KB prompt → ~5 seconds
- 1 `/submit` + 1 `/admin` POST → ~2 seconds

Total ≤35 seconds for a clean seed. If a run blows past a minute, either a query is hanging or the classifier is retrying — check warnings in the draft.
