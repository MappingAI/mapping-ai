---
title: 'SAM deploy overwrites manual CloudFront config causing SSL, routing, and access failures'
date: 2026-04-16
category: integration-issues
module: infrastructure
problem_type: integration_issue
component: development_workflow
symptoms:
  - 'ERR_CERT_COMMON_NAME_INVALID on mapping-ai.org — CloudFront lost custom domain aliases and ACM certificate'
  - 'All page navigation redirected to homepage — SPA-style 403/404 error redirects masked missing URL rewrite function'
  - 'Access Denied (403) on all non-root paths after removing error redirects — CloudFront Function detached'
root_cause: config_error
resolution_type: config_change
severity: critical
tags:
  - aws-cloudfront
  - aws-sam
  - cloudformation
  - infrastructure-as-code
  - ssl-certificate
  - production-outage
  - deployment
  - iac-drift
related_components:
  - tooling
  - documentation
---

# SAM deploy overwrites manual CloudFront config causing SSL, routing, and access failures

> **Historical context:** this document describes behavior on the AWS stack (RDS + Lambda + CloudFront + S3 + SAM). See [`docs/architecture/current.md`](../../architecture/current.md) for today's live stack and [ADR-0001](../../architecture/adrs/0001-migrate-off-aws.md) for migration status.

## Problem

Running `sam deploy` to add two CORS origins to the API Gateway caused CloudFormation to reset the CloudFront distribution to template defaults, removing manually-configured custom domain aliases, ACM SSL certificate, and a URL rewrite CloudFront Function. This caused a full production outage (~20 minutes) with cascading SSL, routing, and access failures on mapping-ai.org.

## Symptoms

1. **ERR_CERT_COMMON_NAME_INVALID** — Browser refused to connect to mapping-ai.org. CloudFront was serving the default `*.cloudfront.net` certificate which doesn't match the custom domain. HSTS enforcement prevented bypassing the error.

2. **All navigation routes to homepage** — After SSL was manually restored, every page (/contribute, /map, /about) rendered the homepage. The `template.yaml` contained `CustomErrorResponses` mapping 403/404 to `/index.html`. Since S3 returns 403 for clean URL paths like `/contribute` (no such S3 key), every page silently served `index.html`.

3. **Access Denied (403) XML errors** — After removing the SPA-style error redirects, raw S3 403 errors were exposed on all non-root paths. The `mapping-ai-url-rewrite` CloudFront Function (which rewrites `/contribute` to `/contribute.html`) had been detached by the deploy.

## What Didn't Work

- **CloudFormation rollback (`aws cloudformation rollback-stack`)** — Failed because the stack was in `UPDATE_COMPLETE` state. Rollback is only available for `UPDATE_FAILED` or `CREATE_FAILED` states. A successful but destructive deploy cannot be rolled back this way.

- **Redeploying from a fresh clone of `main`** — Did not fix anything because `main`'s `template.yaml` had the same missing configuration. The problem was what the template _omitted_, not what it contained. Redeploying the same incomplete template re-applied the same broken state.

- **Removing SPA error redirects without re-attaching the URL rewrite function** — Made the situation worse. The error redirects were masking the underlying routing problem (detached CloudFront Function). Removing them turned silent misbehavior (everything shows homepage) into loud 403 errors on every page.

## Solution

### Immediate fix: Three manual CloudFront API calls

**1. Restore custom domain aliases and SSL certificate:**

```bash
# Get current config and ETag
aws cloudfront get-distribution-config --id E34ZXLC7CZX7XT > cf-config.json

# Update config JSON: set Aliases (4 domains) and ViewerCertificate (ACM ARN)
# Then apply:
aws cloudfront update-distribution \
  --id E34ZXLC7CZX7XT \
  --distribution-config file://cf-update.json \
  --if-match <etag>
```

**2. Re-publish and re-attach the URL rewrite CloudFront Function:**

```bash
# The function existed but was UNASSOCIATED after deploy
aws cloudfront publish-function \
  --name mapping-ai-url-rewrite \
  --if-match <etag>

# Update distribution to attach function to viewer-request
aws cloudfront update-distribution \
  --id E34ZXLC7CZX7XT \
  --distribution-config file://cf-update-with-function.json \
  --if-match <etag>
```

**3. Invalidate cached error pages:**

```bash
aws cloudfront create-invalidation \
  --distribution-id E34ZXLC7CZX7XT \
  --paths "/*"
```

### Permanent fix: Codify all CloudFront config in template.yaml

Updated `template.yaml` to capture everything that was previously manual:

```yaml
Parameters:
  AcmCertificateArn:
    Type: String
    Default: 'arn:aws:acm:us-east-1:...:certificate/...'
    Description: ACM certificate covering mapping-ai.org + aimapping.org + wildcards

Resources:
  # CloudFront Function for clean URL rewriting
  UrlRewriteFunction:
    Type: AWS::CloudFront::Function
    Properties:
      Name: !Sub 'mapping-ai-url-rewrite-${AWS::AccountId}'
      AutoPublish: true
      FunctionConfig:
        Comment: Rewrite clean URLs to .html
        Runtime: cloudfront-js-2.0
      FunctionCode: |
        function handler(event) {
            var request = event.request;
            var uri = request.uri;
            if (uri.endsWith('/')) {
                request.uri += 'index.html';
            } else if (!uri.includes('.')) {
                request.uri += '.html';
            }
            return request;
        }

  CloudFrontDistribution:
    Type: AWS::CloudFront::Distribution
    Properties:
      DistributionConfig:
        # Custom domains — MUST be in template or sam deploy will remove them
        Aliases:
          - mapping-ai.org
          - www.mapping-ai.org
          - aimapping.org
          - www.aimapping.org
        ViewerCertificate:
          AcmCertificateArn: !Ref AcmCertificateArn
          SslSupportMethod: sni-only
          MinimumProtocolVersion: TLSv1.2_2021
        DefaultCacheBehavior:
          # URL rewrite function — MUST be in template or sam deploy will detach it
          FunctionAssociations:
            - EventType: viewer-request
              FunctionARN: !GetAtt UrlRewriteFunction.FunctionARN
          # ... other cache behavior config
        # NO CustomErrorResponses — URL rewrite function handles clean URLs correctly
```

Removed the `CustomErrorResponses` (403/404 to /index.html) which were wrong for a multi-page site.

## Why This Works

The root cause is **infrastructure-as-code (IaC) state drift**. SAM/CloudFormation treats `template.yaml` as the single source of truth for every resource it manages. When `sam deploy` runs, it computes a changeset by comparing the _template definition_ to the _deployed state_ and "corrects" any differences.

Three critical CloudFront settings existed only in the AWS Console:

1. Custom domain aliases (mapping-ai.org, etc.)
2. ACM SSL certificate
3. `mapping-ai-url-rewrite` CloudFront Function association

Because `template.yaml` didn't declare them, CloudFormation interpreted their presence as drift and removed them to match the template. The intended 2-line CORS change to the API Gateway was correct and harmless — the destruction came from CloudFormation reconciling the _entire stack_, not just the changed resource.

The permanent fix closes the drift gap by encoding all CloudFront configuration in `template.yaml`. Future `sam deploy` runs will preserve (rather than destroy) these settings because they're now declared as the desired state.

## Prevention

### 1. Never configure SAM-managed resources manually in the AWS Console

If CloudFormation owns a resource (it's in `template.yaml`), every setting on that resource must also be in the template. Console changes are transient — the next `sam deploy` will silently remove them. This is the #1 rule of IaC.

### 2. Always review the full changeset before deploying

Never use `--no-confirm-changeset`. In this incident, the changeset clearly showed `+ Add SecurityHeadersPolicy`, `* Modify CloudFrontDistribution`, and modifications to all Lambda functions — far beyond the intended 2-line CORS addition. Reading the changeset would have revealed the scope before damage occurred.

### 3. Use --no-execute-changeset for dry runs

```bash
sam build && sam deploy --no-execute-changeset
# Review changeset in CloudFormation console or CLI
# Only then: aws cloudformation execute-change-set --change-set-name <arn>
```

### 4. Audit for drift before deploying

```bash
aws cloudformation detect-stack-drift --stack-name mapping-ai
# Wait, then:
aws cloudformation describe-stack-drift-detection-status --stack-drift-detection-id <id>
aws cloudformation describe-stack-resource-drifts --stack-name mapping-ai
```

Any drift found should be codified in `template.yaml` before the next deploy.

### 5. Use targeted API calls for single-resource changes

Adding CORS origins only required changing the API Gateway. This could have been done without touching CloudFront:

```bash
aws apigatewayv2 update-api --api-id <id> --cors-configuration '{...}'
```

Use the narrowest tool for the job. `sam deploy` is a full-stack reconciliation — don't use it for a single-resource change.

### 6. Update CLAUDE.md and DEPLOYMENT.md with IaC drift warnings

Add explicit documentation that `sam deploy` will reset ALL resources to template state, and that any manual CloudFront configuration must be in `template.yaml` first. (auto memory [claude])

## Related Issues

- [`docs/post-mortems/2026-04-09-d3-defer-map-outage.md`](../../../docs/post-mortems/2026-04-09-d3-defer-map-outage.md) — Previous production outage from deploy (code error, not IaC drift). Same blast radius (full site down), different failure class. Both incidents reinforce: verify before deploying to production.
- [`docs/DEPLOYMENT.md`](../../../docs/DEPLOYMENT.md) — Documents the `sam deploy` process but does NOT warn about CloudFront config drift risk. **Needs update** with a pre-flight checklist for `sam deploy`.
- `CLAUDE.md` "Version Control & Deployment Practices" section — Should add: "Never configure CloudFront/API Gateway settings in the AWS Console without updating template.yaml — `sam deploy` will reset them."

## Incident Timeline

| Time (UTC) | Event                                                                                                |
| ---------- | ---------------------------------------------------------------------------------------------------- |
| ~11:00     | `sam deploy` executed to add CORS origins. Changeset auto-approved with `--no-confirm-changeset`.    |
| ~11:05     | Deploy completes. CloudFront distribution updated — aliases, cert, and URL rewrite function removed. |
| ~11:06     | User reports ERR_CERT_COMMON_NAME_INVALID on mapping-ai.org.                                         |
| ~11:10     | Attempted CloudFormation rollback — failed (stack not in failed state).                              |
| ~11:12     | Redeployed from main branch — no effect (same template).                                             |
| ~11:15     | Manually restored SSL cert + aliases via CloudFront API.                                             |
| ~11:18     | User reports all pages route to homepage. SPA error redirects removed.                               |
| ~11:20     | User reports Access Denied (403) on all pages.                                                       |
| ~11:22     | Discovered `mapping-ai-url-rewrite` function was UNASSOCIATED. Re-published and re-attached.         |
| ~11:25     | Cache invalidation triggered. Site fully restored.                                                   |
| ~11:30     | Updated template.yaml to codify all manual CloudFront config.                                        |
