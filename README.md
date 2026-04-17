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

```bash
git clone https://github.com/MappingAI/mapping-ai.git
cd mapping-ai
npm ci
```

You'll need a `.env` file with database credentials (ask the team or check Doppler).

```bash
# Terminal 1: React dev server (all pages except map)
npx vite dev

# Terminal 2: API proxy (for form submissions)
node dev-server.js
```

Visit http://localhost:5173 for React pages, http://localhost:3000 for the map.

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

Join the [Discord server](https://discord.com/events/1491894381773590609/1494729391509340281) for discussions, coordination, and mapping parties.

---

## Working Group

Maintained by a working group of researchers, policy experts, and practitioners. See [mapping-ai.org/about](https://mapping-ai.org/about) for more.

---

## License

This project is maintained by the Mapping AI Working Group. Content is (c) 2026 the respective contributors.
