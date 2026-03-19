# Mapping AI

A collaborative stakeholder mapping project for the U.S. AI policy landscape.

## Project Overview

Single-page website that collects crowdsourced data about people and organizations shaping AI policy in the United States. Form submissions are stored as JSON files in the GitHub repository via a Vercel serverless function.

## Tech Stack

- **Frontend**: Static HTML/CSS/JS (no framework)
- **Styling**: Space Grotesk font, Antikythera-inspired design
- **Backend**: Vercel serverless function (`api/submit.js`)
- **Data Storage**: JSON files committed to GitHub via API
- **Hosting**: Vercel

## Project Structure

```
mapping-ai/
├── index.html              # Single-page site
├── styles.css              # All styling
├── script.js               # Form toggle + submission logic
├── api/
│   └── submit.js           # Vercel serverless function
├── submissions/
│   ├── people/             # Person submissions (JSON)
│   └── organizations/      # Organization submissions (JSON)
├── vercel.json             # Vercel build configuration
└── *.csv                   # Source data exports from Airtable
```

## Key Files

| File | Purpose |
|------|---------|
| `index.html:69-130` | Person submission form |
| `index.html:132-189` | Organization submission form |
| `script.js:24-66` | Form submission handler |
| `api/submit.js:4-90` | GitHub API integration |
| `styles.css:37-49` | Sticky sidebar layout |
| `styles.css:109-130` | Stakeholder grid (tan background) |

## Commands

**Local preview:**
```bash
npx serve .
```

**Deploy:** Push to `main` branch; Vercel auto-deploys.

## Environment Variables (Vercel)

| Variable | Description |
|----------|-------------|
| `GITHUB_TOKEN` | Fine-grained PAT with Contents read/write |
| `GITHUB_REPO` | Repository path (e.g., `sophiajwang/mapping-ai`) |
| `GITHUB_BRANCH` | Target branch (default: `main`) |

## Data Schema

**Person submission fields:** Name, Category, Title, Primary org, Other orgs, Location, Regulatory stance, Capability belief, Influence type, Twitter/X, Notes

**Organization submission fields:** Name, Category, Website, Location, Funding model, Regulatory stance, Capability belief, Influence type, Twitter/X, Notes

## Version Control Practices

**General principles:**
- All changes tracked through Git with clear, descriptive commit messages
- Version history serves as institutional memory documenting principle evolution
- Before pushing, ensure remote changes are pulled and reconciled
- Use conventional commit prefixes: `feat:`, `fix:`, `refactor:`, `docs:`

**Git authorship (CRITICAL):**
- Commits must be authored by the human decision-maker
- Do NOT include "Claude" or AI assistant references in commit messages or co-authorship
- Human accountability requires clear human authorship in version control

**When committing changes:**
1. Read the file first to understand current state
2. Make targeted, purposeful edits
3. Write commit messages explaining the "why" not just the "what"
4. Ensure commit messages reflect institutional decision-making, not AI assistance

## Additional Documentation

- [Architectural Patterns](.claude/docs/architectural_patterns.md) - Design patterns and conventions used
