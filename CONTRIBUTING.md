# Contributing to Mapping AI

Thanks for being here. This project tracks the people, organizations, and resources shaping U.S. AI policy — contributions of all kinds are welcome, from fixing a typo to proposing a new belief dimension.

If you're looking for the high-level orientation, start with [ONBOARDING.md](ONBOARDING.md). This file is specifically about how to set up a working dev environment and what the CI gate expects of your PR.

## Setup

```bash
git clone https://github.com/MappingAI/mapping-ai.git
cd mapping-ai
nvm use                  # Node 20 (.nvmrc)
npm install
npx lefthook install     # one-time: wires up the pre-commit hook
npm run dev              # Vite on http://localhost:5173
```

`npm install` runs Lefthook's own post-install, which is what places the single-binary hook runner in `node_modules/.bin/`. The hook itself only gets wired into `.git/hooks/` after you explicitly run `npx lefthook install` — we chose that design over an automatic npm `prepare` hook so installing dependencies never mutates your git config behind your back.

> Running without credentials: a separate PR adds a no-`.env` fixture mode so public forks can render the app without access to the database. Until that lands, the forms and search will return errors locally unless `DATABASE_URL` is set in a `.env` file.

## Local commands

| Command | What it does |
|---------|--------------|
| `npm run dev` | Vite dev server on `http://localhost:5173` |
| `npm run build` | Production Vite build into `dist/` |
| `npm run format` | `prettier --write .` — applies repo formatting |
| `npm run format:check` | `prettier --check .` — CI-equivalent |
| `npm run lint` | `eslint .` — full repo lint |
| `npm run lint:fix` | `eslint . --fix` — auto-fix what ESLint can |
| `npm run type-check` | `tsc --noEmit` — type-check across src/ |
| `npm test` | Vitest single-pass |
| `npm run test:watch` | Vitest in watch mode |

The pre-push checklist that matches CI exactly:

```bash
npm run format:check && npm run lint && npm run type-check && npm test && npm run build
```

## How the quality gate works

Every PR to `main` runs a GitHub Actions workflow (`.github/workflows/ci.yml`) with six required status checks: `format:check`, `lint`, `type-check`, `test`, `build`, and `sam validate`. A PR cannot merge until all six are green. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#branch-protection) for the full branch-protection configuration.

Locally, the pre-commit hook is deliberately lighter than CI: it only runs Prettier + ESLint `--fix` on **staged files**, not the whole tree. It's fast, it auto-fixes, and it stages the fix back. If you ever need to commit without it (WIP work, stashed experiments), `git commit --no-verify` skips the hook — CI still catches everything.

### What ESLint flags vs warns

Errors block merge. Warnings don't block but are counted by CI output so the count stays visible. The warning bucket today holds:

- Accessibility patterns in the contribute forms and admin panel that predate the React migration. The clean fix is a shared `<FormField>` component that attaches `htmlFor`/`id` pairs automatically plus a pass over `<div onClick>` sites to make them keyboard-reachable. Tracked as follow-up work.
- `prefer-nullish-coalescing` style nudges — case-by-case when the file is being touched anyway.

When a warning's root cause has been fixed across the codebase, promote the rule to `error` in `eslint.config.js` so the ratchet holds.

### What the pre-commit hook will refuse

The hook blocks commits of `fixtures/*.json` unless `FIXTURE_REVIEWED=1` is set in your environment. Fixture files commit to public git history and a PII leak there is irreversible — the env-var ritual makes the review step conscious. If you're refreshing the fixture legitimately:

```bash
npm run fixtures:generate   # re-runs the sanitizer (coming with the fixture-mode PR)
FIXTURE_REVIEWED=1 git commit -m "fixtures: weekly refresh"
```

## Style and conventions

- **Commit prefixes:** `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `style:`, `test:`. `style:` is specifically for whitespace/formatting; it should never include behavior changes.
- **TypeScript:** no new `any`. Prefer `unknown` + narrowing. The very few existing `any`s on external boundaries (TipTap generics, CDN-loaded globals) carry inline justifications.
- **Imports:** ESM with `.js` extensions on relative paths even in `.ts` source (canonical form with `"type": "module"`).
- **Markdown:** prose formatting is not run through Prettier — it mangles snake_case identifiers and wildcards in technical docs. Keep your own formatting reasonable.

## Testing

- Unit tests live under `src/__tests__/`. They run via Vitest (jsdom environment). `npm test` runs them once; `npm run test:watch` keeps them live.
- For UI changes, also open the page in a browser. Automated tests verify logic; visual and interaction checks are on you.

## Submitting a PR

1. Push your branch: `git push -u origin feat/your-feature`
2. `gh pr create --draft` (drafts are fine while you iterate)
3. Write a summary that explains *why*, not just *what*. Assume the reviewer has no context.
4. Call out risk: does this touch `api/`, `scripts/`, `template.yaml`, or the deploy workflow? If yes, note what manual follow-up (if any) is needed post-merge.
5. Wait for CI. Fix anything it catches. Mark the PR ready for review.

## Questions

- Architecture and data model: [ONBOARDING.md](ONBOARDING.md), [CLAUDE.md](CLAUDE.md)
- Deploy pipeline and incident response: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- Past solutions and post-mortems: [docs/solutions/](docs/solutions/), [docs/post-mortems/](docs/post-mortems/)

If something's unclear after reading those — the doc is probably wrong. Open an issue or PR to fix the doc; docs are part of the code.
