#!/usr/bin/env python3
"""
Phase 4C.2b prep: pull all edges still missing source_url + full context
needed for a Sonnet subagent to research and propose evidence URLs.

Output: enrichment/tmp/source_url_batches/batch_NN.json
    Each batch is a list of edge dicts with everything an agent needs
    without re-querying the DB.

Usage:
    python scripts/source_url_llm_prepare.py                     # default batch size 15
    python scripts/source_url_llm_prepare.py --batch-size 10
    python scripts/source_url_llm_prepare.py --edge-type author  # filter to one type
    python scripts/source_url_llm_prepare.py --limit 30          # cap total edges

After running, spawn one Sonnet subagent per batch file.
"""

import argparse
import json
import os
import sys
from pathlib import Path

import psycopg2
from dotenv import load_dotenv

env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set", file=sys.stderr)
    sys.exit(1)

OUT_DIR = Path(__file__).parent.parent / "tmp" / "source_url_batches"


def fetch_unfilled(conn, edge_type=None, limit=None):
    """Return unfilled edges with full context for LLM research."""
    where = ["(e.source_url IS NULL OR e.source_url = '')"]
    params = []
    if edge_type:
        where.append("e.edge_type = %s")
        params.append(edge_type)

    sql = f"""
        SELECT e.id, e.edge_type, e.role, e.evidence,
               s.id, s.name, s.entity_type, s.category, s.website,
               LEFT(COALESCE(s.notes,''), 400)  AS s_notes,
               t.id, t.name, t.entity_type, t.category, t.website,
               LEFT(COALESCE(t.notes,''), 400)  AS t_notes,
               t.resource_url, t.resource_title, t.resource_author, t.resource_year
        FROM edge e
        JOIN entity s ON e.source_id = s.id
        JOIN entity t ON e.target_id = t.id
        WHERE {' AND '.join(where)}
        ORDER BY e.edge_type, e.id
    """
    if limit:
        sql += " LIMIT %s"
        params.append(limit)

    with conn.cursor() as cur:
        cur.execute(sql, params)
        rows = cur.fetchall()

    records = []
    for r in rows:
        records.append({
            "edge_id":   r[0],
            "edge_type": r[1],
            "role":      r[2],
            "evidence":  r[3],
            "source": {
                "id":       r[4],  "name":     r[5],
                "type":     r[6],  "category": r[7],
                "website":  r[8],  "notes_excerpt": r[9],
            },
            "target": {
                "id":       r[10], "name":     r[11],
                "type":     r[12], "category": r[13],
                "website":  r[14], "notes_excerpt": r[15],
                "resource_url":    r[16],
                "resource_title":  r[17],
                "resource_author": r[18],
                "resource_year":   r[19],
            },
        })
    return records


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch-size", type=int, default=15)
    parser.add_argument("--edge-type", default=None,
                        help="Filter to one edge_type (e.g., author, founder)")
    parser.add_argument("--limit", type=int, default=None,
                        help="Cap total edges (for pilot runs)")
    parser.add_argument("--out-dir", default=str(OUT_DIR))
    args = parser.parse_args()

    conn = psycopg2.connect(DATABASE_URL)
    try:
        records = fetch_unfilled(conn, edge_type=args.edge_type, limit=args.limit)
    finally:
        conn.close()

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    # Wipe existing batch files so we don't mix old/new runs
    for f in out_dir.glob("batch_*.json"):
        f.unlink()

    print(f"Unfilled edges: {len(records)}")
    if not records:
        print("Nothing to do.")
        return

    bs = args.batch_size
    n = (len(records) + bs - 1) // bs
    for i in range(n):
        chunk = records[i*bs:(i+1)*bs]
        path = out_dir / f"batch_{i+1:02d}.json"
        path.write_text(json.dumps(chunk, indent=2, ensure_ascii=False))
        print(f"  {path.name}: {len(chunk)} edges")

    # Summary of distribution
    by_type = {}
    for r in records:
        by_type[r["edge_type"]] = by_type.get(r["edge_type"], 0) + 1
    print("\nBy edge_type:")
    for t in sorted(by_type, key=lambda k: -by_type[k]):
        print(f"  {t}: {by_type[t]}")

    print(f"\n{n} batches written to {out_dir}")


if __name__ == "__main__":
    main()
