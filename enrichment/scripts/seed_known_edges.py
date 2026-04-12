#!/usr/bin/env python3
"""
Phase 5A fix: add a small batch of structural leadership edges where both
persons and orgs are already in the DB — pure INSERT, no new entities.

This is the zero-token leftover from the Phase 5 gap analysis: 9 leaders
were already present, 6 of their expected edges already exist, and 3 are
genuinely missing. This script adds those 3.

Usage:
    python scripts/seed_known_edges.py              # dry run
    python scripts/seed_known_edges.py --live       # apply
    python scripts/seed_known_edges.py -o LOG.md    # report
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
    print("ERROR: DATABASE_URL not set", file=sys.stderr); sys.exit(1)

CREATED_BY = "phase5a-known-edges"
CONFIDENCE = 4  # high: these are well-documented public roles

# (source_id, source_name, target_id, target_name, edge_type, role, is_primary, evidence, source_url)
EDGES = [
    (30,   "Paul Christiano",
     205,  "U.S. AI Safety Institute (NIST)",
     "employer", "Head of AI Safety", False,
     "Paul Christiano joined the U.S. AI Safety Institute at NIST in April 2024 as Head of AI Safety.",
     "https://www.nist.gov/artificial-intelligence"),

    (1394, "Thomas Larsen",
     443,  "Center for AI Policy (CAIP)",
     "employer", "Director of Policy", False,
     "Thomas Larsen serves as Director of Policy at the Center for AI Policy, the advocacy arm focused on frontier-AI legislation.",
     "https://aipolicy.us/"),

    (929,  "Alan Davidson",
     914,  "Department of Commerce",
     "member", "Assistant Secretary for Communications and Information / Administrator of NTIA", False,
     "Alan Davidson led the National Telecommunications and Information Administration (NTIA), a Commerce sub-agency, during the Biden administration; NTIA produced the AI Accountability RFC and AI Open Model Weights report.",
     "https://www.ntia.gov/"),
]


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
    out(f"# Seed known leadership edges — {mode}")
    out(f"*{now}*")
    out()
    out(f"- `created_by`: `{CREATED_BY}`")
    out(f"- `confidence`: {CONFIDENCE}")
    out()

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    # Verify all pairs exist and no edge already in place
    to_insert = []
    skipped = []
    for (sid, sname, tid, tname, etype, role, is_primary, evidence, surl) in EDGES:
        cur.execute("SELECT name FROM entity WHERE id=%s", (sid,))
        s_row = cur.fetchone()
        cur.execute("SELECT name FROM entity WHERE id=%s", (tid,))
        t_row = cur.fetchone()
        if not s_row or not t_row:
            skipped.append((sid, tid, etype, "entity missing"))
            continue
        # Exact duplicate check
        cur.execute("""
            SELECT id, role FROM edge
            WHERE source_id=%s AND target_id=%s AND edge_type=%s
        """, (sid, tid, etype))
        existing = cur.fetchone()
        if existing:
            skipped.append((sid, tid, etype, f"exists (edge {existing[0]}, role={existing[1]})"))
            continue
        to_insert.append((sid, sname, tid, tname, etype, role, is_primary, evidence, surl))

    out("## Plan")
    out()
    out(f"- Candidate edges: {len(EDGES)}")
    out(f"- To insert: {len(to_insert)}")
    out(f"- Skipped: {len(skipped)}")
    out()
    if to_insert:
        out("### Will insert")
        out()
        out("| source | → target | edge_type | role |")
        out("| --- | --- | --- | --- |")
        for sid, sname, tid, tname, etype, role, *_ in to_insert:
            out(f"| [{sid}] {sname} | [{tid}] {tname} | {etype} | {role} |")
        out()
    if skipped:
        out("### Skipped")
        out()
        for sid, tid, etype, why in skipped:
            out(f"- {sid} → {tid} ({etype}): {why}")
        out()

    if args.live and to_insert:
        for (sid, _, tid, _, etype, role, is_primary, evidence, surl) in to_insert:
            cur.execute("""
                INSERT INTO edge (source_id, target_id, edge_type, role,
                                  is_primary, evidence, source_url,
                                  confidence, created_by)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (sid, tid, etype, role, is_primary, evidence, surl,
                  CONFIDENCE, CREATED_BY))
        conn.commit()
        out(f"## Applied — {len(to_insert)} edges inserted")
        out()
    elif not args.live:
        out("---")
        out("*Dry run — no changes. Re-run with `--live` to apply.*")

    conn.close()
    if args.output:
        with open(args.output, "w") as f:
            f.write("\n".join(lines) + "\n")
        print(f"\nReport saved to {args.output}")


if __name__ == "__main__":
    main()
