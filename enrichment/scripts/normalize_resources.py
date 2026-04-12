#!/usr/bin/env python3
"""
Phase 5A fix: normalize resource_category to the 9 canonical values.

Canonical list (from ONBOARDING.md):
    AI Safety, AI Governance, AI Capabilities, Labor & Economy,
    National Security, Industry Analysis, Policy Proposal,
    Technical, Philosophy/Ethics

Current non-canonical values (from gap analysis):
    "AI Policy" (52)                — all look like governance/policy content
    "AI Safety, Philosophy/Ethics" (2) — pick primary
    "AI Safety, Policy Proposal" (1)   — pick primary
    "Ethics" (1)                       — merge into Philosophy/Ethics
    "Media" (1)                        — Hard Fork podcast; reclassify to Industry Analysis

Usage:
    python scripts/normalize_resources.py                # dry run
    python scripts/normalize_resources.py --live         # apply
    python scripts/normalize_resources.py -o LOG.md      # write report
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
    print("ERROR: DATABASE_URL not set.", file=sys.stderr)
    sys.exit(1)


CANONICAL = {
    "AI Safety", "AI Governance", "AI Capabilities", "Labor & Economy",
    "National Security", "Industry Analysis", "Policy Proposal",
    "Technical", "Philosophy/Ethics",
}

# Exact-string mapping from legacy → canonical. Applied in order; the first
# match wins. Comma-joined values collapse to the stronger primary axis.
MAPPINGS = [
    ("AI Policy",                      "AI Governance"),
    ("AI Safety, Philosophy/Ethics",   "AI Safety"),
    ("AI Safety, Policy Proposal",     "AI Safety"),
    ("Ethics",                         "Philosophy/Ethics"),
    ("Media",                          "Industry Analysis"),
]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--live", action="store_true",
                        help="Apply changes (default is dry run)")
    parser.add_argument("-o", "--output", help="Write report to file")
    args = parser.parse_args()

    lines = []
    def out(line=""):
        lines.append(line); print(line)

    mode = "LIVE RUN" if args.live else "DRY RUN"
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    out(f"# Normalize resource_category — {mode}")
    out(f"*{now}*")
    out()

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    # Baseline
    cur.execute("""
        SELECT COALESCE(resource_category,'(NULL)'), COUNT(*)
        FROM entity WHERE entity_type='resource'
        GROUP BY 1 ORDER BY 2 DESC
    """)
    baseline = cur.fetchall()
    out("## Baseline distribution")
    out()
    out("| resource_category | count |")
    out("| --- | ---: |")
    for cat, n in baseline:
        marker = "" if cat in CANONICAL or cat == "(NULL)" else "  ← non-canonical"
        out(f"| {cat} | {n}{marker} |")
    out()

    # Proposed changes
    out("## Mapping applied")
    out()
    out("| From | → | To |")
    out("| --- | --- | --- |")
    for old, new in MAPPINGS:
        out(f"| {old} | → | {new} |")
    out()

    # Pull affected rows
    cur.execute("""
        SELECT id, name, resource_type, resource_category
        FROM entity
        WHERE entity_type='resource' AND resource_category = ANY(%s)
        ORDER BY resource_category, id
    """, ([old for old, _ in MAPPINGS],))
    rows = cur.fetchall()

    # Summary
    per_source = {}
    for _, _, _, cat in rows:
        per_source[cat] = per_source.get(cat, 0) + 1
    out("## Rows to update")
    out()
    out(f"**Total:** {len(rows)}")
    out()
    out("| From | rows |")
    out("| --- | ---: |")
    for old, _ in MAPPINGS:
        out(f"| {old} | {per_source.get(old, 0)} |")
    out()

    # Sample
    out("## Sample (first 20)")
    out()
    out("| id | type | name | from → to |")
    out("| ---: | --- | --- | --- |")
    mapping = dict(MAPPINGS)
    for eid, name, rtype, oldcat in rows[:20]:
        out(f"| {eid} | {rtype} | {name} | {oldcat} → {mapping[oldcat]} |")
    out()

    # Apply
    if args.live:
        n_updated = 0
        for old, new in MAPPINGS:
            cur.execute("""
                UPDATE entity
                SET resource_category = %s, updated_at = NOW()
                WHERE entity_type='resource' AND resource_category = %s
            """, (new, old))
            n_updated += cur.rowcount
        conn.commit()

        # After distribution
        cur.execute("""
            SELECT COALESCE(resource_category,'(NULL)'), COUNT(*)
            FROM entity WHERE entity_type='resource'
            GROUP BY 1 ORDER BY 2 DESC
        """)
        after = cur.fetchall()
        out("## After")
        out()
        out("| resource_category | count |")
        out("| --- | ---: |")
        for cat, n in after:
            marker = "" if cat in CANONICAL or cat == "(NULL)" else "  ← still non-canonical"
            out(f"| {cat} | {n}{marker} |")
        out()
        out(f"**Rows updated:** {n_updated}")
    else:
        out("---")
        out("*Dry run — no changes. Re-run with `--live` to apply.*")

    conn.close()

    if args.output:
        with open(args.output, "w") as f:
            f.write("\n".join(lines) + "\n")
        print(f"\nReport saved to {args.output}")


if __name__ == "__main__":
    main()
