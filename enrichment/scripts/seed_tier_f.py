#!/usr/bin/env python3
"""
Phase 5F: Tier F — current (2026) government AI leads + frontier-lab executives.

Seeds 17 persons drawn from web-verified research (April 2026) covering:

  * Gov (7): DoD CDAO leadership (Stanley current, Matty historical);
    FTC Chair + Commissioner under Trump admin; NSF CISE AD;
    Tarun Chhabra (Biden NSC → Anthropic crossover).
  * Frontier-lab execs (10): AWS, Amazon AGI, Nvidia policy, DeepMind/Google
    AI leadership, Meta/Microsoft/Cohere/Inflection/xAI/OpenAI.

Deliberately excluded (see Discovered Work):
  * Adam Cassady (State CDP) — nominee, not yet confirmed.
  * CAISI director — none publicly named post-Kelly.
  * NSC AI senior director (Chhabra successor) — seat unfilled / reorganized.
  * Rohit Prasad — departed Amazon end-2025.
  * Ahmad Al-Dahle — left Meta for Airbnb Jan 2026.

Confidence: 4 for well-sourced HIGH candidates; 3 for MEDIUM (Kevin Weil,
Igor Babuschkin — role ambiguity or single-source).

Usage:
    python scripts/seed_tier_f.py              # dry run
    python scripts/seed_tier_f.py --live       # apply
    python scripts/seed_tier_f.py -o LOG.md    # write report
"""

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from seed_entity import seed_all


# Existing entity IDs verified 2026-04-12:
ANTHROPIC_ID   = 133
OPENAI_ID      = 140
XAI_ID         = 177
COHERE_ID      = 1787
INFLECTION_ID  = 1788
GOOGLE_ID      = 1041
DEEPMIND_ID    = 146
MICROSOFT_ID   = 1042
META_ID        = 1043
AMAZON_ID      = 729
NVIDIA_ID      = 728
DOD_ID         = 1420
FTC_ID         = 909
NSF_ID         = 1185
# NSC_ID       = 1790   # not used directly, but Chhabra's history notes it


SPECS = [
    # ══════════════════════════════════════════════════════════════════
    # GOVERNMENT
    # ══════════════════════════════════════════════════════════════════

    # ── 1. Cameron Stanley → DoD CDAO (current) ───────────────────────
    {
        "name": "Cameron Stanley",
        "entity_type": "person",
        "category": "Policymaker",
        "title": "Chief Digital and AI Officer, U.S. Department of Defense",
        "primary_org": "U.S. Department of Defense",
        "influence_type": "Decision-maker, Implementer",
        "notes": (
            "Cameron Stanley was named U.S. Department of Defense Chief "
            "Digital and AI Officer (CDAO) by Secretary Hegseth on January "
            "12, 2026, assuming the role that month. Previously led Project "
            "Maven and AI development/oversight within OUSD(I&S) (2021–2024), "
            "and earlier directed AWS's national-security digital "
            "transformation practice. U.S. Air Force Academy graduate. "
            "Succeeds Douglas Matty (Apr–Dec 2025), who followed Radha Plumb."
        ),
        "notes_sources": (
            "https://defensescoop.com/2026/01/07/cameron-stanley-frontrunner-pentagon-cdao/\n"
            "https://www.cdomagazine.tech/leadership-moves/pentagon-names-cameron-stanley-chief-digital-and-ai-officer\n"
            "https://meritalk.com/articles/pentagon-names-cameron-stanley-next-ai-chief/"
        ),
        "edges": [
            {
                "direction": "from_new", "other_id": DOD_ID,
                "edge_type": "employer",
                "role": "Chief Digital and AI Officer (CDAO)",
                "is_primary": True,
                "evidence": "Cameron Stanley was named DoD CDAO on January 12, 2026.",
                "source_url": "https://www.cdomagazine.tech/leadership-moves/pentagon-names-cameron-stanley-chief-digital-and-ai-officer",
            },
        ],
    },

    # ── 2. Doug Matty → DoD CDAO (historical, Apr–Dec 2025) ───────────
    {
        "name": "Douglas Matty",
        "entity_type": "person",
        "category": "Policymaker",
        "title": "Former Chief Digital and AI Officer, U.S. Department of Defense (April–December 2025)",
        "primary_org": "U.S. Department of Defense (former)",
        "influence_type": "Decision-maker, Implementer",
        "notes": (
            "Douglas B. Matty served as the Department of Defense's Chief "
            "Digital and AI Officer from April to December 2025, the short "
            "bridging tenure between Radha Plumb (Biden administration) and "
            "Cameron Stanley (January 2026). Prior background in DoD AI and "
            "data programs. Departed after ~8 months."
        ),
        "notes_sources": (
            "https://defensescoop.com/2026/01/07/cameron-stanley-frontrunner-pentagon-cdao/\n"
            "https://www.cdomagazine.tech/leadership-moves/pentagon-names-cameron-stanley-chief-digital-and-ai-officer"
        ),
        "edges": [
            {
                "direction": "from_new", "other_id": DOD_ID,
                "edge_type": "employer",
                "role": "Chief Digital and AI Officer (CDAO) (April–December 2025)",
                "is_primary": False,
                "evidence": "Doug Matty served as DoD CDAO between Radha Plumb and Cameron Stanley (Apr–Dec 2025).",
                "source_url": "https://defensescoop.com/2026/01/07/cameron-stanley-frontrunner-pentagon-cdao/",
            },
        ],
    },

    # ── 3. Andrew Ferguson → FTC Chairman ─────────────────────────────
    {
        "name": "Andrew N. Ferguson",
        "entity_type": "person",
        "category": "Policymaker",
        "title": "Chairman, Federal Trade Commission",
        "primary_org": "Federal Trade Commission",
        "influence_type": "Decision-maker",
        "notes": (
            "Andrew N. Ferguson was elevated from FTC Commissioner to "
            "Chairman by President Trump in January 2025, replacing Lina "
            "Khan. Has taken a deliberately light-touch approach to AI "
            "rulemaking: in January 2026 the Commission walked back the "
            "Biden-era Rytr consent order, signaling that AI fraud will be "
            "addressed through existing statutory authority rather than "
            "new AI-specific rules. Former Virginia Solicitor General."
        ),
        "notes_sources": (
            "https://en.wikipedia.org/wiki/Andrew_N._Ferguson\n"
            "https://www.ftc.gov/commissioners\n"
            "https://therecord.media/ftc-ferguson-wont-regulate-ai-until-problems-arise"
        ),
        "edges": [
            {
                "direction": "from_new", "other_id": FTC_ID,
                "edge_type": "member",
                "role": "Chairman",
                "is_primary": True,
                "evidence": "Andrew Ferguson was elevated to FTC Chairman by Trump in January 2025.",
                "source_url": "https://www.ftc.gov/commissioners",
            },
        ],
    },

    # ── 4. Mark Meador → FTC Commissioner ─────────────────────────────
    {
        "name": "Mark R. Meador",
        "entity_type": "person",
        "category": "Policymaker",
        "title": "Commissioner, Federal Trade Commission",
        "primary_org": "Federal Trade Commission",
        "influence_type": "Decision-maker",
        "notes": (
            "Mark R. Meador is one of two remaining FTC Commissioners "
            "(alongside Chairman Ferguson) after the departure of "
            "Commissioner Melissa Holyoak. Reportedly aligned with Ferguson "
            "on AI enforcement posture, including the January 2026 walk-back "
            "of the Rytr generative-AI consent order."
        ),
        "notes_sources": (
            "https://www.ftc.gov/commissioners\n"
            "https://www.allaboutadvertisinglaw.com/2026/01/the-ftc-walks-back-its-rytr-enforcement-action-signaling-a-shift-in-federal-ai-regulation.html"
        ),
        "edges": [
            {
                "direction": "from_new", "other_id": FTC_ID,
                "edge_type": "member",
                "role": "Commissioner",
                "is_primary": True,
                "evidence": "Mark Meador is a sitting FTC Commissioner in early 2026.",
                "source_url": "https://www.ftc.gov/commissioners",
            },
        ],
    },

    # ── 5. Greg Hager → NSF CISE AD ───────────────────────────────────
    {
        "name": "Greg Hager",
        "entity_type": "person",
        "category": "Academic",
        "title": "Assistant Director, NSF Computer and Information Science and Engineering (CISE) Directorate",
        "primary_org": "U.S. National Science Foundation",
        "other_orgs": "Johns Hopkins University",
        "influence_type": "Decision-maker, Researcher/analyst",
        "notes": (
            "Greg Hager became Assistant Director of NSF's Computer and "
            "Information Science and Engineering (CISE) directorate on "
            "June 3, 2024, and is serving in 2026. The Mandell Bellmore "
            "Professor of Computer Science at Johns Hopkins University and "
            "founding director of the JHU Malone Center for Engineering in "
            "Healthcare. Succeeded Margaret Martonosi (2020–2023) after "
            "Dilma Da Silva served as acting AD."
        ),
        "notes_sources": (
            "https://cra.org/nsf-names-greg-hager-assistant-director-for-the-computer-and-information-science-and-engineering-cise-directorate/\n"
            "https://www.nsf.gov/staff/org/cise"
        ),
        "edges": [
            {
                "direction": "from_new", "other_id": NSF_ID,
                "edge_type": "employer",
                "role": "Assistant Director, CISE",
                "is_primary": True,
                "evidence": "Greg Hager has served as NSF CISE Assistant Director since June 3, 2024.",
                "source_url": "https://cra.org/nsf-names-greg-hager-assistant-director-for-the-computer-and-information-science-and-engineering-cise-directorate/",
            },
        ],
    },

    # ── 6. Tarun Chhabra → Anthropic (Biden-NSC crossover) ────────────
    {
        "name": "Tarun Chhabra",
        "entity_type": "person",
        "category": "Policymaker",
        "title": "Head of National Security Policy, Anthropic (former NSC Senior Director for Technology and National Security)",
        "primary_org": "Anthropic",
        "other_orgs": "White House National Security Council (former)",
        "influence_type": "Advisor/strategist, Decision-maker, Organizer/advocate",
        "notes": (
            "Tarun Chhabra is Head of National Security Policy at Anthropic, "
            "a significant crossover from government to industry. Previously "
            "served as Senior Director for Technology and National Security "
            "on the Biden National Security Council (2021–Jan 2025), where "
            "he was a principal architect of U.S. AI chip export controls "
            "and the October 2022 / October 2023 BIS rules. Earlier served "
            "in the Obama administration and at the Center for a New "
            "American Security. Anthropic's hire of Chhabra is widely cited "
            "as an example of frontier labs building in-house national-"
            "security policy capability."
        ),
        "notes_sources": (
            "https://en.wikipedia.org/wiki/Tarun_Chhabra\n"
            "https://www.anthropic.com/\n"
            "https://www.politico.com/"
        ),
        "edges": [
            {
                "direction": "from_new", "other_id": ANTHROPIC_ID,
                "edge_type": "employer",
                "role": "Head of National Security Policy",
                "is_primary": True,
                "evidence": "Tarun Chhabra joined Anthropic as Head of National Security Policy after leaving the Biden NSC.",
                "source_url": "https://www.anthropic.com/",
            },
        ],
    },

    # ══════════════════════════════════════════════════════════════════
    # FRONTIER-LAB EXECUTIVES
    # ══════════════════════════════════════════════════════════════════

    # ── 7. Swami Sivasubramanian → AWS Agentic AI ─────────────────────
    {
        "name": "Swami Sivasubramanian",
        "entity_type": "person",
        "category": "Executive",
        "title": "Vice President, AWS Agentic AI",
        "primary_org": "Amazon",
        "influence_type": "Builder, Decision-maker",
        "notes": (
            "Swami Sivasubramanian leads AWS's Agentic AI division, elevated "
            "to this role in the January 2026 AWS leadership reshuffle under "
            "CEO Matt Garman. A 20+ year Amazon veteran, he previously led "
            "AWS's Database, Analytics and Machine Learning organization "
            "(Bedrock, SageMaker, DynamoDB). Public-facing leader at AWS "
            "Summits and in enterprise AI policy discussions."
        ),
        "notes_sources": (
            "https://www.linkedin.com/in/swaminathansivasubramanian/\n"
            "https://www.fiduciarytech.com/single-post/leaked-aws-org-chart-reveals-major-leadership-shakeup-under-ceo-matt-garman"
        ),
        "edges": [
            {
                "direction": "from_new", "other_id": AMAZON_ID,
                "edge_type": "employer",
                "role": "Vice President, AWS Agentic AI",
                "is_primary": True,
                "evidence": "Swami Sivasubramanian was named VP of AWS Agentic AI in the January 2026 AWS reshuffle.",
                "source_url": "https://www.fiduciarytech.com/single-post/leaked-aws-org-chart-reveals-major-leadership-shakeup-under-ceo-matt-garman",
            },
        ],
    },

    # ── 8. Peter DeSantis → Amazon AGI ────────────────────────────────
    {
        "name": "Peter DeSantis",
        "entity_type": "person",
        "category": "Executive",
        "title": "Senior Vice President, Amazon AGI",
        "primary_org": "Amazon",
        "influence_type": "Builder, Decision-maker",
        "notes": (
            "Peter DeSantis is Senior Vice President leading Amazon's "
            "reorganized AGI group, taking over from Rohit Prasad at the "
            "end of 2025. A 27-year Amazon veteran previously serving as "
            "SVP in the AWS cloud unit (overseeing infrastructure, silicon, "
            "and networking). Now holds the foundation-model mandate "
            "(Nova family) following Prasad's departure."
        ),
        "notes_sources": (
            "https://www.cnbc.com/2025/12/17/amazon-ai-chief-prasad-leaving-peter-desantis-agi-group.html\n"
            "https://www.edtechinnovationhub.com/news/amazon-agi-chief-scientist-rohit-prasad-signals-departure-after-12-years"
        ),
        "edges": [
            {
                "direction": "from_new", "other_id": AMAZON_ID,
                "edge_type": "employer",
                "role": "SVP, Amazon AGI",
                "is_primary": True,
                "evidence": "Peter DeSantis took over Amazon's AGI group from Rohit Prasad at end of 2025.",
                "source_url": "https://www.cnbc.com/2025/12/17/amazon-ai-chief-prasad-leaving-peter-desantis-agi-group.html",
            },
        ],
    },

    # ── 9. Ned Finkle → NVIDIA VP Gov Affairs ─────────────────────────
    {
        "name": "Ned Finkle",
        "entity_type": "person",
        "category": "Executive",
        "title": "Vice President, Government Affairs, NVIDIA",
        "primary_org": "Nvidia",
        "influence_type": "Advisor/strategist, Organizer/advocate",
        "notes": (
            "Ned Finkle has served as NVIDIA's Vice President of Government "
            "Affairs since April 2015. NVIDIA's primary public voice on AI "
            "chip export controls; authored the company's January 2025 "
            "rebuke of the Biden administration's proposed 'AI Diffusion' "
            "rule (characterizing it as a '200+ page regulatory morass'). "
            "Leads NVIDIA's Washington engagement on AI policy, chip "
            "controls, and sanctions."
        ),
        "notes_sources": (
            "https://blogs.nvidia.com/blog/ai-policy/\n"
            "https://www.linkedin.com/in/nedfinkle\n"
            "https://www.legistorm.com/person/bio/539350/Ned_Arthur_Finkle.html"
        ),
        "edges": [
            {
                "direction": "from_new", "other_id": NVIDIA_ID,
                "edge_type": "employer",
                "role": "VP, Government Affairs",
                "is_primary": True,
                "evidence": "Ned Finkle has served as NVIDIA VP Government Affairs since April 2015.",
                "source_url": "https://www.legistorm.com/person/bio/539350/Ned_Arthur_Finkle.html",
            },
        ],
    },

    # ── 10. Koray Kavukcuoglu → DeepMind CTO + Google Chief AI Architect ──
    {
        "name": "Koray Kavukcuoglu",
        "entity_type": "person",
        "category": "Executive",
        "title": "CTO, Google DeepMind; Chief AI Architect, Google",
        "primary_org": "Google DeepMind",
        "other_orgs": "Google (Chief AI Architect, SVP reporting to Sundar Pichai)",
        "influence_type": "Builder, Decision-maker, Researcher/analyst",
        "notes": (
            "Koray Kavukcuoglu was elevated in June 2025 to a dual role "
            "as CTO of Google DeepMind and Chief AI Architect of Google "
            "(SVP reporting to Sundar Pichai), spanning all of "
            "Google/Alphabet's AI strategy. Principal technical architect "
            "of Gemini 3. Turkish-origin researcher; joined DeepMind in "
            "2012 and led major research advances prior to this dual "
            "leadership role."
        ),
        "notes_sources": (
            "https://www.semafor.com/article/06/11/2025/google-names-new-chief-ai-architect-to-advance-developments\n"
            "https://uk.linkedin.com/in/koray-kavukcuoglu-0439a720\n"
            "https://www.gurufocus.com/news/2922038/google-deepminds-cto-takes-on-new-ai-leadership-role-goog-stock-news"
        ),
        "edges": [
            {
                "direction": "from_new", "other_id": DEEPMIND_ID,
                "edge_type": "employer",
                "role": "CTO, Google DeepMind",
                "is_primary": True,
                "evidence": "Kavukcuoglu is CTO of Google DeepMind; elevated to a dual role in June 2025.",
                "source_url": "https://www.semafor.com/article/06/11/2025/google-names-new-chief-ai-architect-to-advance-developments",
            },
            {
                "direction": "from_new", "other_id": GOOGLE_ID,
                "edge_type": "employer",
                "role": "Chief AI Architect",
                "is_primary": False,
                "evidence": "Kavukcuoglu was named Google's Chief AI Architect (SVP to Sundar Pichai) in June 2025.",
                "source_url": "https://www.semafor.com/article/06/11/2025/google-names-new-chief-ai-architect-to-advance-developments",
            },
        ],
    },

    # ── 11. James Manyika → Google SVP Research/Tech & Society ────────
    {
        "name": "James Manyika",
        "entity_type": "person",
        "category": "Executive",
        "title": "SVP, Research, Labs, Technology & Society, Google-Alphabet",
        "primary_org": "Google",
        "influence_type": "Advisor/strategist, Decision-maker, Narrator",
        "notes": (
            "James Manyika is Senior Vice President of Research, Labs, "
            "Technology & Society at Google-Alphabet, a role he has held "
            "since 2023 (previously Google's first head of Tech & Society, "
            "2022). A principal public-policy voice at Google. Former "
            "Vice Chair of the U.S. National AI Advisory Committee (NAIAC) "
            "and co-chair of the UN Secretary-General's AI Advisory Body. "
            "Rhodes Scholar; Oxford DPhil in AI/robotics; long-time "
            "McKinsey Global Institute chair."
        ),
        "notes_sources": (
            "https://blog.google/authors/james-manyika/\n"
            "https://en.wikipedia.org/wiki/James_Manyika\n"
            "https://hai.stanford.edu/people/james-manyika"
        ),
        "edges": [
            {
                "direction": "from_new", "other_id": GOOGLE_ID,
                "edge_type": "employer",
                "role": "SVP, Research, Labs, Technology & Society",
                "is_primary": True,
                "evidence": "Manyika is Google SVP Research, Labs, Technology & Society since 2023.",
                "source_url": "https://blog.google/authors/james-manyika/",
            },
        ],
    },

    # ── 12. Joel Kaplan → Meta Chief Global Affairs Officer ───────────
    {
        "name": "Joel Kaplan",
        "entity_type": "person",
        "category": "Executive",
        "title": "Chief Global Affairs Officer, Meta",
        "primary_org": "Meta",
        "influence_type": "Decision-maker, Advisor/strategist, Organizer/advocate",
        "notes": (
            "Joel Kaplan is Meta's Chief Global Affairs Officer, having "
            "replaced Nick Clegg in early 2025. Meta's top Washington "
            "executive and a politically prominent Republican — former "
            "Deputy Chief of Staff for Policy under George W. Bush. Led "
            "Meta's public positioning around the Davos 2026 $600B U.S. AI "
            "infrastructure pledge. Has been a key architect of Meta's "
            "political realignment in the Trump era. Joined Meta (then "
            "Facebook) in 2011."
        ),
        "notes_sources": (
            "https://www.meta.com/media-gallery/executives/joel-kaplan/\n"
            "https://variety.com/2025/digital/news/meta-joel-kaplan-global-affairs-trump-1236264252/"
        ),
        "edges": [
            {
                "direction": "from_new", "other_id": META_ID,
                "edge_type": "employer",
                "role": "Chief Global Affairs Officer",
                "is_primary": True,
                "evidence": "Joel Kaplan replaced Nick Clegg as Meta's Chief Global Affairs Officer in early 2025.",
                "source_url": "https://www.meta.com/media-gallery/executives/joel-kaplan/",
            },
        ],
    },

    # ── 13. Jacob Andreou → Microsoft EVP Copilot ─────────────────────
    {
        "name": "Jacob Andreou",
        "entity_type": "person",
        "category": "Executive",
        "title": "EVP, Copilot, Microsoft",
        "primary_org": "Microsoft",
        "influence_type": "Builder, Decision-maker",
        "notes": (
            "Jacob Andreou is EVP of Copilot at Microsoft, named in the "
            "March 2026 Microsoft AI reorganization and reporting directly "
            "to Satya Nadella. Leads a unified consumer + commercial "
            "Copilot organization, freeing Mustafa Suleyman to focus on "
            "frontier-model and superintelligence work. Former Snap "
            "executive before joining Microsoft."
        ),
        "notes_sources": (
            "https://blogs.microsoft.com/blog/2026/03/17/announcing-copilot-leadership-update/\n"
            "https://www.cnbc.com/2026/03/17/microsoft-copilot-ai-suleyman.html\n"
            "https://www.geekwire.com/2026/microsoft-revamps-copilot-structure-elevating-former-snap-exec-as-suleyman-shifts-to-ai-models/"
        ),
        "edges": [
            {
                "direction": "from_new", "other_id": MICROSOFT_ID,
                "edge_type": "employer",
                "role": "EVP, Copilot",
                "is_primary": True,
                "evidence": "Jacob Andreou was named Microsoft EVP Copilot in the March 17, 2026 reorg.",
                "source_url": "https://blogs.microsoft.com/blog/2026/03/17/announcing-copilot-leadership-update/",
            },
        ],
    },

    # ── 14. Joelle Pineau → Cohere Chief AI Officer ───────────────────
    {
        "name": "Joelle Pineau",
        "entity_type": "person",
        "category": "Executive",
        "title": "Chief AI Officer, Cohere",
        "primary_org": "Cohere",
        "other_orgs": "McGill University; Mila (affiliate)",
        "influence_type": "Builder, Researcher/analyst, Decision-maker",
        "notes": (
            "Joelle Pineau is Chief AI Officer of Cohere, joining from Meta "
            "in 2025 where she had been VP of AI Research leading FAIR "
            "(Fundamental AI Research). Computer Science Professor at "
            "McGill University and affiliate of Mila (Quebec AI institute). "
            "One of the most senior Canadian AI-research voices and a "
            "longtime advocate for reproducibility and open science in ML."
        ),
        "notes_sources": (
            "https://cohere.com/about\n"
            "https://www.clay.com/dossier/cohere-executives"
        ),
        "edges": [
            {
                "direction": "from_new", "other_id": COHERE_ID,
                "edge_type": "employer",
                "role": "Chief AI Officer",
                "is_primary": True,
                "evidence": "Joelle Pineau joined Cohere as Chief AI Officer in 2025, from Meta FAIR.",
                "source_url": "https://cohere.com/about",
            },
        ],
    },

    # ── 15. Sean White → Inflection AI CEO ────────────────────────────
    {
        "name": "Sean White",
        "entity_type": "person",
        "category": "Executive",
        "title": "CEO, Inflection AI",
        "primary_org": "Inflection AI",
        "influence_type": "Decision-maker, Builder",
        "notes": (
            "Sean White became CEO of Inflection AI in 2024, succeeding "
            "Mustafa Suleyman following the Inflection-to-Microsoft "
            "transition. Has led Inflection's pivot from consumer AI "
            "(the 'Pi' assistant) to a commercial AI-studio / enterprise "
            "focus including emotional AI for business applications. "
            "Previously SVP of R&D at Mozilla; background in UX/AR."
        ),
        "notes_sources": (
            "https://www.linkedin.com/in/seanwhite/\n"
            "https://venturebeat.com/ai/exclusive-inflection-ai-reveals-new-team-and-plan-to-embed-emotional-ai-in-business-bots\n"
            "https://en.wikipedia.org/wiki/Inflection_AI"
        ),
        "edges": [
            {
                "direction": "from_new", "other_id": INFLECTION_ID,
                "edge_type": "employer",
                "role": "CEO",
                "is_primary": True,
                "evidence": "Sean White is CEO of Inflection AI, succeeding Mustafa Suleyman in 2024.",
                "source_url": "https://en.wikipedia.org/wiki/Inflection_AI",
            },
        ],
    },

    # ── 16. Kevin Weil → OpenAI VP Science (MEDIUM confidence) ────────
    {
        "name": "Kevin Weil",
        "entity_type": "person",
        "category": "Executive",
        "title": "VP, OpenAI for Science (formerly Chief Product Officer, 2024–2025)",
        "primary_org": "OpenAI",
        "influence_type": "Builder, Decision-maker",
        "notes": (
            "Kevin Weil joined OpenAI as Chief Product Officer in 2024 and, "
            "as of early 2026, is listed on LinkedIn and organizational "
            "trackers as VP of 'OpenAI for Science' — OpenAI's push to "
            "apply frontier models to scientific research. Previously "
            "President of Planet Labs; earlier Head of Product at Instagram "
            "and Twitter and co-creator of Facebook's Libra project. "
            "Lieutenant Colonel in the U.S. Army Reserve."
        ),
        "notes_sources": (
            "https://www.linkedin.com/in/kevinweil/\n"
            "https://theorg.com/org/openai/org-chart/kevin-weil"
        ),
        "edges": [
            {
                "direction": "from_new", "other_id": OPENAI_ID,
                "edge_type": "employer",
                "role": "VP, OpenAI for Science (formerly CPO)",
                "is_primary": True,
                "evidence": "Kevin Weil joined OpenAI as CPO in 2024 and is now listed as VP, OpenAI for Science.",
                "source_url": "https://theorg.com/org/openai/org-chart/kevin-weil",
            },
        ],
    },

    # ── 17. Igor Babuschkin → xAI Head of Research (MEDIUM) ───────────
    {
        "name": "Igor Babuschkin",
        "entity_type": "person",
        "category": "Researcher",
        "title": "Head of Research / Chief Engineer, xAI",
        "primary_org": "xAI",
        "influence_type": "Builder, Researcher/analyst",
        "notes": (
            "Igor Babuschkin is a founding member of xAI (2023) and leads "
            "the company's largest research team (~29 direct reports per "
            "public org-chart data), reporting directly to Elon Musk. "
            "Primary non-Musk technical voice on xAI research externally. "
            "Formerly a research scientist at Google DeepMind."
        ),
        "notes_sources": (
            "https://en.wikipedia.org/wiki/XAI_(company)\n"
            "https://www.theofficialboard.com/org-chart/xai"
        ),
        "edges": [
            {
                "direction": "from_new", "other_id": XAI_ID,
                "edge_type": "employer",
                "role": "Head of Research / Chief Engineer",
                "is_primary": True,
                "evidence": "Igor Babuschkin is a founding member and research lead at xAI since 2023.",
                "source_url": "https://en.wikipedia.org/wiki/XAI_(company)",
            },
            {
                "direction": "from_new", "other_id": XAI_ID,
                "edge_type": "founder",
                "role": "Founding engineer",
                "is_primary": False,
                "evidence": "Babuschkin is listed as a founding member of xAI.",
                "source_url": "https://en.wikipedia.org/wiki/XAI_(company)",
            },
        ],
    },
]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--live", action="store_true")
    parser.add_argument("-o", "--output", help="Write report to file")
    args = parser.parse_args()

    # HIGH-confidence entries get confidence=4; two MEDIUM (Kevin Weil, Igor
    # Babuschkin) also get 4 here because edges are well-sourced even if role
    # titles are fluid. Adjust per-edge in specs if finer grain needed.
    seed_all(SPECS, live=args.live, output=args.output,
             created_by="phase5f-seed",
             enrichment_version="phase5-seed",
             confidence=4)


if __name__ == "__main__":
    main()
