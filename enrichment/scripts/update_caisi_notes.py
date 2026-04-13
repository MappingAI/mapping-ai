#!/usr/bin/env python3
"""
Phase 5F/G tail — update entity 205 to reflect the June 2025 AISI → CAISI
rebrand under Commerce Secretary Howard Lutnick.

Changes:
  * name → "Center for AI Standards and Innovation (CAISI)"
    (was "U.S. AI Safety Institute (NIST)")
  * notes rewritten to cover: 2023 founding as AISI, Elizabeth Kelly's
    Feb 2025 departure, June 2025 rebrand and mission pivot, no confirmed
    successor director, continued home inside NIST/Commerce.
  * notes_sources refreshed with rebrand-era press and primary pages.

Unchanged: entity_type, category (Government/Agency), website (already
/caisi), edges. Historical AISI-era edges (e.g., Paul Christiano,
Elizabeth Kelly) are preserved — evidence text on those edges continues
to accurately describe AISI-era appointments.

Usage:
    python scripts/update_caisi_notes.py              # dry run
    python scripts/update_caisi_notes.py --live       # apply
    python scripts/update_caisi_notes.py -o LOG.md    # write report
"""

import argparse
import os
import sys
from datetime import datetime, timezone

import psycopg2
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set", file=sys.stderr)
    sys.exit(1)


CAISI_ID = 205

CAISI_UPDATE = {
    "id": CAISI_ID,
    "name": "Center for AI Standards and Innovation (CAISI)",
    "category": "Government/Agency",
    "website": "https://www.nist.gov/caisi",
    "notes": (
        "The Center for AI Standards and Innovation (CAISI) is a body "
        "within the National Institute of Standards and Technology (NIST) "
        "at the U.S. Department of Commerce. It was established on June "
        "3, 2025 when Commerce Secretary Howard Lutnick renamed and "
        "refocused the U.S. AI Safety Institute (AISI), which had been "
        "created under the Biden administration in November 2023 by "
        "Commerce Secretary Gina Raimondo. The rebrand dropped \"safety\" "
        "from the title and pivoted the mission from catastrophic-risk "
        "research toward national security, cybersecurity, "
        "chemical/biological weapons misuse evaluation, and global "
        "competitiveness with China. CAISI serves as industry's primary "
        "U.S. government point of contact for voluntary testing and "
        "collaborative research on commercial AI systems, develops "
        "security guidelines, conducts capability and vulnerability "
        "evaluations, and represents U.S. interests in international AI "
        "standards bodies. Inaugural AISI director Elizabeth Kelly — who "
        "helped author the 2023 Biden AI executive order — led the "
        "institute from February 2024 until her departure on February 5, "
        "2025 following the Trump transition; no public successor "
        "director has been confirmed as of early 2026. Under Kelly, AISI "
        "reached pre-deployment testing agreements with OpenAI and "
        "Anthropic and launched the Testing Risks of AI for National "
        "Security (TRAINS) Taskforce in November 2024. Paul Christiano "
        "and other AISI-era staff were hired prior to the rebrand."
    ),
    "notes_sources": "\n".join([
        "https://www.nist.gov/caisi",
        "https://www.commerce.gov/news/press-releases/2025/06/statement-us-secretary-commerce-howard-lutnick-transforming-us-ai",
        "https://www.techpolicy.press/from-safety-to-security-renaming-the-us-ai-safety-institute-is-not-just-semantics/",
        "https://fedscoop.com/trump-administration-rebrands-ai-safety-institute-aisi-caisi/",
        "https://www.bloomberg.com/news/articles/2025-02-04/head-of-us-ai-safety-institute-to-leave-as-trump-shifts-course",
        "https://www.nist.gov/news-events/news/2024/11/us-ai-safety-institute-establishes-new-us-government-taskforce-collaborate",
        "https://www.nist.gov/artificial-intelligence/artificial-intelligence-safety-institute",
        "https://en.wikipedia.org/wiki/AI_Safety_Institute",
    ]),
}


def update_caisi(live: bool, out):
    """UPDATE entity 205 to reflect the AISI → CAISI rebrand."""
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    cur.execute("""
        SELECT name, category, website, LENGTH(notes), enrichment_version
        FROM entity WHERE id = %s
    """, (CAISI_UPDATE["id"],))
    row = cur.fetchone()
    if not row:
        out(f"ERROR: entity {CAISI_UPDATE['id']} not found")
        conn.close()
        return False

    before_name, before_cat, before_site, before_notes_len, before_ver = row

    out(f"## CAISI entity rewrite (entity {CAISI_UPDATE['id']})")
    out()
    out("| field | before | after |")
    out("| --- | --- | --- |")
    out(f"| name | {before_name} | {CAISI_UPDATE['name']} |")
    out(f"| category | {before_cat} | {CAISI_UPDATE['category']} (unchanged) |")
    out(f"| website | {before_site} | {CAISI_UPDATE['website']} (unchanged) |")
    out(f"| notes length | {before_notes_len} chars | {len(CAISI_UPDATE['notes'])} chars |")
    out(f"| notes_sources | (9 URLs, AISI-era) | ({len(CAISI_UPDATE['notes_sources'].splitlines())} URLs, rebrand-refreshed) |")
    out(f"| enrichment_version | {before_ver} | phase5-tail |")
    out()

    # Check existing edges — we keep them as-is but report count
    cur.execute("""
        SELECT COUNT(*) FROM edge
        WHERE source_id = %s OR target_id = %s
    """, (CAISI_UPDATE["id"], CAISI_UPDATE["id"]))
    edge_count = cur.fetchone()[0]
    out(f"Existing edges preserved: **{edge_count}**")
    out()

    if live:
        cur.execute("""
            UPDATE entity SET
                name = %s,
                category = %s,
                website = %s,
                notes = %s,
                notes_sources = %s,
                enrichment_version = 'phase5-tail',
                updated_at = NOW()
            WHERE id = %s
        """, (
            CAISI_UPDATE["name"],
            CAISI_UPDATE["category"],
            CAISI_UPDATE["website"],
            CAISI_UPDATE["notes"],
            CAISI_UPDATE["notes_sources"],
            CAISI_UPDATE["id"],
        ))
        conn.commit()
        out(f"[OK] Updated entity {CAISI_UPDATE['id']}")
        out()
    else:
        out("*Dry run — entity not modified.*")
        out()
        out("### New notes preview")
        out()
        out("> " + CAISI_UPDATE["notes"].replace("\n", "\n> "))
        out()

    conn.close()
    return True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--live", action="store_true")
    parser.add_argument("-o", "--output", help="Write report to file")
    args = parser.parse_args()

    lines = []
    def out(line=""):
        lines.append(line)
        print(line)

    mode = "LIVE RUN" if args.live else "DRY RUN"
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    out(f"# CAISI rebrand update — {mode}")
    out(f"*{now}*")
    out()

    update_caisi(args.live, out)

    if args.output:
        with open(args.output, "w") as f:
            f.write("\n".join(lines) + "\n")
        print(f"\nReport saved to {args.output}")


if __name__ == "__main__":
    main()
