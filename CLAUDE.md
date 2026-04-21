# Mapping AI

A collaborative stakeholder mapping project for the U.S. AI policy landscape.

**Live site:** https://mapping-ai.org

## Project overview

Multi-page website with an interactive D3.js stakeholder map, crowdsourced data collection via rich forms, and a relational database linking people, organizations, and resources. Bidirectional links between entities enable network visualization.

## Architecture

Architecture details live in [`docs/architecture/`](docs/architecture/), not here.

- [`current.md`](docs/architecture/current.md): the stack running in prod today (AWS: RDS + Lambda + CloudFront + S3 + SAM). Full topology, DB schema, API reference.
- [`target.md`](docs/architecture/target.md): the planned stack (Cloudflare Workers + Neon + R2 + TanStack Start + pnpm). Status table tracks what's shipped.
- [`adrs/0001-migrate-off-aws.md`](docs/architecture/adrs/0001-migrate-off-aws.md): the migration currently in progress.

**Rule:** do not assert architecture in this file. Update `current.md` instead. Stale infra claims in CLAUDE.md waste session context on every read.

Other entry points:

- [`docs/CONTRIBUTOR.md`](docs/CONTRIBUTOR.md): contributor-facing API usage (payload schemas, field reference, submission examples).
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md): deploy process, PR requirements, incident response.
- [`ONBOARDING.md`](ONBOARDING.md): setup guide for new developers.

## Commands

Essential contributor-facing commands. See `current.md` for the full deploy and DB pipelines.

```bash
# Local development
npm run dev                   # Vite (5173) + Express API (3000) together
npm run dev:web               # Vite only
npm run dev:api               # Express API only
npx vite build                # Production build (outputs to dist/)

# Quality gates
npx tsc --noEmit              # TypeScript type check
npx vitest run                # Vitest tests
npm run lint                  # ESLint
npm run format:check          # Prettier

# Database (requires DATABASE_URL in .env)
npm run db:migrate            # Create/update tables, triggers, indexes
npm run db:seed               # Import Airtable CSV data
npm run db:export-map         # Regenerate map-data.json from approved entries
npm run db:backup             # Backup all tables to S3 (JSON + SQL)
npm run db:backup:local       # Backup to local files only

# Legacy TipTap bundle (used only by map.html)
npm run build:tiptap          # esbuild src/tiptap-notes.js → assets/js/tiptap-notes.js
```

Frontend auto-deploys on push to `main`. Backend (Lambda) requires manual `sam deploy` with a drift check first. See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the guarded flow.

## Form Features (src/contribute/)

- **Relationship pills**: Compact pill toggle at top of each form ("I am this person" / "I can connect you" / "Someone I know of"). Click to select, click again to deselect.
- **Clear form**: Inline link on pill row; resets all fields, custom selects, tags, TipTap editors.
- **Primary + secondary categories**: Primary via dropdown ("Primary Role" / "Primary Category"); additional via tag dropdown with click-to-add and × remove.
- **Duplicate detection**: Client-side search on Name/Title fields with existing entry card sidebar.
- **Org search**: Primary org, affiliated orgs, parent org. All search existing DB (approved + pending with badge) with edit/add links. Focus preload (top 5), 1-char search.
- **Author search**: Resource form searches existing people for the author field.
- **TipTap notes**: Rich text (bold/italic/lists/links) with @mentions. Info tooltip explains what to include (policy positions, relationships, funding, career) with an @mention example showing bidirectional linking. The @mention dropdown shows a type badge (Person/Org/Resource), name with ellipsis for long names, and detail text.
- **Custom dropdowns**: Styled selects with category/stance colors, search, arrow key nav, click-to-deselect (clicking the selected option clears it).
- **Example submissions**: Collapsible `<details>` with interactive @mentions. Hover shows an entity card fetched from the search API.
- **Location search**: Multi-city tag input via Photon geocoding API, Remote option for orgs.
- **Social search**: Bluesky handle search (free public API).
- **Auto-save**: localStorage draft every 500ms, restored on page load, per-form clear.
- **Inline org creation panel**: Slide-in side panel (460px, 100vw mobile) for creating new orgs without leaving the person/resource form. Triggered from "Add 'X' as new org..." in the dropdown or "Can't find it?" links. Features: name pre-fill from search, category dropdown, website, location search with multi-city tags (Photon/OSM), expandable section with funding model, regulatory stance, Twitter/X, Bluesky live search, TipTap rich text notes with @mentions and info tooltip. Auto-submits via `/submit`, shows success overlay, auto-closes, and links the org back to the triggering field.
- **Request body**: camelCase field names in `data` object, `_hp` honeypot field.

## Map Features (map.html)

- **D3.js force simulation** with orbital cluster layout and semantic ordering.
- **Network view rendering**: Canvas 2D immediate-mode (single `<canvas>`). Per-node `_vs` visual state model (`normal`/`dimmed`/`highlighted`/`one-hop`/`hidden`) replaces SVG CSS classes. `d3.quadtree` for O(log N) hit-testing (hover/click/drag). Pre-rasterized image sprites via offscreen canvas. `_requestRedraw()` coalesces state changes into single animation frames.
- **Two-level view system**: Top-level "Network" (with sub-tabs: All/Orgs/People/Resources) and "Plot" (scatter/beeswarm). SVG icons on buttons. Sub-view persisted to localStorage.
- **Plot view**: 2D scatter or 1D beeswarm plotting people + orgs on any two of {regulatory_stance, agi_timeline, ai_risk_level}; uses `stance_score` / `timeline_score` / `risk_score` from `map-data.json`; entities with null scores excluded with count shown. Plot view still uses SVG (not Canvas).
- **AI Belief panel**: Opacity-based legend showing belief dimension values (stance, timeline, risk). Replaces the former cluster-by-dimension dropdown. Category coloring is default; belief dimensions shown via opacity encoding.
- **Category normalization**: Merges variants ("AI Safety/Alignment" → "AI Safety").
- **Multi-category support**: Entities can have a primary category plus `other_categories`. Filtering by any category shows entities where it's primary OR secondary. Detail panel shows primary as solid badge, secondary as dashed badges.
- **Resources**: Rounded squares with type icons, clustered near related entities in All view.
- **Edges**: From edge table (affiliations + relationships). Clicking any node (directly, from search, or from detail panel links) highlights connected edges and dims unconnected nodes/edges via `_vs` state changes.
- **Node selection dimming**: In "all" view, clicking a node sets all unconnected nodes/edges to `_vs = 'dimmed'`. Background click calls `clearSelection()` to restore `_vs = 'normal'`.
- **Submission count**: Subtle gold dashed ring for ≥5 submissions.
- **Source type filter**: self/connector/external.
- **Cluster labels**: Positioned on outer edge, radiating away from center.
- **Search**: Semantic expansion (SEMANTIC_MAP), 40+ term groups; autocomplete filtered to current view; click-to-zoom on match.
- **Filters**: Dimension-aware chips (rebuild per view + dimension), stance legend; select/deselect all toggle.
- **Images**: `entity.thumbnail_url` is the single source of truth. See `current.md` for the thumbnail pipeline rules.
- **Collapsible controls sidebar**: Chevron button collapses the sidebar with slide animation; "> Controls" button re-expands. Auto-collapses when contribute panel opens, auto-re-expands on close.
- **Collapsible contribute sidebar**: iframe with "Open full page" option, map resizes.
- **View persistence**: localStorage saves view mode (network/plot) and sub-view.
- **Dark/light theme**: CSS variables, localStorage persistence.
- **Zoom**: 0.1x–20x range, controls bottom-right; click node to zoom (k=3).
- **Entity count**: Inside controls sidebar (below "About this map"), not a floating overlay.

## Person categories

Executive, Researcher, Policymaker, Investor, Organizer, Journalist, Academic, Cultural figure.

## Organization categories

Frontier Lab, AI Safety/Alignment, Think Tank/Policy Org, Government/Agency, Academic, VC/Capital/Philanthropy, Labor/Civil Society, Ethics/Bias/Rights, Media/Journalism, Political Campaign/PAC, AI Infrastructure & Compute, AI Deployers & Platforms.

## Version control and deployment practices

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the full deployment and review process.

- Conventional commit prefixes: `feat:`, `fix:`, `refactor:`, `docs:`.
- `map-data.json` / `map-detail.json` / `backup-*.json` / `backup-*.sql` are gitignored.
- Test/seed data scripts gitignored.
- **All changes to main must go through a PR.** No direct pushes except P0 hotfixes with explicit approval.
- **Push to main auto-deploys the frontend.** Test in a browser first, not just with scripts.
- **Backend (Lambda + API Gateway) requires separate `sam deploy`.** Merging `api/*.ts` or `template.yaml` to main does NOT deploy them. Always run `aws cloudformation detect-stack-drift --stack-name mapping-ai` first; a blind `sam deploy` can wipe CloudFront settings not captured in `template.yaml`. This risk goes away when we cut to Cloudflare Workers per [ADR-0001](docs/architecture/adrs/0001-migrate-off-aws.md).
- **Never add `defer` or `async` to the D3 script tag in `map.html`.** Inline map code uses `d3` synchronously during HTML parsing. See `docs/post-mortems/2026-04-09-d3-defer-map-outage.md`. Risk goes away when `map.html` is rewritten as a React component in Phase 3.
- **Browser-test map.html before pushing any HTML/JS changes.** Automated checks cannot catch rendering failures.
- **Verify site loads immediately after any push to main.** Check /, /contribute, /map, /insights, /admin all return 200. The deploy workflow has an automated smoke test; verify manually too.
- **For preview branches**: wait for Cloudflare Pages build after push, then test the affected pages on the preview URL before reporting work done.

## Linting and formatting

ESLint + Prettier + lefthook pre-commit hooks.

```bash
npm run lint          # Check for lint errors
npm run lint:fix      # Auto-fix where possible
npm run format        # Format src/ and api/ files
npm run format:check  # Check formatting without writing
npm run typecheck     # TypeScript type check
```

Pre-commit hooks run typecheck + lint + format check automatically. If a commit fails the hook, fix the underlying issue and commit again.

**Never suppress errors with force flags.** If `--force`, `--no-verify`, or `eslint-disable` seem necessary, fix the root cause. If a lint rule is genuinely wrong for the project, update `eslint.config.js` with a comment explaining why.

To set up lefthook after cloning:

```bash
brew install lefthook
lefthook install
```

## DB safety

- **Deletion protection** enabled on the RDS instance.
- **Manual backups**: `npm run db:backup` dumps all tables to S3 under the `backups/` prefix as timestamped JSON + SQL. Run before any risky admin work.
- **Planned**: audit log table to track all DB mutations (approve/reject/merge/edit/delete) with revert capability. See `memory/db_audit_log.md` for the design target.

## Known technical debt

- **Category mapping fragile**: normalization handles known variants but may miss new ones as data grows.
- **Admin key hardcoded**: default key in `template.yaml`; should rotate before adding collaborators.
- Stack-level debt (inline `map.html`, legacy TipTap bundle, SAM drift risk, two-step deploy, pending-entity negative IDs) is tracked in [`docs/architecture/current.md` → Known limitations](docs/architecture/current.md) and addressed by the migration in [ADR-0001](docs/architecture/adrs/0001-migrate-off-aws.md).
