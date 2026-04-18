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

- **Frontend**: Vite 8 MPA + React 19 + TypeScript + Tailwind CSS v4
- **Map**: D3.js force-directed graph (inline, not React)
- **API**: AWS Lambda + API Gateway (Node.js 20)
- **Database**: PostgreSQL 17 on AWS RDS
- **Hosting**: S3 + CloudFront (auto-deployed via GitHub Actions)

See [TECH.md](TECH.md) for the full architecture reference.

---

## Quick Start

**Prerequisites:** Node.js 20+ and npm. Install via [nvm](https://github.com/nvm-sh/nvm) or `brew install node`.

```bash
git clone https://github.com/MappingAI/mapping-ai.git
cd mapping-ai
npm ci
brew install lefthook    # pre-commit hooks for linting/formatting
lefthook install
```

Create a `.env` file in the project root with database credentials (shared via Doppler, or ask the team):

```bash
# .env
DATABASE_URL=postgresql://...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

Run two terminals:

```bash
# Terminal 1: React dev server
npx vite dev            # http://localhost:5173

# Terminal 2: API proxy (form submissions + map)
node dev-server.js      # http://localhost:3000
```

Visit `localhost:5173` for React pages (contribute, admin, insights, about). Visit `localhost:3000` for the map (inline HTML, not React).

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

- [TECH.md](TECH.md) - architecture, API reference, deployment
- [ONBOARDING.md](ONBOARDING.md) - setup guide for new contributors
- [CLAUDE.md](CLAUDE.md) - codebase conventions and AI assistant context
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) - deploy process and review guidelines

---

## Community

Join the [Discord server](https://discord.gg/2gntpaxV) for discussions, coordination, and mapping parties. Use the forum channels to track bugs, share research questions, and post feature ideas.

---

## Working Group

Maintained by a working group of researchers, policy experts, and practitioners. See [mapping-ai.org/about](https://mapping-ai.org/about) for more.

---

## License

This project is maintained by the Mapping AI Working Group. Content is (c) 2026 the respective contributors.
