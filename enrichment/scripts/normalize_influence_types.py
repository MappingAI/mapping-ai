#!/usr/bin/env python3
"""
Phase 5A fix: normalize entity.influence_type tokens to the 9 canonical values.

Canonical influence types (ONBOARDING.md):
    Decision-maker, Advisor/strategist, Researcher/analyst, Funder/investor,
    Builder, Organizer/advocate, Narrator, Implementer, Connector/convener

influence_type is a comma-separated string. The script:
  1. splits on commas
  2. maps each non-canonical token through a hardcoded mapping
  3. deduplicates in order
  4. rejoins with ", " (fixing spacing while we're at it)
  5. UPDATEs the row only if the normalized value differs

Usage:
    python scripts/normalize_influence_types.py                 # dry run
    python scripts/normalize_influence_types.py --live          # apply
    python scripts/normalize_influence_types.py -o LOG.md       # report
"""

import argparse
import os
import sys
from collections import Counter
from datetime import datetime, timezone

import psycopg2
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set.", file=sys.stderr)
    sys.exit(1)


CANONICAL = [
    "Decision-maker", "Advisor/strategist", "Researcher/analyst",
    "Funder/investor", "Builder", "Organizer/advocate",
    "Narrator", "Implementer", "Connector/convener",
]
CANONICAL_SET = set(CANONICAL)

# Legacy token → canonical token. Applied only to non-canonical values.
# Reasoning notes in parens.
TOKEN_MAP = {
    # Decision-maker: legislators, regulators, corporate leaders, heads of orgs
    "Electoral":               "Decision-maker",        # elected official
    "Legislative":             "Decision-maker",
    "Institutional leader":    "Decision-maker",
    "Corporate leader":        "Decision-maker",
    "Institutional governance":"Decision-maker",

    # Researcher/analyst
    "Researcher":              "Researcher/analyst",
    "Research":                "Researcher/analyst",
    "Researcher/engineer":     "Researcher/analyst",    # lead token = researcher

    # Builder: technical development
    "Technical leader":        "Builder",

    # Implementer: deploying/operationalizing
    "Operations":              "Implementer",
    "Technical implementation":"Implementer",

    # Advisor/strategist
    "Advisor":                 "Advisor/strategist",

    # Funder/investor
    "Investor":                "Funder/investor",
    "Funder":                  "Funder/investor",
    "Funding":                 "Funder/investor",

    # Organizer/advocate
    "Policy advocate":         "Organizer/advocate",

    # Connector/convener
    "Convener":                "Connector/convener",

    # Narrator: thought leadership, public commentary, teaching
    "Thought leader":          "Narrator",
    "Thought-leader":          "Narrator",
    "Thought leadership":      "Narrator",
    "Public intellectual":     "Narrator",
    "Educator":                "Narrator",
}


def normalize(raw: str) -> str:
    """Split on commas, map tokens, dedupe, rejoin."""
    seen = []
    for piece in raw.split(","):
        tok = piece.strip()
        if not tok:
            continue
        mapped = TOKEN_MAP.get(tok, tok)
        if mapped not in seen:
            seen.append(mapped)
    return ", ".join(seen)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--live", action="store_true")
    parser.add_argument("-o", "--output", help="Write report to file")
    args = parser.parse_args()

    lines = []
    def out(line=""):
        lines.append(line); print(line)

    mode = "LIVE RUN" if args.live else "DRY RUN"
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    out(f"# Normalize influence_type — {mode}")
    out(f"*{now}*")
    out()

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    cur.execute("""
        SELECT id, name, influence_type
        FROM entity
        WHERE entity_type='person' AND influence_type IS NOT NULL
        ORDER BY id
    """)
    rows = cur.fetchall()

    # Baseline token counts
    token_counts = Counter()
    for _, _, s in rows:
        for p in s.split(","):
            t = p.strip()
            if t:
                token_counts[t] += 1

    out("## Baseline token counts (non-canonical only)")
    out()
    out("| token | count |")
    out("| --- | ---: |")
    for t, n in sorted(token_counts.items(), key=lambda kv: -kv[1]):
        if t not in CANONICAL_SET:
            out(f"| {t} | {n} |")
    out()

    # Mapping
    out("## Token mapping applied")
    out()
    out("| from | → | to |")
    out("| --- | --- | --- |")
    for old, new in TOKEN_MAP.items():
        out(f"| {old} | → | {new} |")
    out()

    # Compute diffs
    changes = []  # (id, name, before, after)
    for eid, name, raw in rows:
        normalized = normalize(raw)
        if normalized != raw:
            changes.append((eid, name, raw, normalized))

    out(f"## Rows that would change: {len(changes)}")
    out()
    if changes:
        out("### Sample (first 30)")
        out()
        out("| id | name | before | after |")
        out("| ---: | --- | --- | --- |")
        for eid, name, before, after in changes[:30]:
            out(f"| {eid} | {name} | {before} | {after} |")
        out()

    # Apply
    if args.live and changes:
        for eid, _, _, after in changes:
            cur.execute("""
                UPDATE entity SET influence_type = %s, updated_at = NOW()
                WHERE id = %s
            """, (after, eid))
        conn.commit()
        out(f"## Applied — {len(changes)} rows updated")
        out()

        # Verify no non-canonical tokens remain
        cur.execute("""
            SELECT influence_type FROM entity
            WHERE entity_type='person' AND influence_type IS NOT NULL
        """)
        remaining = Counter()
        for (s,) in cur.fetchall():
            for p in s.split(","):
                t = p.strip()
                if t and t not in CANONICAL_SET:
                    remaining[t] += 1
        if remaining:
            out("### ⚠️ Non-canonical tokens STILL present:")
            out()
            out("| token | count |")
            out("| --- | ---: |")
            for t, n in remaining.most_common():
                out(f"| {t} | {n} |")
        else:
            out("All influence_type tokens are canonical. ✓")
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
