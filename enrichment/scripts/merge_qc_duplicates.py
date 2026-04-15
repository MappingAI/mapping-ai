#!/usr/bin/env python3
"""
QC Phase 1 fix: merge 11 explicit duplicate entities flagged by
`logs/audits/qc-report-20260414.md`.

For each (dup_id → canon_id) pair this script:
  1. Redirects every edge touching `dup_id` to `canon_id`, dropping any
     redirect that would collide with an existing canon edge on
     (source_id, target_id, edge_type).
  2. Rewrites any entity whose `parent_org_id = dup_id` to point at
     `canon_id`.
  3. Merges `notes_sources` URLs from dup into canon (dedup by URL).
  4. Deletes the dup entity.

Pairs are applied in a single transaction. Dry-run by default.

Usage:
    python scripts/merge_qc_duplicates.py               # dry run
    python scripts/merge_qc_duplicates.py --live        # apply
    python scripts/merge_qc_duplicates.py -o LOG.md     # write report
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
    print("ERROR: DATABASE_URL not set", file=sys.stderr)
    sys.exit(1)

# (dup_id, canon_id, human-readable pair label)
MERGES = [
    (1445, 1376, "President Biden → Joe Biden"),
    (1354, 1353, "Rob Long → Robert Long"),
    (1470, 1149, "Bipartisan Taskforce on AI → House Bipartisan Task Force on AI"),
    (1238, 1420, "Pentagon → Department of Defense"),
    (1433, 1432, "AMI Labs → Advanced Machine Intelligence Labs"),
    (1467, 1150, "House Science, Space, and Technology Committee → House Committee on Science Space & Tech"),
    (1479, 1148, "Commerce, Science and Transportation Committee → Senate Committee on Commerce, Science and Transportation"),
    (1483, 1149, "House Task Force on Artificial Intelligence → House Bipartisan Task Force on AI"),
    (1484, 1481, "Congressional AI Caucus → Congressional Artificial Intelligence Caucus"),
    (1632, 875, "Distributed AI Research Institute → DAIR"),
    (1745, 128, "Open Philanthropy Project → Coefficient Giving"),
]


def extract_urls(text):
    if not text:
        return []
    return re.findall(r"https?://[^\s\)\]\}\"'<>,]+", text)


def merge_one(cur, dup_id, canon_id, out):
    """Execute one merge. Returns dict of counts."""
    # Pull entity rows for sanity
    cur.execute(
        "SELECT id, entity_type, name FROM entity WHERE id IN (%s, %s)",
        (dup_id, canon_id),
    )
    found = {r[0]: r for r in cur.fetchall()}
    if dup_id not in found or canon_id not in found:
        raise RuntimeError(
            f"Missing entity for merge {dup_id} → {canon_id}: got {list(found)}"
        )
    if found[dup_id][1] != found[canon_id][1]:
        raise RuntimeError(
            f"entity_type mismatch: {found[dup_id]} vs {found[canon_id]}"
        )
    out(f"- [{dup_id}] `{found[dup_id][2]}` → [{canon_id}] `{found[canon_id][2]}`")

    # Edges touching dup
    cur.execute(
        """
        SELECT id, source_id, target_id, edge_type, role
        FROM edge
        WHERE source_id = %s OR target_id = %s
        ORDER BY id
        """,
        (dup_id, dup_id),
    )
    dup_edges = cur.fetchall()

    # Existing canon edge keys
    cur.execute(
        """
        SELECT source_id, target_id, edge_type
        FROM edge
        WHERE source_id = %s OR target_id = %s
        """,
        (canon_id, canon_id),
    )
    canon_keys = set((r[0], r[1], r[2]) for r in cur.fetchall())

    redirects = []
    collisions = []
    self_loops = []
    for eid, src, tgt, etype, role in dup_edges:
        new_src = canon_id if src == dup_id else src
        new_tgt = canon_id if tgt == dup_id else tgt
        if new_src == new_tgt:
            # dup↔canon edge becomes a self-loop — drop it
            self_loops.append((eid, src, tgt, etype))
            continue
        key = (new_src, new_tgt, etype)
        if key in canon_keys:
            collisions.append((eid, key))
        else:
            redirects.append((eid, new_src, new_tgt))
            canon_keys.add(key)

    for eid, ns, nt in redirects:
        cur.execute(
            "UPDATE edge SET source_id = %s, target_id = %s WHERE id = %s",
            (ns, nt, eid),
        )
    for eid, _ in collisions:
        cur.execute("DELETE FROM edge WHERE id = %s", (eid,))
    for eid, _, _, _ in self_loops:
        cur.execute("DELETE FROM edge WHERE id = %s", (eid,))

    # parent_org_id pointers
    cur.execute(
        "SELECT id, name FROM entity WHERE parent_org_id = %s",
        (dup_id,),
    )
    child_rows = cur.fetchall()
    for cid, cname in child_rows:
        cur.execute(
            "UPDATE entity SET parent_org_id = %s, updated_at = NOW() WHERE id = %s",
            (canon_id, cid),
        )

    # Merge notes_sources URLs
    cur.execute(
        "SELECT notes_sources FROM entity WHERE id = %s", (dup_id,)
    )
    dup_sources = cur.fetchone()[0] or ""
    cur.execute(
        "SELECT notes_sources FROM entity WHERE id = %s", (canon_id,)
    )
    canon_sources = cur.fetchone()[0] or ""
    canon_urls = set(extract_urls(canon_sources))
    dup_urls = extract_urls(dup_sources)
    new_urls = [u for u in dup_urls if u not in canon_urls]
    if new_urls:
        merged = (canon_sources.rstrip() + "\n\n" + "\n".join(new_urls)).strip()
        cur.execute(
            "UPDATE entity SET notes_sources = %s, updated_at = NOW() WHERE id = %s",
            (merged, canon_id),
        )

    # Verify no edges still reference dup, then delete
    cur.execute(
        "SELECT COUNT(*) FROM edge WHERE source_id = %s OR target_id = %s",
        (dup_id, dup_id),
    )
    remaining = cur.fetchone()[0]
    if remaining != 0:
        raise RuntimeError(
            f"{remaining} edges still reference {dup_id} after redirect"
        )
    cur.execute("DELETE FROM entity WHERE id = %s", (dup_id,))

    out(
        f"    edges: {len(redirects)} redirected, "
        f"{len(collisions)} collided, "
        f"{len(self_loops)} self-loops dropped"
    )
    if child_rows:
        out(
            f"    parent_org_id rewritten on {len(child_rows)} child(ren): "
            + ", ".join(f"[{cid}] {cname}" for cid, cname in child_rows)
        )
    if new_urls:
        out(f"    notes_sources: appended {len(new_urls)} URL(s)")
    return {
        "redirects": len(redirects),
        "collisions": len(collisions),
        "self_loops": len(self_loops),
        "children": len(child_rows),
        "new_urls": len(new_urls),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--live", action="store_true")
    parser.add_argument("-o", "--output")
    args = parser.parse_args()

    lines = []

    def out(line=""):
        lines.append(line)
        print(line)

    mode = "LIVE RUN" if args.live else "DRY RUN"
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    out(f"# QC Phase 1: merge 11 explicit duplicates — {mode}")
    out(f"*{now}*")
    out()

    conn = psycopg2.connect(DATABASE_URL)
    # autocommit off so we can wrap all merges in one txn
    conn.autocommit = False
    cur = conn.cursor()

    totals = {"redirects": 0, "collisions": 0, "self_loops": 0, "children": 0, "new_urls": 0}
    try:
        for dup_id, canon_id, label in MERGES:
            out(f"## {label}")
            out()
            counts = merge_one(cur, dup_id, canon_id, out)
            for k in totals:
                totals[k] += counts[k]
            out()

        if args.live:
            conn.commit()
            out("## Applied")
        else:
            conn.rollback()
            out("## Dry run — rolled back")
        out()
        out(
            f"- edges redirected: {totals['redirects']}  \n"
            f"- edges dropped (collisions): {totals['collisions']}  \n"
            f"- edges dropped (self-loops): {totals['self_loops']}  \n"
            f"- parent_org_id rewrites: {totals['children']}  \n"
            f"- notes_sources URLs appended: {totals['new_urls']}  \n"
            f"- entities deleted: {len(MERGES) if args.live else 0}"
        )
    except Exception as e:
        conn.rollback()
        out(f"\nERROR: {e}\nTransaction rolled back; no changes applied.")
        conn.close()
        return 1

    conn.close()

    if args.output:
        with open(args.output, "w") as f:
            f.write("\n".join(lines) + "\n")
        print(f"\nReport saved to {args.output}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
