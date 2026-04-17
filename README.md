# Mapping AI

A crowdsourced map of the U.S. AI policy landscape — tracking the people, organizations, and resources shaping AI governance ahead of 2028.

**Live site:** [mapping-ai.org](https://mapping-ai.org)

---

## What This Is

Mapping AI is a collaboratively maintained database of actors in U.S. AI policy: legislators, regulators, researchers, funders, advocates, frontier labs, and civil society organizations. The goal is to identify who is shaping AI governance, where coalitions are forming, and where the gaps are — and to use that map as the foundation for a coordinated progressive policy agenda.

The project is maintained by a working group of researchers, policy experts, and practitioners. Public submissions are welcome.

---

## How to Contribute

Visit [mapping-ai.org/contribute.html](https://mapping-ai.org/contribute.html) to submit a person, organization, or resource. All submissions are reviewed before appearing on the map.

**What we track:**

- **People** — individuals actively shaping AI policy: policymakers, researchers, funders, advocates, journalists
- **Organizations** — frontier labs, think tanks, government agencies, labor groups, civil society orgs, academic institutions
- **Resources** — essays, reports, books, podcasts, and academic papers relevant to AI governance

**Submission fields include:** regulatory stance, influence type, threat model beliefs, AGI timeline views, and source evidence — so the map captures not just who is involved but where they stand.

---

## Working Group

Maintained by a working group of researchers, policy experts, and practitioners. See [mapping-ai.org/about.html](https://mapping-ai.org/about.html) for more.

---

## For Developers

```bash
git clone https://github.com/MappingAI/mapping-ai.git
cd mapping-ai
nvm use               # Node 20
npm install
npx lefthook install  # one-time: wires up pre-commit hook
npm run dev           # Vite dev server on http://localhost:5173
```

The full contributor guide — local commands, CI expectations, pre-commit hook, coding conventions — is in [CONTRIBUTING.md](CONTRIBUTING.md). Architecture, data model, and deployment live in [TECH.md](TECH.md), [ONBOARDING.md](ONBOARDING.md), and [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## License

This project is maintained by the Mapping AI Working Group. Content is © 2026 the respective contributors.
