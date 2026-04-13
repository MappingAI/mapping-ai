#!/usr/bin/env python3
"""
Phase 5H: Industry Analysis resources.

Populates the (previously empty) Industry Analysis resource_category bucket.

Actions:
  1. UPDATE entity 628 (Chip War): fix resource_category AI Governance →
     Industry Analysis; add resource_key_argument.
  2. INSERT SemiAnalysis (newsletter by Dylan Patel).
  3. INSERT Stratechery (newsletter by Ben Thompson) + author edge → [1841].
  4. INSERT State of AI Report (annual report) + author edge → [1860] Ian Hogarth.

Usage:
    python scripts/seed_industry_analysis.py           # dry run
    python scripts/seed_industry_analysis.py --live    # apply
    python scripts/seed_industry_analysis.py -o LOG.md
"""

import argparse
import os
import sys
from datetime import datetime, timezone

import psycopg2
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from seed_entity import seed_all

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set", file=sys.stderr)
    sys.exit(1)

# ── Verified IDs (staging, 2026-04-13) ────────────────────────────────
CHIP_WAR_ID     = 628
BEN_THOMPSON_ID = 1841
IAN_HOGARTH_ID  = 860

# ── New resource specs ─────────────────────────────────────────────────
NEW_SPECS = [
    {
        "name": "SemiAnalysis",
        "entity_type": "resource",
        "category": "Industry Analysis",
        "website": "https://www.semianalysis.com",
        "resource_type": "Substack/Newsletter",
        "resource_category": "Industry Analysis",
        "resource_title": "SemiAnalysis",
        "resource_url": "https://www.semianalysis.com",
        "resource_author": "Dylan Patel",
        "resource_year": "2020",
        "resource_key_argument": (
            "Deep technical analysis of semiconductor economics, AI chip "
            "architectures, and data center infrastructure. Patel's research "
            "on GPU supply chains, inference scaling, and hyperscaler capex "
            "is widely cited by investors, AI labs, and hardware teams as "
            "ground truth on the compute layer of the AI stack."
        ),
        "notes": (
            "SemiAnalysis is an independent research firm and newsletter "
            "founded by Dylan Patel. It publishes detailed technical reports "
            "on semiconductor supply chains, AI chip design (NVIDIA, AMD, "
            "custom ASICs), and the economics of AI data centers. Considered "
            "the definitive industry source on AI hardware and compute "
            "infrastructure; regularly cited in mainstream tech press and by "
            "Congressional staff examining chip export controls."
        ),
        "notes_sources": (
            "https://www.semianalysis.com/\n"
            "https://en.wikipedia.org/wiki/SemiAnalysis"
        ),
        "edges": [],
    },
    {
        "name": "Stratechery",
        "entity_type": "resource",
        "category": "Industry Analysis",
        "website": "https://stratechery.com",
        "resource_type": "Substack/Newsletter",
        "resource_category": "Industry Analysis",
        "resource_title": "Stratechery",
        "resource_url": "https://stratechery.com",
        "resource_author": "Ben Thompson",
        "resource_year": "2013",
        "resource_key_argument": (
            "Applies 'Aggregation Theory' — the idea that internet platforms "
            "that control demand can commoditize supply — to AI, arguing that "
            "AI accelerates the winner-take-most dynamics of platform markets "
            "and reshapes which layer (compute, model, application) captures value."
        ),
        "notes": (
            "Stratechery is a paid newsletter founded in 2013 by Ben Thompson "
            "covering the business strategy and competitive dynamics of the "
            "technology industry. Thompson's 'Aggregation Theory' framework "
            "is a foundational lens for analysts and policymakers thinking "
            "about AI platform power. His AI coverage — including interviews "
            "with OpenAI, Google, and Microsoft leadership — is widely read "
            "by tech executives, VCs, and policy staff tracking AI market "
            "structure."
        ),
        "notes_sources": (
            "https://stratechery.com/\n"
            "https://en.wikipedia.org/wiki/Stratechery"
        ),
        "edges": [
            {
                "direction": "to_new",
                "other_id": BEN_THOMPSON_ID,
                "edge_type": "author",
                "role": None,
                "is_primary": True,
                "evidence": "Ben Thompson is the sole founder and author of Stratechery (2013–present).",
                "source_url": "https://stratechery.com/about/",
            },
        ],
    },
    {
        "name": "State of AI Report",
        "entity_type": "resource",
        "category": "Industry Analysis",
        "website": "https://www.stateof.ai",
        "resource_type": "Report",
        "resource_category": "Industry Analysis",
        "resource_title": "State of AI Report",
        "resource_url": "https://www.stateof.ai",
        "resource_author": "Nathan Benaich, Ian Hogarth",
        "resource_year": "2024",
        "resource_key_argument": (
            "Annual benchmark of AI research output, industry investment, "
            "geopolitical competition, and safety incidents. Provides a "
            "comparative scorecard across frontier labs and nations; widely "
            "cited by investors and policymakers to track the pace and "
            "direction of AI development."
        ),
        "notes": (
            "The State of AI Report is an annual publication produced by "
            "investor Nathan Benaich and AI policy figure Ian Hogarth "
            "(former Chair of the UK AI Safety Institute). First published "
            "in 2018, it has become one of the most widely read annual "
            "reviews of AI progress, covering research breakthroughs, "
            "industry trends, geopolitical competition (US vs. China), "
            "and AI safety. The 2023 edition was downloaded over 1 million "
            "times and is routinely cited in government AI strategies and "
            "venture investment theses."
        ),
        "notes_sources": (
            "https://www.stateof.ai/\n"
            "https://en.wikipedia.org/wiki/State_of_AI_Report"
        ),
        "edges": [
            {
                "direction": "to_new",
                "other_id": IAN_HOGARTH_ID,
                "edge_type": "author",
                "role": None,
                "is_primary": True,
                "evidence": (
                    "Ian Hogarth co-founded the State of AI Report with "
                    "Nathan Benaich in 2018 and has co-authored every annual edition."
                ),
                "source_url": "https://www.stateof.ai/",
            },
        ],
    },
]


def fix_chip_war(cur, live=False):
    """Update Chip War category and add key argument."""
    key_arg = (
        "Traces how control of semiconductor manufacturing became the defining "
        "geopolitical contest of the 21st century; argues that chip supply "
        "chains — and the chokepoints within them — determine national power "
        "in the AI era, with implications for U.S. export controls and "
        "industrial policy."
    )
    print(f"{'APPLY' if live else 'DRY RUN'}: UPDATE entity {CHIP_WAR_ID} (Chip War)")
    print(f"  resource_category: 'AI Governance' → 'Industry Analysis'")
    print(f"  resource_key_argument: (adding)")
    if live:
        cur.execute(
            """
            UPDATE entity
               SET resource_category      = 'Industry Analysis',
                   resource_key_argument  = %s,
                   updated_at             = NOW()
             WHERE id = %s
            """,
            (key_arg, CHIP_WAR_ID),
        )
        print(f"  ✓ Updated {cur.rowcount} row(s).")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--live", action="store_true")
    parser.add_argument("-o", "--output", default=None)
    args = parser.parse_args()

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        fix_chip_war(cur, live=args.live)
        if args.live:
            conn.commit()
        print()
    except Exception as exc:
        conn.rollback()
        print(f"ERROR in fix_chip_war: {exc}", file=sys.stderr)
        conn.close()
        sys.exit(1)

    conn.close()

    # Seed new resources
    output = args.output or (
        f"enrichment/logs/seeding/industry-analysis-seeding-{datetime.now().strftime('%Y%m%d')}.md"
    )
    seed_all(
        NEW_SPECS,
        live=args.live,
        output=output,
        created_by="phase5h-industry-analysis",
        enrichment_version="phase5h-industry-analysis",
        confidence=4,
    )


if __name__ == "__main__":
    main()
