#!/usr/bin/env python3
"""
Phase 4A: Backfill missing employer/member/founder edges from person notes.

The audit flags 271 entities (151 persons + 120 orgs) with `influence_without_edge` —
they have an influence_type like "Researcher/analyst" but no employer/member edge.

For persons, their notes typically describe their affiliation explicitly
("Professor at X", "CEO of Y", "Co-founder of Z"). This script extracts those
relationships via regex patterns, validates the mentioned org against the DB,
and proposes new edges.

Rules (conservative — only high-confidence patterns):

  R1  "(Co-)?[Ff]ounder of|and (CEO|Chairman)? of ORG" → founder
  R2  "(Co-)?[Ff]ounded ORG"                           → founder
  R3  "(Full |Associate |Assistant )?Professor at ORG" → employer (role="Professor")
  R4  "(?:CEO|CTO|CFO|COO|CSO) (?:of|at) ORG"          → employer (role=extracted)
  R5  "Chief [\w\s]+ Officer (?:of|at|,) ORG"          → employer (role=extracted)
  R6  "Director (?:of|at) ORG"                          → employer (role="Director")
       (Only if ORG name contains "Center", "Lab", "Institute", "Program")
  R7  "(Senior |Research )?Fellow at ORG"              → member (role=extracted)
  R8  "Board [Mm]ember of ORG"                         → member (role="Board Member")
  R9  "leads|heads ORG"                                 → employer (role="Lead")
       (ORG name must contain "Center", "Lab", "Institute", etc.)

Org name matching:
  - Exact case-insensitive match against entity.name
  - Skip orgs with name length < 5 (too many false positives)
  - Skip the person's own entity (self-reference)
  - Skip if an edge of that type already exists between the pair (either direction)

Usage:
    python scripts/backfill_employer_edges.py                      # report only
    python scripts/backfill_employer_edges.py --dry-run            # show proposed changes
    python scripts/backfill_employer_edges.py --dry-run --flagged-only
    python scripts/backfill_employer_edges.py --live               # apply changes
    python scripts/backfill_employer_edges.py --live --rule R1,R2  # only rules R1 and R2
    python scripts/backfill_employer_edges.py --ids 1330,1341      # only these persons
"""

import argparse
import json
import os
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone

import psycopg2
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(env_path)

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set in .env", file=sys.stderr)
    sys.exit(1)

INFLUENCE_EDGE_MAP = {
    "Funder/investor": {"funder"},
    "Builder": {"employer", "founder"},
    "Researcher/analyst": {"employer", "member"},
    "Advisor/strategist": {"advisor", "member"},
    "Narrator": {"employer", "author"},
}

# Orgs that fit "Center/Lab/Institute" heuristic for R6 and R9
LAB_KEYWORDS = re.compile(
    r"\b(Center|Centre|Lab|Laboratory|Institute|Program|Initiative|"
    r"School|College|Department|Group|Project|Mission|Consortium)\b",
    re.IGNORECASE,
)

CREATED_BY = "phase4-backfill"


# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------

def get_conn():
    return psycopg2.connect(DATABASE_URL)


def fetch_persons(conn, only_flagged=False, ids=None):
    """Fetch person entities; if only_flagged, limit to influence_without_edge cases."""
    with conn.cursor() as cur:
        base = """
            SELECT e.id, e.name, e.category, e.notes, e.influence_type, e.title, e.primary_org
            FROM entity e
            WHERE e.entity_type = 'person'
              AND e.notes IS NOT NULL
        """
        params = []
        if ids:
            base += " AND e.id = ANY(%s)"
            params.append(ids)
        base += " ORDER BY e.id"
        cur.execute(base, params)
        rows = cur.fetchall()

    if not only_flagged:
        return rows

    # Filter to only flagged
    with conn.cursor() as cur:
        flagged = []
        for r in rows:
            eid, _, _, _, inf_types, _, _ = r
            if not inf_types:
                continue
            cur.execute(
                "SELECT edge_type FROM edge WHERE source_id = %s OR target_id = %s",
                (eid, eid),
            )
            existing = {row[0] for row in cur.fetchall()}
            for inf in inf_types.split(","):
                expected = INFLUENCE_EDGE_MAP.get(inf.strip())
                if expected and not existing.intersection(expected):
                    flagged.append(r)
                    break
        return flagged


def fetch_orgs(conn):
    """Return dict of org_name_lower → (id, canonical_name)."""
    with conn.cursor() as cur:
        cur.execute("SELECT id, name FROM entity WHERE entity_type = 'organization'")
        return {name.lower(): (oid, name) for oid, name in cur.fetchall() if name}


def fetch_person_edges(conn, person_id):
    """Return set of (edge_type, other_id) tuples involving this person."""
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT edge_type, source_id, target_id FROM edge
            WHERE source_id = %s OR target_id = %s
        """,
            (person_id, person_id),
        )
        edges = set()
        for et, sid, tid in cur.fetchall():
            other = tid if sid == person_id else sid
            edges.add((et, other))
        return edges


# ---------------------------------------------------------------------------
# Rule engine
# ---------------------------------------------------------------------------

# Each rule is (name, regex, edge_type, role_extractor).
# role_extractor takes the regex match and returns a role string (or None).
# Capturing group named "org" must be defined in each regex.

RULES = [
    # R1: Co-founder / Founder of X (+optional "and CEO of X")
    (
        "R1",
        re.compile(
            r"(?P<prefix>(?:Co-)?[Ff]ound(?:er|ing)\s+(?:and\s+\w+\s+)?(?:of\s+)?)"
            r"(?P<org>[A-Z][A-Za-z0-9&\s\-.,]+?(?:\s+Inc\.?|\s+LLC|\s+AI|\s+Lab|\s+Institute)?)"
            r"(?=[.,;:]|\sin\s|\sat\s|\sis\s|\swith\s|$)",
        ),
        "founder",
        lambda m: "Co-founder" if "co-" in m.group("prefix").lower() else "Founder",
    ),
    # R2: Founded X / Co-founded X
    (
        "R2",
        re.compile(
            r"(?P<prefix>(?:Co-)?[Ff]ounded\s+)"
            r"(?P<org>[A-Z][A-Za-z0-9&\s\-.,]+?)"
            r"(?=[.,;:]|\sin\s|\s\(|$)",
        ),
        "founder",
        lambda m: "Co-founder" if "co-" in m.group("prefix").lower() else "Founder",
    ),
    # R3: (Full/Associate/Assistant) Professor at X / Professor of Y at X
    (
        "R3",
        re.compile(
            r"(?P<title>(?:Full |Associate |Assistant |DeepMind |Pioneer )?Professor"
            r"(?:\s+of\s+[A-Za-z\s]+?)?)\s+at\s+"
            r"(?P<org>[A-Z][A-Za-z0-9&\s\-.,]+?)"
            r"(?=[.,;:]|\sin\s|\sand\s|\swho\s|\swith\s|$)",
        ),
        "employer",
        lambda m: m.group("title").strip(),
    ),
    # R4: CEO/CTO/CFO/etc of/at X
    (
        "R4",
        re.compile(
            r"(?P<title>CEO|CTO|CFO|COO|CSO|CMO|CAIO|Chief\s+\w+\s+Officer|"
            r"President\s+and\s+CEO|President\s+&\s+CEO)"
            r"\s+(?:of|at|,)\s+"
            r"(?P<org>[A-Z][A-Za-z0-9&\s\-.,]+?)"
            r"(?=[.,;:]|\sin\s|\swho\s|$)",
        ),
        "employer",
        lambda m: m.group("title").strip(),
    ),
    # R5: "at X as CEO" or "CEO, X" style
    (
        "R5",
        re.compile(
            r"(?P<title>Chief\s+[A-Za-z]+(?:\s+and\s+[A-Za-z]+)?\s+Officer),?\s+(?:at\s+|of\s+)"
            r"(?P<org>[A-Z][A-Za-z0-9&\s\-.,]+?)"
            r"(?=[.,;:]|\sin\s|\swho\s|$)",
        ),
        "employer",
        lambda m: m.group("title").strip(),
    ),
    # R6: Director of X (only if X looks like a lab/center)
    (
        "R6",
        re.compile(
            r"(?P<title>(?:Executive |Founding |Research |Co-|Associate )?"
            r"Directors?(?:\s+of\s+[A-Za-z\s]+?)?)\s+(?:of|at|,)\s+"
            r"(?P<org>[A-Z][A-Za-z0-9&\s\-.,]+?)"
            r"(?=[.,;:]|\sin\s|\swith\s|\sand\s|$)",
        ),
        "employer",
        lambda m: m.group("title").strip(),
    ),
    # R7: Senior/Research Fellow at X
    (
        "R7",
        re.compile(
            r"(?P<title>(?:Senior |Research |Visiting |Policy |Distinguished )?Fellow)\s+"
            r"(?:at|of|,)\s+"
            r"(?P<org>[A-Z][A-Za-z0-9&\s\-.,]+?)"
            r"(?=[.,;:]|\sin\s|\swith\s|$)",
        ),
        "member",
        lambda m: m.group("title").strip(),
    ),
    # R8: Board Member of X
    (
        "R8",
        re.compile(
            r"(?P<title>Board\s+[Mm]ember|Trustee|Steering\s+Committee\s+[Mm]ember)\s+"
            r"(?:of|at|,)\s+"
            r"(?P<org>[A-Z][A-Za-z0-9&\s\-.,]+?)"
            r"(?=[.,;:]|\sin\s|$)",
        ),
        "member",
        lambda m: m.group("title").strip(),
    ),
]


PAST_MARKERS = re.compile(
    r"\b(?:[Ff]ormer(?:ly)?|[Pp]reviously|[Ff]mr\.?|ex-|until\s+\d{4}|"
    r"\(former\)|\(past\)|\(fmr\.?\))\b",
    re.IGNORECASE,
)

# Year-range pattern indicates a past role (e.g. "Director of DARPA from 2012 to 2017")
YEAR_RANGE = re.compile(r"\bfrom\s+\d{4}\s+to\s+\d{4}\b", re.IGNORECASE)

# Skip notes that look like dup/merge placeholders
DUPE_MARKER = re.compile(r"(?i)\bDUPLICATE\b|see entity \d+")


def extract_relationships(person_notes, person_name, orgs_by_lower_name):
    """
    Apply all rules to person's notes. Return list of proposed edges:
    [(rule_name, edge_type, org_id, org_canonical_name, role, evidence_snippet), ...]
    """
    proposals = []
    if not person_notes:
        return proposals

    # Skip dup-stub notes
    if DUPE_MARKER.search(person_notes):
        return proposals

    # Run each rule
    for rule_name, pattern, edge_type, role_fn in RULES:
        for m in pattern.finditer(person_notes):
            # Skip if the match is inside a "former/previously/ex-" clause —
            # look back up to 50 chars for a past-marker adjacent to the title.
            look_start = max(0, m.start() - 50)
            lookback = person_notes[look_start : m.start()]
            if PAST_MARKERS.search(lookback):
                continue
            # Also skip if the title itself starts with Former
            if PAST_MARKERS.match(m.group(0).strip()):
                continue
            # Skip if a year-range pattern follows within 50 chars (past role with dates)
            look_end = min(len(person_notes), m.end() + 50)
            lookforward = person_notes[m.end() : look_end]
            if YEAR_RANGE.search(lookforward):
                continue
            raw_org = m.group("org").strip().rstrip(".,;:")
            if not raw_org or len(raw_org) < 4:
                continue
            # Trim trailing common filler words
            raw_org = re.sub(r"\s+(in|by|for|with|from|as)\s+.*$", "", raw_org)
            raw_org = raw_org.strip().rstrip(".,;:")
            if len(raw_org) < 4:
                continue

            # Try to match against entity table
            org_match = orgs_by_lower_name.get(raw_org.lower())
            if not org_match:
                # Clean trailing filler ("and owner...", "magazine", etc.).
                # Chop at conjunctions/comma that the regex may have greedily included.
                for delim in (" and ", " or ", ", "):
                    if delim in raw_org:
                        raw_org = raw_org.split(delim)[0]
                org_match = orgs_by_lower_name.get(raw_org.lower())
            if not org_match:
                # Strip common corporate suffixes.
                cleaned = re.sub(
                    r"\s+(Inc\.?|LLC|Ltd\.?|Corp\.?|Corporation|magazine|Foundation)$",
                    "", raw_org).rstrip(".,;:")
                if cleaned.lower() != raw_org.lower():
                    org_match = orgs_by_lower_name.get(cleaned.lower())
                    if org_match:
                        raw_org = cleaned
            if not org_match:
                # Last resort: shrink a suffix-word ONLY if that word is a common
                # non-entity noise word. This guards against "Google X" → "Google".
                SAFE_DROP = {"AI", "Lab", "Institute"}  # allowed to drop (rare cases)
                parts = raw_org.split()
                if len(parts) >= 2:
                    last = parts[-1].rstrip(".,;:")
                    if last in SAFE_DROP:
                        candidate = " ".join(parts[:-1])
                        if candidate.lower() in orgs_by_lower_name:
                            # Only use it if DB has no match for the longer name
                            # AND the longer name isn't also a separate entity
                            # (already checked — `org_match` is still None).
                            org_match = orgs_by_lower_name[candidate.lower()]
                            raw_org = candidate

            if not org_match:
                continue

            org_id, org_canonical = org_match
            role = role_fn(m)

            # Evidence snippet: ±40 chars around the match
            start = max(0, m.start() - 40)
            end = min(len(person_notes), m.end() + 40)
            snippet = person_notes[start:end].replace("\n", " ").strip()

            proposals.append(
                (rule_name, edge_type, org_id, org_canonical, role, snippet)
            )

    # Dedupe by (edge_type, org_id) — keep first match
    seen = set()
    unique = []
    for p in proposals:
        key = (p[1], p[2])
        if key in seen:
            continue
        seen.add(key)
        unique.append(p)
    return unique


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    g = parser.add_mutually_exclusive_group()
    g.add_argument("--dry-run", action="store_true", help="Show proposed changes without writing")
    g.add_argument("--live", action="store_true", help="Apply proposed changes to DB")
    parser.add_argument("--flagged-only", action="store_true", help="Only process persons flagged as influence_without_edge")
    parser.add_argument("--ids", type=str, help="Comma-separated person IDs to process")
    parser.add_argument("--rule", type=str, help="Comma-separated rule names to apply (e.g., R1,R3)")
    parser.add_argument("--output", type=str, help="Write report to file instead of stdout")
    args = parser.parse_args()

    ids = [int(x) for x in args.ids.split(",")] if args.ids else None
    rule_filter = set(args.rule.split(",")) if args.rule else None

    conn = get_conn()
    persons = fetch_persons(conn, only_flagged=args.flagged_only, ids=ids)
    orgs_by_lower = fetch_orgs(conn)
    print(f"Loaded {len(orgs_by_lower)} orgs, {len(persons)} persons to scan",
          file=sys.stderr)

    all_proposals = []  # (person_id, person_name, proposal_tuple)
    rule_counts = Counter()
    skipped_existing = Counter()

    for row in persons:
        person_id, person_name, _, notes, _, _, _ = row
        proposals = extract_relationships(notes, person_name, orgs_by_lower)
        if not proposals:
            continue

        existing_edges = fetch_person_edges(conn, person_id)
        # We also consider ANY edge type between the pair (don't duplicate if they already have ANY relation)
        for p in proposals:
            rule_name, edge_type, org_id, org_canonical, role, snippet = p
            if rule_filter and rule_name not in rule_filter:
                continue
            # Skip if an edge of this type already exists between pair
            # Also skip if there's ANY edge of employer/member/founder/advisor between them
            # (avoids double-counting a person→org relationship already captured differently)
            related_edge_types = {
                t for (t, oid) in existing_edges if oid == org_id
            }
            if edge_type in related_edge_types:
                skipped_existing[edge_type] += 1
                continue
            # Conservative: if person already has ANY of {employer, member, founder} to this org, skip
            blocking = {"employer", "member", "founder", "advisor"} & related_edge_types
            if blocking:
                skipped_existing[f"{edge_type}_blocked_by_{list(blocking)[0]}"] += 1
                continue
            rule_counts[rule_name] += 1
            all_proposals.append((person_id, person_name, p))

    # --- Report ---
    out_lines = []
    def emit(s=""):
        out_lines.append(s)

    emit(f"# Backfill Employer Edges — Proposal Report")
    emit(f"*Generated: {datetime.now(timezone.utc).isoformat()}*")
    emit()
    emit(f"- Persons scanned: {len(persons)}")
    emit(f"- Total proposals: {len(all_proposals)}")
    emit(f"- Proposals skipped (edge already exists): {sum(skipped_existing.values())}")
    emit()
    emit("## Proposals by rule")
    for rn, cnt in sorted(rule_counts.items()):
        emit(f"- {rn}: {cnt}")
    emit()

    # Group by edge_type
    by_type = defaultdict(list)
    for person_id, person_name, p in all_proposals:
        by_type[p[1]].append((person_id, person_name, p))

    for et in ["founder", "employer", "member"]:
        if et not in by_type:
            continue
        emit(f"## {et} edges ({len(by_type[et])})")
        emit()
        emit("| Person ID | Person | → Org | Role | Rule | Evidence |")
        emit("| ---: | --- | --- | --- | --- | --- |")
        for person_id, person_name, p in sorted(by_type[et]):
            rule_name, _, org_id, org_canon, role, snippet = p
            snippet_safe = snippet.replace("|", "\\|")[:140]
            emit(f"| {person_id} | {person_name} | [{org_id}] {org_canon} | {role} | {rule_name} | {snippet_safe} |")
        emit()

    if args.live:
        emit("## APPLYING CHANGES...")
        applied = 0
        with conn.cursor() as cur:
            for person_id, person_name, p in all_proposals:
                _, edge_type, org_id, org_canon, role, snippet = p
                cur.execute(
                    """
                    INSERT INTO edge (source_id, target_id, edge_type, role, is_primary,
                                      evidence, confidence, created_by)
                    VALUES (%s, %s, %s, %s, FALSE, %s, 3, %s)
                    """,
                    (person_id, org_id, edge_type, role,
                     f"Backfilled from notes: ...{snippet[-140:]}", CREATED_BY),
                )
                applied += 1
        conn.commit()
        emit(f"Applied: {applied} edges")
    else:
        emit("*Dry-run — no changes written. Re-run with --live to apply.*")

    out = "\n".join(out_lines)
    if args.output:
        with open(args.output, "w") as f:
            f.write(out)
        print(f"Report written to {args.output}", file=sys.stderr)
    else:
        print(out)

    conn.close()


if __name__ == "__main__":
    main()
