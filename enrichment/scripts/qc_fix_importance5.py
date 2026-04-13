"""
Apply deterministic QC fixes identified in logs/importance5_spotcheck.md.

Covers:
  1. Rewrite "TEST DATA" placeholder notes on 3 resources (643, 550, 549).
  2. Back-fill `title` for 7 persons.
  3. Back-fill `primary_org` for persons where it was null or stale.
  4. Flip Joe Biden's category from Executive → Policymaker.
  5. Downgrade belief_ai_risk from Existential → Serious for Klein, AOC, Sanders, Drescher.
  6. Add resource_url for EU AI Act.

Skipped (needs judgment / research, not pure SQL):
  - Microsoft / Meta / Google category decision
  - Near-duplicate imp=5 cluster dedup (Google+Alphabet+DeepMind, Meta+Meta AI, WH+Trump admin+OSTP)
  - Zuckerberg + Andreessen note rewrites
  - Hinton / Huang factual cleanup
  - Trump AI Action Plan name/date/URL cleanup

Usage:
    source .venv/bin/activate
    python scripts/qc_fix_importance5.py --dry-run     # preview
    python scripts/qc_fix_importance5.py --live        # apply
"""

import argparse
import os
import sys

import psycopg2
from dotenv import load_dotenv


def load_env():
    env_path = ".env" if os.path.exists(".env") else "../.env"
    load_dotenv(env_path)


NOTES_HUMAN_COMPATIBLE = (
    "2019 book by UC Berkeley computer scientist Stuart Russell arguing that the standard "
    "model of AI — machines pursuing fixed objectives — is fundamentally unsafe as capability "
    "scales, and proposing a provably-beneficial alternative in which AI systems remain "
    "uncertain about human preferences and defer to human feedback. Widely cited in AI "
    "governance discussions of alignment, oversight, and the case for safety-focused "
    "regulation. A foundational popular-audience text alongside Bostrom's Superintelligence."
)

NOTES_NIST_RMF = (
    "Voluntary framework published January 2023 by NIST (under Dept. of Commerce) providing "
    "guidance for organizations to manage risks from AI systems across the lifecycle. Built "
    "around four core functions — Govern, Map, Measure, Manage — and accompanied by the "
    "AI RMF Playbook and Generative AI Profile (July 2024). Widely adopted as the de facto "
    "U.S. industry reference; explicitly invoked in Biden's EO 14110 and in subsequent "
    "federal agency AI policies. Under the Trump administration's July 2025 AI Action Plan, "
    "NIST was directed to revise the RMF (removing references to DEI, misinformation, and "
    "climate change)."
)

NOTES_STATEMENT_AI_RISK = (
    "One-sentence open letter published May 30, 2023 by the Center for AI Safety (CAIS): "
    "\u201cMitigating the risk of extinction from AI should be a global priority alongside other "
    "societal-scale risks such as pandemics and nuclear war.\u201d Signed by 350+ AI researchers "
    "and public figures, including Sam Altman, Demis Hassabis, Dario Amodei, Geoffrey Hinton, "
    "Yoshua Bengio, Stuart Russell, and Bill Gates. A watershed moment that moved existential "
    "AI risk from a fringe concern into mainstream policy discourse."
)


def updates():
    """Return list of (label, sql, params) tuples."""
    return [
        # 1. TEST DATA rewrites
        ("resource 643 Human Compatible — rewrite notes",
         "UPDATE entity SET notes = %s, updated_at = now() WHERE id = 643",
         (NOTES_HUMAN_COMPATIBLE,)),
        ("resource 550 NIST AI RMF — rewrite notes",
         "UPDATE entity SET notes = %s, updated_at = now() WHERE id = 550",
         (NOTES_NIST_RMF,)),
        ("resource 549 Statement on AI Risk — rewrite notes",
         "UPDATE entity SET notes = %s, updated_at = now() WHERE id = 549",
         (NOTES_STATEMENT_AI_RISK,)),

        # 2. Person titles (7)
        ("person 1376 Joe Biden — set title",
         "UPDATE entity SET title = %s, updated_at = now() WHERE id = 1376",
         ("46th President of the United States (2021\u20132025)",)),
        ("person 1103 Donald Trump — set title",
         "UPDATE entity SET title = %s, updated_at = now() WHERE id = 1103",
         ("45th and 47th President of the United States (2017\u20132021, 2025\u2013present)",)),
        ("person 1476 Elizabeth Warren — set title",
         "UPDATE entity SET title = %s, updated_at = now() WHERE id = 1476",
         ("U.S. Senator, Massachusetts (2013\u2013present)",)),
        ("person 1425 John Thune — set title",
         "UPDATE entity SET title = %s, updated_at = now() WHERE id = 1425",
         ("Senate Majority Leader (2025\u2013present); U.S. Senator, South Dakota (2005\u2013present)",)),
        ("person 1305 Mike Johnson — set title",
         "UPDATE entity SET title = %s, updated_at = now() WHERE id = 1305",
         ("Speaker of the U.S. House of Representatives (2023\u2013present); U.S. Representative, Louisiana",)),
        ("person 1223 Jeff Dean — set title",
         "UPDATE entity SET title = %s, updated_at = now() WHERE id = 1223",
         ("Chief Scientist, Google DeepMind & Google Research",)),
        ("person 1366 John M. Jumper — set title",
         "UPDATE entity SET title = %s, updated_at = now() WHERE id = 1366",
         ("Director, Google DeepMind; 2024 Nobel Laureate in Chemistry (AlphaFold)",)),

        # 3. Person primary_org fills (11 — skipping Swisher who has no clear primary)
        ("person 821 Geoffrey Hinton — primary_org",
         "UPDATE entity SET primary_org = %s, updated_at = now() WHERE id = 821",
         ("University of Toronto",)),
        ("person 938 Yuval Noah Harari — primary_org",
         "UPDATE entity SET primary_org = %s, updated_at = now() WHERE id = 938",
         ("Sapienship",)),
        ("person 1103 Donald Trump — primary_org",
         "UPDATE entity SET primary_org = %s, updated_at = now() WHERE id = 1103",
         ("Trump administration",)),
        ("person 1476 Elizabeth Warren — primary_org",
         "UPDATE entity SET primary_org = %s, updated_at = now() WHERE id = 1476",
         ("United States Senate",)),
        ("person 1425 John Thune — primary_org",
         "UPDATE entity SET primary_org = %s, updated_at = now() WHERE id = 1425",
         ("United States Senate",)),
        ("person 1305 Mike Johnson — primary_org",
         "UPDATE entity SET primary_org = %s, updated_at = now() WHERE id = 1305",
         ("U.S. House of Representatives",)),
        ("person 1007 Andrej Karpathy — primary_org",
         "UPDATE entity SET primary_org = %s, updated_at = now() WHERE id = 1007",
         ("Eureka Labs",)),
        ("person 835 Ilya Sutskever — primary_org",
         "UPDATE entity SET primary_org = %s, updated_at = now() WHERE id = 835",
         ("Safe Superintelligence Inc.",)),
        ("person 1223 Jeff Dean — primary_org",
         "UPDATE entity SET primary_org = %s, updated_at = now() WHERE id = 1223",
         ("Google DeepMind",)),
        ("person 1366 John M. Jumper — primary_org",
         "UPDATE entity SET primary_org = %s, updated_at = now() WHERE id = 1366",
         ("Google DeepMind",)),

        # Role updates for people whose current role moved orgs
        ("person 1006 Marco Rubio — primary_org Senate→State",
         "UPDATE entity SET primary_org = %s, updated_at = now() WHERE id = 1006",
         ("U.S. Department of State",)),
        ("person 92 Yann LeCun — primary_org Meta AI→AMI Labs",
         "UPDATE entity SET primary_org = %s, updated_at = now() WHERE id = 92",
         ("Advanced Machine Intelligence Labs (AMI Labs)",)),

        # 4. Biden category
        ("person 1376 Joe Biden — category Executive→Policymaker",
         "UPDATE entity SET category = %s, updated_at = now() WHERE id = 1376",
         ("Policymaker",)),

        # 5. belief_ai_risk: Existential→Serious
        ("person 67 Ezra Klein — belief_ai_risk Existential→Serious",
         "UPDATE entity SET belief_ai_risk = %s, updated_at = now() WHERE id = 67",
         ("Serious",)),
        ("person 10 AOC — belief_ai_risk Existential→Serious",
         "UPDATE entity SET belief_ai_risk = %s, updated_at = now() WHERE id = 10",
         ("Serious",)),
        ("person 96 Bernie Sanders — belief_ai_risk Existential→Serious",
         "UPDATE entity SET belief_ai_risk = %s, updated_at = now() WHERE id = 96",
         ("Serious",)),
        ("person 36 Fran Drescher — belief_ai_risk Existential→Serious",
         "UPDATE entity SET belief_ai_risk = %s, updated_at = now() WHERE id = 36",
         ("Serious",)),

        # 6. Resource URL
        ("resource 635 EU AI Act — set resource_url",
         "UPDATE entity SET resource_url = %s, updated_at = now() WHERE id = 635",
         ("https://eur-lex.europa.eu/eli/reg/2024/1689/oj",)),
    ]


def main():
    parser = argparse.ArgumentParser()
    g = parser.add_mutually_exclusive_group(required=True)
    g.add_argument("--dry-run", action="store_true")
    g.add_argument("--live", action="store_true")
    args = parser.parse_args()

    load_env()
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()

    items = updates()
    print(f"Planned updates: {len(items)}")
    applied = 0
    skipped = 0
    for label, sql, params in items:
        cur.execute(sql, params)
        rc = cur.rowcount
        status = "OK" if rc == 1 else f"SKIP (rowcount={rc})"
        print(f"  [{status}] {label}")
        if rc == 1:
            applied += 1
        else:
            skipped += 1

    if args.live:
        conn.commit()
        print(f"\nCOMMITTED: {applied} applied, {skipped} skipped.")
    else:
        conn.rollback()
        print(f"\nDRY-RUN: {applied} would apply, {skipped} would skip. Rolled back.")
    cur.close()
    conn.close()


if __name__ == "__main__":
    sys.exit(main())
