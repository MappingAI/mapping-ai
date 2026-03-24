# Technical Reference — Mapping AI

This document covers architecture, local development, deployment, and the API for contributors working on the codebase.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Browser                                                │
│  mapping-ai.org (GitHub Pages)                          │
│  Static HTML/CSS/JS — no framework                      │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS (CORS)
                     ▼
┌─────────────────────────────────────────────────────────┐
│  AWS API Gateway (HTTP API)                             │
│  POST /submit   →  Lambda: api/submit.js                │
│  GET  /submissions → Lambda: api/submissions.js         │
└────────────────────┬────────────────────────────────────┘
                     │ pg (node-postgres)
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Neon Postgres                                          │
│  Tables: people, organizations, resources               │
└─────────────────────────────────────────────────────────┘
```

Frontend is fully static — no build step. Backend is serverless via AWS Lambda, deployed with AWS SAM. Database is Neon Postgres (serverless Postgres, independent of any hosting platform).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend hosting | GitHub Pages (custom domain via `CNAME`) |
| Frontend | Static HTML/CSS/JS — no framework, no bundler |
| Fonts | EB Garamond (serif) + DM Mono (mono) via Google Fonts |
| Backend | AWS Lambda (Node.js 20) + API Gateway (HTTP API) |
| Infrastructure-as-code | AWS SAM (`template.yaml`) |
| Database | Neon Postgres (serverless) |
| DB client | `pg` (node-postgres v8) |

---

## Repository Structure

```
mapping-ai/
├── index.html              # Background / home page
├── theoryofchange.html     # Theory of change
├── contribute.html         # Submission forms (person, org, resource)
├── about.html              # Team and project info
├── assets/
│   ├── css/
│   │   └── styles.css      # Styles for index.html (contribute page styles are inline)
│   ├── images/
│   │   └── mapping-ai-cropped.jpeg
│   └── js/
│       └── script.js       # Form toggle + submission logic
├── api/
│   ├── submit.js           # Lambda: POST /submit — inserts submissions
│   └── submissions.js      # Lambda: GET /submissions — queries approved entries
├── scripts/
│   ├── migrate.js          # Creates / updates database schema
│   ├── seed.js             # Seeds DB from Airtable CSV exports
│   └── export.js           # Exports all DB tables to CSV
├── data/                   # Airtable CSV source exports
│   ├── People-Grid view.csv
│   ├── Organizations-Grid view.csv
│   ├── Policy Efforts-Grid view.csv
│   └── Readings-Grid view.csv
├── template.yaml           # AWS SAM infrastructure definition
├── samconfig.toml          # SAM deployment config (non-sensitive)
├── test-handlers.mjs       # Local Lambda validation tests (no DB required)
├── package.json            # Node dependencies
└── CNAME                   # GitHub Pages custom domain (mapping-ai.org)
```

> **Note:** All HTML pages embed their own `<style>` blocks — there is no shared stylesheet across pages. `assets/css/styles.css` applies only to `index.html`.

---

## Local Development

### Prerequisites

- Node.js 20+
- `npx` (included with npm)

### Run locally

```bash
git clone https://github.com/sophiajwang/mapping-ai.git
cd mapping-ai
npx serve .
# Open http://localhost:3000
```

The frontend is fully static — no build step, no environment variables needed for local preview.

> Form submissions will fail locally unless you point `API_BASE` in `assets/js/script.js` at a running Lambda (or run the Lambda locally with SAM — see below).

### Run Lambda locally (optional)

```bash
npm install
sam build
sam local start-api --parameter-overrides DatabaseUrl=$DATABASE_URL
```

This starts a local API Gateway at `http://localhost:3000`. Update `API_BASE` in `assets/js/script.js` to `http://localhost:3000` for local end-to-end testing.

### Run tests

```bash
node test-handlers.mjs
```

Tests all validation logic in the Lambda handlers without requiring a database connection. All 19 tests should pass.

---

## Environment Variables

| Variable | Where set | How to obtain |
|----------|-----------|---------------|
| `DATABASE_URL` | AWS Lambda (via `sam deploy`) | Neon dashboard → console.neon.tech → Connection Details |

Copy `.env.example` to `.env` for local script usage:

```bash
cp .env.example .env
# Fill in DATABASE_URL
```

**Never commit `.env`.** It is in `.gitignore`.

---

## Database

### Provider

[Neon](https://neon.tech) — serverless Postgres. Connection string format:

```
postgresql://user:password@host/dbname?sslmode=require
```

Get the connection string from `console.neon.tech` → your project → Connection Details.

### Schema

#### `people`

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `name` | VARCHAR(200) | Required |
| `category` | VARCHAR(200) | Frontier Lab, Academic, Policymaker, etc. |
| `title` | VARCHAR(200) | Job title |
| `primary_org` | VARCHAR(200) | |
| `other_orgs` | VARCHAR(200) | |
| `location` | VARCHAR(200) | |
| `regulatory_stance` | VARCHAR(200) | Accelerate → Precautionary scale |
| `evidence_source` | VARCHAR(200) | How stance is documented |
| `agi_timeline` | VARCHAR(200) | |
| `ai_risk_level` | VARCHAR(200) | |
| `threat_models` | TEXT | Comma-separated (multi-select) |
| `influence_type` | TEXT | Comma-separated (multi-select) |
| `twitter` | VARCHAR(200) | @handle |
| `bluesky` | VARCHAR(200) | @handle.bsky.social |
| `notes` | TEXT | |
| `submitter_email` | VARCHAR(200) | Not displayed publicly |
| `submitter_relationship` | VARCHAR(200) | |
| `is_self_submission` | BOOLEAN | Default false |
| `submitted_at` | TIMESTAMPTZ | |
| `status` | VARCHAR(20) | `pending` → `approved` / `rejected` |
| `created_at` | TIMESTAMPTZ | |

#### `organizations`

Same as `people` minus `title`, `primary_org`, `other_orgs`; adds:

| Column | Type | Notes |
|--------|------|-------|
| `website` | VARCHAR(200) | |
| `funding_model` | VARCHAR(200) | Nonprofit, VC-backed, Government, etc. |
| `last_verified` | VARCHAR(50) | Date the entry was last confirmed accurate |

#### `resources`

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `title` | VARCHAR(300) | Required |
| `author` | VARCHAR(200) | |
| `resource_type` | VARCHAR(100) | Essay, Book, Report, Podcast, etc. |
| `url` | VARCHAR(500) | |
| `year` | VARCHAR(10) | |
| `category` | VARCHAR(200) | AI Safety, AI Governance, Labor & Economy, etc. |
| `key_argument` | TEXT | |
| `notes` | TEXT | |
| `submitter_email` | VARCHAR(200) | |
| `submitter_relationship` | VARCHAR(200) | |
| `is_self_submission` | BOOLEAN | |
| `submitted_at` | TIMESTAMPTZ | |
| `status` | VARCHAR(20) | |
| `created_at` | TIMESTAMPTZ | |

### Database scripts

All scripts require `DATABASE_URL` in `.env` or the environment.

```bash
# Create / update schema (idempotent — safe to re-run)
node scripts/migrate.js

# Seed from Airtable CSV exports in data/
node scripts/seed.js

# Export all tables to exports/*.csv
node scripts/export.js
```

---

## Backend Deployment (AWS Lambda)

### Prerequisites

```bash
brew install awscli
brew install aws-sam-cli
aws configure   # Enter your IAM access key, region: eu-west-2
```

### First-time deploy

```bash
sam build
sam deploy --guided --parameter-overrides "DatabaseUrl=<your_neon_connection_string>"
```

Follow the prompts. Recommended values:
- Stack name: `mapping-ai`
- Region: `eu-west-2`
- Confirm changeset: `y`
- Allow IAM role creation: `y`
- Disable rollback: `n`
- Save config: `y`

SAM prints `ApiUrl` in the outputs. Update `API_BASE` in `assets/js/script.js` with this value and commit.

### Subsequent deploys

```bash
sam build && sam deploy --parameter-overrides "DatabaseUrl=<connection_string>"
```

> **Security:** Never put `DatabaseUrl` in `samconfig.toml` or any tracked file. Always pass it on the command line.

### Infrastructure

Defined in `template.yaml`. Two Lambda functions behind a single HTTP API Gateway:

| Route | Function | File |
|-------|----------|------|
| `POST /submit` | SubmitFunction | `api/submit.js` |
| `GET /submissions` | SubmissionsFunction | `api/submissions.js` |

CORS is configured at the API Gateway level to allow all origins (`*`).

---

## Frontend Deployment (GitHub Pages)

The frontend auto-deploys when commits are pushed to `main`. No build step required.

**Custom domain:** `mapping-ai.org` is configured via:
1. `CNAME` file in repo root (contains `mapping-ai.org`)
2. GoDaddy DNS A records pointing to GitHub Pages IPs:
   ```
   185.199.108.153
   185.199.109.153
   185.199.110.153
   185.199.111.153
   ```
3. GoDaddy CNAME: `www` → `sophiajwang.github.io`

GitHub Pages settings: Settings → Pages → Source: Deploy from branch → `main`.

---

## API Reference

### `POST /submit`

Submit a new entry for review.

**Request body (JSON):**

```json
{
  "type": "person",
  "timestamp": "2026-03-24T00:00:00.000Z",
  "_hp": "",
  "data": {
    "name": "Jane Doe",
    "category": "Academic",
    "regulatoryStance": "Moderate",
    "influenceType": "Researcher/analyst, Advisor/strategist"
  }
}
```

- `type`: `"person"` | `"organization"` | `"resource"`
- `_hp`: honeypot field — must be empty string (bots fill this in)
- `data`: object of form fields (camelCase keys)

**Responses:**

| Status | Meaning |
|--------|---------|
| 200 | Submission received (including honeypot silently accepted) |
| 400 | Validation error (missing required field, field too long, invalid type) |
| 405 | Method not allowed |
| 500 | Server error |

**Validation rules:**
- `name` required for `person` and `organization`
- `title` required for `resource`
- Short fields: 200 character max
- Long fields (`notes`, `keyArgument`, `threatModels`): 1000 character max
- All submissions enter DB with `status = 'pending'`

---

### `GET /submissions`

Retrieve approved entries.

**Query parameters:**

| Parameter | Values | Default |
|-----------|--------|---------|
| `type` | `person`, `organization` | both |
| `status` | `pending`, `approved`, `rejected` | `approved` |

**Example:**

```
GET /submissions?type=person&status=approved
```

**Response (JSON):**

```json
{
  "people": [...],
  "organizations": [...]
}
```

---

## Spam Protection

- **Honeypot field** (`_hp`): a hidden form field that humans don't fill in. If non-empty, the server returns 200 silently without writing to the database.
- **Field length limits**: enforced server-side at 200 / 1000 characters.
- All submissions land in `status = 'pending'` and require manual review before appearing publicly.

---

## Branch Strategy

| Branch | Status | Description |
|--------|--------|-------------|
| `main` | Live | Auto-deploys to GitHub Pages. Merge target for all changes. |
| `migration` | Merge-ready | AWS Lambda + GitHub Pages migration. Ready to merge into `main`. |
| `robby/frontend-experiments` | Parked | UI rewrite (sticky TOC, fade-in scroll). Pending team review. |

---

## Commit Conventions

Use conventional commit prefixes:

| Prefix | Use for |
|--------|---------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `chore:` | Maintenance, dependencies, config |
| `docs:` | Documentation only |
| `style:` | CSS / visual changes, no logic change |
| `test:` | Tests only |
| `refactor:` | Code restructure, no behavior change |

---

## Security Practices

- **No secrets in tracked files.** `DATABASE_URL` is passed to Lambda at deploy time via `--parameter-overrides`, never stored in `samconfig.toml` or any committed file.
- **`.env` is gitignored.** Copy `.env.example` to `.env` locally.
- **`submissions/` and `exports/` are gitignored.** Submission data and CSV exports must never be committed to the repo.
- **`is_self_submission` flag** is tracked in the DB for moderation context but not displayed publicly.
- **Submitter emails** are stored in the DB for follow-up but are never returned by the public `/submissions` endpoint.
