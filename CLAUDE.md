# Mapping AI

A collaborative stakeholder mapping project for the U.S. AI policy landscape.

## Project Overview

Single-page website that collects crowdsourced data about people and organizations shaping AI policy in the United States.

## Tech Stack

- **Frontend**: Static HTML/CSS/JS (no framework) — hosted on GitHub Pages
- **Backend**: AWS Lambda + API Gateway (`api/submit.js`, `api/submissions.js`)
- **Database**: Neon Postgres — `people`, `organizations`, and `resources` tables
- **Hosting**: GitHub Pages (frontend) + AWS (backend)
- **Infrastructure**: AWS SAM (`template.yaml`)

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
├── template.yaml           # AWS SAM infrastructure definition
├── CNAME                   # GitHub Pages custom domain
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

**Deploy backend:**
```bash
# First time
sam build && sam deploy --guided --parameter-overrides DatabaseUrl=$DATABASE_URL

# Subsequent deploys
sam build && sam deploy
```

**Deploy frontend:** Push to `main` branch; GitHub Pages auto-deploys.

## Environment Variables

| Variable | Where | Description |
|----------|-------|-------------|
| `DATABASE_URL` | AWS Lambda (set during `sam deploy`) | Neon Postgres connection string |

The `DATABASE_URL` comes from the Neon dashboard at `console.neon.tech` — not from Vercel.

## API Endpoint

After deploying with SAM, the API Gateway URL is printed as `ApiUrl` in the stack outputs.
Update `API_BASE` in `assets/js/script.js` with this value, then commit and push.

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

## Known Technical Debt

### Moderation workflow (no admin UI)
All submission review is done by manually running SQL against Neon (`UPDATE people SET status='approved' WHERE id=X`). This is sustainable at low volume but will become painful as the map grows. A future task: build a simple password-protected admin page that lists pending submissions and allows approve/reject with a button. This is a self-contained feature suitable for a dedicated agent sprint.

### Inline CSS across pages
`contribute.html`, `about.html`, and `theoryofchange.html` embed their styles in `<style>` blocks rather than using a shared stylesheet. `index.html` uses `assets/css/styles.css`. This means design changes (color variables, typography, nav) must be made in 4 places. The right fix is consolidating to a single shared stylesheet — a multi-file refactor suitable for a dedicated agent sprint. Do not attempt inline.

## Additional Documentation

- [Architectural Patterns](.claude/docs/architectural_patterns.md) - Design patterns and conventions used
