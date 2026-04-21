# Post-Mortem: Workshop Page Overwrite + Credential Leak (2026-04-18)

> **Historical context:** this document describes behavior on the AWS stack (RDS + Lambda + CloudFront + S3 + SAM). See [`docs/architecture/current.md`](../architecture/current.md) for today's live stack and [ADR-0001](../architecture/adrs/0001-migrate-off-aws.md) for migration status.

## Incident 1: Workshop Page Overwrite

### What happened

A cleanup PR (#18) overwrote Sophia's workshop page updates instead of building on top of them. The subagent that updated `src/workshop/App.tsx` replaced the entire file with its own version rather than merging changes into the existing content.

### Root cause

The subagent was given instructions to "update the workshop page" without explicit guidance to preserve existing content. It read the file, wrote a new version with the requested changes, but replaced Sophia's content (streams, schedule, detailed contributor instructions) in the process.

### Timeline

- Sophia pushed workshop updates with detailed stream descriptions, schedule, and setup instructions
- Cleanup PR was created with parallel subagents, one of which rewrote workshop/App.tsx
- PR was merged without diffing against Sophia's version
- Sophia noticed her content was gone and reverted

### Prevention

1. **Never rewrite a file another person recently edited.** Always `git pull` and check `git log -- <file>` before modifying shared files.
2. **Subagents that modify files should be told to READ the current version first and ADD to it, not replace it.**
3. **Before merging any PR that touches files others are working on, diff the PR specifically against the latest main to verify no content was lost.**
4. **When resolving merge conflicts, prefer the other person's version as the base and add your changes on top.**

---

## Incident 2: Credential Leak Analysis

### What happened

An email from leakscanner@mailbox.org flagged that the RDS database password was committed to the public GitHub repo at commit `d89ce57` in `scripts/migrate-to-rds-new-schema.js`.

### Investigation

The hardcoded RDS connection string (`postgresql://mappingai:WBDMQAmc...@mapping-ai-db...`) was already present in the file before commit `d89ce57`. Checking the git history:

- **Commit `50785f7`** (earlier): already contained the hardcoded credential
- **Commit `d89ce57`** (flagged by scanner): a Prettier formatting pass that reformatted the file, keeping the existing credential
- **Commit `3f84b0c`** (Sophia): removed the hardcoded credential

### Detailed commit analysis

| Commit    | Author            | Date       | What happened                                                                                                                                                                                                                               |
| --------- | ----------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `50785f7` | sophiajwang       | 2026-04-07 | **Original introduction.** File `scripts/migrate-to-rds-new-schema.js` was added with hardcoded RDS connection string on line 19. This was a one-time migration script.                                                                     |
| `d89ce57` | anushreechaudhuri | 2026-04-17 | **Reformatted by Prettier.** A different Claude session ran Prettier across the codebase. The formatter touched this file (reformatting the const declaration), preserving the existing credential. This is the commit the scanner flagged. |
| `3f84b0c` | sophiajwang       | 2026-04-17 | **Fixed.** Sophia removed the hardcoded credential and replaced it with `process.env.RDS_URL`.                                                                                                                                              |

The credential was introduced on 2026-04-07 by Sophia in a migration script commit. It was NOT introduced by the React migration session. The `d89ce57` commit that the scanner flagged merely reformatted the file.

**Current state:** The credential is removed from `main` (commit `3f84b0c`). However, it still exists in git history on feature branches (`feat/ci-gate`, `feat/fixture-fork-ux`, `feat/shared-types-cleanup`, `feat/tooling-baseline`, `feat/typescript-lambdas`). Sophia has already rotated the RDS password, so the leaked credential is no longer valid.

### Root cause

The migration script was written as a one-time tool and hardcoded the RDS URL directly instead of reading from `.env`. This pattern is common in throwaway scripts that accidentally get committed to public repos.

### Prevention

1. **Pre-commit hooks should scan for credential patterns.** Add a lefthook `secrets` check that greps for patterns like `postgresql://.*:.*@` or AWS key formats.
2. **Never hardcode credentials in any file, even one-time scripts.** Always use `process.env.DATABASE_URL` or `dotenv`.
3. **Migration and one-time scripts should be deleted or gitignored after use.** They should never stay in the repo long-term.
4. **Delete stale feature branches** that contain the leaked credential from the remote: `feat/ci-gate`, `feat/fixture-fork-ux`, `feat/shared-types-cleanup`, `feat/tooling-baseline`, `feat/typescript-lambdas`.
5. **Consider adding `git-secrets` or `trufflehog` to the CI pipeline** to catch credential patterns before they reach the remote.
