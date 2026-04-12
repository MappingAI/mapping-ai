#!/usr/bin/env python3
"""
Phase 4C.1: Zero-API source_url backfill for edges.

Currently 0/2221 edges have a source_url. This script populates source_url
from existing data in the DB — no web requests, no LLM calls:

  1. If target is a resource with resource_url → use that
  2. Elif target is an org with website → use that
  3. Elif source is an org with website → use that
  4. Else: leave NULL (can't backfill cheaply)

The resulting source_url is a best-effort general pointer (usually the
target org's homepage), not necessarily the specific page that documents
the edge. Subsequent passes can do targeted upgrades for high-value edges.

Usage:
    python scripts/backfill_source_urls.py              # dry run (default)
    python scripts/backfill_source_urls.py --live       # apply
    python scripts/backfill_source_urls.py -o FILE      # write report to file
"""

import argparse
import os
import sys
from datetime import datetime, timezone

import psycopg2
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(env_path)

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set in .env", file=sys.stderr)
    sys.exit(1)


def get_connection():
    return psycopg2.connect(DATABASE_URL)


def normalize_url(url):
    """Basic URL hygiene — ensure scheme, strip whitespace. Does NOT re-write."""
    if not url:
        return None
    u = url.strip()
    if not u:
        return None
    # If it looks like a domain without scheme, prepend https://
    if not u.startswith(("http://", "https://")):
        u = "https://" + u
    return u


def fetch_backfill_candidates(conn):
    """Return edges missing source_url + source/target metadata needed to fill them."""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT e.id, e.edge_type,
                   s.id, s.entity_type, s.website,
                   t.id, t.entity_type, t.website, t.resource_url
            FROM edge e
            JOIN entity s ON e.source_id = s.id
            JOIN entity t ON e.target_id = t.id
            WHERE e.source_url IS NULL OR e.source_url = ''
            ORDER BY e.id
        """)
        return cur.fetchall()


def pick_url(row):
    """
    Decide a source_url for this edge based on available data.
    Returns (url, strategy_name) or (None, 'unfilled').
    """
    (eid, etype, sid, stype, swebsite, tid, ttype, twebsite, tresource_url) = row

    # 1. Target is a resource → use its resource_url
    if ttype == "resource":
        u = normalize_url(tresource_url)
        if u:
            return u, "target_resource_url"

    # 2. Target is an organization with a website
    if ttype == "organization":
        u = normalize_url(twebsite)
        if u:
            return u, "target_website"

    # 3. Source is an organization with a website (common for org→person edges)
    if stype == "organization":
        u = normalize_url(swebsite)
        if u:
            return u, "source_website"

    # No simple zero-cost fill
    return None, "unfilled"


def main():
    parser = argparse.ArgumentParser(
        description="Backfill edge.source_url from entity.website / resource_url"
    )
    parser.add_argument("--live", action="store_true",
                        help="Apply changes (default is dry run)")
    parser.add_argument("-o", "--output", help="Write report to file")
    args = parser.parse_args()

    lines = []
    def out(line=""):
        lines.append(line)
        print(line)

    conn = get_connection()
    mode = "LIVE RUN" if args.live else "DRY RUN"
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    out(f"# Source URL Backfill — {mode}")
    out(f"*{now}*")
    out()

    # Fetch baseline stats
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM edge")
        total_edges = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM edge WHERE source_url IS NOT NULL AND source_url != ''")
        already_filled = cur.fetchone()[0]

    out(f"**Total edges:** {total_edges}")
    out(f"**Already filled:** {already_filled}")
    out(f"**Candidates (NULL source_url):** {total_edges - already_filled}")
    out()

    candidates = fetch_backfill_candidates(conn)

    # Classify each
    fills = []  # (edge_id, edge_type, url, strategy)
    strategy_counts = {"target_resource_url": 0, "target_website": 0,
                       "source_website": 0, "unfilled": 0}
    edge_type_strategy = {}  # edge_type → {strategy: count}

    for row in candidates:
        eid, etype = row[0], row[1]
        url, strat = pick_url(row)
        strategy_counts[strat] = strategy_counts.get(strat, 0) + 1
        edge_type_strategy.setdefault(etype, {}).setdefault(strat, 0)
        edge_type_strategy[etype][strat] += 1
        if url:
            fills.append((eid, etype, url, strat))

    out("## Coverage by Strategy")
    out()
    out("| Strategy | Count |")
    out("| -------- | ----: |")
    for strat in ["target_resource_url", "target_website", "source_website", "unfilled"]:
        out(f"| {strat} | {strategy_counts.get(strat, 0)} |")
    out()
    filled_total = len(fills)
    out(f"**Would fill:** {filled_total} / {len(candidates)} "
        f"({100*filled_total/len(candidates):.1f}%)")
    out()

    # Breakdown by edge_type
    out("## Yield by Edge Type")
    out()
    out("| edge_type | filled | unfilled | fill % |")
    out("| --------- | -----: | -------: | -----: |")
    all_strats = ["target_resource_url", "target_website", "source_website"]
    for etype in sorted(edge_type_strategy.keys()):
        counts = edge_type_strategy[etype]
        filled = sum(counts.get(s, 0) for s in all_strats)
        unfilled = counts.get("unfilled", 0)
        total = filled + unfilled
        pct = 100 * filled / total if total else 0
        out(f"| {etype} | {filled} | {unfilled} | {pct:.1f}% |")
    out()

    # Sample fills (first 10)
    out("## Sample Fills (first 10)")
    out()
    out("| edge_id | edge_type | strategy | url |")
    out("| ------: | --------- | -------- | --- |")
    for eid, etype, url, strat in fills[:10]:
        shown = url if len(url) < 80 else url[:77] + "..."
        out(f"| {eid} | {etype} | {strat} | {shown} |")
    out()

    # Unfilled breakdown: which edge types are hardest?
    unfilled_rows = [(row[0], row[1]) for row in candidates
                     if pick_url(row)[0] is None]
    unfilled_by_type = {}
    for eid, etype in unfilled_rows:
        unfilled_by_type[etype] = unfilled_by_type.get(etype, 0) + 1
    out("## Unfilled Breakdown (zero-cost strategies exhausted)")
    out()
    out("| edge_type | unfilled count |")
    out("| --------- | -------------: |")
    for etype in sorted(unfilled_by_type, key=lambda k: -unfilled_by_type[k]):
        out(f"| {etype} | {unfilled_by_type[etype]} |")
    out()

    # Apply
    if args.live:
        out("## Results")
        out()
        with conn.cursor() as cur:
            for eid, _, url, _ in fills:
                cur.execute("UPDATE edge SET source_url = %s WHERE id = %s",
                            (url, eid))
        conn.commit()

        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM edge WHERE source_url IS NOT NULL AND source_url != ''")
            after_filled = cur.fetchone()[0]

        out(f"**Updated:** {filled_total} edges")
        out(f"**Total filled after run:** {after_filled} / {total_edges} "
            f"({100*after_filled/total_edges:.1f}%)")
    else:
        out("---")
        out("*Dry run — no changes applied. Run with `--live` to execute.*")

    conn.close()

    if args.output:
        with open(args.output, "w") as f:
            f.write("\n".join(lines) + "\n")
        print(f"\nReport saved to {args.output}")


if __name__ == "__main__":
    main()
