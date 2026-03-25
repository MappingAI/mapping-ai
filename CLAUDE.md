# Mapping AI

A collaborative stakeholder mapping project for the U.S. AI policy landscape.

## Project Overview

Multi-page website that collects crowdsourced data about people and organizations shaping AI policy in the United States, with an interactive D3.js visualization.

**Live site:** https://mapping-ai.org

## Tech Stack

- **DNS**: Cloudflare (DNS-only mode, CNAME flattening)
- **CDN**: AWS CloudFront
- **Frontend hosting**: AWS S3
- **Frontend**: Static HTML/CSS/JS (no framework)
- **Visualization**: D3.js (`map.html`)
- **Backend**: AWS Lambda + API Gateway (`api/submit.js`, `api/submissions.js`)
- **Database**: Neon Postgres — `people`, `organizations`, and `resources` tables
- **Infrastructure**: AWS SAM (`template.yaml`)
- **CI/CD**: GitHub Actions (auto-deploy to S3 on push to main)

## Project Structure

```
mapping-ai/
├── index.html              # Background / home page
├── theoryofchange.html     # Theory of change
├── contribute.html         # Submission forms (person, org, resource)
├── map.html                # Interactive stakeholder map (D3.js)
├── map-data.json           # Map data export (regenerate with export-map-data.js)
├── about.html              # Team and project info
├── assets/
│   ├── css/styles.css      # Styles for index.html
│   ├── images/             # Logo and images
│   └── js/script.js        # Form toggle + submission logic
├── api/
│   ├── submit.js           # Lambda: POST /submit — insert submissions
│   └── submissions.js      # Lambda: GET /submissions — query submissions
├── scripts/
│   ├── migrate.js          # Create/update database schema
│   ├── seed.js             # Import CSV data into database
│   ├── export.js           # Export all tables to CSV
│   └── export-map-data.js  # Generate map-data.json (strips sensitive fields)
├── template.yaml           # AWS SAM infrastructure (Lambda + API Gateway + S3 + CloudFront)
└── .github/workflows/
    └── deploy.yml          # GitHub Actions: auto-deploy to S3 on push
```

## Key Files

| File | Purpose |
|------|---------|
| `contribute.html` | Person, organization, and resource submission forms |
| `map.html` | Interactive D3.js stakeholder visualization |
| `map-data.json` | Static data for map (regenerated from DB) |
| `assets/js/script.js` | Form submission handler |
| `api/submit.js` | Lambda: Postgres INSERT |
| `api/submissions.js` | Lambda: Postgres SELECT with status/type filters |
| `template.yaml` | AWS SAM infrastructure definition |
| `.github/workflows/deploy.yml` | GitHub Actions deployment workflow |

## Commands

**Local preview:**
```bash
npx serve .
# Open http://localhost:3000
```

**Regenerate map data:**
```bash
node scripts/export-map-data.js
# Creates map-data.json from approved DB entries (strips sensitive fields)
```

**Deploy backend (Lambda + API Gateway):**
```bash
sam build && sam deploy --parameter-overrides DatabaseUrl=$DATABASE_URL
```

**Deploy frontend:** Push to `main` branch — GitHub Actions auto-deploys to S3 and invalidates CloudFront cache.

## Environment Variables

| Variable | Where | Description |
|----------|-------|-------------|
| `DATABASE_URL` | Local `.env` + AWS Lambda | Neon Postgres connection string |
| `AWS_ACCESS_KEY_ID` | GitHub Secrets | AWS credentials for deployment |
| `AWS_SECRET_ACCESS_KEY` | GitHub Secrets | AWS credentials for deployment |
| `S3_BUCKET_NAME` | GitHub Secrets | S3 bucket for static files |
| `CLOUDFRONT_DISTRIBUTION_ID` | GitHub Secrets | For cache invalidation |

The `DATABASE_URL` comes from the Neon dashboard at `console.neon.tech`.

## API Endpoint

**Production API:** `https://j8jamvdf6i.execute-api.eu-west-2.amazonaws.com`

This is set as `API_BASE` in `assets/js/script.js`.

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
