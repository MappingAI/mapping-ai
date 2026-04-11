#!/usr/bin/env python3
"""
Phase 2 Manual Review — 25 random samples per cleanup stage.

Queries the staging database directly. For each sample, prints enough
context for a human to judge whether the change is correct.

Usage:
    python review_phase2.py edges
    python review_phase2.py citations
    python review_phase2.py beliefs
    python review_phase2.py all          # run all three
"""

import argparse
import os
import re
import sys
import textwrap

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

CITATION_RE = re.compile(r"\[\d+(?:,\s*\d+)*\]")

CANONICAL_EDGE_TYPES = {
    "employer", "founder", "funder", "parent_company", "advisor", "member",
    "author", "publisher", "collaborator", "partner", "critic", "supporter",
}

# Expected source→target entity types for canonical edges.
# None = any type is acceptable.
EXPECTED_DIR = {
    "employer":       ("person", "organization"),
    "founder":        ("person", "organization"),
    "funder":         (None, None),
    "parent_company": ("organization", "organization"),
    "advisor":        ("person", None),
    "member":         ("person", "organization"),
    "author":         ("person", "resource"),
    "publisher":      ("organization", "resource"),
    "collaborator":   (None, None),
    "partner":        (None, None),
    "critic":         ("person", None),
    "supporter":      ("person", None),
}

SAMPLE_SIZE = 25


def get_connection():
    return psycopg2.connect(DATABASE_URL)


def header(title):
    print()
    print("=" * 70)
    print(title)
    print("=" * 70)


def wrap(text, width=72, indent="    "):
    """Word-wrap text with indent for display."""
    return textwrap.indent(textwrap.fill(text, width), indent)


# ---------------------------------------------------------------------------
# Edge review
# ---------------------------------------------------------------------------

def review_edges(conn):
    header("EDGE NORMALIZATION — 25 Random Edges")
    print()
    print("  Verify for each edge:")
    print("    1. Does the edge_type match the actual relationship?")
    print("    2. Is the direction correct? (source → target)")
    print("    3. Is the role reasonable (if set)?")
    print()
    print("  FLAG meanings:")
    print("    ⚠  DIRECTION — source or target entity type doesn't match")
    print("       the expected pattern for this edge type")
    print()

    with conn.cursor() as cur:
        cur.execute("""
            SELECT e.id, e.edge_type, e.role, e.evidence,
                   s.id, s.name, s.entity_type,
                   t.id, t.name, t.entity_type
            FROM edge e
            JOIN entity s ON e.source_id = s.id
            JOIN entity t ON e.target_id = t.id
            WHERE e.edge_type IN %s
            ORDER BY RANDOM()
            LIMIT %s
        """, (tuple(CANONICAL_EDGE_TYPES), SAMPLE_SIZE))
        rows = cur.fetchall()

    flagged = 0
    for i, (eid, etype, role, evidence,
            sid, sname, stype, tid, tname, ttype) in enumerate(rows, 1):
        exp_src, exp_tgt = EXPECTED_DIR.get(etype, (None, None))
        bad_src = exp_src and stype != exp_src
        bad_tgt = exp_tgt and ttype != exp_tgt
        flag = bad_src or bad_tgt

        marker = "⚠ " if flag else "  "
        if flag:
            flagged += 1

        print(f"{marker}[{i:>2}/{SAMPLE_SIZE}]  Edge {eid}  |  {etype}" +
              (f"  (role: {role})" if role else ""))
        print(f"       {sname} ({stype})  →  {tname} ({ttype})")
        if evidence:
            print(f"       Evidence: {evidence[:120]}{'...' if len(evidence) > 120 else ''}")
        if flag:
            exp = f"{exp_src or '*'}→{exp_tgt or '*'}"
            actual = f"{stype}→{ttype}"
            print(f"       ⚠  Expected {exp}, got {actual}")
        print()

    print("-" * 70)
    print(f"  {SAMPLE_SIZE} edges reviewed, {flagged} flagged for direction")
    print()


# ---------------------------------------------------------------------------
# Citation review
# ---------------------------------------------------------------------------

def review_citations(conn):
    header("CITATION CLEANUP — 25 Random Cleaned Entities")
    print()
    print("  Verify for each entity:")
    print("    1. No citation markers remain ([1], [2,3], etc.)")
    print("    2. Text reads naturally — no double spaces or orphaned punctuation")
    print("    3. No content was accidentally removed")
    print()
    print("  Where notes_v1 is available, citations in the original are")
    print("  highlighted with ← markers so you can see what was stripped.")
    print()

    # Strategy: find entities where notes_v1 has citation patterns but
    # current notes does not — these are confirmed cleaned entities with
    # a real before/after comparison available.
    with conn.cursor() as cur:
        cur.execute(r"""
            SELECT id, name, entity_type, notes, notes_v1
            FROM entity
            WHERE notes_v1 IS NOT NULL
              AND notes_v1 ~ '\[\d+\]'
              AND (notes IS NULL OR NOT notes ~ '\[\d+\]')
            ORDER BY RANDOM()
            LIMIT %s
        """, (SAMPLE_SIZE,))
        rows = cur.fetchall()

    # If notes_v1 doesn't have citations (enrichment added them after
    # notes_v1 was set), fall back to entities with clean notes that
    # differ from notes_v1.
    if len(rows) < SAMPLE_SIZE:
        remaining = SAMPLE_SIZE - len(rows)
        seen_ids = {r[0] for r in rows}
        with conn.cursor() as cur:
            cur.execute(r"""
                SELECT id, name, entity_type, notes, notes_v1
                FROM entity
                WHERE notes IS NOT NULL
                  AND LENGTH(notes) > 100
                  AND NOT notes ~ '\[\d+\]'
                  AND notes_v1 IS NOT NULL
                  AND notes != notes_v1
                ORDER BY RANDOM()
                LIMIT %s
            """, (remaining + 10,))
            for row in cur.fetchall():
                if row[0] not in seen_ids and len(rows) < SAMPLE_SIZE:
                    rows.append(row)
                    seen_ids.add(row[0])

    for i, (eid, name, etype, notes, notes_v1) in enumerate(rows, 1):
        print(f"  [{i:>2}/{SAMPLE_SIZE}]  Entity {eid}: {name} ({etype})")
        print()

        notes = notes or ""
        notes_v1 = notes_v1 or ""

        cits_before = CITATION_RE.findall(notes_v1)
        cits_after = CITATION_RE.findall(notes)

        if cits_before:
            # Mark citations in the before text
            marked = CITATION_RE.sub(lambda m: f" ←{m.group()}→ ", notes_v1)
            print("    BEFORE (notes_v1) — citations marked with ← →:")
            print(wrap(marked[:400]))
            if len(marked) > 400:
                print("    ...")
            print()
            print("    AFTER (notes):")
            print(wrap(notes[:400]))
            if len(notes) > 400:
                print("    ...")
            print()
            print(f"    Citations removed: {len(cits_before)}  |  "
                  f"Remaining: {len(cits_after)}")
        else:
            # notes_v1 didn't have citations — just show current notes
            print("    (notes_v1 has no citations — showing current notes only)")
            print()
            print("    CURRENT NOTES:")
            print(wrap(notes[:400]))
            if len(notes) > 400:
                print("    ...")
            print()
            print(f"    Citation artifacts in current text: {len(cits_after)}")

        print()
        print("    " + "-" * 50)
        print()

    remaining_total = _count_remaining_citations(conn)
    print("-" * 70)
    print(f"  {len(rows)} entities reviewed")
    print(f"  Total entities still containing citation artifacts: "
          f"{remaining_total}")
    print()


def _count_remaining_citations(conn):
    with conn.cursor() as cur:
        cur.execute(r"SELECT COUNT(*) FROM entity WHERE notes ~ '\[\d+\]'")
        return cur.fetchone()[0]


# ---------------------------------------------------------------------------
# Belief review
# ---------------------------------------------------------------------------

def review_beliefs(conn):
    header("BELIEF NORMALIZATION — 25 Random Normalized Entities")
    print()
    print("  Phase 2 mapped non-canonical belief values to canonical ones:")
    print("    • belief_agi_timeline: 'Ill-defined concept' → 'Ill-defined'")
    print("    • belief_evidence_source:")
    print("        'Inferred from actions/associations' → 'Inferred'")
    print("        'Public statements/Policy proposals'  → 'Explicitly stated'")
    print("        Various campaign-related values        → 'Inferred'")
    print()
    print("  Verify: does the canonical value make sense for this entity?")
    print()

    with conn.cursor() as cur:
        # Sample from entities most likely to have been normalized:
        # evidence_source='Inferred' (136 total, 102 were migrated) or
        # agi_timeline='Ill-defined' (21 total, 2 were migrated)
        cur.execute("""
            SELECT id, name, entity_type, category,
                   belief_regulatory_stance,
                   belief_agi_timeline,
                   belief_ai_risk,
                   belief_evidence_source,
                   LEFT(notes, 200) AS notes_snippet
            FROM entity
            WHERE belief_evidence_source = 'Inferred'
               OR belief_agi_timeline = 'Ill-defined'
            ORDER BY RANDOM()
            LIMIT %s
        """, (SAMPLE_SIZE,))
        rows = cur.fetchall()

    for i, (eid, name, etype, cat, reg, agi, risk,
            evidence, snippet) in enumerate(rows, 1):
        # Flag which field was likely normalized
        flags = []
        if evidence == "Inferred":
            flags.append("evidence_source → Inferred")
        if agi == "Ill-defined":
            flags.append("agi_timeline → Ill-defined")

        print(f"  [{i:>2}/{SAMPLE_SIZE}]  Entity {eid}: {name} ({etype}"
              + (f", {cat}" if cat else "") + ")")
        print(f"    Normalized: {', '.join(flags)}")
        print()
        print(f"    regulatory_stance:  {reg or '(null)'}")
        print(f"    agi_timeline:       {agi or '(null)'}")
        print(f"    ai_risk:            {risk or '(null)'}")
        print(f"    evidence_source:    {evidence or '(null)'}")
        if snippet:
            print()
            print("    Notes excerpt:")
            print(wrap(snippet))
        print()
        print("    " + "-" * 50)
        print()

    # Confirm no non-canonical values remain
    _check_belief_residuals(conn)


def _check_belief_residuals(conn):
    canonical_evidence = {
        "Explicitly stated", "Inferred", "Unknown",
    }
    canonical_agi = {
        "Unknown", "5-10 years", "2-3 years", "10-25 years",
        "Ill-defined", "25+ years or never", "Already here",
    }

    with conn.cursor() as cur:
        cur.execute("""
            SELECT DISTINCT belief_evidence_source
            FROM entity
            WHERE belief_evidence_source IS NOT NULL
        """)
        current_ev = {r[0] for r in cur.fetchall()}

        cur.execute("""
            SELECT DISTINCT belief_agi_timeline
            FROM entity
            WHERE belief_agi_timeline IS NOT NULL
        """)
        current_agi = {r[0] for r in cur.fetchall()}

    bad_ev = current_ev - canonical_evidence
    bad_agi = current_agi - canonical_agi

    print("-" * 70)
    if bad_ev:
        print(f"  ⚠  Non-canonical belief_evidence_source values: {bad_ev}")
    else:
        print("  ✓  All belief_evidence_source values are canonical")

    if bad_agi:
        print(f"  ⚠  Non-canonical belief_agi_timeline values: {bad_agi}")
    else:
        print("  ✓  All belief_agi_timeline values are canonical")
    print()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

COMMANDS = {
    "edges": review_edges,
    "citations": review_citations,
    "beliefs": review_beliefs,
}


def main():
    parser = argparse.ArgumentParser(
        description="Manual review of Phase 2 database changes"
    )
    parser.add_argument(
        "stage",
        choices=list(COMMANDS.keys()) + ["all"],
        help="Which stage to review (or 'all')",
    )
    parser.add_argument(
        "-o", "--output",
        help="Write output to file (in addition to stdout)",
    )
    args = parser.parse_args()

    conn = get_connection()

    if args.output:
        import io

        class Tee:
            def __init__(self, *streams):
                self.streams = streams
            def write(self, data):
                for s in self.streams:
                    s.write(data)
            def flush(self):
                for s in self.streams:
                    s.flush()

        outfile = open(args.output, "w")
        sys.stdout = Tee(sys.__stdout__, outfile)

    try:
        if args.stage == "all":
            for fn in COMMANDS.values():
                fn(conn)
        else:
            COMMANDS[args.stage](conn)
    finally:
        conn.close()
        if args.output:
            sys.stdout = sys.__stdout__
            outfile.close()
            print(f"\nOutput saved to {args.output}")


if __name__ == "__main__":
    main()
