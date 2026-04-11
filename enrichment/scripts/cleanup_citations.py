#!/usr/bin/env python3
"""
Phase 2.2: Citation Artifact Cleanup

Strips inline citation markers ([1], [2,3], etc.) from entity notes.
These are leftover artifacts from source-backed note generation —
the actual sources live in notes_sources.

Usage:
    python cleanup_citations.py              # dry run (default)
    python cleanup_citations.py --live       # apply changes
    python cleanup_citations.py -o FILE      # write report to file
"""

import argparse
import os
import re
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

# Matches [1], [2,3], [1, 2, 3], [10,11], etc.
CITATION_PATTERN = re.compile(r"\[\d+(?:,\s*\d+)*\]")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def get_connection():
    return psycopg2.connect(DATABASE_URL)


def strip_citations(text):
    """Remove citation artifacts and clean up resulting whitespace."""
    cleaned = CITATION_PATTERN.sub("", text)
    cleaned = re.sub(r"  +", " ", cleaned)
    cleaned = re.sub(r" ([.,;:!?])", r"\1", cleaned)
    cleaned = re.sub(r" +$", "", cleaned, flags=re.MULTILINE)
    return cleaned.strip()


def find_affected(conn):
    """Return entities with citation artifacts in notes."""
    with conn.cursor() as cur:
        cur.execute(r"""
            SELECT id, name, entity_type, notes
            FROM entity
            WHERE notes ~ '\[\d+\]'
            ORDER BY id
        """)
        return cur.fetchall()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Strip citation artifacts from entity notes"
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

    out(f"# Citation Artifact Cleanup — {mode}")
    out(f"*{now}*")
    out()

    # ---- Find affected entities ----
    affected = find_affected(conn)
    out(f"**Entities with citation artifacts:** {len(affected)}")
    out()

    type_counts = {}
    for _, _, etype, _ in affected:
        type_counts[etype] = type_counts.get(etype, 0) + 1
    out("| Entity Type | Count |")
    out("| ----------- | ----: |")
    for etype, count in sorted(type_counts.items(), key=lambda x: -x[1]):
        out(f"| {etype} | {count} |")
    out()

    # ---- Build change list ----
    changes = []
    for eid, name, etype, notes in affected:
        citations = CITATION_PATTERN.findall(notes)
        cleaned = strip_citations(notes)
        if cleaned != notes:
            chars_removed = len(notes) - len(cleaned)
            changes.append((eid, name, etype, len(citations), chars_removed,
                            notes, cleaned))

    total_citations = sum(c[3] for c in changes)
    total_chars = sum(c[4] for c in changes)
    out(f"**Entities to update:** {len(changes)}")
    out(f"**Total citations to remove:** {total_citations}")
    out(f"**Total characters to remove:** {total_chars}")
    out()

    # ---- Sample before/after ----
    out("## Sample Changes (first 5)")
    out()
    for eid, name, etype, num_cit, chars_rm, original, cleaned in changes[:5]:
        out(f"### ID {eid}: {name} ({etype})")
        out(f"- Citations: {num_cit}, characters removed: {chars_rm}")
        out()
        snip = 250
        out("**Before:**")
        out(f"> {original[:snip]}{'...' if len(original) > snip else ''}")
        out()
        out("**After:**")
        out(f"> {cleaned[:snip]}{'...' if len(cleaned) > snip else ''}")
        out()

    # ---- Full entity list ----
    out("## All Affected Entities")
    out()
    out("| ID | Name | Type | Citations | Chars Removed |")
    out("| -: | ---- | ---- | --------: | ------------: |")
    for eid, name, etype, num_cit, chars_rm, _, _ in changes:
        out(f"| {eid} | {name} | {etype} | {num_cit} | {chars_rm} |")
    out()

    # ---- Apply ----
    if args.live:
        out("## Results")
        out()
        updated_ids = []
        with conn.cursor() as cur:
            for eid, _, _, _, _, _, cleaned in changes:
                cur.execute("UPDATE entity SET notes = %s WHERE id = %s",
                            (cleaned, eid))
                updated_ids.append(eid)

        conn.commit()
        out(f"**Updated:** {len(updated_ids)} entities")
        out(f"**Entity IDs:** {', '.join(str(i) for i in updated_ids)}")
        out()

        # Verify no remaining artifacts
        remaining = find_affected(conn)
        out(f"**Remaining citation artifacts:** {len(remaining)}")
        if remaining:
            out()
            out("| ID | Name | Remaining |")
            out("| -: | ---- | --------: |")
            for eid, name, _, notes in remaining:
                count = len(CITATION_PATTERN.findall(notes))
                out(f"| {eid} | {name} | {count} |")
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
