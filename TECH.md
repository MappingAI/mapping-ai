# Technical Reference — Mapping AI

This document covers architecture, local development, deployment, and the API for contributors working on the codebase.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Browser                                                │
│  mapping-ai.org                                         │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Cloudflare (DNS)                                       │
│  - DNS resolution (CNAME flattening at root)            │
│  - DDoS protection                                      │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  AWS CloudFront (CDN)                                   │
│  - Global edge caching                                  │
│  - SSL/TLS termination (ACM certificate)                │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
┌───────────────────┐   ┌─────────────────────────────────┐
│  AWS S3           │   │  AWS API Gateway (HTTP API)     │
│  Static files:    │   │  POST /submit   → Lambda        │
│  HTML, CSS, JS    │   │  GET /submissions → Lambda      │
└───────────────────┘   └────────────────┬────────────────┘
                                         │ pg (node-postgres)
                                         ▼
                        ┌─────────────────────────────────┐
                        │  AWS RDS Postgres               │
                        │  Tables: people, organizations, │
                        │          resources              │
                        └─────────────────────────────────┘
```

Frontend is fully static — no build step. Backend is serverless via AWS Lambda, deployed with AWS SAM. Database is AWS RDS Postgres (eu-west-2). All infrastructure defined in `template.yaml`.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| DNS | Cloudflare (DNS-only mode, CNAME flattening) |
| CDN | AWS CloudFront |
| Frontend hosting | AWS S3 |
| Frontend | Static HTML/CSS/JS — no framework, no bundler |
| Visualization | D3.js (map.html) |
| Fonts | EB Garamond (serif) + DM Mono (mono) via Google Fonts |
| Backend | AWS Lambda (Node.js 20) + API Gateway (HTTP API) |
| Infrastructure-as-code | AWS SAM (`template.yaml`) |
| Database | AWS RDS Postgres (eu-west-2) |
| DB client | `pg` (node-postgres v8) |
| CI/CD | GitHub Actions (auto-deploy on push to main) |

---

## Repository Structure

```
mapping-ai/
├── index.html              # Background / home page
├── theoryofchange.html     # Theory of change
├── contribute.html         # Submission forms (person, org, resource)
├── map.html                # Interactive stakeholder map (D3.js)
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
│   ├── export.js           # Exports all DB tables to CSV
│   └── export-map-data.js  # Generates map-data.json (strips sensitive fields, adds stance_score/timeline_score/risk_score)
├── data/                   # Airtable CSV source exports
├── template.yaml           # AWS SAM infrastructure (Lambda + API Gateway + S3 + CloudFront)
├── samconfig.toml          # SAM deployment config (non-sensitive)
├── test-handlers.mjs       # Local Lambda validation tests (no DB required)
├── package.json            # Node dependencies
└── .github/
    └── workflows/
        └── deploy.yml      # GitHub Actions: auto-deploy to S3 on push
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
| `DATABASE_URL` | AWS Lambda (via `sam deploy`) + GitHub Secrets | RDS connection string — see `.env.example` for format |

Copy `.env.example` to `.env` for local script usage:

```bash
cp .env.example .env
# Fill in DATABASE_URL
```

**Never commit `.env`.** It is in `.gitignore`.

---

## Database

### Provider

AWS RDS Postgres (eu-west-2). Connection string format:

```
postgresql://user:password@mapping-ai-db.c9sccou2k3xe.eu-west-2.rds.amazonaws.com:5432/mappingai
```

Credentials are managed separately — never committed to the repo.

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

## Deployment

### Prerequisites

```bash
brew install awscli
brew install aws-sam-cli
aws configure   # Enter your IAM access key, region: eu-west-2
```

### First-time deploy (infrastructure)

This deploys both the backend (Lambda + API Gateway) AND frontend hosting (S3 + CloudFront):

```bash
sam build
sam deploy --guided --parameter-overrides "DatabaseUrl=<your_rds_connection_string>"
```

Follow the prompts. Recommended values:
- Stack name: `mapping-ai`
- Region: `eu-west-2`
- Confirm changeset: `y`
- Allow IAM role creation: `y`
- Disable rollback: `n`
- Save config: `y`

SAM outputs:
- `ApiUrl` — API Gateway endpoint (update `API_BASE` in `assets/js/script.js`)
- `CloudFrontUrl` — Your site URL (e.g., `https://d1234567890.cloudfront.net`)
- `WebsiteBucketName` — S3 bucket for static files

### Deploy static files to S3

After infrastructure is deployed, upload the static files:

```bash
# Get bucket name from SAM outputs
BUCKET_NAME=$(aws cloudformation describe-stacks --stack-name mapping-ai --query "Stacks[0].Outputs[?OutputKey=='WebsiteBucketName'].OutputValue" --output text)

# Sync static files to S3
aws s3 sync . s3://$BUCKET_NAME \
  --exclude ".*" \
  --exclude "node_modules/*" \
  --exclude "api/*" \
  --exclude "scripts/*" \
  --exclude "data/*" \
  --exclude "exports/*" \
  --exclude "*.yaml" \
  --exclude "*.toml" \
  --exclude "*.json" \
  --exclude "*.mjs" \
  --exclude "*.md" \
  --delete

# Invalidate CloudFront cache (so changes appear immediately)
DISTRIBUTION_ID=$(aws cloudformation describe-stacks --stack-name mapping-ai --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" --output text)
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"
```

### Subsequent backend deploys

```bash
source .env && sam build && sam deploy --parameter-overrides "DatabaseUrl=$DATABASE_URL"
```

> **Security:** Never put `DatabaseUrl` in `samconfig.toml` or any tracked file. Always pass it on the command line.

### GitHub Actions (auto-deploy)

On every push to `main`, `.github/workflows/deploy.yml` automatically:
1. Generates `map-data.json` from RDS (via `export-map-data.js`)
2. Syncs all static files to S3
3. Invalidates the CloudFront cache

**GitHub Secrets required** (Settings → Secrets → Actions):
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `S3_BUCKET_NAME`
- `CLOUDFRONT_DISTRIBUTION_ID`
- `DATABASE_URL` — RDS connection string (used by the export step)

---

## Custom Domain Setup

After CloudFront is deployed, to use a custom domain (e.g., `aimapping.org`):

1. **Request SSL certificate** in AWS Certificate Manager (ACM):
   - Region must be `us-east-1` (required for CloudFront)
   - Request a certificate for `aimapping.org` and `www.aimapping.org`
   - Validate via DNS (add CNAME records to your domain registrar)

2. **Update CloudFront distribution** (in AWS Console or template.yaml):
   - Add alternate domain names: `aimapping.org`, `www.aimapping.org`
   - Select the ACM certificate

3. **Update DNS** at your domain registrar:
   - `aimapping.org` → CNAME or ALIAS to CloudFront distribution domain
   - `www.aimapping.org` → CNAME to CloudFront distribution domain

---

## Infrastructure

Defined in `template.yaml`. Resources:

| Resource | Type | Purpose |
|----------|------|---------|
| `MappingAiApi` | HTTP API Gateway | Routes `/submit` and `/submissions` |
| `SubmitFunction` | Lambda | Handles form submissions |
| `SubmissionsFunction` | Lambda | Returns approved entries |
| `WebsiteBucket` | S3 Bucket | Stores static files |
| `CloudFrontDistribution` | CloudFront | CDN, SSL, caching |
| `CloudFrontOriginAccessControl` | OAC | Secure S3 access |
| `WebsiteBucketPolicy` | Bucket Policy | Allow CloudFront to read S3 |

CORS is configured at the API Gateway level to allow requests from the CloudFront domain and custom domains.

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

- **No secrets in tracked files.** `DATABASE_URL` is passed to Lambda at deploy time via `--parameter-overrides` and stored in GitHub Secrets for CI/CD — never stored in `samconfig.toml` or any committed file.
- **`.env` is gitignored.** Copy `.env.example` to `.env` locally.
- **`submissions/` and `exports/` are gitignored.** Submission data and CSV exports must never be committed to the repo.
- **`is_self_submission` flag** is tracked in the DB for moderation context but not displayed publicly.
- **Submitter emails** are stored in the DB for follow-up but are never returned by the public `/submissions` endpoint.
- **AWS credentials** are stored in `~/.aws/credentials` (outside repo) or GitHub Secrets for CI/CD.
