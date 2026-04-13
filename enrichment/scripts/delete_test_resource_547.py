#!/usr/bin/env python3
"""
Phase 5 tail: delete test-data resource entity 547 ("The Hard Fork Podcast").

Background
----------
Entity 547 is a v1-era stub whose `notes` field is literally the string
"TEST DATA — NYT podcast, major public influence on AI perception". It
was the only resource in the `Industry Analysis` bucket and was
mis-categorized there by the Tier A normalization pass (old value
"Media" → "Industry Analysis"). The authors (Kevin Roose [878], Casey
Newton [4]) are already seeded as Journalist entities; the podcast
itself is not load-bearing for the map.

Two edges touch 547:
  * author   : [4] Casey Newton → [547]    (valid but orphaned post-delete)
  * employer : [4] Casey Newton → [547]    (structurally wrong — a
                person can't be "employed by" a podcast resource)

Both are deleted alongside the entity. Emptying the Industry Analysis
bucket is the intended outcome — see task_list.md Phase 5F/G tail.

Usage:
    python scripts/delete_test_resource_547.py              # dry run
    python scripts/delete_test_resource_547.py --live       # apply
    python scripts/delete_test_resource_547.py -o LOG.md    # write report
"""

import argparse
import os
import sys
from datetime import datetime, timezone

import psycopg2
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set", file=sys.stderr)
    sys.exit(1)

TARGET_ID = 547


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--live", action="store_true")
    parser.add_argument("-o", "--output", help="Write report")
    args = parser.parse_args()

    lines = []
    def out(line=""):
        lines.append(line)
        print(line)

    mode = "LIVE RUN" if args.live else "DRY RUN"
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    out(f"# Delete test-data resource [{TARGET_ID}] — {mode}")
    out(f"*{now}*")
    out()

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    # Snapshot entity
    cur.execute("""
        SELECT id, name, entity_type, resource_category, resource_type,
               resource_author, enrichment_version, notes
        FROM entity WHERE id = %s
    """, (TARGET_ID,))
    row = cur.fetchone()
    if not row:
        out(f"ERROR: entity {TARGET_ID} not found. Nothing to do.")
        conn.close()
        return

    out("## Entity to delete")
    out()
    out("| field | value |")
    out("| --- | --- |")
    out(f"| id | {row[0]} |")
    out(f"| name | {row[1]} |")
    out(f"| entity_type | {row[2]} |")
    out(f"| resource_category | {row[3]} |")
    out(f"| resource_type | {row[4]} |")
    out(f"| resource_author | {row[5]} |")
    out(f"| enrichment_version | {row[6]} |")
    out(f"| notes | `{row[7]}` |")
    out()

    # Snapshot edges
    cur.execute("""
        SELECT e.id, e.edge_type, e.role, e.source_id, s.name,
               e.target_id, t.name
        FROM edge e
        JOIN entity s ON s.id = e.source_id
        JOIN entity t ON t.id = e.target_id
        WHERE e.source_id = %s OR e.target_id = %s
        ORDER BY e.id
    """, (TARGET_ID, TARGET_ID))
    edges = cur.fetchall()
    out(f"## Edges to delete ({len(edges)})")
    out()
    if edges:
        out("| edge_id | type | role | source | → | target |")
        out("| ---: | --- | --- | --- | --- | --- |")
        for e in edges:
            out(f"| {e[0]} | {e[1]} | {e[2] or ''} | [{e[3]}] {e[4]} | → | [{e[5]}] {e[6]} |")
    out()

    # Industry Analysis bucket count before/after
    cur.execute("""
        SELECT COUNT(*) FROM entity
        WHERE entity_type='resource' AND resource_category='Industry Analysis'
    """)
    ia_before = cur.fetchone()[0]
    out(f"Industry Analysis bucket before: **{ia_before}** → after: **{ia_before - 1}**")
    out()

    if args.live:
        cur.execute("DELETE FROM edge WHERE source_id = %s OR target_id = %s",
                    (TARGET_ID, TARGET_ID))
        edges_deleted = cur.rowcount
        cur.execute("DELETE FROM entity WHERE id = %s", (TARGET_ID,))
        entity_deleted = cur.rowcount
        conn.commit()
        out(f"[OK] Deleted {edges_deleted} edge(s) and {entity_deleted} entity row.")
        out()
    else:
        out("*Dry run — no deletes executed.*")
        out()

    conn.close()

    if args.output:
        with open(args.output, "w") as f:
            f.write("\n".join(lines) + "\n")
        print(f"\nReport saved to {args.output}")


if __name__ == "__main__":
    main()
