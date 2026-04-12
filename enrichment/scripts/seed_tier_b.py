#!/usr/bin/env python3
"""
Phase 5B: Tier B seeding run — 6 canonical orgs flagged as missing by
the Phase 5A gap analysis.

Seeds are based on training-data knowledge (cutoff May 2025) — confidence=3.
Notes should be verified against sources before promotion.

Deliberately NOT seeded in this pass:
  - CAISI   — uncertain whether created/renamed post-Trump-admin NIST reorg
  - Nancy Pelosi — does not clearly pass the ONBOARDING "don't add randos"
                   bar for AI policy specifically

Usage:
    python scripts/seed_tier_b.py                 # dry run
    python scripts/seed_tier_b.py --live          # apply
    python scripts/seed_tier_b.py -o LOG.md       # write report
"""

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from seed_entity import seed_all

# Existing entity IDs we anchor to (verified 2026-04-12):
COMMERCE_ID        = 914     # Department of Commerce
WHITE_HOUSE_ID     = 1031    # White House
STATE_DEPT_ID      = 1157    # U.S. Department of State
SULEYMAN_ID        = 1365    # Mustafa Suleyman
HOFFMAN_ID         = 848     # Reid Hoffman


SPECS = [
    # ── 1. Cohere ──────────────────────────────────────────────────────
    {
        "name": "Cohere",
        "entity_type": "organization",
        "category": "Frontier Lab",
        "website": "https://cohere.com",
        "notes": (
            "Canadian enterprise-focused AI company founded in 2019 by Aidan "
            "Gomez (co-author of 'Attention Is All You Need'), Nick Frosst, and "
            "Ivan Zhang. Builds large language models and operates the Cohere "
            "For AI non-profit research lab. Backed by Inovia, Tiger Global, "
            "NVIDIA, and Fujitsu; reached a $5.5B valuation in 2024. "
            "Participates in North American frontier-AI policy discussions "
            "and has signed multiple voluntary AI commitments."
        ),
        "notes_sources": (
            "https://cohere.com/about\n"
            "https://cohere.com/research\n"
            "https://en.wikipedia.org/wiki/Cohere"
        ),
        "edges": [
            # Founders not in DB — flag as Discovered Work
        ],
    },

    # ── 2. Inflection AI ───────────────────────────────────────────────
    {
        "name": "Inflection AI",
        "entity_type": "organization",
        "category": "Frontier Lab",
        "website": "https://inflection.ai",
        "notes": (
            "AI startup founded in 2022 by Mustafa Suleyman, Reid Hoffman, and "
            "Karén Simonyan. Built the 'Pi' conversational AI assistant "
            "positioned as emotionally intelligent and personal. In March 2024, "
            "Microsoft hired most of Inflection's staff (including Suleyman as "
            "CEO of Microsoft AI) and licensed Inflection's technology in a "
            "~$650M deal. The remaining company pivoted to enterprise AI under "
            "CEO Sean White."
        ),
        "notes_sources": (
            "https://inflection.ai/\n"
            "https://www.ft.com/content/4181c2f7-c31b-4a61-8ffd-c5db4bdcab89\n"
            "https://en.wikipedia.org/wiki/Inflection_AI"
        ),
        "edges": [
            {
                "direction": "to_new",
                "other_id": SULEYMAN_ID,
                "edge_type": "founder",
                "role": "Co-founder (2022) and former CEO; departed for Microsoft 2024",
                "is_primary": False,
                "evidence": "Mustafa Suleyman co-founded Inflection AI in 2022 and served as CEO until joining Microsoft as CEO of Microsoft AI in March 2024.",
                "source_url": "https://www.ft.com/content/4181c2f7-c31b-4a61-8ffd-c5db4bdcab89",
            },
            {
                "direction": "to_new",
                "other_id": HOFFMAN_ID,
                "edge_type": "founder",
                "role": "Co-founder",
                "is_primary": False,
                "evidence": "Reid Hoffman co-founded Inflection AI with Mustafa Suleyman and Karén Simonyan in 2022.",
                "source_url": "https://inflection.ai/",
            },
        ],
    },

    # ── 3. BIS ─────────────────────────────────────────────────────────
    {
        "name": "Bureau of Industry and Security (BIS)",
        "entity_type": "organization",
        "category": "Government/Agency",
        "website": "https://www.bis.doc.gov",
        "parent_org_id": COMMERCE_ID,
        "notes": (
            "Commerce Department sub-agency that administers U.S. export "
            "controls under the Export Administration Regulations (EAR). BIS "
            "designed and enforces the semiconductor export controls targeting "
            "China first adopted October 2022 and significantly expanded "
            "October 2023 — the primary U.S. regulatory lever on frontier-AI "
            "compute. Issues licenses, foreign-direct-product rules, and "
            "enforcement actions affecting NVIDIA, AMD, TSMC, and downstream "
            "chip consumers. Also oversees the Entity List."
        ),
        "notes_sources": (
            "https://www.bis.doc.gov/\n"
            "https://www.federalregister.gov/documents/2023/10/25/2023-23055/implementation-of-additional-export-controls-certain-advanced-computing-items-supercomputer-and\n"
            "https://www.bis.doc.gov/index.php/policy-guidance/advanced-computing-and-semiconductor-manufacturing-items-export-controls"
        ),
        "edges": [
            {
                "direction": "from_new",
                "other_id": COMMERCE_ID,
                "edge_type": "parent_company",
                "role": "Sub-agency within Commerce",
                "is_primary": False,
                "evidence": "BIS is an agency within the U.S. Department of Commerce.",
                "source_url": "https://www.bis.doc.gov/index.php/about-bis",
            },
        ],
    },

    # ── 4. NSC ─────────────────────────────────────────────────────────
    {
        "name": "National Security Council (NSC)",
        "entity_type": "organization",
        "category": "Government/Agency",
        "website": "https://www.whitehouse.gov/nsc/",
        "parent_org_id": WHITE_HOUSE_ID,
        "notes": (
            "White House body that coordinates national-security, foreign-"
            "policy, and technology-and-security policy across federal "
            "agencies. Chaired by the President; led operationally by the "
            "National Security Advisor. Hosts the Director for Technology and "
            "National Security portfolio, which coordinates AI-and-national-"
            "security policy including chip export controls, compute access, "
            "and military AI use. Originating home of the 2023 Biden AI "
            "Executive Order process."
        ),
        "notes_sources": (
            "https://www.whitehouse.gov/nsc/\n"
            "https://en.wikipedia.org/wiki/United_States_National_Security_Council"
        ),
        "edges": [
            {
                "direction": "from_new",
                "other_id": WHITE_HOUSE_ID,
                "edge_type": "parent_company",
                "role": "Within the Executive Office of the President",
                "is_primary": False,
                "evidence": "The NSC sits within the Executive Office of the President / White House.",
                "source_url": "https://www.whitehouse.gov/nsc/",
            },
        ],
    },

    # ── 5. PCAST ───────────────────────────────────────────────────────
    {
        "name": "President's Council of Advisors on Science and Technology (PCAST)",
        "entity_type": "organization",
        "category": "Government/Agency",
        "website": "https://www.whitehouse.gov/pcast/",
        "parent_org_id": WHITE_HOUSE_ID,
        "notes": (
            "Federal advisory committee to the President and White House on "
            "science, technology, and innovation policy. Members are external "
            "experts from academia and industry, appointed by the President. "
            "Issued the landmark April 2024 report 'Supercharging Research: "
            "Harnessing Artificial Intelligence to Meet Global Challenges', "
            "which shaped Biden-era federal AI science priorities and is a "
            "reference document for subsequent policy debates."
        ),
        "notes_sources": (
            "https://www.whitehouse.gov/pcast/\n"
            "https://en.wikipedia.org/wiki/President%27s_Council_of_Advisors_on_Science_and_Technology"
        ),
        "edges": [
            {
                "direction": "from_new",
                "other_id": WHITE_HOUSE_ID,
                "edge_type": "parent_company",
                "role": "Advisory committee reporting to the President",
                "is_primary": False,
                "evidence": "PCAST is a White House advisory committee reporting to the President.",
                "source_url": "https://www.whitehouse.gov/pcast/",
            },
        ],
    },

    # ── 6. Bureau of Cyberspace and Digital Policy (CDP) ───────────────
    {
        "name": "Bureau of Cyberspace and Digital Policy (CDP)",
        "entity_type": "organization",
        "category": "Government/Agency",
        "website": "https://www.state.gov/bureaus-offices/bureau-of-cyberspace-and-digital-policy/",
        "parent_org_id": STATE_DEPT_ID,
        "notes": (
            "State Department bureau established April 2022 that leads U.S. "
            "diplomacy on cybersecurity, digital freedom, and international "
            "technology governance including AI. CDP coordinates U.S. "
            "positions at the UN, G7, OECD, and Council of Europe on AI "
            "governance, and engages with allied governments on trusted-AI "
            "frameworks and standards. Headed by the U.S. Ambassador at Large "
            "for Cyberspace and Digital Policy."
        ),
        "notes_sources": (
            "https://www.state.gov/bureaus-offices/bureau-of-cyberspace-and-digital-policy/\n"
            "https://www.state.gov/establishment-of-the-bureau-of-cyberspace-and-digital-policy/"
        ),
        "edges": [
            {
                "direction": "from_new",
                "other_id": STATE_DEPT_ID,
                "edge_type": "parent_company",
                "role": "Bureau within State",
                "is_primary": False,
                "evidence": "CDP is a bureau within the U.S. Department of State, established in 2022.",
                "source_url": "https://www.state.gov/establishment-of-the-bureau-of-cyberspace-and-digital-policy/",
            },
        ],
    },
]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--live", action="store_true")
    parser.add_argument("-o", "--output", help="Write report to file")
    args = parser.parse_args()
    seed_all(SPECS, live=args.live, output=args.output,
             created_by="phase5b-seed",
             enrichment_version="phase5-seed",
             confidence=3)


if __name__ == "__main__":
    main()
