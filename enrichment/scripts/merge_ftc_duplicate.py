#!/usr/bin/env python3
"""
Phase 5A fix: merge FTC duplicate entity 199 → 909.

Background
----------
The DB contains two FTC entities:
  * 199 — "FTC (Federal Trade Commission)"       v2,            5 edges
  * 909 — "Federal Trade Commission"              phase3-manual, 12 edges
909 is canonical. This script:
  1. Redirects 199's edges to 909, skipping any that would collide
     with an existing 909 edge on (source, target, edge_type).
  2. Merges 199's notes_sources URLs into 909's (dedup by URL).
  3. Deletes entity 199.

Usage:
    python scripts/merge_ftc_duplicate.py              # dry run
    python scripts/merge_ftc_duplicate.py --live       # apply
    python scripts/merge_ftc_duplicate.py -o LOG.md    # write report
"""

import argparse
import os
import re
import sys
from datetime import datetime, timezone

import psycopg2
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set", file=sys.stderr); sys.exit(1)

DUP_ID = 199
CANON_ID = 909


def extract_urls(text):
    """Pull http/https URLs out of a notes_sources blob."""
    if not text:
        return []
    return re.findall(r"https?://[^\s\)\]\}\"'<>,]+", text)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--live", action="store_true")
    parser.add_argument("-o", "--output", help="Write report")
    args = parser.parse_args()

    lines = []
    def out(line=""):
        lines.append(line); print(line)

    mode = "LIVE RUN" if args.live else "DRY RUN"
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    out(f"# Merge FTC duplicate (199 → 909) — {mode}")
    out(f"*{now}*")
    out()

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    # Sanity: both must exist
    cur.execute("SELECT id, name, enrichment_version FROM entity WHERE id IN (%s, %s)",
                (DUP_ID, CANON_ID))
    existing = {r[0]: r for r in cur.fetchall()}
    if DUP_ID not in existing or CANON_ID not in existing:
        out(f"ERROR: expected both {DUP_ID} and {CANON_ID} to exist. Got {existing}")
        return 1

    for eid, name, v in existing.values():
        out(f"- [{eid}] `{name}` ({v})")
    out()

    # Pull edges of the dup
    cur.execute("""
        SELECT id, source_id, target_id, edge_type, role, evidence, source_url
        FROM edge
        WHERE source_id = %s OR target_id = %s
        ORDER BY id
    """, (DUP_ID, DUP_ID))
    dup_edges = cur.fetchall()

    # Existing (source, target, edge_type) keys on canon side (after rewrite)
    cur.execute("""
        SELECT source_id, target_id, edge_type
        FROM edge
        WHERE source_id = %s OR target_id = %s
    """, (CANON_ID, CANON_ID))
    canon_keys = set((r[0], r[1], r[2]) for r in cur.fetchall())

    redirects = []      # (edge_id, new_source, new_target)
    collisions = []     # (edge_id, would-be key)
    for (eid, src, tgt, etype, role, evid, surl) in dup_edges:
        new_src = CANON_ID if src == DUP_ID else src
        new_tgt = CANON_ID if tgt == DUP_ID else tgt
        key = (new_src, new_tgt, etype)
        if key in canon_keys:
            collisions.append((eid, key))
        else:
            redirects.append((eid, new_src, new_tgt, etype, role))
            canon_keys.add(key)

    out("## Edge redirects")
    out()
    out(f"**{len(redirects)} will be redirected, {len(collisions)} collide with existing canon edges.**")
    out()
    out("| edge_id | new source → target | edge_type | role |")
    out("| ---: | --- | --- | --- |")
    for eid, ns, nt, etype, role in redirects:
        out(f"| {eid} | {ns} → {nt} | {etype} | {role or ''} |")
    out()
    if collisions:
        out("### Collisions (will be deleted instead of redirected)")
        out()
        for eid, key in collisions:
            out(f"- edge {eid} (would-be key {key})")
        out()

    # Notes_sources merge
    cur.execute("SELECT notes_sources FROM entity WHERE id = %s", (DUP_ID,))
    dup_sources = cur.fetchone()[0] or ""
    cur.execute("SELECT notes_sources FROM entity WHERE id = %s", (CANON_ID,))
    canon_sources = cur.fetchone()[0] or ""

    canon_urls = set(extract_urls(canon_sources))
    dup_urls = extract_urls(dup_sources)
    new_urls = [u for u in dup_urls if u not in canon_urls]

    out("## notes_sources merge")
    out()
    out(f"- canon URLs: {len(canon_urls)}")
    out(f"- dup URLs: {len(dup_urls)}")
    out(f"- new URLs to append: {len(new_urls)}")
    out()
    if new_urls:
        out("### URLs appended from 199:")
        out()
        for u in new_urls:
            out(f"- {u}")
        out()

    # Build merged_sources (simple: canon_sources + "\n" + any new URLs on their own line)
    if new_urls:
        merged_sources = (canon_sources.rstrip() + "\n\n" +
                          "\n".join(new_urls)).strip()
    else:
        merged_sources = canon_sources

    # Apply
    if args.live:
        # 1. redirects: update edges
        for eid, ns, nt, _, _ in redirects:
            cur.execute("""
                UPDATE edge SET source_id = %s, target_id = %s WHERE id = %s
            """, (ns, nt, eid))

        # 2. collisions: delete
        for eid, _ in collisions:
            cur.execute("DELETE FROM edge WHERE id = %s", (eid,))

        # 3. Merge notes_sources
        if new_urls:
            cur.execute("""
                UPDATE entity SET notes_sources = %s, updated_at = NOW()
                WHERE id = %s
            """, (merged_sources, CANON_ID))

        # 4. Delete dup entity (should have no edges left)
        cur.execute("""
            SELECT COUNT(*) FROM edge
            WHERE source_id = %s OR target_id = %s
        """, (DUP_ID, DUP_ID))
        remaining = cur.fetchone()[0]
        if remaining != 0:
            conn.rollback()
            out(f"ERROR: {remaining} edges still reference {DUP_ID}. Rollback.")
            return 1

        cur.execute("DELETE FROM entity WHERE id = %s", (DUP_ID,))
        conn.commit()

        # Verify
        cur.execute("""
            SELECT COUNT(*) FROM edge
            WHERE source_id = %s OR target_id = %s
        """, (CANON_ID, CANON_ID))
        canon_edges_after = cur.fetchone()[0]
        out("## Applied")
        out()
        out(f"- edges redirected: {len(redirects)}")
        out(f"- edges deleted (collisions): {len(collisions)}")
        out(f"- notes_sources URLs appended: {len(new_urls)}")
        out(f"- entity {DUP_ID} deleted")
        out(f"- entity {CANON_ID} now has {canon_edges_after} edges")
    else:
        out("---")
        out("*Dry run — no changes. Re-run with `--live` to apply.*")

    conn.close()
    if args.output:
        with open(args.output, "w") as f:
            f.write("\n".join(lines) + "\n")
        print(f"\nReport saved to {args.output}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
