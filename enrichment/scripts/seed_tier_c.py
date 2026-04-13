#!/usr/bin/env python3
"""
Phase 5C: Tier C seeding — 9 leadership persons for existing government
and lab orgs, drawn from training-data knowledge (cutoff May 2025).

IMPORTANT: some of these appointments may have changed under the Trump
administration (Jan 2025 onwards). Each person is seeded at confidence=3
with language that describes their known appointment (year) rather than
asserting current tenure, and belief fields are left NULL.

Notes should be verified against sources and current status before any
belief-field backfill or importance rating.

Usage:
    python scripts/seed_tier_c.py              # dry run
    python scripts/seed_tier_c.py --live       # apply
    python scripts/seed_tier_c.py -o LOG.md    # write report
"""

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from seed_entity import seed_all


# Existing org IDs verified 2026-04-12:
AISI_ID        = 205    # U.S. AI Safety Institute (NIST)
ANTHROPIC_ID   = 133
CAIP_ID        = 443    # Center for AI Policy
DOD_ID         = 1420   # Department of Defense
FTC_ID         = 909    # Federal Trade Commission
NIST_ID        = 1309   # National Institute of Standards and Technology
NSF_ID         = 1185   # U.S. National Science Foundation
OMB_ID         = 1295   # Office of Management and Budget


SPECS = [
    # ── Elizabeth Kelly → AISI ─────────────────────────────────────────
    {
        "name": "Elizabeth Kelly",
        "entity_type": "person",
        "category": "Policymaker",
        "title": "Inaugural Director, U.S. AI Safety Institute",
        "primary_org": "U.S. AI Safety Institute (NIST)",
        "influence_type": "Decision-maker, Implementer",
        "notes": (
            "Elizabeth Kelly was named the inaugural Director of the U.S. AI "
            "Safety Institute within NIST in February 2024, tasked with "
            "operationalizing AI evaluations and red-teaming under the Biden "
            "AI Executive Order. Previously served as Special Assistant to "
            "the President for Economic Policy at the White House National "
            "Economic Council, where she focused on financial-sector "
            "regulation and consumer-protection policy."
        ),
        "notes_sources": (
            "https://www.nist.gov/news-events/news/2024/02/new-leadership-launching-us-ai-safety-institute\n"
            "https://www.commerce.gov/news/press-releases/2024/02/us-commerce-secretary-gina-raimondo-announces-key-executive"
        ),
        "edges": [
            {
                "direction": "from_new",
                "other_id": AISI_ID,
                "edge_type": "employer",
                "role": "Director",
                "is_primary": True,
                "evidence": "Elizabeth Kelly was named inaugural Director of the U.S. AI Safety Institute in February 2024.",
                "source_url": "https://www.nist.gov/news-events/news/2024/02/new-leadership-launching-us-ai-safety-institute",
            },
        ],
    },

    # ── Craig Martell → DoD (historical) ───────────────────────────────
    {
        "name": "Craig Martell",
        "entity_type": "person",
        "category": "Policymaker",
        "title": "Former Chief Digital and AI Officer, U.S. Department of Defense (2022–2024)",
        "primary_org": "U.S. Department of Defense (former)",
        "influence_type": "Decision-maker, Implementer, Builder",
        "notes": (
            "Craig Martell served as the first Chief Digital and AI Officer "
            "(CDAO) of the U.S. Department of Defense from 2022 to April "
            "2024. Stood up the CDAO office and Task Force Lima (generative "
            "AI for defense) in 2023. Prior career in industry machine "
            "learning leadership at Lyft, LinkedIn, and Dropbox. Departed "
            "DoD to return to the private sector in April 2024."
        ),
        "notes_sources": (
            "https://www.defense.gov/News/Releases/Release/Article/3077078/\n"
            "https://breakingdefense.com/2024/04/dod-chief-digital-and-ai-officer-craig-martell-is-stepping-down/"
        ),
        "edges": [
            {
                "direction": "from_new",
                "other_id": DOD_ID,
                "edge_type": "employer",
                "role": "Chief Digital and AI Officer (CDAO) (2022–2024)",
                "is_primary": False,
                "evidence": "Craig Martell was the first CDAO at the Department of Defense, serving 2022–2024.",
                "source_url": "https://breakingdefense.com/2024/04/dod-chief-digital-and-ai-officer-craig-martell-is-stepping-down/",
            },
        ],
    },

    # ── Radha Plumb → DoD ──────────────────────────────────────────────
    {
        "name": "Radha Plumb",
        "entity_type": "person",
        "category": "Policymaker",
        "title": "Chief Digital and AI Officer, U.S. Department of Defense (appointed 2024)",
        "primary_org": "U.S. Department of Defense",
        "influence_type": "Decision-maker, Implementer",
        "notes": (
            "Radha Plumb was named Chief Digital and AI Officer (CDAO) at "
            "the U.S. Department of Defense in mid-2024, succeeding Craig "
            "Martell. Prior to the CDAO role, Plumb served as Deputy CDAO "
            "and earlier held senior policy positions at Google and "
            "Facebook. Leads DoD's adoption of AI and data capabilities "
            "including Task Force Lima and the Replicator initiative."
        ),
        "notes_sources": (
            "https://www.defense.gov/News/Releases/Release/Article/3819395/\n"
            "https://breakingdefense.com/2024/08/dods-new-ai-chief-wants-to-accelerate-adoption-of-generative-ai/"
        ),
        "edges": [
            {
                "direction": "from_new",
                "other_id": DOD_ID,
                "edge_type": "employer",
                "role": "Chief Digital and AI Officer (CDAO)",
                "is_primary": True,
                "evidence": "Radha Plumb was appointed DoD CDAO in mid-2024, succeeding Craig Martell.",
                "source_url": "https://www.defense.gov/News/Releases/Release/Article/3819395/",
            },
        ],
    },

    # ── Clare Martorana → OMB ──────────────────────────────────────────
    {
        "name": "Clare Martorana",
        "entity_type": "person",
        "category": "Policymaker",
        "title": "U.S. Federal Chief Information Officer (appointed 2021)",
        "primary_org": "Office of Management and Budget",
        "influence_type": "Decision-maker, Implementer",
        "notes": (
            "Clare Martorana was appointed U.S. Federal Chief Information "
            "Officer (CIO) at the Office of Management and Budget in March "
            "2021. Oversaw implementation of OMB Memorandum M-24-10 "
            "('Advancing Governance, Innovation, and Risk Management for "
            "Agency Use of Artificial Intelligence'), the Biden "
            "administration's central AI-use policy for federal agencies. "
            "Prior career: CIO at the Office of Personnel Management; "
            "tech executive at WebMD, Everyday Health."
        ),
        "notes_sources": (
            "https://www.cio.gov/about/members-and-leadership/martorana-clare/\n"
            "https://www.whitehouse.gov/wp-content/uploads/2024/03/M-24-10-Advancing-Governance-Innovation-and-Risk-Management-for-Agency-Use-of-Artificial-Intelligence.pdf"
        ),
        "edges": [
            {
                "direction": "from_new",
                "other_id": OMB_ID,
                "edge_type": "employer",
                "role": "U.S. Federal Chief Information Officer",
                "is_primary": True,
                "evidence": "Clare Martorana has served as U.S. Federal CIO at OMB since March 2021.",
                "source_url": "https://www.cio.gov/about/members-and-leadership/martorana-clare/",
            },
        ],
    },

    # ── Jason Green-Lowe → CAIP ────────────────────────────────────────
    {
        "name": "Jason Green-Lowe",
        "entity_type": "person",
        "category": "Organizer",
        "title": "Executive Director, Center for AI Policy",
        "primary_org": "Center for AI Policy (CAIP)",
        "influence_type": "Organizer/advocate, Advisor/strategist",
        "notes": (
            "Jason Green-Lowe is the founding Executive Director of the "
            "Center for AI Policy (CAIP), a Washington, D.C. nonprofit "
            "advocating for frontier-AI safety legislation. Prior career "
            "as an attorney focused on administrative and regulatory law. "
            "CAIP has proposed model legislation (the 'Responsible Advanced "
            "AI Act') and maintains a tracker of federal and state AI bills."
        ),
        "notes_sources": (
            "https://aipolicy.us/about\n"
            "https://aipolicy.us/"
        ),
        "edges": [
            {
                "direction": "from_new",
                "other_id": CAIP_ID,
                "edge_type": "employer",
                "role": "Executive Director",
                "is_primary": True,
                "evidence": "Jason Green-Lowe is the founding Executive Director of the Center for AI Policy.",
                "source_url": "https://aipolicy.us/about",
            },
            {
                "direction": "from_new",
                "other_id": CAIP_ID,
                "edge_type": "founder",
                "role": "Founding Executive Director",
                "is_primary": False,
                "evidence": "Green-Lowe founded the Center for AI Policy.",
                "source_url": "https://aipolicy.us/about",
            },
        ],
    },

    # ── Sam McCandlish → Anthropic ─────────────────────────────────────
    {
        "name": "Sam McCandlish",
        "entity_type": "person",
        "category": "Researcher",
        "title": "Co-founder and Chief Scientist, Anthropic",
        "primary_org": "Anthropic",
        "influence_type": "Researcher/analyst, Builder",
        "notes": (
            "Sam McCandlish is a co-founder and Chief Scientist of "
            "Anthropic, where he leads scaling and pre-training research. "
            "Previously at OpenAI, where he was a lead author on the "
            "influential 2020 'Scaling Laws for Neural Language Models' "
            "paper (with Jared Kaplan). Left OpenAI with the group that "
            "founded Anthropic in 2021."
        ),
        "notes_sources": (
            "https://www.anthropic.com/company\n"
            "https://arxiv.org/abs/2001.08361"
        ),
        "edges": [
            {
                "direction": "from_new",
                "other_id": ANTHROPIC_ID,
                "edge_type": "founder",
                "role": "Co-founder",
                "is_primary": False,
                "evidence": "Sam McCandlish was part of the group that left OpenAI to found Anthropic in 2021.",
                "source_url": "https://www.anthropic.com/company",
            },
            {
                "direction": "from_new",
                "other_id": ANTHROPIC_ID,
                "edge_type": "employer",
                "role": "Chief Scientist",
                "is_primary": True,
                "evidence": "Sam McCandlish serves as Chief Scientist at Anthropic.",
                "source_url": "https://www.anthropic.com/company",
            },
        ],
    },

    # ── Alvaro Bedoya → FTC ────────────────────────────────────────────
    {
        "name": "Alvaro Bedoya",
        "entity_type": "person",
        "category": "Policymaker",
        "title": "FTC Commissioner (confirmed 2022)",
        "primary_org": "Federal Trade Commission",
        "influence_type": "Decision-maker",
        "notes": (
            "Alvaro Bedoya was confirmed as Commissioner of the Federal "
            "Trade Commission in May 2022. Before the FTC, Bedoya founded "
            "the Center on Privacy & Technology at Georgetown Law. Has been "
            "an outspoken voice on algorithmic accountability, facial "
            "recognition surveillance, and AI's civil-rights implications, "
            "including at FTC's 2023 hearing on generative AI and in public "
            "speeches on 'statistical discrimination'."
        ),
        "notes_sources": (
            "https://www.ftc.gov/about-ftc/commissioners-staff/alvaro-bedoya\n"
            "https://www.ftc.gov/news-events/news/speeches"
        ),
        "edges": [
            {
                "direction": "from_new",
                "other_id": FTC_ID,
                "edge_type": "member",
                "role": "Commissioner",
                "is_primary": True,
                "evidence": "Alvaro Bedoya was confirmed as FTC Commissioner in May 2022.",
                "source_url": "https://www.ftc.gov/about-ftc/commissioners-staff/alvaro-bedoya",
            },
        ],
    },

    # ── Michael Littman → NSF ──────────────────────────────────────────
    {
        "name": "Michael Littman",
        "entity_type": "person",
        "category": "Academic",
        "title": "Division Director, Information and Intelligent Systems (IIS), NSF CISE",
        "primary_org": "U.S. National Science Foundation",
        "other_orgs": "Brown University",
        "influence_type": "Researcher/analyst, Advisor/strategist",
        "notes": (
            "Michael Littman is a computer science professor at Brown "
            "University who took an NSF rotation beginning 2022 as Division "
            "Director for Information and Intelligent Systems (IIS) within "
            "the Computer and Information Science and Engineering "
            "directorate. Long-time AI/ML researcher and educator "
            "specializing in reinforcement learning; widely known for "
            "public-facing AI education content on YouTube."
        ),
        "notes_sources": (
            "https://www.nsf.gov/cise/iis/\n"
            "https://cs.brown.edu/people/mlittman/"
        ),
        "edges": [
            {
                "direction": "from_new",
                "other_id": NSF_ID,
                "edge_type": "employer",
                "role": "Division Director, IIS (rotation from Brown)",
                "is_primary": True,
                "evidence": "Michael Littman is the NSF CISE IIS Division Director on rotation from Brown University.",
                "source_url": "https://www.nsf.gov/cise/iis/",
            },
        ],
    },

    # ── Reva Schwartz → NIST ───────────────────────────────────────────
    {
        "name": "Reva Schwartz",
        "entity_type": "person",
        "category": "Researcher",
        "title": "Principal Investigator for AI Bias, NIST",
        "primary_org": "National Institute of Standards and Technology",
        "influence_type": "Researcher/analyst",
        "notes": (
            "Reva Schwartz is a Research Scientist at NIST focused on the "
            "sociotechnical dimensions of trustworthy AI. Was a principal "
            "contributor to the NIST AI Risk Management Framework (AI RMF "
            "1.0, released January 2023) and its Generative AI Profile "
            "(2024). Background in cognitive and behavioral science applied "
            "to AI systems assessment."
        ),
        "notes_sources": (
            "https://www.nist.gov/people/reva-schwartz\n"
            "https://www.nist.gov/itl/ai-risk-management-framework"
        ),
        "edges": [
            {
                "direction": "from_new",
                "other_id": NIST_ID,
                "edge_type": "employer",
                "role": "Research Scientist / PI for AI Bias",
                "is_primary": True,
                "evidence": "Reva Schwartz is a Research Scientist at NIST and key contributor to the AI RMF.",
                "source_url": "https://www.nist.gov/people/reva-schwartz",
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
             created_by="phase5c-seed",
             enrichment_version="phase5-seed",
             confidence=3)


if __name__ == "__main__":
    main()
