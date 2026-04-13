#!/usr/bin/env python3
"""
Phase 4A.3: Backfill person→org edges from ORG notes (mirror of backfill_employer_edges.py).

The audit still flags ~338 orgs with `influence_without_edge` after the Phase 4A
person-side pass added 48 edges. Those orgs have an influence_type like
"Builder" or "Researcher/analyst" but no inbound employer/founder/member
edges from persons.

Many of those orgs *do* describe their leadership in notes — "Founded in 2013
by Matt Zeiler", "led by David Krueger", "CEO Jona Glade and President
Vilhelm Skoglund", "Key AI reporters include Andrew R. Chow, Billy Perrigo".
This script extracts those person mentions, looks them up against the person
table, and proposes person→org edges.

Rules (conservative — only high-confidence patterns):

  R1  "[Ff]ounded (in YYYY )?by NAME[, NAME[, and NAME]]"   → founder (each name)
  R2  "(?:led|run|headed|directed) by NAME"                  → employer
  R3  "(?:CEO|CTO|CSO|COO|CFO|President|Director|Chair(?:man)?|Executive Director) NAME"
                                                             → employer
  R4  "NAME \\(ROLE\\)" where ROLE contains a canonical title → employer
  R5  "[Ll]eadership (?:includes|:) ... NAME (ROLE)"         → employer
  R6  "(?:reporters|journalists|writers)\\s+include NAME, NAME"
                                                             → employer (media orgs)

Name matching:
  - Exact case-insensitive full-name match against entity.name where entity_type='person'
  - Require ≥2 whitespace-separated tokens (filters single-word matches)
  - If multiple persons share the same lowercased name → skip (ambiguous)
  - Skip if the pair already has ANY of {employer, member, founder, advisor} in either direction

Guards:
  - Past-tense markers (former, previously, ex-, fmr.) within 50 chars before the match → skip
  - Year-range within 50 chars after the match → skip (past role with dates)
  - DUPLICATE notes → skip whole entity

Usage:
    python scripts/backfill_org_edges.py                     # report only
    python scripts/backfill_org_edges.py --dry-run           # proposed changes
    python scripts/backfill_org_edges.py --live              # apply
    python scripts/backfill_org_edges.py --live --rule R1,R2 # only rules R1,R2
    python scripts/backfill_org_edges.py --ids 241,276       # only these orgs
"""

import argparse
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

CREATED_BY = "phase4a3-backfill"

# Person name: 2-4 capitalized tokens, allowing middle initial and apostrophes
NAME_TOKEN = r"[A-Z][A-Za-z'\-]+(?:\.?\s+)"
MIDDLE_INIT = r"(?:[A-Z]\.\s+)?"
PERSON_NAME = (
    r"(?P<name>"
    r"[A-Z][A-Za-z'\-]+"                      # first name
    r"(?:\s+[A-Z]\.?)?"                        # optional middle initial
    r"(?:\s+[A-Z][A-Za-z'\-]+){1,2}"          # last name (+optional second)
    r")"
)

# Canonical senior-role keywords (for parenthetical and leadership-list rules)
ROLE_KEYWORDS = (
    "CEO|CTO|CSO|COO|CFO|CMO|CAIO|"
    r"Chief\s+\w+(?:\s+\w+)?\s+Officer|"
    "President|Co-?Founder|Founder|"
    "Executive\s+Director|Managing\s+Director|Director|"
    "Chair(?:man|woman|person)?|"
    "Head\s+of\s+[\\w\\s]+|Lead|Principal|"
    "Editor(?:-in-Chief)?|Reporter|Writer"
)

PAST_MARKERS = re.compile(
    r"\b(?:[Ff]ormer(?:ly)?|[Pp]reviously|[Ff]mr\.?|ex-|until\s+\d{4}|"
    r"\(former\)|\(past\)|\(fmr\.?\))\b",
)
# Disambiguation markers — when a match lives inside a comparative clause
# ("distinct from the nonprofit ... run by X"), the subject is NOT the org we're
# seeding. Skip if any of these appear in the preceding 100 chars.
DISAMBIG_MARKERS = re.compile(
    r"\b(?:distinct\s+from|not\s+to\s+be\s+confused\s+with|"
    r"separate\s+from|unlike|as\s+opposed\s+to|similar\s+to|"
    r"unrelated\s+to|compared\s+to|versus|vs\.?)\b",
    re.IGNORECASE,
)
YEAR_RANGE = re.compile(r"\bfrom\s+\d{4}\s+to\s+\d{4}\b", re.IGNORECASE)
DUPE_MARKER = re.compile(r"(?i)\bDUPLICATE\b|see entity \d+")


# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------

def get_conn():
    return psycopg2.connect(DATABASE_URL)


def fetch_orgs(conn, only_flagged=True, ids=None):
    with conn.cursor() as cur:
        base = """
            SELECT id, name, category, influence_type, notes
            FROM entity
            WHERE entity_type = 'organization'
              AND notes IS NOT NULL
        """
        params = []
        if ids:
            base += " AND id = ANY(%s)"
            params.append(ids)
        base += " ORDER BY id"
        cur.execute(base, params)
        rows = cur.fetchall()

    if not only_flagged:
        return rows

    filtered = []
    with conn.cursor() as cur:
        for r in rows:
            eid, _, _, inf, _ = r
            if not inf:
                continue
            cur.execute(
                "SELECT edge_type FROM edge WHERE source_id=%s OR target_id=%s",
                (eid, eid),
            )
            existing = {row[0] for row in cur.fetchall()}
            for t in (x.strip() for x in inf.split(",")):
                expected = INFLUENCE_EDGE_MAP.get(t)
                if expected and not existing.intersection(expected):
                    filtered.append(r)
                    break
    return filtered


def fetch_person_lookup(conn):
    """Return dict: lowercased_name → list of (id, canonical_name).
    Lists of length >1 are ambiguous and will be skipped."""
    with conn.cursor() as cur:
        cur.execute("SELECT id, name FROM entity WHERE entity_type='person' AND name IS NOT NULL")
        lookup = defaultdict(list)
        for pid, name in cur.fetchall():
            lookup[name.lower().strip()].append((pid, name))
    return lookup


def fetch_org_edges(conn, org_id):
    """Return set of (edge_type, other_id) for edges touching org_id."""
    with conn.cursor() as cur:
        cur.execute(
            "SELECT edge_type, source_id, target_id FROM edge "
            "WHERE source_id=%s OR target_id=%s",
            (org_id, org_id),
        )
        edges = set()
        for et, sid, tid in cur.fetchall():
            other = tid if sid == org_id else sid
            edges.add((et, other))
        return edges


# ---------------------------------------------------------------------------
# Rule engine
# ---------------------------------------------------------------------------

RULES = [
    # R1: "Founded (in YEAR) by NAME[, NAME]* [, and NAME]" — splits list ourselves
    (
        "R1",
        re.compile(
            r"[Ff]ounded(?:\s+in\s+\d{4})?\s+by\s+"
            r"(?P<list>[A-Z][A-Za-z'\-\.\s,]+?(?:\s+and\s+[A-Z][A-Za-z'\-\.\s]+?)?)"
            r"(?=[.;:]|\s+(?:in|as|to|with|who|which)\s+|$)",
        ),
        "founder",
    ),
    # R2: (led|run|headed|directed) by NAME
    (
        "R2",
        re.compile(
            r"\b(?:led|run|headed|directed)\s+by\s+" + PERSON_NAME
            + r"(?=[.,;:]|\s+(?:and|with|who|of|at)\s|$)",
        ),
        "employer",
    ),
    # R3: "(ROLE) NAME" with role explicitly preceding the name (e.g. "CEO Jona Glade")
    (
        "R3",
        re.compile(
            r"\b(?P<role>" + ROLE_KEYWORDS + r")\s+"
            + PERSON_NAME
            + r"(?=[.,;:]|\s+(?:and|with|joined|who|of|at)\s|$)",
        ),
        "employer",
    ),
    # R4: "NAME (ROLE)" — parenthetical
    (
        "R4",
        re.compile(
            PERSON_NAME
            + r"\s+\((?P<role>[^)]*?(?:" + ROLE_KEYWORDS + r")[^)]*?)\)"
        ),
        "employer",
    ),
]


def split_names(raw):
    """Split 'A, B, and C' / 'A and B' / 'A' → ['A','B','C']."""
    # Normalize "and" → ","
    s = re.sub(r"\s+and\s+", ", ", raw.strip())
    pieces = [p.strip().rstrip(".,;:") for p in s.split(",")]
    return [p for p in pieces if p]


def is_valid_name(s):
    """A candidate must have ≥2 tokens and start with uppercase letters."""
    tokens = s.split()
    if len(tokens) < 2 or len(tokens) > 5:
        return False
    for t in tokens:
        if not t or not t[0].isupper():
            return False
    return True


def is_past_tense_context(notes, match_start, match_end):
    """Guard: skip if a past-tense or disambiguation marker is within 100 chars before,
    OR a year-range 50 chars after."""
    look_start = max(0, match_start - 100)
    lookback = notes[look_start:match_start]
    if PAST_MARKERS.search(lookback):
        return True
    if DISAMBIG_MARKERS.search(lookback):
        return True
    look_end = min(len(notes), match_end + 50)
    if YEAR_RANGE.search(notes[match_end:look_end]):
        return True
    return False


def extract_relationships(org_id, org_name, org_notes, person_lookup):
    """Return list of (rule, edge_type, person_id, person_name, role, evidence)."""
    proposals = []
    if not org_notes or DUPE_MARKER.search(org_notes):
        return proposals

    org_name_lower = org_name.lower()

    for rule_name, pattern, edge_type in RULES:
        for m in pattern.finditer(org_notes):
            if is_past_tense_context(org_notes, m.start(), m.end()):
                continue

            # --- Extract candidate names per rule ---
            if rule_name == "R1":
                candidates = [(n, "Founder") for n in split_names(m.group("list"))]
            elif rule_name in ("R2",):
                candidates = [(m.group("name"), "Lead")]
            elif rule_name == "R3":
                candidates = [(m.group("name"), m.group("role").strip())]
            elif rule_name == "R4":
                candidates = [(m.group("name"), m.group("role").strip())]
            else:
                continue

            for raw_name, role in candidates:
                raw_name = raw_name.strip().rstrip(".,;:")
                if not is_valid_name(raw_name):
                    continue
                # Skip if candidate = org's own name (shouldn't happen for persons, but guard)
                if raw_name.lower() == org_name_lower:
                    continue

                hits = person_lookup.get(raw_name.lower(), [])
                if len(hits) == 0:
                    continue
                if len(hits) > 1:
                    # Ambiguous — skip silently (record in caller if wanted)
                    continue
                person_id, person_canonical = hits[0]

                # Evidence snippet
                start = max(0, m.start() - 30)
                end = min(len(org_notes), m.end() + 30)
                snippet = org_notes[start:end].replace("\n", " ").strip()

                proposals.append((rule_name, edge_type, person_id, person_canonical, role, snippet))

    # Dedupe per (edge_type, person_id) within this org; keep first
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
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    g = parser.add_mutually_exclusive_group()
    g.add_argument("--dry-run", action="store_true", help="Show proposed changes without writing")
    g.add_argument("--live", action="store_true", help="Apply proposed changes to DB")
    parser.add_argument("--all-orgs", action="store_true",
                        help="Scan ALL orgs (default: only influence_without_edge flagged)")
    parser.add_argument("--ids", type=str, help="Comma-separated org IDs to process")
    parser.add_argument("--rule", type=str, help="Comma-separated rule names (e.g., R1,R3)")
    parser.add_argument("--output", type=str, help="Write report to file")
    args = parser.parse_args()

    ids = [int(x) for x in args.ids.split(",")] if args.ids else None
    rule_filter = set(args.rule.split(",")) if args.rule else None

    conn = get_conn()
    orgs = fetch_orgs(conn, only_flagged=not args.all_orgs, ids=ids)
    person_lookup = fetch_person_lookup(conn)
    dup_names = sum(1 for v in person_lookup.values() if len(v) > 1)
    print(f"Loaded {len(person_lookup)} unique person names "
          f"({dup_names} ambiguous), {len(orgs)} orgs to scan",
          file=sys.stderr)

    all_proposals = []
    rule_counts = Counter()
    skipped_existing = Counter()

    for row in orgs:
        org_id, org_name, _, _, notes = row
        proposals = extract_relationships(org_id, org_name, notes, person_lookup)
        if not proposals:
            continue

        existing_edges = fetch_org_edges(conn, org_id)
        for p in proposals:
            rule_name, edge_type, person_id, person_canon, role, snippet = p
            if rule_filter and rule_name not in rule_filter:
                continue
            related_types = {t for (t, oid) in existing_edges if oid == person_id}
            if edge_type in related_types:
                skipped_existing[edge_type] += 1
                continue
            # Conservative: skip if pair already has any generic relationship edge.
            # Includes legacy `affiliated` — such pairs belong to Phase 4A.2 reclassification,
            # not this backfill. Double-edging would create noise.
            blocking = {"employer", "member", "founder", "advisor", "affiliated"} & related_types
            if blocking:
                skipped_existing[f"{edge_type}_blocked_by_{sorted(blocking)[0]}"] += 1
                continue
            rule_counts[rule_name] += 1
            all_proposals.append((org_id, org_name, p))

    # --- Report ---
    out_lines = []
    def emit(s=""):
        out_lines.append(s)

    emit("# Backfill Org Edges — Proposal Report")
    emit(f"*Generated: {datetime.now(timezone.utc).isoformat()}*")
    emit()
    emit(f"- Orgs scanned: {len(orgs)} ({'flagged only' if not args.all_orgs else 'all orgs'})")
    emit(f"- Person names in lookup: {len(person_lookup)} "
         f"({dup_names} ambiguous — skipped silently)")
    emit(f"- Total proposals: {len(all_proposals)}")
    emit(f"- Proposals skipped (existing edge): {sum(skipped_existing.values())}")
    emit()
    emit("## Proposals by rule")
    for rn, cnt in sorted(rule_counts.items()):
        emit(f"- {rn}: {cnt}")
    emit()
    if skipped_existing:
        emit("## Skipped (existing edges by type)")
        for k, v in sorted(skipped_existing.items()):
            emit(f"- {k}: {v}")
        emit()

    by_type = defaultdict(list)
    for org_id, org_name, p in all_proposals:
        by_type[p[1]].append((org_id, org_name, p))

    for et in ["founder", "employer", "member"]:
        if et not in by_type:
            continue
        emit(f"## {et} edges ({len(by_type[et])})")
        emit()
        emit("| Org ID | Org | ← Person | Role | Rule | Evidence |")
        emit("| ---: | --- | --- | --- | --- | --- |")
        for org_id, org_name, p in sorted(by_type[et]):
            rule_name, _, person_id, person_canon, role, snippet = p
            snippet_safe = snippet.replace("|", "\\|")[:140]
            emit(f"| {org_id} | {org_name} | [{person_id}] {person_canon} | "
                 f"{role} | {rule_name} | {snippet_safe} |")
        emit()

    if args.live:
        emit("## APPLYING CHANGES...")
        applied = 0
        with conn.cursor() as cur:
            for org_id, org_name, p in all_proposals:
                _, edge_type, person_id, person_canon, role, snippet = p
                cur.execute(
                    """
                    INSERT INTO edge (source_id, target_id, edge_type, role, is_primary,
                                      evidence, confidence, created_by)
                    VALUES (%s, %s, %s, %s, FALSE, %s, 3, %s)
                    """,
                    (person_id, org_id, edge_type, role,
                     f"Backfilled from org notes: ...{snippet[-140:]}", CREATED_BY),
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
