#!/usr/bin/env python3
"""
Phase 4.2: Fix reversed edge directions for canonical edge types.

Handles the clear automatic cases found during direction audit:
  - advisor edges where source is an org and target is a person (reversed)
    → flip source/target (person → org is the canonical direction)

Everything else (person→person founder, person→person employer, org→org advisor)
is reported for manual review — too ambiguous to fix automatically.

Usage:
    python scripts/fix_edge_directions.py              # report only
    python scripts/fix_edge_directions.py --dry-run    # preview fixes
    python scripts/fix_edge_directions.py --live       # apply fixes
"""

import argparse
import os
import sys

import psycopg2
from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(env_path)

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set in .env", file=sys.stderr)
    sys.exit(1)

# Expected directions: (src_entity_type, tgt_entity_type) or None = any
CANONICAL_DIRECTIONS = {
    "employer":       ("person",       "organization"),
    "founder":        ("person",       "organization"),
    "parent_company": ("organization", "organization"),
    "advisor":        ("person",       None),
    "member":         ("person",       "organization"),
    "author":         ("person",       "resource"),
    "publisher":      ("organization", "resource"),
    "critic":         ("person",       None),
    "supporter":      ("person",       None),
}


# ---------------------------------------------------------------------------
# DB
# ---------------------------------------------------------------------------

def get_connection():
    return psycopg2.connect(DATABASE_URL)


def fetch_violations(conn):
    """Return edges that violate canonical direction rules."""
    violations = []
    with conn.cursor() as cur:
        for etype, (exp_src, exp_tgt) in CANONICAL_DIRECTIONS.items():
            conditions = [f"e.edge_type = '{etype}'"]
            if exp_src:
                conditions.append(f"s.entity_type != '{exp_src}'")
            if exp_tgt:
                conditions.append(f"t.entity_type != '{exp_tgt}'")

            cur.execute(f"""
                SELECT e.id, e.edge_type, e.role, e.evidence,
                       s.id, s.name, s.entity_type, s.category,
                       t.id, t.name, t.entity_type, t.category
                FROM edge e
                JOIN entity s ON e.source_id = s.id
                JOIN entity t ON e.target_id = t.id
                WHERE {' AND '.join(conditions)}
                ORDER BY e.id
            """)
            for row in cur.fetchall():
                violations.append((etype, row))

    return violations


def flip_edge(conn, edge_id, dry_run):
    """Swap source_id and target_id for an edge."""
    if dry_run:
        return
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE edge
            SET source_id = target_id,
                target_id = source_id
            WHERE id = %s
        """, (edge_id,))
    conn.commit()


# ---------------------------------------------------------------------------
# Classification of violations
# ---------------------------------------------------------------------------

def is_auto_fixable(etype, row):
    """
    Returns True if this violation is safe to flip automatically.
    Currently: advisor edges where org→person (clearly reversed).
    """
    _, _, role, evidence, sid, sname, stype, scat, tid, tname, ttype, tcat = row
    return etype == "advisor" and stype == "organization" and ttype == "person"


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Fix reversed edge directions for canonical edge types"
    )
    parser.add_argument("--dry-run", action="store_true",
                        help="Show what would change without writing to DB")
    parser.add_argument("--live", action="store_true",
                        help="Apply fixes to DB")
    args = parser.parse_args()

    if args.live and args.dry_run:
        print("ERROR: --live and --dry-run are mutually exclusive", file=sys.stderr)
        sys.exit(1)

    write_mode = args.live and not args.dry_run

    conn = get_connection()
    violations = fetch_violations(conn)

    auto_fix = [(et, row) for et, row in violations if is_auto_fixable(et, row)]
    manual = [(et, row) for et, row in violations if not is_auto_fixable(et, row)]

    print()
    print("=" * 70)
    print(f"  Edge direction audit — {len(violations)} violations total")
    print("=" * 70)
    print()
    print(f"  Auto-fixable (safe to flip):  {len(auto_fix)}")
    print(f"  Manual review needed:         {len(manual)}")
    print()

    if auto_fix:
        print("  AUTO-FIX: reversed advisor edges (org→person → person→org)")
        print()
        for etype, row in auto_fix:
            eid, _, role, _, sid, sname, stype, _, tid, tname, ttype, _ = row
            r = f"  [{role}]" if role else ""
            print(f"  [{eid}] FLIP: {sname} ({stype}) → {tname} ({ttype}){r}")
            print(f"         → {tname} ({ttype}) → {sname} ({stype})")
        print()

    if manual:
        print("  MANUAL REVIEW (not auto-fixed):")
        print()
        by_type = {}
        for etype, row in manual:
            by_type.setdefault(etype, []).append(row)

        for etype, rows in sorted(by_type.items()):
            exp_src, exp_tgt = CANONICAL_DIRECTIONS.get(etype, (None, None))
            exp_str = f"expected {exp_src or '*'} → {exp_tgt or '*'}"
            print(f"  {etype} ({len(rows)} edges, {exp_str}):")
            for row in rows:
                eid, _, role, _, sid, sname, stype, scat, tid, tname, ttype, tcat = row
                r = f"  [{role}]" if role else ""
                print(f"    [{eid}] {sname} ({stype}) → {tname} ({ttype}){r}")
            print()

    if not (args.dry_run or args.live):
        print("  Run with --dry-run to preview or --live to apply auto-fixes.")
        conn.close()
        return

    mode = "LIVE" if write_mode else "DRY RUN"
    print(f"  [{mode}] Flipping {len(auto_fix)} advisor edges...")
    for etype, row in auto_fix:
        eid = row[0]
        flip_edge(conn, eid, dry_run=not write_mode)

    conn.close()

    action = "flipped" if write_mode else "would flip"
    print(f"  {len(auto_fix)} edges {action}.")
    if write_mode:
        print("  Run audit.py to verify.")


if __name__ == "__main__":
    main()
