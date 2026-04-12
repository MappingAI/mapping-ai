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

  --role-relationship   Role string explicitly describes the relationship
                        (not the person's other job). Examples:
                          "Founder", "Co-founder and CEO"     → founder
                          "Advisor", "Policy Advisor"          → advisor
                          "Board Member", "Trustee"            → member
                          "Senior Fellow", "Research Fellow"   → member
                          "PhD Student", "Alumnus"             → member
                          "CEO", "President and CEO"           → employer
                          "Partner University", "Affiliated School" → partner

  --structural-default  For no-role person→org edges, apply a structural default.
                        Uses existing-employer-edge check + multi-affiliation check
                        to avoid mis-classifying secondary affiliations as primary.
                          Researcher/Academic → Frontier Lab/Academic → employer (if single) else member
                          Executive → Frontier Lab/Deployers/Compute → employer (if single) else advisor
                          Executive → other org → advisor
                          Policymaker → Gov/Agency → employer (if single) else member
                          Investor → VC/Capital → employer (if single) else advisor

Anything not matching a rule is left for manual review and surfaced in the report.

Usage:
    python scripts/reclassify_affiliated.py              # report only
    python scripts/reclassify_affiliated.py --dry-run --party-membership
    python scripts/reclassify_affiliated.py --live --party-membership --journalist-employer
    python scripts/reclassify_affiliated.py --live --all
"""

import argparse
import os
import re
import sys
from collections import Counter, defaultdict
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


def classify_role_relationship(role):
    """Rule A: role string unambiguously describes the target relationship.

    Returns 'employer' | 'founder' | 'advisor' | 'member' | 'partner' | None.
    Returns None for ambiguous roles (role describes person's other job, etc.).
    """
    if not role:
        return None
    rl = role.lower().strip()

    # Skip historical / former-role markers — too ambiguous for auto-classification
    if re.search(r"\b(fmr|former)\b|\(former\)", rl):
        return None

    # Founder of target. Skip cases like "Founder, OtherOrg" (role describes other org).
    if re.search(r"\b(co-?founder|founder)\b", rl):
        if re.search(r"\bfounder,\s+[a-z]", rl) and not re.search(
            r"founder,\s+(and|\&)", rl
        ):
            return None
        return "founder"

    # "President and CEO" / "Founder and CEO" combos (before single CEO regex)
    if re.match(
        r"^(president and ceo|chairman and ceo|chair and ceo|ceo and founder|"
        r"founder and ceo|ceo and co-founder|co-founder and ceo|president & ceo)$",
        rl,
    ):
        return "founder" if "founder" in rl else "employer"

    # Single senior-exec title (person holds exactly one of these at a time)
    if re.match(
        r"^(co-?)?(ceo|cto|cfo|coo|cio|chro|cmo|cpo|clo|cso|"
        r"chief executive officer|chief technology officer|"
        r"chief financial officer|chief operating officer)$",
        rl,
    ):
        return "employer"

    # Professor at target (title-only, no comma)
    if re.match(
        r"^(assistant professor|associate professor|professor|"
        r"distinguished professor|chair professor|lecturer|"
        r"senior lecturer|reader)$",
        rl,
    ):
        return "employer"

    # Pure advisor title (not "Advisor to [person]" or similar)
    if re.match(
        r"^(senior\s+|policy\s+|strategic\s+|scientific\s+|science\s+|"
        r"technical\s+|special\s+)?(advisor|adviser)s?$",
        rl,
    ):
        return "advisor"

    # Board / trustee — describes relationship to target
    if re.search(
        r"\b(board member|board of directors|board of trustees|trustee|"
        r"board chair|chairman of the board|chairwoman of the board)\b",
        rl,
    ):
        return "member"

    # Fellow types
    if re.match(
        r"^(senior\s+|research\s+|non-?resident\s+|nonresident\s+|visiting\s+|"
        r"affiliate\s+|founding\s+|distinguished\s+)?fellow(s)?$",
        rl,
    ):
        return "member"

    # Affiliate / scholar
    if re.match(
        r"^(affiliate|associate|visiting scholar|scholar in residence|"
        r"nonresident scholar|non-resident scholar|visiting researcher|"
        r"visiting professor)(s)?$",
        rl,
    ):
        return "member"

    # Member / participant
    if re.match(r"^(member|participant|delegate|ranking member)(s)?$", rl):
        return "member"
    if re.match(r"^member of\b|^participant in\b", rl):
        return "member"

    # Chair / co-chair (of committee/caucus — member-of-committee relationship)
    if re.match(r"^(co-?chair|chair|vice chair|chairman|chairwoman)$", rl):
        return "member"

    # Research associate — academic affiliate status
    if re.match(r"^research associate$", rl):
        return "member"

    # Educational / alumni relationships
    if re.match(
        r"^(graduate|phd graduate|phd student|alumnus|alumna|alumni|student|undergraduate)$",
        rl,
    ):
        return "member"

    # Org-to-org partner labels
    if re.match(
        r"^(partner university|affiliated school|sister organization|parent organization)$",
        rl,
    ):
        return "partner"

    return None


def build_edge_index(conn):
    """Pre-load existing employer/founder edges + per-person affiliated counts.

    Used by classify_structural to avoid mis-classifying secondary affiliations.
    Returns (has_other_employer_fn, affiliated_per_source_counter).
    """
    existing = defaultdict(list)
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT source_id, edge_type, target_id FROM edge
            WHERE edge_type IN ('employer','founder','member','advisor')
            """
        )
        for src, et, tgt in cur.fetchall():
            existing[src].append((et, tgt))

        cur.execute(
            "SELECT source_id FROM edge WHERE edge_type IN %s",
            (AFFILIATED_TYPES,),
        )
        affils = Counter(r[0] for r in cur.fetchall())

    def has_other_employer(sid, tid):
        return any(et == "employer" and t != tid for et, t in existing[sid])

    return has_other_employer, affils


def classify_structural(row, has_other_employer, affiliated_per_source):
    """Rule B: for no-role person→org edges, apply structural defaults.

    Uses two signals to avoid mis-classifying secondary affiliations:
      1. has_other_employer(sid, tid): person already has an employer edge elsewhere
      2. affiliated_per_source[sid] > 1: person has multiple affiliated candidates

    Either signal downgrades 'employer' to 'member' or 'advisor'.
    """
    eid, etype, role, evidence, sid, sname, stype, scat, tid, tname, ttype, tcat = row
    if role:
        return None
    if stype != "person" or ttype != "organization":
        return None

    other_emp = has_other_employer(sid, tid)
    many_affils = affiliated_per_source[sid] > 1
    secondary = other_emp or many_affils

    if scat in ("Researcher", "Academic"):
        if tcat in ("Frontier Lab", "Academic", "AI Safety/Alignment", "Think Tank/Policy Org"):
            return "member" if secondary else "employer"
    if scat == "Executive":
        if tcat in ("Frontier Lab", "Deployers & Platforms", "Infrastructure & Compute"):
            return "advisor" if secondary else "employer"
        return "advisor"  # Executive at non-primary org category
    if scat == "Policymaker" and tcat == "Government/Agency":
        return "member" if secondary else "employer"
    if scat == "Investor" and tcat == "VC/Capital/Philanthropy":
        return "advisor" if secondary else "employer"
    return None


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------

def print_report(edges, rules_enabled, has_other_employer, affiliated_per_source):
    counts = {
        "party_membership": 0,
        "journalist_employer": 0,
        "org_to_person": 0,
        "resource_author": 0,
        "role_relationship": 0,
        "structural_default": 0,
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
        elif classify_role_relationship(role) is not None:
            counts["role_relationship"] += 1
        elif classify_structural(row, has_other_employer, affiliated_per_source) is not None:
            counts["structural_default"] += 1
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
    print(f"  {'Role explicitly describes relationship':<40} {counts['role_relationship']:>5}  --role-relationship")
    print(f"  {'Structural default (no role)':<40} {counts['structural_default']:>5}  --structural-default")
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

def apply_rules(conn, edges, rules, dry_run, has_other_employer, affiliated_per_source):
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

        elif "role_relationship" in rules:
            new_type = classify_role_relationship(role)
            if new_type is not None:
                apply_reclassification(conn, eid, new_type, flip=False, dry_run=dry_run)
                counts["role_relationship"] += 1
            else:
                # Fall through to structural if enabled
                if "structural_default" in rules:
                    st = classify_structural(row, has_other_employer, affiliated_per_source)
                    if st is not None:
                        apply_reclassification(conn, eid, st, flip=False, dry_run=dry_run)
                        counts["structural_default"] += 1
                        continue
                counts["skipped"] += 1

        elif "structural_default" in rules:
            st = classify_structural(row, has_other_employer, affiliated_per_source)
            if st is not None:
                apply_reclassification(conn, eid, st, flip=False, dry_run=dry_run)
                counts["structural_default"] += 1
            else:
                counts["skipped"] += 1

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
    parser.add_argument("--role-relationship", action="store_true",
                        help="Classify edges whose role explicitly describes the relationship")
    parser.add_argument("--structural-default", action="store_true",
                        help="For no-role person→org edges, apply structural defaults")
    args = parser.parse_args()

    if args.live and args.dry_run:
        print("ERROR: --live and --dry-run are mutually exclusive", file=sys.stderr)
        sys.exit(1)

    # Determine which rules to run
    if args.apply_all:
        rules = {
            "party_membership", "journalist_employer", "org_to_person",
            "resource_author", "role_relationship", "structural_default",
        }
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
        if args.role_relationship:
            rules.add("role_relationship")
        if args.structural_default:
            rules.add("structural_default")

    write_mode = args.live and not args.dry_run

    conn = get_connection()
    edges = fetch_affiliated(conn)

    # Pre-build indexes used by structural classifier
    has_other_employer, affiliated_per_source = build_edge_index(conn)

    # Always print the report
    counts = print_report(edges, rules, has_other_employer, affiliated_per_source)

    if not rules:
        print("  No rules selected — run with --dry-run + a rule flag to preview changes.")
        print("  Example: python reclassify_affiliated.py --dry-run --party-membership")
        print()
        conn.close()
        return

    mode_label = "LIVE" if write_mode else "DRY RUN"
    print(f"  [{mode_label}] Applying rules: {', '.join(sorted(rules))}")
    print()

    applied = apply_rules(conn, edges, rules, dry_run=not write_mode,
                          has_other_employer=has_other_employer,
                          affiliated_per_source=affiliated_per_source)

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
