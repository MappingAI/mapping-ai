#!/usr/bin/env python3
"""
Phase 5D: Tier D — founder backfill + CSIS entity fix.

Two operations:

  1. Rewrite entity 349 ("CSIS AI Policy Podcast ...") to represent the
     parent think tank (Center for Strategic and International Studies).
     Changes: name, category, website, notes, notes_sources. Edges
     unaffected (there are none pointing at 349 today).

  2. Seed 5 persons with founder/employer edges to existing orgs:
       * Aidan Gomez, Nick Frosst, Ivan Zhang → Cohere [1787]
       * Karén Simonyan → Inflection AI [1788] (founder) + Microsoft [1042] (current)
       * Gregory C. Allen → CSIS [349] (post-rewrite)

  Aidan Gomez additionally gets an `author` edge to Attention Is All You
  Need [1804] (seeded in Tier E) since he was one of the eight original
  authors.

Usage:
    python scripts/seed_tier_d.py              # dry run
    python scripts/seed_tier_d.py --live       # apply
    python scripts/seed_tier_d.py -o LOG.md    # write report
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

# Existing / previously-seeded entity IDs (verified 2026-04-12):
COHERE_ID           = 1787
INFLECTION_ID       = 1788
MICROSOFT_ID        = 1042
GOOGLE_ID           = 1041
CSIS_ID             = 349
ATTENTION_PAPER_ID  = 1804


CSIS_UPDATE = {
    "id": CSIS_ID,
    "name": "Center for Strategic and International Studies (CSIS)",
    "category": "Think Tank/Policy Org",
    "website": "https://www.csis.org",
    "notes": (
        "Center for Strategic and International Studies (CSIS) is a "
        "bipartisan Washington, D.C.-based think tank founded in 1962. "
        "One of the leading U.S. foreign-policy and national-security "
        "research institutions. On AI, CSIS houses the Wadhwani AI Center "
        "(launched 2024, directed by Gregory C. Allen) which publishes "
        "research on AI and national security, chip export controls, and "
        "U.S.-China technology competition, and produces the biweekly "
        "CSIS AI Policy Podcast."
    ),
    "notes_sources": (
        "https://www.csis.org/\n"
        "https://www.csis.org/programs/wadhwani-ai-center\n"
        "https://www.csis.org/podcasts/ai-policy-podcast\n"
        "https://en.wikipedia.org/wiki/Center_for_Strategic_and_International_Studies"
    ),
}


SPECS = [
    # ── 1. Aidan Gomez → Cohere + Attention paper ─────────────────────
    {
        "name": "Aidan Gomez",
        "entity_type": "person",
        "category": "Executive",
        "title": "Co-founder and CEO, Cohere",
        "primary_org": "Cohere",
        "influence_type": "Builder, Decision-maker, Researcher/analyst",
        "notes": (
            "Aidan N. Gomez is co-founder and CEO of Cohere. Previously a "
            "research intern and then researcher affiliated with Google "
            "Brain, where he was one of the eight co-authors of the "
            "landmark 2017 paper 'Attention Is All You Need' introducing "
            "the Transformer architecture. Also co-founded the non-profit "
            "research organisation FOR.ai. Canadian; completed his DPhil "
            "in computer science at the University of Oxford."
        ),
        "notes_sources": (
            "https://cohere.com/about\n"
            "https://arxiv.org/abs/1706.03762\n"
            "https://en.wikipedia.org/wiki/Aidan_Gomez"
        ),
        "edges": [
            {
                "direction": "from_new",
                "other_id": COHERE_ID,
                "edge_type": "founder",
                "role": "Co-founder",
                "is_primary": False,
                "evidence": "Aidan Gomez co-founded Cohere in 2019 with Nick Frosst and Ivan Zhang.",
                "source_url": "https://cohere.com/about",
            },
            {
                "direction": "from_new",
                "other_id": COHERE_ID,
                "edge_type": "employer",
                "role": "CEO",
                "is_primary": True,
                "evidence": "Aidan Gomez serves as CEO of Cohere.",
                "source_url": "https://cohere.com/about",
            },
            {
                "direction": "from_new",
                "other_id": ATTENTION_PAPER_ID,
                "edge_type": "author",
                "role": "Co-author",
                "is_primary": False,
                "evidence": "Aidan N. Gomez is one of the eight co-authors of 'Attention Is All You Need' (2017).",
                "source_url": "https://arxiv.org/abs/1706.03762",
            },
        ],
    },

    # ── 2. Nick Frosst → Cohere ───────────────────────────────────────
    {
        "name": "Nick Frosst",
        "entity_type": "person",
        "category": "Executive",
        "title": "Co-founder, Cohere",
        "primary_org": "Cohere",
        "influence_type": "Builder, Decision-maker",
        "notes": (
            "Nick Frosst is a co-founder of Cohere (2019). Previously a "
            "research scientist at Google Brain, where he worked with "
            "Geoffrey Hinton on capsule networks and other deep-learning "
            "architectures. Canadian; also the lead singer of the indie "
            "band Good Kid."
        ),
        "notes_sources": (
            "https://cohere.com/about\n"
            "https://en.wikipedia.org/wiki/Cohere"
        ),
        "edges": [
            {
                "direction": "from_new",
                "other_id": COHERE_ID,
                "edge_type": "founder",
                "role": "Co-founder",
                "is_primary": True,
                "evidence": "Nick Frosst co-founded Cohere in 2019 with Aidan Gomez and Ivan Zhang.",
                "source_url": "https://cohere.com/about",
            },
            {
                "direction": "from_new",
                "other_id": COHERE_ID,
                "edge_type": "employer",
                "role": "Co-founder",
                "is_primary": False,
                "evidence": "Nick Frosst is an ongoing employee of Cohere in a co-founder leadership capacity.",
                "source_url": "https://cohere.com/about",
            },
        ],
    },

    # ── 3. Ivan Zhang → Cohere ────────────────────────────────────────
    {
        "name": "Ivan Zhang",
        "entity_type": "person",
        "category": "Executive",
        "title": "Co-founder, Cohere",
        "primary_org": "Cohere",
        "influence_type": "Builder",
        "notes": (
            "Ivan Zhang is a co-founder of Cohere (2019), where he has led "
            "engineering and infrastructure. Previously worked with Aidan "
            "Gomez at FOR.ai, the research community that preceded Cohere. "
            "Canadian; dropped out of the University of Toronto to start "
            "the company."
        ),
        "notes_sources": (
            "https://cohere.com/about\n"
            "https://en.wikipedia.org/wiki/Cohere"
        ),
        "edges": [
            {
                "direction": "from_new",
                "other_id": COHERE_ID,
                "edge_type": "founder",
                "role": "Co-founder",
                "is_primary": True,
                "evidence": "Ivan Zhang co-founded Cohere in 2019 with Aidan Gomez and Nick Frosst.",
                "source_url": "https://cohere.com/about",
            },
            {
                "direction": "from_new",
                "other_id": COHERE_ID,
                "edge_type": "employer",
                "role": "Co-founder",
                "is_primary": False,
                "evidence": "Ivan Zhang is an ongoing employee of Cohere in a co-founder leadership capacity.",
                "source_url": "https://cohere.com/about",
            },
        ],
    },

    # ── 4. Karén Simonyan → Inflection + Microsoft ────────────────────
    {
        "name": "Karén Simonyan",
        "entity_type": "person",
        "category": "Researcher",
        "title": "Chief Scientist, Microsoft AI (former Inflection AI Chief Scientist and co-founder)",
        "primary_org": "Microsoft",
        "other_orgs": "Inflection AI (co-founder, 2022-2024)",
        "influence_type": "Researcher/analyst, Builder",
        "notes": (
            "Karén Simonyan is a co-founder of Inflection AI (2022), where "
            "he served as Chief Scientist. Previously a Principal Scientist "
            "at DeepMind, where he co-led the Deep Learning Scaling team "
            "and contributed to Gemini. Widely known in computer vision "
            "for the VGG architecture (Simonyan & Zisserman, 2014). Joined "
            "Microsoft in March 2024 alongside Mustafa Suleyman as part of "
            "the Inflection-to-Microsoft transition, serving as Chief "
            "Scientist of Microsoft AI."
        ),
        "notes_sources": (
            "https://inflection.ai/\n"
            "https://www.ft.com/content/4181c2f7-c31b-4a61-8ffd-c5db4bdcab89\n"
            "https://arxiv.org/abs/1409.1556"
        ),
        "edges": [
            {
                "direction": "from_new",
                "other_id": INFLECTION_ID,
                "edge_type": "founder",
                "role": "Co-founder and Chief Scientist (2022-2024)",
                "is_primary": False,
                "evidence": "Karén Simonyan co-founded Inflection AI with Mustafa Suleyman and Reid Hoffman in 2022.",
                "source_url": "https://inflection.ai/",
            },
            {
                "direction": "from_new",
                "other_id": MICROSOFT_ID,
                "edge_type": "employer",
                "role": "Chief Scientist, Microsoft AI",
                "is_primary": True,
                "evidence": "Karén Simonyan joined Microsoft as Chief Scientist of Microsoft AI in March 2024 following the Inflection-Microsoft deal.",
                "source_url": "https://www.ft.com/content/4181c2f7-c31b-4a61-8ffd-c5db4bdcab89",
            },
        ],
    },

    # ── 5. Gregory C. Allen → CSIS ────────────────────────────────────
    {
        "name": "Gregory C. Allen",
        "entity_type": "person",
        "category": "Researcher",
        "title": "Director, Wadhwani AI Center at CSIS",
        "primary_org": "Center for Strategic and International Studies (CSIS)",
        "influence_type": "Researcher/analyst, Advisor/strategist, Narrator",
        "notes": (
            "Gregory C. Allen is Director of the Wadhwani AI Center at "
            "CSIS, where he leads research on AI, national security, and "
            "U.S.-China technology competition. A leading public analyst "
            "of U.S. chip export controls (especially the October 2022 and "
            "October 2023 rules). Previously served as Director of "
            "Strategy and Policy at the U.S. Department of Defense's Joint "
            "Artificial Intelligence Center (JAIC, the predecessor to the "
            "CDAO office). Co-author of the influential 2017 report "
            "'Artificial Intelligence and National Security'. Hosts the "
            "biweekly CSIS AI Policy Podcast."
        ),
        "notes_sources": (
            "https://www.csis.org/people/gregory-c-allen\n"
            "https://www.csis.org/programs/wadhwani-ai-center\n"
            "https://www.csis.org/podcasts/ai-policy-podcast"
        ),
        "edges": [
            {
                "direction": "from_new",
                "other_id": CSIS_ID,
                "edge_type": "employer",
                "role": "Director, Wadhwani AI Center",
                "is_primary": True,
                "evidence": "Gregory C. Allen is Director of the Wadhwani AI Center at CSIS.",
                "source_url": "https://www.csis.org/people/gregory-c-allen",
            },
        ],
    },
]


def update_csis(live: bool, out):
    """UPDATE entity 349 (CSIS) with the corrected think-tank framing."""
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    cur.execute("""
        SELECT name, category, website FROM entity WHERE id = %s
    """, (CSIS_UPDATE["id"],))
    row = cur.fetchone()
    if not row:
        out(f"ERROR: entity {CSIS_UPDATE['id']} not found")
        conn.close()
        return False

    out("## CSIS entity rewrite (entity 349)")
    out()
    out("| field | before | after |")
    out("| --- | --- | --- |")
    out(f"| name | {row[0]} | {CSIS_UPDATE['name']} |")
    out(f"| category | {row[1]} | {CSIS_UPDATE['category']} |")
    out(f"| website | {row[2]} | {CSIS_UPDATE['website']} |")
    out(f"| notes | (podcast-focused, {'—'}) | (think tank-focused, {len(CSIS_UPDATE['notes'])} chars) |")
    out()

    if live:
        cur.execute("""
            UPDATE entity SET
                name = %s,
                category = %s,
                website = %s,
                notes = %s,
                notes_sources = %s,
                updated_at = NOW()
            WHERE id = %s
        """, (
            CSIS_UPDATE["name"],
            CSIS_UPDATE["category"],
            CSIS_UPDATE["website"],
            CSIS_UPDATE["notes"],
            CSIS_UPDATE["notes_sources"],
            CSIS_UPDATE["id"],
        ))
        conn.commit()
        out(f"✓ Updated entity {CSIS_UPDATE['id']}")
        out()
    else:
        out("*Dry run — CSIS entity not modified.*")
        out()

    conn.close()
    return True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--live", action="store_true")
    parser.add_argument("-o", "--output", help="Write report to file")
    args = parser.parse_args()

    # ── Step 1: CSIS entity rewrite ────────────────────────────────────
    lines = []
    def out(line=""):
        lines.append(line); print(line)

    mode = "LIVE RUN" if args.live else "DRY RUN"
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    out(f"# Tier D — founders + CSIS fix — {mode}")
    out(f"*{now}*")
    out()

    update_csis(args.live, out)

    # ── Step 2: seed 5 persons ─────────────────────────────────────────
    out("## Person seeds")
    out()
    seed_report = seed_all(
        SPECS, live=args.live, output=None,
        created_by="phase5d-seed",
        enrichment_version="phase5-seed",
        confidence=4,
    )

    # Write combined report (CSIS rewrite + seed_all output)
    if args.output:
        combined = lines + seed_report["lines"]
        with open(args.output, "w") as f:
            f.write("\n".join(combined) + "\n")
        print(f"\nCombined report saved to {args.output}")


if __name__ == "__main__":
    main()
