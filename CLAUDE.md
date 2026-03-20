# Mapping AI

A collaborative stakeholder mapping project for the U.S. AI policy landscape.

## Project Overview

Single-page website that collects crowdsourced data about people and organizations shaping AI policy in the United States. Form submissions are stored as JSON files in the GitHub repository via a Vercel serverless function.

## Tech Stack

- **Frontend**: Static HTML/CSS/JS (no framework)
- **Styling**: Space Grotesk font, Antikythera-inspired design
- **Backend**: Vercel serverless functions (`api/submit.js`, `api/submissions.js`)
- **Database**: Vercel Postgres (Neon) — `people` and `organizations` tables
- **Hosting**: Vercel

## Project Structure

```
mapping-ai/
├── index.html              # Single-page site
├── styles.css              # All styling
├── script.js               # Form toggle + submission logic
├── api/
│   ├── submit.js           # POST endpoint — insert submissions
│   └── submissions.js      # GET endpoint — query submissions
├── scripts/
│   ├── migrate.js          # Create database tables
│   └── seed.js             # Import CSV data into database
├── vercel.json             # Vercel build configuration
└── *.csv                   # Source data exports from Airtable
```

## Key Files

| File | Purpose |
|------|---------|
| `index.html:69-130` | Person submission form |
| `index.html:132-189` | Organization submission form |
| `script.js:24-66` | Form submission handler |
| `api/submit.js` | Postgres INSERT (person or organization) |
| `api/submissions.js` | Postgres SELECT with status/type filters |
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
| `POSTGRES_URL` | Auto-set when Vercel Postgres is linked |

(Connection string env vars are auto-populated by Vercel when a Postgres database is attached to the project.)

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
