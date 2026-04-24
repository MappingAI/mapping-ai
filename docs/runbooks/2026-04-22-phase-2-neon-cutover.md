# Runbook: Phase 2.1, AWS RDS to Neon cutover

**Status:** draft, not yet executed. **Owner:** Anushree. **Planned window:** TBD.

This runbook covers the real cutover of the mapping-ai Postgres database from AWS RDS to Neon. It builds on the dry-run proved out in `scripts/migration/neon-dryrun.sh`. The runbook is referenced by Phase 2.1 in `docs/plans/2026-04-21-001-refactor-aws-to-cloudflare-migration-plan.md`.

Rule of thumb: every stateful step is prefixed with a short rationale. Do not skip steps even if they feel redundant. The point of the runbook is to be boring.

---

## Prerequisites

Verify all five before starting. If any fails, stop and fix it, then start over from the top.

1. **neonctl authed.** Run `neonctl me`. If it prints an account, you are good. If it errors, run `neonctl auth` and retry.
2. **Postgres 17 client tools installed.** Run `pg_dump --version`, `pg_restore --version`, `psql --version`. All three should print a 17+ version (Postgres 18 client works against 17 servers). On macOS: `brew install libpq && export PATH="/opt/homebrew/opt/libpq/bin:$PATH"`.
3. **`DATABASE_URL` is set to prod RDS.** Run `echo "$DATABASE_URL" | head -c 60`. It should start with `postgres://…@mapping-ai-db.c9sccou2k3xe.eu-west-2.rds.amazonaws.com`. If it is empty, `source .env`.
4. **Fresh RDS snapshot taken.** This is the rollback of last resort. Via AWS Console: RDS → `mapping-ai-db` → Actions → Take snapshot. Name it `pre-neon-cutover-YYYY-MM-DD`. Wait for `Available` before proceeding.
5. **RDS deletion-protection is on.** Already enabled per `docs/architecture/current.md`, but confirm in Console so no one has flipped it in the last week.

Nice-to-have:

- A second terminal tail-ing Cloudflare Web Analytics for the hour around cutover, so a drop in traffic is visible.
- Another teammate on call via Slack in case rollback is needed.

---

## Step 1: Dry-run

Purpose: prove schema + data copies cleanly to a Neon branch before touching prod. The script is idempotent; run it as many times as you want.

```bash
export PATH="/opt/homebrew/opt/libpq/bin:$PATH"   # macOS with brew install libpq
set -a && source .env && set +a                   # pulls DATABASE_URL
scripts/migration/neon-dryrun.sh --delete-after
```

Expected output (the specific branch ID and timestamp will vary):

```
→ Creating Neon branch 'dryrun-YYYY-MM-DD-HHMMSS' on project calm-tree-46517731
→ Extracting connection string for branch dryrun-…
→ Running pg_dump from prod RDS → /tmp/mapping-ai-dryrun-…dump (custom format, no-owner, no-acl)
→ Running pg_restore → Neon branch 'dryrun-…'
→ Running row-count queries on Neon branch
… (row counts) …
→ Running same row-count queries on prod RDS for comparison
… (row counts) …
===========================================================
DRY-RUN COMPLETE
```

**Do not proceed unless all three counts match exactly between RDS and Neon:** `entity` by type, `submission` total, `edge` total. If they diverge, file an incident and stop.

Omit `--delete-after` on the final dry-run so you can smoke-test the app against the Neon branch locally before the real cutover:

```bash
scripts/migration/neon-dryrun.sh           # leaves branch alive
# copy the unredacted connection string printed above
DATABASE_URL='postgresql://…neon.tech/neondb?…' pnpm run dev
# open http://localhost:5173, submit a form, approve from admin, confirm map updates
neonctl branches delete <branch-id> --project-id calm-tree-46517731   # clean up
```

---

## Step 2: Comparison queries

Purpose: spot-check specific entities beyond totals. Rotate through a few known IDs to make sure contents (not just row counts) survived.

Against the Neon staging branch from Step 1:

```bash
psql "$NEON_URL" <<'SQL'
-- Known entity: Stephen Clare, id 1849
SELECT id, name, category, status, thumbnail_url
FROM entity WHERE id = 1849;

-- Row count totals (duplicates the script output; reassurance)
SELECT 'entity' AS tbl, COUNT(*) AS n FROM entity
UNION ALL SELECT 'submission', COUNT(*) FROM submission
UNION ALL SELECT 'edge', COUNT(*) FROM edge;

-- Sequence values are current (no drift after restore)
SELECT pg_get_serial_sequence('entity','id')::regclass AS seq,
       last_value FROM entity_id_seq;

-- Triggers exist and are enabled
SELECT tgname, tgenabled FROM pg_trigger
WHERE tgrelid IN ('entity'::regclass,'submission'::regclass)
  AND NOT tgisinternal
ORDER BY tgname;

-- Belief weighted averages (make sure trigger-computed fields copied)
SELECT id, name, belief_regulatory_stance_wavg, belief_regulatory_stance_n
FROM entity WHERE belief_regulatory_stance_n > 0 LIMIT 5;
SQL
```

Run the same queries against `$DATABASE_URL` (RDS) and diff visually. If anything looks off, stop and investigate before Step 3.

---

## Step 3: Real cutover

Do NOT start this step until Step 1 and Step 2 both look clean. Expected total downtime: under 15 minutes, assuming no surprises.

### 3a. Create the prod Neon target

The earlier dry-run wrote into a throwaway branch. For the real cutover, use the production branch (`main`) of the Neon project as the target. It already exists; you just need to push data into it.

```bash
# Get the prod Neon URL. Store it in a shell var; never echo it unredacted.
NEON_PROD_URL=$(neonctl connection-string production --project-id calm-tree-46517731)

# Fresh dump from RDS. Use a new path; the script's dump was ephemeral.
export PATH="/opt/homebrew/opt/libpq/bin:$PATH"
set -a && source .env && set +a
pg_dump -Fc --no-owner --no-acl "$DATABASE_URL" -f /tmp/mapping-ai-cutover.dump

# Restore into Neon prod. --clean drops pre-existing schema so re-running
# this step is safe. This is the main cutover step; prod RDS is still the
# source of truth during this window.
pg_restore --clean --if-exists --no-owner --no-acl -d "$NEON_PROD_URL" /tmp/mapping-ai-cutover.dump

# Verify counts on Neon prod
psql "$NEON_PROD_URL" -c "SELECT entity_type, COUNT(*) FROM entity GROUP BY entity_type;
                          SELECT COUNT(*) FROM submission;
                          SELECT COUNT(*) FROM edge;"
```

Match these against RDS one more time before moving on.

### 3b. Freeze writes during the swap (optional, recommended)

If traffic is low, skip. If you want zero write loss: either flip the site to a maintenance banner via a Cloudflare Transform Rule, or coordinate with team members to not submit. The API Gateway rate limit can also be tightened temporarily as a hack. Document what you did so rollback is obvious.

Re-run the `pg_dump` + `pg_restore` step one more time right before the swap so the two DBs match within seconds.

### 3c. Update GitHub Secrets

Replaces the `DATABASE_URL` secret so future deploys (`.github/workflows/deploy.yml` → `scripts/export-map-data.ts`) read from Neon instead of RDS.

1. Go to https://github.com/MappingAI/mapping-ai/settings/secrets/actions
2. Edit `DATABASE_URL` → paste the full Neon prod URL (unredacted, with password)
3. Keep the RDS URL in a safe place (your password manager) so rollback is a 30-second flip

Do not trigger a deploy yet. The Lambdas still point at RDS until step 3d.

### 3d. Update Lambda `DATABASE_URL` via `sam deploy` (CAREFUL)

This is the riskiest step. See `memory/feedback_sam_deploy_danger.md`. A sloppy `sam deploy` wiped CloudFront config on 2026-04-16. Follow this sequence exactly.

1. **Drift check first.**

   ```bash
   aws cloudformation detect-stack-drift --stack-name mapping-ai
   # wait ~30s
   aws cloudformation describe-stack-resource-drifts --stack-name mapping-ai \
     --stack-resource-drift-status-filters MODIFIED DELETED
   ```

   If anything shows drift, STOP. Resolve drift into `template.yaml` (or document an explicit decision to overwrite) before continuing.

2. **Dry-run changeset.**

   ```bash
   sam build
   sam deploy \
     --parameter-overrides \
       DatabaseUrl="$NEON_PROD_URL" \
       AdminKey="$ADMIN_KEY" \
       AnthropicApiKey="$ANTHROPIC_API_KEY" \
       AnthropicSemanticSearchKey="$ANTHROPIC_SEMANTIC_SEARCH_KEY" \
       ContributorKey="$CONTRIBUTOR_KEY" \
     --no-execute-changeset
   ```

   Read the changeset line by line in the AWS Console. Only the Lambda environment variable `DatabaseUrl` should change. If anything else is Modified/Added/Removed, STOP.

3. **Execute.** Only after the changeset reads clean, re-run the same `sam deploy` command without `--no-execute-changeset`. Do not pass `--no-confirm-changeset`; always review.

4. **Verify.** Hit the live API:
   ```bash
   curl -s 'https://j8jamvdf6i.execute-api.eu-west-2.amazonaws.com/submissions?type=person' \
     | head -c 300
   # expect JSON with recent entities
   ```

### 3e. Update local `.env` files

Every team member with a local `.env` needs to swap `DATABASE_URL` to the Neon prod URL. Post in Slack with the new URL in a password-manager link, not plaintext. Old RDS URL stays in their password manager for rollback.

---

## Step 4: Verification

Prove the cutover worked end-to-end before declaring done.

1. **Smoke test the live site.**

   ```bash
   for page in / /contribute /map /about /insights /admin; do
     code=$(curl -o /dev/null -s -w '%{http_code}' "https://mapping-ai.org$page")
     echo "$page → $code"
   done
   ```

   Every line should end in `200`.

2. **Submit + approve a throwaway entity.** From the live site: submit an obvious test entry (`name: "z-test-delete-me-$(date +%s)"` or similar), approve it from admin, watch it appear on the map within ~60s. Then delete it via admin.

3. **Check Cloudflare Web Analytics** for the hour around cutover. Traffic should be flat. A cliff is a bad sign.

4. **Check Lambda logs (CloudWatch) for errors.**

   ```bash
   aws logs tail /aws/lambda/mapping-ai-submit --since 15m
   aws logs tail /aws/lambda/mapping-ai-admin --since 15m
   ```

   Look for connection errors, auth errors, unexpected timeouts.

---

## Step 5: Rollback (keep this section bookmarked)

Target: restore service within 5 minutes of detecting a problem. RDS stays warm through Phase 3.10, so rollback is an env var flip, not a data restore.

1. **Flip local `.env` back** so you can hit the API via scripts.
2. **Flip GitHub Secret `DATABASE_URL` back to RDS** (the value you saved in your password manager in 3c).
3. **`sam deploy` with the RDS URL** (same drift-check + no-execute-changeset + execute sequence as 3d, but with the RDS `DatabaseUrl`).
4. **Verify via the smoke test in Step 4.**
5. **Investigate the cutover failure before retrying.** Write up what broke in a post-mortem under `docs/post-mortems/`.

If the rollback itself fails: the RDS snapshot from the Prerequisites step is the ultimate fallback. Restore from snapshot into a new RDS instance, flip the Lambda `DatabaseUrl` to that host, then file an incident.

---

## Step 6: Docs updates (same commit as cutover)

After Step 4 is green, flip the docs atomically. Every claim about where the database lives must move to Neon in one commit so `current.md` stays the source of truth.

1. **`docs/architecture/current.md`**, Database section:
   - Host: replace `mapping-ai-db.c9sccou2k3xe.eu-west-2.rds.amazonaws.com` with the Neon host (strip password)
   - Version: `Postgres 17` stays (Neon runs Postgres)
   - Instance / free-tier / deletion-protection lines: replace with Neon's equivalents (compute branch, free-tier row count, point-in-time recovery semantics)
   - Add a date stamp: `Cutover: YYYY-MM-DD`

2. **`docs/architecture/target.md`**, Status table:
   - Database row: mark as `**shipped YYYY-MM-DD**` linked to the PR that executed this runbook

3. **`memory/credentials.md`**: note Neon is now primary, RDS is standby. Update after one week of stability.

4. **`docs/plans/2026-04-21-001-refactor-aws-to-cloudflare-migration-plan.md`**: flip Phase 2.1 checkbox to `[x]` and add the cutover date to the status table.

5. **Keep RDS warm until Phase 3.10.** Do not run `sam delete`, do not disable the RDS instance, do not delete snapshots. The 1-week warm window exists for rollback.

---

## Appendix: watch-outs from the dry-run (2026-04-21)

Captured from the first end-to-end dry-run so the next run is boring:

- **pg_dump version skew.** The dry-run used `pg_dump 18.3` against a `Postgres 17` source. That works (newer client, older server). The other direction (older client against newer server) does not. If you install `libpq` from a distro-managed repo, verify the version.
- **`--clean --if-exists`.** The restore uses `--clean --if-exists` to drop pre-existing schema in the target. Without it, rerunning into an already-populated Neon branch errors on existing tables. Harmless on a fresh branch, load-bearing on a re-run.
- **Trigger re-creation.** Postgres re-created all three triggers (`trg_before_submission_update`, `trg_after_submission_update`, `trg_entity_search`) from the dump. No extra migrate step needed.
- **Sequences.** `pg_dump -Fc` restores sequence values, so `entity_id_seq`, `submission_id_seq`, `edge_id_seq` come over current. New inserts on Neon do not collide with existing IDs.
- **No extension surprises.** mapping-ai does not use uncommon extensions; only `plpgsql` (built-in) and `pg_trgm`-adjacent features via `tsvector`. Neon supports both out of the box.
- **Row counts on 2026-04-22 dry-run:**
  - `entity`: 787 organizations, 756 persons, 155 resources (1698 total)
  - `submission`: 21
  - `edge`: 2234
  - Match these against the numbers on cutover day as a sanity check. They will drift upward with new submissions; any large delta from these baselines deserves attention.

## Appendix: why we keep RDS warm for 1+ week

Phase 3 (Cloudflare Workers + TanStack Start) is the next cutover and is higher risk than this one. Keeping RDS warm means the Neon cutover stays a one-step revert during the Phase 3 window. Once Phase 3 is green and stable for a week, Phase 3.10 retires both the Lambdas and RDS in the same cleanup pass.
