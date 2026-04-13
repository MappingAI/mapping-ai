#!/usr/bin/env python3
"""
Phase 5G: Tier G — AI-beat journalists + cultural figures + supporting
media organizations.

Seeds 19 entities:

  * 3 media organizations (Reuters, Semafor, Forbes) — needed as edge
    endpoints for journalist employer edges.
  * 12 journalists (9 from original candidate list + 3 high-value bonus
    additions: Ben Thompson, Sigal Samuel, Garrison Lovely).
  * 4 cultural figures (Molly Crabapple, Douglas Rushkoff, Jaron Lanier,
    Sherry Turkle). Naomi Klein already in DB as [941] — skipped.

Dropped from research (insufficient evidence or wrong category):
  * Tim Urban — no confirmed 2024–25 AI work.
  * Nick Bostrom — already in DB as Academic.
  * Audrey Tang — already in DB as Policymaker.
  * Rana Ayyub, James Bridle — not primarily AI-beat.
  * Kate Kaye, Dan Primack, Ryan Mac — either departed journalism
    or AI is not their primary beat.

Confidence: 4 for journalists/orgs with documented employment; 3 for
cultural figures (independent/affiliation-fluid).

Ordering matters: media orgs seed FIRST so journalist edges resolve.

Usage:
    python scripts/seed_tier_g.py              # dry run
    python scripts/seed_tier_g.py --live       # apply
    python scripts/seed_tier_g.py -o LOG.md    # write report
"""

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from seed_entity import seed_all


# ══════════════════════════════════════════════════════════════════════
# Existing media org IDs (verified 2026-04-12)
# ══════════════════════════════════════════════════════════════════════
NYT_ID             = 862     # "The New York Times" (duplicate of 1059 — flagged)
WAPO_ID            = 868
WSJ_ID             = 1409
BLOOMBERG_ID       = 865
THE_VERGE_ID       = 175
WIRED_ID           = 863
PLATFORMER_ID      = 1060    # organization entity (648 is the resource)
MIT_TECH_REVIEW_ID = 864
MICROSOFT_ID       = 1042    # for Jaron Lanier edge


# ══════════════════════════════════════════════════════════════════════
# SPECS — Media orgs FIRST (ordering matters for downstream edges)
# ══════════════════════════════════════════════════════════════════════

MEDIA_ORG_SPECS = [
    # ── Reuters ───────────────────────────────────────────────────────
    {
        "name": "Reuters",
        "entity_type": "organization",
        "category": "Media/Journalism",
        "website": "https://www.reuters.com",
        "notes": (
            "Reuters is an international news agency owned by Thomson "
            "Reuters, one of the two largest wire services globally. Its "
            "U.S. technology desk has expanded AI coverage significantly "
            "since 2023, with dedicated AI reporters covering frontier labs "
            "(OpenAI, Anthropic), governance, and enterprise AI adoption. "
            "Widely syndicated — Reuters wire reporting often sets the "
            "initial framing of AI-industry stories in regional and "
            "international outlets."
        ),
        "notes_sources": (
            "https://www.reuters.com/\n"
            "https://en.wikipedia.org/wiki/Reuters"
        ),
        "edges": [],
    },

    # ── Semafor ───────────────────────────────────────────────────────
    {
        "name": "Semafor",
        "entity_type": "organization",
        "category": "Media/Journalism",
        "website": "https://www.semafor.com",
        "notes": (
            "Semafor is a global news organization founded in 2022 by "
            "Justin Smith and Ben Smith. Its Technology vertical, led by "
            "Technology Editor Reed Albergotti, publishes a twice-weekly "
            "AI-focused newsletter read by an estimated 30,000+ tech "
            "executives. Also produces Semafor Flagship (daily newsletter) "
            "and hosts the annual Semafor AI Summit in Washington, D.C., "
            "which convenes AI-industry executives and policymakers."
        ),
        "notes_sources": (
            "https://www.semafor.com/\n"
            "https://en.wikipedia.org/wiki/Semafor_(website)"
        ),
        "edges": [],
    },

    # ── Forbes ────────────────────────────────────────────────────────
    {
        "name": "Forbes",
        "entity_type": "organization",
        "category": "Media/Journalism",
        "website": "https://www.forbes.com",
        "notes": (
            "Forbes is a U.S. business magazine and media company founded "
            "in 1917. Its AI coverage is anchored by the annual AI 50 list "
            "(most promising private AI companies, produced with Sequoia "
            "and Meritech) and a growing dedicated AI reporting team. "
            "Hired Anna Tong from Reuters in October 2025 to lead AI "
            "coverage and help curate the AI 50."
        ),
        "notes_sources": (
            "https://www.forbes.com/ai/\n"
            "https://en.wikipedia.org/wiki/Forbes"
        ),
        "edges": [],
    },
]


# ══════════════════════════════════════════════════════════════════════
# JOURNALIST SPECS — seed SECOND, after media orgs exist
# Edge targeting uses string "name" (resolved dynamically post-insert)
# so we can reference Reuters/Semafor/Forbes by name below.
# ══════════════════════════════════════════════════════════════════════

# Because seed_entity.py needs `other_id` integers, we look up the
# just-seeded media-org IDs at runtime in main(). Journalists are defined
# below as a template; edges get patched with resolved IDs before seed_all.

JOURNALIST_SPEC_TEMPLATES = [

    # ── 1. Kylie Robison ──────────────────────────────────────────────
    {
        "name": "Kylie Robison",
        "entity_type": "person",
        "category": "Journalist",
        "title": "Independent AI journalist (KylieBytes); formerly Senior Correspondent, Wired",
        "primary_org": "Independent",
        "other_orgs": "Wired (former, 2024–2025)",
        "influence_type": "Narrator",
        "notes": (
            "Kylie Robison covered the business of AI as Senior "
            "Correspondent at Wired from 2024 through late 2025, including "
            "reporting on OpenAI, Anthropic, and Dario Amodei's positions "
            "on state AI regulation. Departed Wired to write independently "
            "(KylieBytes) in late 2025. Well-sourced in Silicon Valley "
            "AI-business circles."
        ),
        "notes_sources": (
            "https://talkingbiznews.com/media-news/wired-hires-robison-as-senior-correspondent/\n"
            "https://talkingbiznews.com/media-news/senior-correspondent-robison-departs-wired/"
        ),
        "edges": [
            {"direction": "from_new", "other_id": WIRED_ID,
             "edge_type": "employer", "role": "Senior Correspondent (2024–2025)",
             "is_primary": False,
             "evidence": "Robison was Wired Senior Correspondent covering AI from 2024 to late 2025.",
             "source_url": "https://talkingbiznews.com/media-news/senior-correspondent-robison-departs-wired/"},
        ],
    },

    # ── 2. Hayden Field ───────────────────────────────────────────────
    {
        "name": "Hayden Field",
        "entity_type": "person",
        "category": "Journalist",
        "title": "Senior AI Reporter (Lead), The Verge",
        "primary_org": "The Verge",
        "other_orgs": "CNBC (former)",
        "influence_type": "Narrator",
        "notes": (
            "Hayden Field leads The Verge's AI coverage as Senior AI "
            "Reporter, having joined from CNBC in June 2025. Anchors "
            "Verge reporting on OpenAI, Anthropic, Google, Meta, and "
            "Apple's AI efforts. Appears on the Decoder podcast discussing "
            "AI monetization and lab IPO timelines."
        ),
        "notes_sources": (
            "https://www.linkedin.com/in/haydenfield/\n"
            "https://meredithandthemedia.substack.com/p/cnbcs-hayden-field-joins-the-verge"
        ),
        "edges": [
            {"direction": "from_new", "other_id": THE_VERGE_ID,
             "edge_type": "employer", "role": "Senior AI Reporter",
             "is_primary": True,
             "evidence": "Hayden Field joined The Verge as Senior AI Reporter from CNBC in June 2025.",
             "source_url": "https://meredithandthemedia.substack.com/p/cnbcs-hayden-field-joins-the-verge"},
        ],
    },

    # ── 3. Deepa Seetharaman → Reuters ───────────────────────────────
    {
        "name": "Deepa Seetharaman",
        "entity_type": "person",
        "category": "Journalist",
        "title": "AI Reporter, Reuters",
        "primary_org": "Reuters",
        "other_orgs": "Wall Street Journal (former, ~2015–2025)",
        "influence_type": "Narrator",
        "notes": (
            "Deepa Seetharaman covers AI at Reuters, having joined in "
            "April 2025 after a decade at the Wall Street Journal where "
            "she was a lead tech reporter (including on the 'Facebook "
            "Files' investigation). One of the most experienced AI "
            "accountability journalists in U.S. media."
        ),
        "notes_sources": (
            "https://talkingbiznews.com/media-news/wsj-tech-reporter-seetharaman-departs/\n"
            "https://muckrack.com/dseetharaman"
        ),
        "edges": [
            {"direction": "from_new", "other_id": "Reuters",  # resolved at runtime
             "edge_type": "employer", "role": "AI Reporter",
             "is_primary": True,
             "evidence": "Seetharaman joined Reuters to cover AI in April 2025 after departing WSJ.",
             "source_url": "https://talkingbiznews.com/media-news/wsj-tech-reporter-seetharaman-departs/"},
            {"direction": "from_new", "other_id": WSJ_ID,
             "edge_type": "employer", "role": "Tech Reporter (former, ~2015–2025)",
             "is_primary": False,
             "evidence": "Seetharaman spent a decade at WSJ before joining Reuters.",
             "source_url": "https://talkingbiznews.com/media-news/wsj-tech-reporter-seetharaman-departs/"},
        ],
    },

    # ── 4. Berber Jin → WSJ ──────────────────────────────────────────
    {
        "name": "Berber Jin",
        "entity_type": "person",
        "category": "Journalist",
        "title": "Reporter, AI / Startups / VC, Wall Street Journal",
        "primary_org": "Wall Street Journal",
        "influence_type": "Narrator",
        "notes": (
            "Berber Jin is a Wall Street Journal reporter covering AI, "
            "startups and venture capital. Broke major OpenAI scoops in "
            "2025–26 including the 'code red' leadership dynamics, the "
            "Sora shutdown controversy, Sam Altman investment conflicts, "
            "and the OpenAI/Anthropic IPO race."
        ),
        "notes_sources": (
            "https://muckrack.com/berber-jin\n"
            "https://www.linkedin.com/in/berberjin/"
        ),
        "edges": [
            {"direction": "from_new", "other_id": WSJ_ID,
             "edge_type": "employer", "role": "Reporter, AI / Startups / VC",
             "is_primary": True,
             "evidence": "Berber Jin is a WSJ reporter covering AI, startups and VC.",
             "source_url": "https://muckrack.com/berber-jin"},
        ],
    },

    # ── 5. Alex Heath → Sources (independent) ─────────────────────────
    {
        "name": "Alex Heath",
        "entity_type": "person",
        "category": "Journalist",
        "title": "Founder, Sources; Co-host, 'Access' podcast (Vox Media)",
        "primary_org": "Sources (independent publication)",
        "other_orgs": "The Verge (former)",
        "influence_type": "Narrator",
        "notes": (
            "Alex Heath left The Verge in September 2025 to launch "
            "Sources, an independent publication chronicling how AI is "
            "reshaping Silicon Valley. Also co-hosts the Access podcast "
            "(Vox Media) with interviews of tech CEOs (Mark Zuckerberg, "
            "Dylan Field). Known for AI talent-war scoops and CEO-access "
            "interviews during his Verge tenure."
        ),
        "notes_sources": (
            "https://sources.news/about\n"
            "https://talkingbiznews.com/media-news/heath-departs-the-verge-to-launch-podcast-publication/"
        ),
        "edges": [
            {"direction": "from_new", "other_id": THE_VERGE_ID,
             "edge_type": "employer", "role": "Reporter (former, through Sept 2025)",
             "is_primary": False,
             "evidence": "Alex Heath left The Verge in September 2025 to found Sources.",
             "source_url": "https://talkingbiznews.com/media-news/heath-departs-the-verge-to-launch-podcast-publication/"},
        ],
    },

    # ── 6. Nilay Patel → The Verge (Editor-in-Chief) ─────────────────
    {
        "name": "Nilay Patel",
        "entity_type": "person",
        "category": "Journalist",
        "title": "Editor-in-Chief, The Verge; Host, 'Decoder' podcast",
        "primary_org": "The Verge",
        "influence_type": "Narrator, Connector/convener",
        "notes": (
            "Nilay Patel is Editor-in-Chief of The Verge and host of the "
            "Decoder podcast, one of the most influential tech-policy "
            "interview shows. Decoder episodes in 2025–26 have interviewed "
            "AI-lab and enterprise leaders, and Patel's editorial direction "
            "shapes Verge coverage of OpenAI, Anthropic, and Pentagon AI "
            "procurement."
        ),
        "notes_sources": (
            "https://podcasts.apple.com/us/podcast/decoder-with-nilay-patel/id1011668648\n"
            "https://en.wikipedia.org/wiki/Nilay_Patel"
        ),
        "edges": [
            {"direction": "from_new", "other_id": THE_VERGE_ID,
             "edge_type": "employer", "role": "Editor-in-Chief",
             "is_primary": True,
             "evidence": "Nilay Patel is Editor-in-Chief of The Verge and host of Decoder.",
             "source_url": "https://en.wikipedia.org/wiki/Nilay_Patel"},
        ],
    },

    # ── 7. Reed Albergotti → Semafor ─────────────────────────────────
    {
        "name": "Reed Albergotti",
        "entity_type": "person",
        "category": "Journalist",
        "title": "Technology Editor, Semafor",
        "primary_org": "Semafor",
        "influence_type": "Narrator",
        "notes": (
            "Reed Albergotti is Technology Editor at Semafor, authoring its "
            "twice-weekly AI-focused newsletter read by an estimated 30,000+ "
            "tech executives. Covers AI infrastructure (GPU shortages, "
            "data-center capacity), frontier labs, and Big Tech AI "
            "strategy. Editor of Semafor Tech's 2026 predictions package."
        ),
        "notes_sources": (
            "https://www.semafor.com/author/reed-albergotti\n"
            "https://www.semafor.com/article/12/31/2025/semafor-techs-predictions-for-2026"
        ),
        "edges": [
            {"direction": "from_new", "other_id": "Semafor",  # resolved at runtime
             "edge_type": "employer", "role": "Technology Editor",
             "is_primary": True,
             "evidence": "Reed Albergotti is Technology Editor at Semafor.",
             "source_url": "https://www.semafor.com/author/reed-albergotti"},
        ],
    },

    # ── 8. Shirin Ghaffary → Bloomberg ───────────────────────────────
    {
        "name": "Shirin Ghaffary",
        "entity_type": "person",
        "category": "Journalist",
        "title": "AI Reporter, Bloomberg News; author, 'Q&AI' newsletter",
        "primary_org": "Bloomberg",
        "influence_type": "Narrator",
        "notes": (
            "Shirin Ghaffary is Bloomberg's lead AI reporter on the West "
            "Coast, covering major frontier-lab funding rounds (including "
            "the reported OpenAI $110B raise in 2025) and writing the "
            "award-winning 'Q&AI' newsletter. Previously at Recode/Vox."
        ),
        "notes_sources": (
            "https://www.bloomberg.com/authors/AWgQvzatnYQ/shirin-ghaffary\n"
            "https://www.bloomberg.com/account/newsletters/q-ai"
        ),
        "edges": [
            {"direction": "from_new", "other_id": BLOOMBERG_ID,
             "edge_type": "employer", "role": "AI Reporter",
             "is_primary": True,
             "evidence": "Shirin Ghaffary is Bloomberg's lead AI reporter on the West Coast.",
             "source_url": "https://www.bloomberg.com/authors/AWgQvzatnYQ/shirin-ghaffary"},
        ],
    },

    # ── 9. Anna Tong → Forbes ────────────────────────────────────────
    {
        "name": "Anna Tong",
        "entity_type": "person",
        "category": "Journalist",
        "title": "AI Reporter, Forbes",
        "primary_org": "Forbes",
        "other_orgs": "Reuters (former)",
        "influence_type": "Narrator",
        "notes": (
            "Anna Tong joined Forbes in October 2025 to cover AI and help "
            "curate the AI 50 list, after previously breaking OpenAI "
            "governance scoops at Reuters. One of the more prominent "
            "AI-business beat journalists moving to a major U.S. business "
            "outlet with a dedicated AI franchise."
        ),
        "notes_sources": (
            "https://www.editorandpublisher.com/stories/forbes-hires-anna-tong-to-cover-artificial-intelligence,258343\n"
            "https://talkingbiznews.com/media-news/forbes-hires-tong-to-cover-artificial-intelligence/"
        ),
        "edges": [
            {"direction": "from_new", "other_id": "Forbes",  # resolved at runtime
             "edge_type": "employer", "role": "AI Reporter",
             "is_primary": True,
             "evidence": "Anna Tong joined Forbes in October 2025 to cover AI.",
             "source_url": "https://www.editorandpublisher.com/stories/forbes-hires-anna-tong-to-cover-artificial-intelligence,258343"},
        ],
    },

    # ── 10. Ben Thompson → Stratechery (independent, bonus) ──────────
    {
        "name": "Ben Thompson",
        "entity_type": "person",
        "category": "Journalist",
        "title": "Founder and Author, Stratechery",
        "primary_org": "Stratechery (independent)",
        "influence_type": "Narrator, Advisor/strategist",
        "notes": (
            "Ben Thompson is founder and author of Stratechery, a "
            "subscription tech-strategy analysis newsletter widely read "
            "by executives and policymakers. Thompson's 2025–26 AI "
            "analysis (including 'Checking In on AI and the Big Five', "
            "'OpenAI, Microsoft and The State of AI', and DeepSeek and "
            "'AI slop era' coverage) has set framing for how industry "
            "leaders think about AI strategy and platform dynamics."
        ),
        "notes_sources": (
            "https://stratechery.com/\n"
            "https://stratechery.com/2025/checking-in-on-ai-and-the-big-five/"
        ),
        "edges": [],
    },

    # ── 11. Sigal Samuel → Vox Future Perfect (bonus) ────────────────
    {
        "name": "Sigal Samuel",
        "entity_type": "person",
        "category": "Journalist",
        "title": "Senior Reporter, Future Perfect, Vox",
        "primary_org": "Vox (Future Perfect)",
        "influence_type": "Narrator",
        "notes": (
            "Sigal Samuel is a Senior Reporter for Vox's Future Perfect "
            "vertical, covering AI consciousness, AI ethics, and "
            "frontier-AI moral philosophy questions substantively — a "
            "niche few mainstream outlets address. Co-hosts the Future "
            "Perfect podcast. One of the most thoughtful public voices on "
            "AI welfare/consciousness questions in U.S. media."
        ),
        "notes_sources": (
            "https://muckrack.com/sigal-samuel\n"
            "https://www.aspenideas.org/speakers/sigal-samuel"
        ),
        "edges": [],
    },

    # ── 12. Garrison Lovely → Freelance (bonus) ──────────────────────
    {
        "name": "Garrison Lovely",
        "entity_type": "person",
        "category": "Journalist",
        "title": "Freelance AI journalist; publisher, 'Obsolete' Substack; author",
        "primary_org": "Freelance / Independent",
        "other_orgs": "Omidyar Network (Reporter-in-Residence)",
        "influence_type": "Narrator",
        "notes": (
            "Garrison Lovely is a freelance AI journalist whose 2024–25 "
            "work has appeared in the New York Times, Bloomberg, TIME, "
            "Nature, and MIT Technology Review (including a 2025 Bloomberg "
            "piece on AI 'scheming'). Publishes the 'Obsolete' Substack "
            "and is author of the forthcoming (Spring 2026) book "
            "'Obsolete'. Reporter-in-Residence at Omidyar Network."
        ),
        "notes_sources": (
            "https://www.obsoletebook.org/\n"
            "https://muckrack.com/garrison-lovely"
        ),
        "edges": [],
    },
]


# ══════════════════════════════════════════════════════════════════════
# CULTURAL FIGURE SPECS — seed LAST
# ══════════════════════════════════════════════════════════════════════

CULTURAL_SPECS = [

    # ── 1. Molly Crabapple ────────────────────────────────────────────
    {
        "name": "Molly Crabapple",
        "entity_type": "person",
        "category": "Cultural figure",
        "title": "Artist and author; anti-generative-AI-art organizer",
        "primary_org": "Independent",
        "influence_type": "Organizer/advocate, Narrator",
        "notes": (
            "Molly Crabapple is a New York-based artist and author and the "
            "most visible artist-organizer in the anti-generative-AI "
            "movement. Organized a 1,000-signatory open letter calling on "
            "publishers not to use AI-generated illustrations. Regular "
            "contributor to Hyperallergic; September 2025 essay 'Can "
            "Artists Stop the AI Slop Machine?' is widely cited by critics "
            "of generative-AI image tools."
        ),
        "notes_sources": (
            "https://news.artnet.com/art-world/open-letter-urges-publishers-not-to-use-ai-generated-illustrations-2294392\n"
            "https://www.mollycrabapple.com/press/"
        ),
        "edges": [],
    },

    # ── 2. Douglas Rushkoff ───────────────────────────────────────────
    {
        "name": "Douglas Rushkoff",
        "entity_type": "person",
        "category": "Cultural figure",
        "title": "Media theorist; Professor of Media Theory, CUNY/Queens; host, 'Team Human'",
        "primary_org": "CUNY Queens College",
        "influence_type": "Narrator, Organizer/advocate",
        "notes": (
            "Douglas Rushkoff is a Professor of Media Theory at Queens "
            "College CUNY, host of the Team Human podcast, and a prolific "
            "public commentator on technology and society. His updated "
            "edition of 'Program or Be Programmed' includes '11 Commands "
            "for the AI future'. Scholar-in-residence at Andus Labs; "
            "produced the Andus 'After Now' event (July 2025) featuring "
            "Brian Eno, Nick Thompson, and others."
        ),
        "notes_sources": (
            "https://rushkoff.com/\n"
            "https://theculturejournalist.substack.com/p/douglas-rushkoff-ai-program-or-be-programmed"
        ),
        "edges": [],
    },

    # ── 3. Jaron Lanier → Microsoft ──────────────────────────────────
    {
        "name": "Jaron Lanier",
        "entity_type": "person",
        "category": "Cultural figure",
        "title": "Prime Unifying Scientist, Microsoft; New Yorker contributor",
        "primary_org": "Microsoft",
        "influence_type": "Narrator, Researcher/analyst",
        "notes": (
            "Jaron Lanier is Microsoft's 'Prime Unifying Scientist' (the "
            "company's informal chief philosophical advisor on AI) and a "
            "longtime New Yorker contributor. Pioneering VR researcher and "
            "one of the field's most prominent public dissenters on AI-as-"
            "entity framing — argues 'there is no AI' and advocates for "
            "'data dignity' (compensating humans whose data trains models). "
            "Shapes elite skepticism about anthropomorphic AI framing."
        ),
        "notes_sources": (
            "https://cdss.berkeley.edu/news/jaron-lanier-wants-you-stop-saying-ai\n"
            "https://medium.com/@jamierothwell/jaron-laniers-a-i-reality-check-why-there-is-no-a-i-is-more-prescient-than-ever-ff75a5c48633"
        ),
        "edges": [
            {"direction": "from_new", "other_id": MICROSOFT_ID,
             "edge_type": "employer", "role": "Prime Unifying Scientist",
             "is_primary": True,
             "evidence": "Jaron Lanier serves as Microsoft's Prime Unifying Scientist.",
             "source_url": "https://cdss.berkeley.edu/news/jaron-lanier-wants-you-stop-saying-ai"},
        ],
    },

    # ── 4. Sherry Turkle ──────────────────────────────────────────────
    {
        "name": "Sherry Turkle",
        "entity_type": "person",
        "category": "Cultural figure",
        "title": "Abby Rockefeller Mauzé Professor, MIT; author",
        "primary_org": "Massachusetts Institute of Technology (MIT)",
        "influence_type": "Narrator, Researcher/analyst",
        "notes": (
            "Sherry Turkle is the Abby Rockefeller Mauzé Professor of the "
            "Social Studies of Science and Technology at MIT and one of "
            "the most prominent U.S. voices on AI companionship and the "
            "psychology of human-AI relationships. Author of 'Artificial "
            "Intimacy: Who We Become When We Talk to Machines' (2025), "
            "building on her earlier 'Alone Together' and 'Reclaiming "
            "Conversation'. Widely cited as chatbot-companion and "
            "emotional-AI products become mainstream."
        ),
        "notes_sources": (
            "https://www.hachettebookgroup.com/titles/sherry-turkle/artificial-intimacy/9780316573962/\n"
            "https://www.npr.org/transcripts/g-s1-14793"
        ),
        "edges": [],
    },

    # Note: Naomi Klein is already in DB as [941] (enrichment_version=v1)
    # with an AI-focused notes section — skip re-seeding.
]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--live", action="store_true")
    parser.add_argument("-o", "--output", help="Write report to file")
    args = parser.parse_args()

    # ──────────────────────────────────────────────────────────────────
    # Step 1: seed media orgs (Reuters, Semafor, Forbes).
    # Need their IDs before seeding journalists that reference them.
    # ──────────────────────────────────────────────────────────────────
    media_report = seed_all(
        MEDIA_ORG_SPECS, live=args.live, output=None,
        created_by="phase5g-media-seed",
        enrichment_version="phase5-seed",
        confidence=4,
    )

    # Build name→id map from media-org seeding results.
    # Each result tuple is (name, new_id, edge_count).
    name_to_id = {r[0]: r[1] for r in media_report["results"]}

    # ──────────────────────────────────────────────────────────────────
    # Step 2: resolve string-based other_id references in journalist specs.
    # Any edge whose other_id is a string (e.g., "Reuters") gets mapped
    # to the newly-seeded org ID. On dry run, media orgs are not inserted,
    # so we stub those edges out to avoid FK violations in the report —
    # seed_entity.py's preflight will flag them as non-existent, which is
    # expected and documented.
    # ──────────────────────────────────────────────────────────────────
    resolved_journalists = []
    for spec in JOURNALIST_SPEC_TEMPLATES:
        edges_out = []
        for e in spec.get("edges", []):
            oid = e["other_id"]
            if isinstance(oid, str):
                resolved = name_to_id.get(oid)
                if resolved is None:
                    if args.live:
                        raise RuntimeError(
                            f"Failed to resolve media org '{oid}' for "
                            f"journalist {spec['name']} — was it seeded?"
                        )
                    # Dry run: leave as string; preflight will note.
                    e = dict(e); e["other_id"] = -1  # signal missing
                    edges_out.append(e)
                    continue
                e = dict(e); e["other_id"] = resolved
            edges_out.append(e)
        new_spec = dict(spec); new_spec["edges"] = edges_out
        resolved_journalists.append(new_spec)

    # Filter out any journalist edges with other_id=-1 (dry-run only).
    if not args.live:
        for spec in resolved_journalists:
            spec["edges"] = [e for e in spec["edges"] if e["other_id"] != -1]

    # ──────────────────────────────────────────────────────────────────
    # Step 3: seed journalists.
    # ──────────────────────────────────────────────────────────────────
    j_report = seed_all(
        resolved_journalists, live=args.live, output=None,
        created_by="phase5g-journalist-seed",
        enrichment_version="phase5-seed",
        confidence=4,
    )

    # ──────────────────────────────────────────────────────────────────
    # Step 4: seed cultural figures.
    # ──────────────────────────────────────────────────────────────────
    c_report = seed_all(
        CULTURAL_SPECS, live=args.live, output=None,
        created_by="phase5g-cultural-seed",
        enrichment_version="phase5-seed",
        confidence=3,   # cultural figures: independent/fluid affiliations
    )

    # ──────────────────────────────────────────────────────────────────
    # Combined report.
    # ──────────────────────────────────────────────────────────────────
    if args.output:
        combined = (
            ["# Tier G — media orgs + journalists + cultural figures\n"]
            + ["## Part 1: Media organizations\n"] + media_report["lines"]
            + ["\n## Part 2: Journalists\n"]       + j_report["lines"]
            + ["\n## Part 3: Cultural figures\n"]  + c_report["lines"]
        )
        with open(args.output, "w") as f:
            f.write("\n".join(combined) + "\n")
        print(f"\nCombined report saved to {args.output}")


if __name__ == "__main__":
    main()
