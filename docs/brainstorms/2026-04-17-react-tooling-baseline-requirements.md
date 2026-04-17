---
date: 2026-04-17
topic: react-tooling-baseline
---

# React Tooling Baseline (pre-merge on feat/react-contribute)

## Problem Frame

`feat/react-contribute` is days away from merging to `main` and becoming the production codebase. It already has a solid foundation (React 19 + Vite 8 MPA, TS 5.9 `strict`, Vitest, TanStack Query, react-hook-form), but zero enforcement tooling: no ESLint, no Prettier, no pre-commit hooks, no CI PR checks. GitHub Actions only _deploys_ on push to `main` — it never runs `tsc`, tests, or a linter before merge.

Worse, `api/*.js` and `scripts/*.js` are plain JS explicitly excluded from `tsconfig.json`, so the `toFrontendShape()` contract (DB → frontend field mapping — the source of past silent breaks) is unchecked on both sides of the wire. "End-to-end type safety" isn't really possible without migrating them.

At the same time, the repo is being positioned for a public launch (Discord, mapping parties, outside contributors). A forker today cannot run the app — no DB, no AWS creds, no Anthropic key, and `ONBOARDING.md` still says `node dev-server.js` instead of `npm run dev`.

This brainstorm locks in the baseline before the React merge lands so that (a) the merge itself passes a real PR gate, (b) every future PR is type-checked, linted, formatted, and tested, and (c) a stranger can clone the repo and see a working app in under a minute.

## Requirements

- **R1. Whole-repo TypeScript.** Migrate `api/*.js`, `scripts/*.js`, `dev-server.js`, and `src/tiptap-notes.js` to `.ts`. The shared `toFrontendShape()` / `Entity` / `Submission` / `Edge` contracts live in typed modules importable by both Lambdas and the React app.
- **R2. ESLint 9 flat config + Prettier.** Single `eslint.config.js` covering React + TS + hooks + a11y + import-order. Prettier owns formatting, ESLint defers via `eslint-config-prettier`. Both run on `src/`, `api/`, `scripts/`, config files.
- **R3. Light pre-commit, strict CI.** Pre-commit hook runs Prettier + ESLint `--fix` on staged files only (sub-second). CI runs the full gate on every PR: `prettier --check`, `eslint`, `tsc --noEmit`, `vitest run`, `vite build`. All four are required status checks on `main`.
- **R4. Type-safe Lambda build.** SAM template uses `BuildMethod: esbuild` to compile `.ts` Lambdas at deploy time. `sam build && sam deploy` still works; no separate TS build step in the dev loop.
- **R5. Fork-friendly local dev.** `git clone && npm install && npm run dev` renders the full map + forms with zero external credentials. Achieved via a checked-in sanitized `fixtures/map-data.json` and a fixture-mode branch in the dev server that returns canned responses when `DATABASE_URL` is absent. Submissions in fixture mode log to console.
- **R6. Sanitized fixture generator.** A script generates `fixtures/map-data.json` from the live DB, stripping emails, notes, and any unapproved/internal entities. The generator itself is gitignored (it needs DB access); only its output ships. Fixture is refreshed manually before each public release, not on every deploy.
- **R7. README + ONBOARDING reflect the new flow.** `npm run dev` is the one-line start command. `.env.example` enumerates every optional variable with inline comments explaining what breaks without it. A short "Contributing" section explains the lint/format/test workflow and how to run the pre-commit hook manually.
- **R8. Editor parity.** `.editorconfig` for indentation/line endings. `.vscode/settings.json` + recommended extensions (ESLint, Prettier, Tailwind IntelliSense) so IDE and CLI agree on formatting. `.nvmrc` pinned to Node 20 to match CI.
- **R9. Dependency hygiene.** Dependabot (or Renovate) configured for weekly grouped minor/patch updates on npm and GitHub Actions, with auto-merge disabled by default — PRs must still pass the gate in R3.
- **R10. Incremental migration lands on feat/react-contribute, not main.** The tooling baseline is merged into the React branch _before_ it merges to `main`, so the React merge itself is the first PR that passes the full gate. Everything on `main` after the merge inherits a green baseline.

## Success Criteria

- A fresh clone of the public repo, with no `.env` file, boots a working map + form UI via `npm run dev` in under 60 seconds.
- Every PR to `main` shows four required status checks: format, lint, type-check, test. Merge is blocked when any fails.
- `tsc --noEmit` returns zero errors across `src/`, `api/`, and `scripts/`.
- A contributor can run `npm run lint` / `npm run format` / `npm run type-check` / `npm run test` locally with no surprises relative to CI.
- Lambda deploys still succeed via the existing `sam deploy` invocation, with no regressions in cold-start time attributable to the TS migration.

## Scope Boundaries

- **Not** introducing Biome, Oxc, or any non-ESLint/Prettier tool. Decided via dialogue — Prettier was an explicit user ask and ESLint's React ecosystem coverage wins.
- **Not** migrating `map.html`, `contribute.html`, etc. inline code to React components. The MPA structure stays; each page's React root is imported from `src/<page>/main.tsx`.
- **Not** adding Playwright/Puppeteer E2E to CI. Vitest + Testing Library + `vite build` is the CI floor. Existing `test-handlers.mjs` / Puppeteer scripts can remain as local-only.
- **Not** building a real DB-less backend. Fixture mode is read-only + console.log for writes. Anyone wanting real submissions sets up `.env` per `.env.example`.
- **Not** changing the deploy pipeline beyond adding the SAM esbuild metadata and wiring PR checks. The existing S3 + CloudFront deploy on push to `main` stays.
- **Not** adding CODEOWNERS, PR templates, or Issue templates in this pass — possibly worth a follow-up but out of scope here.

## Key Decisions

- **Whole-repo TS over frontend-only.** Rationale: the real bug class to prevent is `toFrontendShape()` drift between DB column names and frontend field names — that requires typing both sides. The 6 Lambdas + ~15 scripts are a manageable one-time lift.
- **ESLint 9 + Prettier over Biome.** Rationale: user explicitly wanted Prettier; React/TanStack-Query/a11y/Tailwind-classname rule coverage is still ESLint-first in 2026; we don't have a perf pain point that would justify Biome's tradeoff.
- **Light local + strict CI over strict-everywhere.** Rationale: strict pre-commit hooks are routinely bypassed with `--no-verify`, so the real enforcement has to be in CI. Local hooks exist purely for fast formatting feedback, not as a gate.
- **Fixture-based local dev over docker-compose.** Rationale: docker adds a dependency for contributors who just want to tweak a React component. Fixture mode handles 95% of the "first-time forker" need; anyone doing DB work already sets up credentials.
- **Land tooling on feat/react-contribute before merge.** Rationale: if we merge first and land tooling second, the React merge itself skips the gate we're building, and the first gated PR will be a huge cleanup. Do the cleanup in the branch.

## Dependencies / Assumptions

- Assumes the React branch is close enough to feature-complete that we're not churning files while the tooling lands. If refactors are still in flight, time the baseline PR between them.
- Assumes GitHub branch protection on `main` is configurable (it is — repo is under the user's account).
- Assumes we're OK with a one-time noisy PR that adds ~10 config files and touches every source file once (Prettier pass). Keep that PR tooling-only, no behavior changes, to make review trivial.
- Fixture generator script needs DB access; it runs manually by the maintainer before tagged public releases, not in CI.

## Considered Higher-Upside Add-Ons (defer to planning or follow-up)

These came up as "could make the fork experience meaningfully better" but carry enough cost that they belong in a separate scoping pass:

- **PR preview deploys** (Cloudflare Pages or Vercel preview) — `.gitignore` already references `.vercel/`, suggesting this was considered. Would let reviewers click a preview URL on every PR. Cost: second hosting layer to maintain.
- **Commit-message linter** (commitlint + conventional-commits) — CLAUDE.md already documents `feat:/fix:/refactor:/docs:` prefixes; enforcing them mechanically is a small add.
- **Automated changelog / release notes** (release-please) — only worth it once there's a versioning discipline.

## Outstanding Questions

### Resolve Before Planning

_(none — all product decisions locked)_

### Deferred to Planning

- [Affects R1][Technical] Exact SAM `BuildMethod: esbuild` configuration — do we need per-function Metadata or a single top-level Globals entry, and does it play well with the current `samconfig.toml`?
- [Affects R3][Needs research] lefthook vs Husky+lint-staged — both meet R3; lefthook is a single binary with no Node dep, Husky is the incumbent. Planner picks based on ergonomics.
- [Affects R5][Technical] Fixture shape — do we reuse the existing `map-data.json` schema 1:1, or also ship a fixture for `/search` responses (needed for the contribute-page autocomplete to look real)?
- [Affects R6][Needs research] Sanitization rules for the fixture — PII boundaries for emails, notes_html @mentions, submitter relationships. Probably a small allowlist of fields is safer than a denylist.
- [Affects R9][Technical] Renovate vs Dependabot grouping rules — Renovate has richer grouping for monorepo-style dep bumps, Dependabot is built-in.

## Next Steps

→ `/ce:plan` for structured implementation planning
