# Database Setup Instructions

## Step 1: Create Vercel Postgres Database

1. Go to the [Vercel Dashboard](https://vercel.com/dashboard)
2. Select the **mapping-ai** project
3. Go to the **Storage** tab
4. Click **Create Database** → select **Postgres (Neon)**
5. Choose a name (e.g., `mapping-ai-db`) and region (pick the closest to your users, e.g., `us-east-1`)
6. Click **Create**

This automatically adds the `POSTGRES_URL` (and related) environment variables to your Vercel project.

## Step 2: Pull Environment Variables Locally

You need the database connection string locally to run migrations and seed data.

```bash
# Install Vercel CLI if you haven't already
npm i -g vercel

# Link this directory to the Vercel project (if not already linked)
vercel link

# Pull env vars into a local .env file
vercel env pull .env
```

## Step 3: Install Dependencies

```bash
npm install
```

## Step 4: Run Migration + Seed

```bash
# Create tables
npm run db:migrate

# Import CSV data (people + organizations) as 'approved' entries
npm run db:seed

# Or both at once:
npm run db:setup
```

## Step 5: Remove Old GitHub Token

The `GITHUB_TOKEN`, `GITHUB_REPO`, and `GITHUB_BRANCH` environment variables in Vercel are no longer needed. You can remove them from:

**Vercel Dashboard → Project → Settings → Environment Variables**

## Step 6: Deploy

Push to `main` — Vercel will auto-deploy. The serverless functions now use `@vercel/postgres` and will read from the `POSTGRES_URL` env var that Vercel auto-injects.

```bash
git add -A && git commit -m "feat: migrate from GitHub storage to Vercel Postgres"
git push
```

## API Endpoints

### POST /api/submit
Same as before — form submissions are inserted into the database with `status: 'pending'`.

### GET /api/submissions
Returns approved entries. Query params:
- `?type=person` or `?type=organization` — filter by type (omit for both)
- `?status=pending` — override status filter (default: `approved`)

Example: `GET /api/submissions?type=person` returns all approved people.

## Database Schema

**people** table:
`id, name, category, title, primary_org, other_orgs, location, regulatory_stance, capability_belief, influence_type, twitter, notes, submitter_email, submitted_at, status, created_at`

**organizations** table:
`id, name, category, website, location, funding_model, regulatory_stance, capability_belief, influence_type, twitter, notes, submitter_email, submitted_at, status, created_at`

Both tables have an index on `status` for fast filtered queries.
