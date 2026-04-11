#!/usr/bin/env python3
"""
Phase 4.1: Reclassify `affiliated` and `affiliated_with` edges to canonical types.

Default mode is --report: prints a breakdown and samples without touching the DB.
Reclassification rules are applied in named batches via flags.

Rules implemented (safe, high-confidence cases only):

  --party-membership    person → Political Campaign/PAC with no role
                        → member (party membership)

  --journalist-employer person/Journalist → Media/Journalism org with no role
                        → employer

  --org-to-person-flip  org → person edges (direction is backwards)
                        Flips source/target; infers type from role keywords:
                          Board Member, Chair, Affiliate → member
                          All others → member (default; safer than employer for ambiguous)

  --resource-author     resource → person edges (reversed author relationship)
                        Flips to person → resource as author

Anything not matching a rule is left for manual review and surfaced in the report.

Usage:
    python scripts/reclassify_affiliated.py              # report only
    python scripts/reclassify_affiliated.py --dry-run --party-membership
    python scripts/reclassify_affiliated.py --live --party-membership --journalist-employer
    python scripts/reclassify_affiliated.py --live --all
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
    print("ERROR: DATABASE_URL not set in .env", file=sys.stderr)
    sys.exit(1)

AFFILIATED_TYPES = ("affiliated", "affiliated_with")

# Keywords in role field that suggest a board/member relationship
MEMBER_ROLE_KEYWORDS = (
    "board", "chair", "affiliate", "fellow", "member", "associate",
    "advisor", "adviser", "trustee", "committee", "council",
)

EMPLOYER_ROLE_KEYWORDS = (
    "ceo", "cto", "coo", "cfo", "president", "director", "head",
    "chief", "officer", "vp", "vice president", "manager", "lead",
    "founder", "co-founder",
)


# ---------------------------------------------------------------------------
# DB
# ---------------------------------------------------------------------------

def get_connection():
    return psycopg2.connect(DATABASE_URL)


def fetch_affiliated(conn):
    """Return all affiliated/affiliated_with edges with source and target details."""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT e.id, e.edge_type, e.role, e.evidence,
                   s.id, s.name, s.entity_type, s.category,
                   t.id, t.name, t.entity_type, t.category
            FROM edge e
            JOIN entity s ON e.source_id = s.id
            JOIN entity t ON e.target_id = t.id
            WHERE e.edge_type IN %s
            ORDER BY e.id
        """, (AFFILIATED_TYPES,))
        return cur.fetchall()


def apply_reclassification(conn, edge_id, new_type, flip=False, dry_run=True):
    """Update a single edge. If flip=True, swap source_id and target_id."""
    if dry_run:
        return

    with conn.cursor() as cur:
        if flip:
            cur.execute("""
                UPDATE edge
                SET edge_type = %s,
                    source_id = target_id,
                    target_id = source_id
                WHERE id = %s
            """, (new_type, edge_id))
        else:
            cur.execute("""
                UPDATE edge
                SET edge_type = %s
                WHERE id = %s
            """, (new_type, edge_id))
    conn.commit()


# ---------------------------------------------------------------------------
# Classification logic
# ---------------------------------------------------------------------------

def classify_party_membership(row):
    """person → Political Campaign/PAC with null role → member"""
    eid, etype, role, evidence, sid, sname, stype, scat, tid, tname, ttype, tcat = row
    return (
        stype == "person"
        and ttype == "organization"
        and tcat == "Political Campaign/PAC"
        and not role
    )


def classify_journalist_employer(row):
    """person/Journalist → Media/Journalism org → employer"""
    eid, etype, role, evidence, sid, sname, stype, scat, tid, tname, ttype, tcat = row
    return (
        stype == "person"
        and scat == "Journalist"
        and ttype == "organization"
        and tcat == "Media/Journalism"
    )


def classify_org_to_person(row):
    """org → person (reversed direction) — needs flip + type inference"""
    eid, etype, role, evidence, sid, sname, stype, scat, tid, tname, ttype, tcat = row
    return stype == "organization" and ttype == "person"


def classify_resource_author(row):
    """resource → person (reversed author) — flip to person → resource as author"""
    eid, etype, role, evidence, sid, sname, stype, scat, tid, tname, ttype, tcat = row
    return stype == "resource" and ttype == "person"


def infer_org_person_type(role):
    """Guess canonical type from role string for reversed org→person edges."""
    if not role:
        return "member"
    rl = role.lower()
    for kw in EMPLOYER_ROLE_KEYWORDS:
        if kw in rl:
            return "employer"
    for kw in MEMBER_ROLE_KEYWORDS:
        if kw in rl:
            return "member"
    return "member"  # safe default for unknown


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------

def print_report(edges, rules_enabled):
    counts = {
        "party_membership": 0,
        "journalist_employer": 0,
        "org_to_person": 0,
        "resource_author": 0,
        "unresolved": 0,
    }

    unresolved_samples = []

    for row in edges:
        eid, etype, role, evidence, sid, sname, stype, scat, tid, tname, ttype, tcat = row
        if classify_party_membership(row):
            counts["party_membership"] += 1
        elif classify_journalist_employer(row):
            counts["journalist_employer"] += 1
        elif classify_org_to_person(row):
            counts["org_to_person"] += 1
        elif classify_resource_author(row):
            counts["resource_author"] += 1
        else:
            counts["unresolved"] += 1
            if len(unresolved_samples) < 20:
                unresolved_samples.append(row)

    total = sum(counts.values())
    print()
    print("=" * 70)
    print(f"  Affiliated edge reclassification — {total} total edges")
    print("=" * 70)
    print()
    print(f"  {'Rule':<40} {'Edges':>5}  {'--flag'}")
    print(f"  {'-'*40}  {'-'*5}  {'-'*25}")
    print(f"  {'person → Political Campaign/PAC':<40} {counts['party_membership']:>5}  --party-membership")
    print(f"  {'person/Journalist → Media/Journalism':<40} {counts['journalist_employer']:>5}  --journalist-employer")
    print(f"  {'org → person (reversed, needs flip)':<40} {counts['org_to_person']:>5}  --org-to-person-flip")
    print(f"  {'resource → person (reversed author)':<40} {counts['resource_author']:>5}  --resource-author")
    print(f"  {'Unresolved (manual review needed)':<40} {counts['unresolved']:>5}")
    print()

    if unresolved_samples:
        print("  Unresolved samples (need manual review):")
        print()
        for row in unresolved_samples[:20]:
            eid, etype, role, evidence, sid, sname, stype, scat, tid, tname, ttype, tcat = row
            role_str = f"  role: {role}" if role else ""
            print(f"  [{eid}]  {sname} ({stype}/{scat or '?'}) → {tname} ({ttype}/{tcat or '?'}){role_str}")
        print()

    return counts


# ---------------------------------------------------------------------------
# Apply rules
# ---------------------------------------------------------------------------

def apply_rules(conn, edges, rules, dry_run):
    counts = {rule: 0 for rule in rules}
    counts["skipped"] = 0

    for row in edges:
        eid = row[0]
        etype, role = row[1], row[2]

        if "party_membership" in rules and classify_party_membership(row):
            apply_reclassification(conn, eid, "member", flip=False, dry_run=dry_run)
            counts["party_membership"] += 1

        elif "journalist_employer" in rules and classify_journalist_employer(row):
            apply_reclassification(conn, eid, "employer", flip=False, dry_run=dry_run)
            counts["journalist_employer"] += 1

        elif "org_to_person" in rules and classify_org_to_person(row):
            new_type = infer_org_person_type(role)
            apply_reclassification(conn, eid, new_type, flip=True, dry_run=dry_run)
            counts["org_to_person"] += 1

        elif "resource_author" in rules and classify_resource_author(row):
            apply_reclassification(conn, eid, "author", flip=True, dry_run=dry_run)
            counts["resource_author"] += 1

        else:
            counts["skipped"] += 1

    return counts


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Reclassify affiliated/affiliated_with edges to canonical types"
    )
    parser.add_argument("--report", action="store_true", default=True,
                        help="Print breakdown report (default)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show what would change without writing to DB")
    parser.add_argument("--live", action="store_true",
                        help="Apply changes to DB")
    parser.add_argument("--all", dest="apply_all", action="store_true",
                        help="Apply all available rules")
    parser.add_argument("--party-membership", action="store_true")
    parser.add_argument("--journalist-employer", action="store_true")
    parser.add_argument("--org-to-person-flip", action="store_true")
    parser.add_argument("--resource-author", action="store_true")
    args = parser.parse_args()

    if args.live and args.dry_run:
        print("ERROR: --live and --dry-run are mutually exclusive", file=sys.stderr)
        sys.exit(1)

    # Determine which rules to run
    if args.apply_all:
        rules = {"party_membership", "journalist_employer", "org_to_person", "resource_author"}
    else:
        rules = set()
        if args.party_membership:
            rules.add("party_membership")
        if args.journalist_employer:
            rules.add("journalist_employer")
        if args.org_to_person_flip:
            rules.add("org_to_person")
        if args.resource_author:
            rules.add("resource_author")

    write_mode = args.live and not args.dry_run

    conn = get_connection()
    edges = fetch_affiliated(conn)

    # Always print the report
    counts = print_report(edges, rules)

    if not rules:
        print("  No rules selected — run with --dry-run + a rule flag to preview changes.")
        print("  Example: python reclassify_affiliated.py --dry-run --party-membership")
        print()
        conn.close()
        return

    mode_label = "LIVE" if write_mode else "DRY RUN"
    print(f"  [{mode_label}] Applying rules: {', '.join(sorted(rules))}")
    print()

    applied = apply_rules(conn, edges, rules, dry_run=not write_mode)

    for rule, n in applied.items():
        if rule == "skipped":
            print(f"  Skipped (no matching rule): {n}")
        else:
            print(f"  {rule}: {n} edges {'updated' if write_mode else 'would update'}")

    conn.close()

    if write_mode:
        print()
        print(f"  Done. Run audit.py to verify counts.")


if __name__ == "__main__":
    main()
