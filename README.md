# Mapping AI

A crowdsourced map of the U.S. AI policy landscape, tracking the people, organizations, and resources shaping AI governance.

**Live site:** [mapping-ai.org](https://mapping-ai.org)
**GitHub:** [MappingAI/mapping-ai](https://github.com/MappingAI/mapping-ai)

---

## What This Is

Mapping AI is a collaboratively maintained database of actors in U.S. AI policy: legislators, regulators, researchers, funders, advocates, frontier labs, and civil society organizations. The goal is to identify who is shaping AI governance, where coalitions are forming, and where the gaps are, then use that map as the foundation for a coordinated progressive policy agenda.

The project is maintained by a working group of researchers, policy experts, and practitioners. Public submissions are welcome.

---

## Tech Stack

Frontend: Vite 8 MPA + React 19 + TypeScript + Tailwind CSS v4. The stakeholder map (`map.html`) is inline D3.js + Canvas 2D, not React.

Backend and infrastructure specifics are documented in [`docs/architecture/current.md`](docs/architecture/current.md). A migration off AWS to Cloudflare Workers + Neon + TanStack Start is in progress; see [`docs/architecture/target.md`](docs/architecture/target.md) and [ADR-0001](docs/architecture/adrs/0001-migrate-off-aws.md).

---

## Quick Start

**Prerequisites:** Node.js 20+ and pnpm. Install Node via [nvm](https://github.com/nvm-sh/nvm) or `brew install node`, then `brew install pnpm` (or `npm install -g pnpm`).

### 1. Clone and install

```bash
git clone https://github.com/MappingAI/mapping-ai.git
cd mapping-ai
pnpm install --frozen-lockfile
brew install lefthook
lefthook install
```

### 2. Environment setup

Create a `.env` file in the project root with database credentials (shared via Doppler, or ask the team):

```bash
# .env
DATABASE_URL=postgresql://...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

### 3. Start local dev

```bash
pnpm run dev
```

Visit `localhost:5173`. This runs Vite and the Express API server together. Everything works from there: map, contribute form, admin, insights, search, form submissions.

On first run, `map-data.json` is generated from your database automatically (needs `DATABASE_URL` in `.env`). If you don't have DB credentials, download the production snapshot first so the map isn't empty:

```bash
curl -o map-data.json https://mapping-ai.org/map-data.json
curl -o map-detail.json https://mapping-ai.org/map-detail.json
```

### Using AI coding agents

If you're using Claude Code, Cursor, or similar:

- Read `CLAUDE.md` first for full codebase context
- Use `npx tsc --noEmit` to catch type errors after changes
- Use `agent-browser` for visual testing (screenshots, form interaction)
- `npx vitest run` to verify tests
- The [compound-engineering](https://github.com/EveryInc/compound-engineering-plugin) plugin has useful skills: `/ce:review` for code review, `/ce:compound` for documentation

---

## How to Contribute Data

Visit [mapping-ai.org/contribute](https://mapping-ai.org/contribute) to submit a person, organization, or resource. All submissions are reviewed before appearing on the map.

**What we track:**

- **People**: policymakers, researchers, funders, advocates, journalists actively shaping AI policy
- **Organizations**: frontier labs, think tanks, government agencies, labor groups, civil society, academic institutions
- **Resources**: essays, reports, books, podcasts, and academic papers relevant to AI governance

Submission fields include regulatory stance, influence type, threat model beliefs, AGI timeline views, and source evidence, so the map captures not just who is involved but where they stand.

---

## For Developers

- [docs/architecture/current.md](docs/architecture/current.md) - architecture, API reference, schema, deployment
- [docs/architecture/target.md](docs/architecture/target.md) - planned architecture (migration in progress, see [ADR-0001](docs/architecture/adrs/0001-migrate-off-aws.md))
- [ONBOARDING.md](ONBOARDING.md) - setup guide for new contributors
- [CLAUDE.md](CLAUDE.md) - codebase conventions and AI assistant context
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) - deploy process and review guidelines

---

## Community

Join the [Discord server](https://discord.gg/EFZ3FxAt) for discussions, coordination, and mapping parties. Use the forum channels to track bugs, share research questions, and post feature ideas.

---

## Working Group

Maintained by a working group of researchers, policy experts, and practitioners. See [mapping-ai.org/about](https://mapping-ai.org/about) for more.

---

## License

This project is maintained by the Mapping AI Working Group. Content is (c) 2026 the respective contributors.
