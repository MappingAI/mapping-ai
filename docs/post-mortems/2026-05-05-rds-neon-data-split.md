# Post-Mortem: RDS/Neon Data Split (2026-05-05)

## What happened

On launch day (May 4), the live map-data.json was regenerated from the Neon production database and uploaded to R2. This overwrote the previous version which had been generated from the RDS database. The Neon DB was missing ~240 entities and ~1,000 edges that existed in RDS, causing entities like Hoover Institution to disappear from the map. The submit endpoint was also returning 500 errors because 5 columns (`topic_tags`, `format_tags`, `advocated_stance`, `advocated_timeline`, `advocated_risk`) were missing from Neon's submission table.

Separately, the claims-pilot Neon branch had 5,835 sourced claims (powering entity sparklines and sourced beliefs) that were never merged to the production branch, so sparklines stopped appearing.

## Root cause

The migration from AWS RDS to Neon (April 2026) was incomplete in three ways:

1. **Entity/edge data gap**: The initial Neon seed captured the DB state at migration time, but subsequent enrichment scripts continued writing to RDS (via the main `.env` which still pointed to RDS). Neon received some enrichment separately, creating two divergent databases with 240 entities and ~1,000 edges only in RDS.

2. **Schema gap**: The `scripts/migrate.js` migration failed partway through on Neon (errored on a `topic_tags` GIN index before reaching subsequent ALTER TABLE statements). Nobody re-ran or checked for completion, leaving the submission table missing 5 columns that the submit endpoint's INSERT expected.

3. **Claims data not merged**: The claims enrichment pipeline ran against the `claims-pilot` Neon branch (5,835 claims, 8,254 sources). This data was never merged to the production branch, so the live `claims-detail.json` only had 2 entries.

## Contributing factors

- **Multiple DATABASE_URLs**: The main `.env` had `DATABASE_URL` pointing to RDS and `NEON_PROD_URL` pointing to Neon. Scripts defaulted to RDS. The Cloudflare Worker used Neon. GitHub Actions had a separate `DATABASE_URL` secret. No single source of truth.
- **No migration verification**: The RDS-to-Neon migration had no automated check confirming row counts matched or that all schema objects were created.
- **Stale AWS references**: Multiple scripts (`backup-db.js`, `cache-thumbnails.js`) still reference S3 buckets and `eu-west-2` region. The `engine.js` still has a hardcoded CloudFront URL for org logos and an AWS API Gateway URL for semantic search.
- **`qa_approved` flag**: 61 entities approved via enrichment scripts had `qa_approved = NULL` because those scripts bypassed the submission trigger that sets the flag. The export script filters on `qa_approved = true`, silently excluding them.

## What was fixed (May 4-5)

1. Synced 240 missing entities and ~1,000 missing edges from RDS to Neon
2. Deduplicated 193 entity pairs and 115 edge pairs created by the sync
3. Added 5 missing columns to Neon submission table (fixed submit endpoint)
4. Set `qa_approved = true` for 61 approved entities missing the flag
5. Merged 5,835 claims and 3,302 sources from claims-pilot to production branch
6. Updated GitHub `DATABASE_URL` secret to Neon
7. Verified Cloudflare Pages `DATABASE_URL` points to Neon
8. Re-exported and uploaded map-data.json and claims-detail.json to R2

## Remaining cleanup needed

### Critical (blocks correct operation)

- [ ] Update main `.env` `DATABASE_URL` to Neon (currently still RDS)
- [ ] Remove `RDS_DB_PWD` and old AWS DB credentials from `.env`
- [ ] Fix hardcoded AWS API Gateway semantic search URL in `engine.js:5760`

### Important (scripts will break or use wrong infra)

- [ ] Update `scripts/backup-db.js` to upload to R2 instead of S3
- [ ] Update `scripts/cache-thumbnails.js` to upload to R2 instead of S3
- [ ] Update org logo URL in `engine.js:232` from CloudFront to R2 or remove
- [ ] Update comment in `src/types/entity.ts:57` ("served from S3/CloudFront")
- [ ] Update comment in `engine.js:3325` ("served over HTTP/2 from CloudFront")
- [ ] Remove stale GitHub secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `CLOUDFRONT_DISTRIBUTION_ID`, `S3_BUCKET_NAME`

### Preventive measures

- [ ] Add entity/edge count smoke test to deploy workflow that fails if counts drop below a threshold
- [ ] Add `qa_approved = true` to the entity creation trigger so enrichment scripts don't need to set it manually
- [ ] Add a `--dry-run` flag to `export-map-data.ts` that prints counts without writing files, for pre-upload verification
- [ ] Document that `claims-detail.json` must be re-exported separately (it's not part of `db:export-map`)
