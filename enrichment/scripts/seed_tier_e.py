#!/usr/bin/env python3
"""
Phase 5E: Tier E seeding — 5 anchor resources (foundational AI papers and
essays) that policy discussions repeatedly cite. Each is seeded with
publisher and (where possible) author edges to existing entities.

Selection criteria:
  * frequently cited in AI policy discourse (policymakers, journalists,
    think tanks reference these by name)
  * has at least one existing entity we can anchor with an edge
  * truly missing from DB (confirmed via name/title ILIKE search)

Seeded at confidence=4 on edges — these are well-documented public
authorship facts, not inferences.

Usage:
    python scripts/seed_tier_e.py              # dry run
    python scripts/seed_tier_e.py --live       # apply
    python scripts/seed_tier_e.py -o LOG.md    # write report
"""

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from seed_entity import seed_all

# Existing entity IDs verified 2026-04-12:
ANTHROPIC_ID      = 133
OPENAI_ID         = 140
GOOGLE_ID         = 1041
DARIO_AMODEI_ID   = 8
JARED_KAPLAN_ID   = 50
JAN_LEIKE_ID      = 822
JOHN_SCHULMAN_ID  = 836
PAUL_CHRISTIANO_ID = 30
SAM_MCCANDLISH_ID = 1798  # seeded in Tier C


SPECS = [
    # ── 1. Core Views on AI Safety ─────────────────────────────────────
    {
        "name": "Core Views on AI Safety",
        "entity_type": "resource",
        "resource_type": "Essay",
        "resource_category": "AI Safety",
        "resource_author": "Anthropic",
        "resource_year": "2023",
        "resource_url": "https://www.anthropic.com/news/core-views-on-ai-safety",
        "resource_title": "Core Views on AI Safety: When, Why, What, and How",
        "resource_key_argument": (
            "Anthropic's foundational public statement of its AI safety "
            "philosophy: frontier AI could be transformative and risky, "
            "safety research must scale alongside capabilities, empirical "
            "work on current models generalizes to future risks, and a mix "
            "of safety research and responsible scaling is necessary."
        ),
        "notes": (
            "Published by Anthropic in March 2023 as a company-wide "
            "statement of AI safety views and strategy. Frequently cited in "
            "AI governance discussions as representative of the 'responsible "
            "scaling' / 'pragmatic safety' frame, in contrast to pause-"
            "oriented positions. Often referenced alongside Anthropic's "
            "Responsible Scaling Policy (RSP)."
        ),
        "notes_sources": (
            "https://www.anthropic.com/news/core-views-on-ai-safety"
        ),
        "edges": [
            {
                "direction": "to_new",
                "other_id": ANTHROPIC_ID,
                "edge_type": "publisher",
                "role": None,
                "is_primary": False,
                "evidence": "Core Views on AI Safety is Anthropic's own published statement.",
                "source_url": "https://www.anthropic.com/news/core-views-on-ai-safety",
            },
        ],
    },

    # ── 2. Constitutional AI ───────────────────────────────────────────
    {
        "name": "Constitutional AI: Harmlessness from AI Feedback",
        "entity_type": "resource",
        "resource_type": "Academic Paper",
        "resource_category": "AI Safety",
        "resource_author": "Yuntao Bai, Saurav Kadavath, Sandipan Kundu, Amanda Askell, Jackson Kernion, Andy Jones, Anna Chen, Anna Goldie, Azalia Mirhoseini, Cameron McKinnon, et al. (Anthropic)",
        "resource_year": "2022",
        "resource_url": "https://arxiv.org/abs/2212.08073",
        "resource_title": "Constitutional AI: Harmlessness from AI Feedback",
        "resource_key_argument": (
            "Introduces Constitutional AI (CAI): a method to train a "
            "harmless AI assistant using AI-generated feedback guided by a "
            "set of written principles ('constitution'), instead of relying "
            "primarily on human-labeled harmlessness feedback. Builds on "
            "RLHF but replaces human preference labels for harmfulness with "
            "AI self-critique and revision."
        ),
        "notes": (
            "Foundational Anthropic paper (December 2022) that introduced "
            "Constitutional AI, the training approach that underlies the "
            "Claude models' safety behavior. Widely cited in AI governance "
            "discussions around alignment techniques, scalable oversight, "
            "and alternatives to pure-human-feedback training."
        ),
        "notes_sources": (
            "https://arxiv.org/abs/2212.08073\n"
            "https://www.anthropic.com/research/constitutional-ai-harmlessness-from-ai-feedback"
        ),
        "edges": [
            {
                "direction": "to_new",
                "other_id": ANTHROPIC_ID,
                "edge_type": "publisher",
                "role": None,
                "is_primary": False,
                "evidence": "Constitutional AI was authored by a team at Anthropic.",
                "source_url": "https://arxiv.org/abs/2212.08073",
            },
            {
                "direction": "to_new",
                "other_id": JARED_KAPLAN_ID,
                "edge_type": "author",
                "role": "Senior author",
                "is_primary": False,
                "evidence": "Jared Kaplan is listed as a senior author on the Constitutional AI paper.",
                "source_url": "https://arxiv.org/abs/2212.08073",
            },
            {
                "direction": "to_new",
                "other_id": DARIO_AMODEI_ID,
                "edge_type": "author",
                "role": "Senior author",
                "is_primary": False,
                "evidence": "Dario Amodei is listed as a senior author on the Constitutional AI paper.",
                "source_url": "https://arxiv.org/abs/2212.08073",
            },
        ],
    },

    # ── 3. Attention Is All You Need ───────────────────────────────────
    {
        "name": "Attention Is All You Need",
        "entity_type": "resource",
        "resource_type": "Academic Paper",
        "resource_category": "Technical",
        "resource_author": "Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N. Gomez, Łukasz Kaiser, Illia Polosukhin (Google)",
        "resource_year": "2017",
        "resource_url": "https://arxiv.org/abs/1706.03762",
        "resource_title": "Attention Is All You Need",
        "resource_key_argument": (
            "Introduces the Transformer, a neural network architecture based "
            "solely on attention mechanisms, dispensing with recurrence and "
            "convolutions. Achieves state-of-the-art translation quality "
            "while being more parallelizable and requiring significantly "
            "less training time. The architectural foundation of nearly all "
            "modern large language models."
        ),
        "notes": (
            "2017 Google paper at NeurIPS that introduced the Transformer "
            "architecture — the foundation of GPT, BERT, Claude, Gemini, "
            "LLaMA, and essentially every frontier language model. Of the "
            "eight authors, Aidan N. Gomez later co-founded Cohere. The "
            "paper is routinely invoked in AI policy discussions to ground "
            "claims about the lineage and maturity of current AI systems."
        ),
        "notes_sources": (
            "https://arxiv.org/abs/1706.03762\n"
            "https://proceedings.neurips.cc/paper_files/paper/2017/hash/3f5ee243547dee91fbd053c1c4a845aa-Abstract.html"
        ),
        "edges": [
            {
                "direction": "to_new",
                "other_id": GOOGLE_ID,
                "edge_type": "publisher",
                "role": None,
                "is_primary": False,
                "evidence": "All eight authors were affiliated with Google (Google Brain / Google Research) at time of publication.",
                "source_url": "https://arxiv.org/abs/1706.03762",
            },
        ],
    },

    # ── 4. InstructGPT / RLHF paper ────────────────────────────────────
    {
        "name": "Training Language Models to Follow Instructions with Human Feedback",
        "entity_type": "resource",
        "resource_type": "Academic Paper",
        "resource_category": "AI Safety",
        "resource_author": "Long Ouyang, Jeff Wu, Xu Jiang, Diogo Almeida, Carroll L. Wainwright, Pamela Mishkin, Chong Zhang, Sandhini Agarwal, Katarina Slama, Alex Ray, John Schulman, Jacob Hilton, Fraser Kelton, Luke Miller, Maddie Simens, Amanda Askell, Peter Welinder, Paul Christiano, Jan Leike, Ryan Lowe (OpenAI)",
        "resource_year": "2022",
        "resource_url": "https://arxiv.org/abs/2203.02155",
        "resource_title": "Training Language Models to Follow Instructions with Human Feedback (InstructGPT)",
        "resource_key_argument": (
            "Shows that fine-tuning language models with reinforcement "
            "learning from human feedback (RLHF) produces outputs humans "
            "prefer and rate as more truthful and less harmful than base "
            "models, even when the RLHF model is 100x smaller. Established "
            "RLHF as the dominant post-training alignment technique for "
            "commercial LLMs (used in ChatGPT, GPT-4, Claude, Gemini)."
        ),
        "notes": (
            "OpenAI's foundational 2022 RLHF paper (the 'InstructGPT' "
            "paper), which underpins the alignment approach in ChatGPT and "
            "all subsequent commercial LLMs. Frequently cited in AI policy "
            "discussions about post-training interventions, alignment "
            "research, and the limits of current safety techniques."
        ),
        "notes_sources": (
            "https://arxiv.org/abs/2203.02155\n"
            "https://openai.com/research/instruction-following"
        ),
        "edges": [
            {
                "direction": "to_new",
                "other_id": OPENAI_ID,
                "edge_type": "publisher",
                "role": None,
                "is_primary": False,
                "evidence": "InstructGPT was published by OpenAI researchers.",
                "source_url": "https://arxiv.org/abs/2203.02155",
            },
            {
                "direction": "to_new",
                "other_id": JAN_LEIKE_ID,
                "edge_type": "author",
                "role": "Senior author",
                "is_primary": False,
                "evidence": "Jan Leike is listed as a senior author on InstructGPT.",
                "source_url": "https://arxiv.org/abs/2203.02155",
            },
            {
                "direction": "to_new",
                "other_id": JOHN_SCHULMAN_ID,
                "edge_type": "author",
                "role": "Author",
                "is_primary": False,
                "evidence": "John Schulman is listed as an author on InstructGPT.",
                "source_url": "https://arxiv.org/abs/2203.02155",
            },
            {
                "direction": "to_new",
                "other_id": PAUL_CHRISTIANO_ID,
                "edge_type": "author",
                "role": "Author",
                "is_primary": False,
                "evidence": "Paul Christiano is listed as an author on InstructGPT.",
                "source_url": "https://arxiv.org/abs/2203.02155",
            },
        ],
    },

    # ── 5. Scaling Laws for Neural Language Models ─────────────────────
    {
        "name": "Scaling Laws for Neural Language Models",
        "entity_type": "resource",
        "resource_type": "Academic Paper",
        "resource_category": "AI Capabilities",
        "resource_author": "Jared Kaplan, Sam McCandlish, Tom Henighan, Tom B. Brown, Benjamin Chess, Rewon Child, Scott Gray, Alec Radford, Jeffrey Wu, Dario Amodei (OpenAI)",
        "resource_year": "2020",
        "resource_url": "https://arxiv.org/abs/2001.08361",
        "resource_title": "Scaling Laws for Neural Language Models",
        "resource_key_argument": (
            "Empirically demonstrates that language model performance "
            "follows smooth power-law relationships across model size, "
            "dataset size, and training compute. Motivated the large-scale "
            "investment in ever-larger models (GPT-3 and successors) by "
            "showing predictable capability gains from compute scaling."
        ),
        "notes": (
            "2020 OpenAI paper by Jared Kaplan, Sam McCandlish, and team "
            "(many of whom later co-founded Anthropic) that established the "
            "empirical scaling-laws framework. A foundational reference for "
            "policy debates about compute governance, export controls, and "
            "the inevitability/contingency of capability gains. Widely cited "
            "alongside the Chinchilla paper (Hoffmann et al. 2022)."
        ),
        "notes_sources": (
            "https://arxiv.org/abs/2001.08361"
        ),
        "edges": [
            {
                "direction": "to_new",
                "other_id": OPENAI_ID,
                "edge_type": "publisher",
                "role": None,
                "is_primary": False,
                "evidence": "Scaling Laws was published while the authors were at OpenAI.",
                "source_url": "https://arxiv.org/abs/2001.08361",
            },
            {
                "direction": "to_new",
                "other_id": JARED_KAPLAN_ID,
                "edge_type": "author",
                "role": "First author",
                "is_primary": False,
                "evidence": "Jared Kaplan is the first author of the Scaling Laws paper.",
                "source_url": "https://arxiv.org/abs/2001.08361",
            },
            {
                "direction": "to_new",
                "other_id": SAM_MCCANDLISH_ID,
                "edge_type": "author",
                "role": "Senior author",
                "is_primary": False,
                "evidence": "Sam McCandlish is listed as a co-author on the Scaling Laws paper.",
                "source_url": "https://arxiv.org/abs/2001.08361",
            },
            {
                "direction": "to_new",
                "other_id": DARIO_AMODEI_ID,
                "edge_type": "author",
                "role": "Senior author",
                "is_primary": False,
                "evidence": "Dario Amodei is listed as a senior author on the Scaling Laws paper.",
                "source_url": "https://arxiv.org/abs/2001.08361",
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
             created_by="phase5e-seed",
             enrichment_version="phase5-seed",
             confidence=4)


if __name__ == "__main__":
    main()
