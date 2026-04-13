#!/usr/bin/env python3
"""
Phase 5F/G tail — verify Investor category tagging for Hoffman,
Andreessen, Thiel, Khosla, and fill the primary_org metadata gap for
the two v1-era rows that were missing it.

Scope: category audit of existing entities only. No new edges, no new
entities. Edge-coverage gaps surfaced during the audit are logged as
Discovered Work in docs/task_list.md.

Findings (read-only verification):
  * [3]   Marc Andreessen   — category=Investor, primary_org=a16z ✓
  * [38]  Peter Thiel       — category=Investor, primary_org=Founders Fund ✓
  * [848] Reid Hoffman      — category=Investor, primary_org=NULL (fix)
  * [849] Vinod Khosla      — category=Investor, primary_org=NULL (fix)

All four already carry `Funder/investor` as the leading influence_type.

Fixes (two rows):
  * 848 Hoffman  → primary_org = "Greylock Partners"   (active investor role,
                   partner since 2009; consistent with existing title)
  * 849 Khosla   → primary_org = "Khosla Ventures"     (founder of the firm,
                   consistent with existing title)

Usage:
    python scripts/audit_investor_tagging.py              # dry run + report
    python scripts/audit_investor_tagging.py --live       # apply primary_org
    python scripts/audit_investor_tagging.py -o LOG.md    # write report
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


INVESTORS = [
    (3,   "Marc Andreessen"),
    (38,  "Peter Thiel"),
    (848, "Reid Hoffman"),
    (849, "Vinod Khosla"),
]

PRIMARY_ORG_FIXES = {
    848: "Greylock Partners",
    849: "Khosla Ventures",
}


def audit(live: bool, out):
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    out("## Category audit")
    out()
    out("| id | name | category | primary_org | influence_type (head) | enrichment_version |")
    out("| ---: | --- | --- | --- | --- | --- |")

    before = {}
    for eid, _ in INVESTORS:
        cur.execute("""
            SELECT id, name, category, primary_org, influence_type, enrichment_version
            FROM entity WHERE id = %s
        """, (eid,))
        row = cur.fetchone()
        before[eid] = row
        head_infl = (row[4] or "").split(",")[0].strip()
        po = row[3] if row[3] else "_NULL_"
        out(f"| {row[0]} | {row[1]} | {row[2]} | {po} | {head_infl} | {row[5]} |")

    out()
    # Sanity checks
    all_investor = all(row[2] == "Investor" for row in before.values())
    all_funder = all(
        (row[4] or "").lower().startswith("funder/investor")
        for row in before.values()
    )
    out(f"- All four tagged `category=Investor`: **{all_investor}**")
    out(f"- All four lead `influence_type` with `Funder/investor`: **{all_funder}**")
    out()

    out("## primary_org backfill")
    out()
    out("| id | name | before | after |")
    out("| ---: | --- | --- | --- |")
    for eid, new_po in PRIMARY_ORG_FIXES.items():
        row = before[eid]
        out(f"| {eid} | {row[1]} | {row[3] or '_NULL_'} | {new_po} |")
    out()

    if live:
        for eid, new_po in PRIMARY_ORG_FIXES.items():
            cur.execute("""
                UPDATE entity
                SET primary_org = %s,
                    updated_at = NOW()
                WHERE id = %s
                  AND (primary_org IS NULL OR primary_org = '')
            """, (new_po, eid))
            out(f"[OK] UPDATE {eid} — rows affected: {cur.rowcount}")
        conn.commit()
        out()
    else:
        out("*Dry run — primary_org not modified.*")
        out()

    # Edge-coverage notes (surfaced, not fixed)
    out("## Discovered edge-coverage gaps (logged for future seeding, not fixed here)")
    out()
    cur.execute("""
        SELECT e.edge_type, e.role, t.name
        FROM edge e
        JOIN entity t ON t.id = e.target_id
        WHERE e.source_id = 849
        ORDER BY e.edge_type
    """)
    khosla_edges = cur.fetchall()
    out(f"- **[849] Vinod Khosla** has {len(khosla_edges)} outgoing edge(s): "
        f"{', '.join(f'{r[0]}→{r[2]}' for r in khosla_edges) or 'none'}. "
        "Thin coverage for a major AI investor (Khosla Ventures is the "
        "largest outside investor in OpenAI). No funder edge to OpenAI or "
        "other portfolio AI cos — candidate for a future seeding pass.")
    cur.execute("""
        SELECT COUNT(*) FROM edge
        WHERE source_id = 848 AND edge_type = 'funder'
    """)
    hoffman_funder_n = cur.fetchone()[0]
    out(f"- **[848] Reid Hoffman** has {hoffman_funder_n} `funder` edge(s). "
        "Missing funder edges to Greylock portfolio (OpenAI, Inflection AI) "
        "and to orgs he co-founded. Candidate for future seeding pass.")
    out()

    conn.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--live", action="store_true")
    parser.add_argument("-o", "--output", help="Write report to file")
    args = parser.parse_args()

    lines = []
    def out(line=""):
        lines.append(line)
        print(line)

    mode = "LIVE RUN" if args.live else "DRY RUN"
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    out(f"# Investor tagging audit — {mode}")
    out(f"*{now}*")
    out()

    audit(args.live, out)

    if args.output:
        with open(args.output, "w") as f:
            f.write("\n".join(lines) + "\n")
        print(f"\nReport saved to {args.output}")


if __name__ == "__main__":
    main()
