#!/usr/bin/env python3
"""
Phase 2.1: Edge Type Normalization

Migrates legacy edge types to the 12 canonical types per ONBOARDING.md.
Handles renames, direction flips (source/target swap), and role backfills.

Three types have mixed directions (employed_by, board_member, co_founded_with)
and get conditional flips — only org→person edges are flipped to person→org.

Skips `affiliated`, `affiliated_with`, `mentioned` — these need manual review.

Usage:
    python normalize_edges.py              # dry run (default)
    python normalize_edges.py --live       # apply changes
    python normalize_edges.py -o FILE      # write report to file
"""

import argparse
import os
import sys
from datetime import datetime, timezone

import psycopg2
from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(env_path)

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set in .env")
    sys.exit(1)

# Simple migrations: consistent direction, blanket rename/flip.
# (legacy_type, canonical_type, flip, set_role)
SIMPLE_MIGRATIONS = [
    # Renames — direction already correct
    ("founded",          "founder",        False, None),
    ("invested_in",      "funder",         False, None),
    ("partner_of",       "partner",        False, None),
    ("advises",          "advisor",        False, None),
    ("critic_of",        "critic",         False, None),
    ("supporter_of",     "supporter",      False, None),
    ("former_colleague", "collaborator",   False, None),
    ("mentor_of",        "advisor",        False, "Mentor"),
    ("person_organization", "employer",    False, None),
    # Blanket flips — direction is consistent across all edges
    ("funded_by",        "funder",         True,  None),
    ("subsidiary_of",    "parent_company", True,  None),
    ("spun_out_from",    "parent_company", True,  None),
    ("mentored_by",      "advisor",        True,  "Mentor"),
    ("authored_by",      "author",         True,  None),
    ("published_by",     "publisher",      True,  None),
]

# Conditional migrations: mixed directions in the data.
# Canonical direction is person→org for all three.
# Only flip edges where source=org and target=person.
# (legacy_type, canonical_type, set_role)
CONDITIONAL_MIGRATIONS = [
    ("employed_by",      "employer", None),
    ("board_member",     "member",   "Board Member"),
    ("co_founded_with",  "founder",  "Co-founder"),
]

ALL_MIGRATIONS = (
    [(l, c, f, r, False) for l, c, f, r in SIMPLE_MIGRATIONS]
    + [(l, c, False, r, True) for l, c, r in CONDITIONAL_MIGRATIONS]
)

SKIP_TYPES = {"affiliated", "affiliated_with", "mentioned"}

CANONICAL_TYPES = {
    "employer", "founder", "funder", "parent_company", "advisor", "member",
    "author", "publisher", "collaborator", "partner", "critic", "supporter",
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def get_connection():
    return psycopg2.connect(DATABASE_URL)


def edge_distribution(conn):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT edge_type, COUNT(*)
            FROM edge GROUP BY edge_type ORDER BY COUNT(*) DESC
        """)
        return cur.fetchall()


def direction_breakdown(conn, edge_type):
    """Return {direction_string: count} for an edge type."""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT s.entity_type || ' -> ' || t.entity_type, COUNT(*)
            FROM edge e
            JOIN entity s ON e.source_id = s.id
            JOIN entity t ON e.target_id = t.id
            WHERE e.edge_type = %s
            GROUP BY 1 ORDER BY 2 DESC
        """, (edge_type,))
        return cur.fetchall()


def sample_edges(conn, edge_type, limit=3):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT e.id, s.name, s.entity_type, t.name, t.entity_type, e.role
            FROM edge e
            JOIN entity s ON e.source_id = s.id
            JOIN entity t ON e.target_id = t.id
            WHERE e.edge_type = %s
            LIMIT %s
        """, (edge_type, limit))
        return cur.fetchall()


def edge_count(conn, edge_type):
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM edge WHERE edge_type = %s", (edge_type,))
        return cur.fetchone()[0]


def null_role_count(conn, edge_type):
    with conn.cursor() as cur:
        cur.execute(
            "SELECT COUNT(*) FROM edge WHERE edge_type = %s AND role IS NULL",
            (edge_type,),
        )
        return cur.fetchone()[0]


def apply_simple(cur, legacy, canonical, flip, set_role):
    """Blanket rename, optional flip, optional role backfill."""
    if flip and set_role:
        cur.execute("""
            UPDATE edge
            SET edge_type = %s, source_id = target_id, target_id = source_id,
                role = COALESCE(role, %s)
            WHERE edge_type = %s
        """, (canonical, set_role, legacy))
    elif flip:
        cur.execute("""
            UPDATE edge
            SET edge_type = %s, source_id = target_id, target_id = source_id
            WHERE edge_type = %s
        """, (canonical, legacy))
    elif set_role:
        cur.execute("""
            UPDATE edge
            SET edge_type = %s, role = COALESCE(role, %s)
            WHERE edge_type = %s
        """, (canonical, set_role, legacy))
    else:
        cur.execute("""
            UPDATE edge SET edge_type = %s WHERE edge_type = %s
        """, (canonical, legacy))
    return cur.rowcount


def apply_conditional(cur, legacy, canonical, set_role):
    """Rename all, but only flip org→person edges to person→org."""
    role_clause = ", role = COALESCE(role, %s)" if set_role else ""
    params = [canonical]
    if set_role:
        params.append(set_role)
    params.append(legacy)

    cur.execute(f"""
        UPDATE edge e
        SET edge_type = %s,
            source_id = CASE
                WHEN s.entity_type = 'organization' AND t.entity_type = 'person'
                THEN e.target_id ELSE e.source_id END,
            target_id = CASE
                WHEN s.entity_type = 'organization' AND t.entity_type = 'person'
                THEN e.source_id ELSE e.target_id END
            {role_clause}
        FROM entity s, entity t
        WHERE e.edge_type = %s
          AND s.id = e.source_id AND t.id = e.target_id
    """, params)
    return cur.rowcount


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Normalize legacy edge types to canonical types"
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

    out(f"# Edge Type Normalization — {mode}")
    out(f"*{now}*")
    out()

    # ---- Current distribution ----
    out("## Current Distribution")
    out()
    out("| Type | Count | Status |")
    out("| ---- | ----: | ------ |")

    dist = edge_distribution(conn)
    total = sum(c for _, c in dist)
    all_legacy = {m[0] for m in ALL_MIGRATIONS}
    for etype, count in dist:
        if etype in CANONICAL_TYPES:
            status = "canonical"
        elif etype in SKIP_TYPES:
            status = "SKIP (manual review)"
        elif etype in all_legacy:
            rule = next(m for m in ALL_MIGRATIONS if m[0] == etype)
            tag = f"→ {rule[1]}"
            if rule[4]:
                tag += " (conditional flip)"
            elif rule[2]:
                tag += " (flip)"
            if rule[3]:
                tag += f" (role={rule[3]})"
            status = tag
        else:
            status = "UNKNOWN"
        out(f"| {etype} | {count} | {status} |")
    out()
    out(f"**Total edges:** {total}")
    out()

    # ---- Simple migration plan ----
    out("## Simple Migrations (consistent direction)")
    out()
    out("| Legacy | Count | → Canonical | Flip | Role | Null Roles |")
    out("| ------ | ----: | ----------- | ---- | ---- | ---------: |")

    simple_plan = []
    simple_total = 0
    for legacy, canonical, flip, role in SIMPLE_MIGRATIONS:
        count = edge_count(conn, legacy)
        if count == 0:
            continue
        simple_total += count
        nulls = null_role_count(conn, legacy) if role else 0
        simple_plan.append((legacy, canonical, flip, role, count, nulls))
        out(f"| {legacy} | {count} | {canonical} | "
            f"{'YES' if flip else 'no'} | {role or '—'} | "
            f"{nulls if role else '—'} |")
    out()

    # ---- Conditional migration plan ----
    out("## Conditional Migrations (mixed direction — flip only org→person)")
    out()

    cond_plan = []
    cond_total = 0
    for legacy, canonical, role in CONDITIONAL_MIGRATIONS:
        count = edge_count(conn, legacy)
        if count == 0:
            continue
        cond_total += count
        breakdown = direction_breakdown(conn, legacy)
        nulls = null_role_count(conn, legacy) if role else 0
        cond_plan.append((legacy, canonical, role, count, nulls, breakdown))

        out(f"### `{legacy}` → `{canonical}` ({count} edges)")
        if role:
            out(f"Role backfill: `{role}` ({nulls} null roles)")
        out()
        out("| Direction | Count | Action |")
        out("| --------- | ----: | ------ |")
        for direction, dcount in breakdown:
            if direction == "organization -> person":
                action = "FLIP to person→org"
            elif direction == "person -> organization":
                action = "keep (already correct)"
            else:
                action = "keep (log as data quality note)"
            out(f"| {direction} | {dcount} | {action} |")
        out()

    out(f"**Total to migrate:** {simple_total + cond_total} / {total}")
    out()

    # ---- Skipped ----
    out("## Skipped (manual review needed)")
    out()
    for skip in sorted(SKIP_TYPES):
        cnt = edge_count(conn, skip)
        if cnt > 0:
            out(f"- `{skip}`: {cnt} edges")
    out()

    # ---- Apply ----
    if args.live:
        out("## Results")
        out()
        migrated = 0
        with conn.cursor() as cur:
            for legacy, canonical, flip, role, expected, _ in simple_plan:
                affected = apply_simple(cur, legacy, canonical, flip, role)
                migrated += affected
                check = "" if affected == expected else f" (expected {expected})"
                out(f"- `{legacy}` → `{canonical}`: **{affected}**{check}")

            for legacy, canonical, role, expected, _, _ in cond_plan:
                affected = apply_conditional(cur, legacy, canonical, role)
                migrated += affected
                check = "" if affected == expected else f" (expected {expected})"
                out(f"- `{legacy}` → `{canonical}` (conditional): **{affected}**{check}")

        conn.commit()
        out()
        out(f"**Total migrated:** {migrated}")
        out()

        # Post-migration
        out("## Post-Migration Distribution")
        out()
        out("| Type | Count | Canonical? |")
        out("| ---- | ----: | ---------- |")
        post = edge_distribution(conn)
        for etype, count in post:
            canon = "yes" if etype in CANONICAL_TYPES else "no"
            out(f"| {etype} | {count} | {canon} |")
        out()
        canonical_count = sum(c for t, c in post if t in CANONICAL_TYPES)
        out(f"**Canonical:** {canonical_count} / {total} "
            f"({canonical_count * 100 / total:.1f}%)")
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
