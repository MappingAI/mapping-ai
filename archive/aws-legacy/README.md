# AWS Legacy Infrastructure (archived 2026-04-28)

These files were the production infrastructure before the migration to Cloudflare Pages + Neon. They are preserved here for emergency rollback reference.

## Emergency rollback procedure

If the Cloudflare/Neon stack is down and you need to revert to AWS:

1. **DNS**: In Cloudflare dashboard, change the `mapping-ai.org` CNAME from `mapping-ai.pages.dev` back to the CloudFront distribution domain (`d3fo5mm9fktie3.cloudfront.net`). Change proxy status to DNS-only (grey cloud).

2. **Database**: RDS instance `mapping-ai-db.c9sccou2k3xe.eu-west-2.rds.amazonaws.com` has deletion protection on. Snapshot `pre-neon-cutover-2026-04-28` is available. Data will be stale (frozen at 2026-04-28 cutover).

3. **Lambda**: The 6 Lambda functions still exist and point at RDS. They will work immediately once DNS routes to CloudFront again.

4. **Frontend**: S3 bucket `mapping-ai-website-561047280976` still has the last deployed frontend. CloudFront serves it. The frontend API URLs need to be reverted from `/api` to `https://j8jamvdf6i.execute-api.eu-west-2.amazonaws.com` (revert PR #68).

5. **Deploy**: Move `template.yaml` and `samconfig.toml` back to project root. Run `sam build && sam deploy` with RDS DATABASE_URL.

## Archived files

- `template.yaml`: SAM template (6 Lambdas, API Gateway, S3, CloudFront, security headers)
- `samconfig.toml`: SAM deploy config (region eu-west-2, stack mapping-ai)
- `api/*.ts`: Lambda handler source code (replaced by `functions/api/*.ts` Pages Functions)

## Key AWS resources (still active, do not delete yet)

- **RDS**: `mapping-ai-db.c9sccou2k3xe.eu-west-2.rds.amazonaws.com` (eu-west-2)
- **S3**: `mapping-ai-website-561047280976` (eu-west-2)
- **CloudFront**: `E34ZXLC7CZX7XT`
- **API Gateway**: `j8jamvdf6i` (eu-west-2)
- **Lambda functions**: `mapping-ai-submit`, `mapping-ai-submissions`, `mapping-ai-search`, `mapping-ai-semantic-search`, `mapping-ai-admin`, `mapping-ai-upload`

## When to delete AWS resources

After 2+ weeks of stable Cloudflare/Neon operation with no rollbacks needed. Delete in this order: CloudFront distribution, S3 bucket, Lambda functions (via `sam delete`), API Gateway, RDS instance (take final snapshot first).
