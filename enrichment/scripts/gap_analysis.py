#!/usr/bin/env python3
"""
Phase 5A: Coverage gap analysis for seeding.

Produces a Markdown report answering "what are we under-covered on?" along
several axes:

  1. Category × entity_type counts (persons, orgs, resources) — surface
     under-represented categories relative to canonical buckets.
  2. Executive team coverage — for canonical "must-have" orgs (frontier
     labs, big agencies, top think tanks), list whether we have CEO /
     CTO / Chief Scientist / Head of Policy edges.
  3. Org staff distribution — orgs with 0 / 1 / 2+ inbound employer edges.
  4. Orphan counts by category — entities with zero edges.
  5. Resource coverage — by resource_type and resource_category.
  6. Influence-type coverage by person category — cross-tab.
  7. Named-entity absence check — a small watchlist of high-profile
     names we'd expect but may be missing.

No AI, no network calls — pure SQL over the staging DB.

Usage:
    python scripts/gap_analysis.py                      # stdout
    python scripts/gap_analysis.py -o logs/gap.md       # write to file
"""

import argparse
import os
import sys
from datetime import datetime, timezone

import psycopg2
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(env_path)

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set in .env", file=sys.stderr)
    sys.exit(1)


# ── Canonical category lists (from ONBOARDING.md) ───────────────────────

PERSON_CATEGORIES = [
    "Executive", "Researcher", "Policymaker", "Investor",
    "Organizer", "Journalist", "Academic", "Cultural figure",
]

ORG_CATEGORIES = [
    "Frontier Lab", "Infrastructure & Compute", "Deployers & Platforms",
    "AI Safety/Alignment", "Think Tank/Policy Org", "Government/Agency",
    "Academic", "VC/Capital/Philanthropy", "Labor/Civil Society",
    "Ethics/Bias/Rights", "Media/Journalism", "Political Campaign/PAC",
]

RESOURCE_TYPES = [
    "Essay", "Book", "Report", "Podcast", "Video",
    "Website", "Academic Paper", "News Article", "Substack/Newsletter",
]

RESOURCE_CATEGORIES = [
    "AI Safety", "AI Governance", "AI Capabilities", "Labor & Economy",
    "National Security", "Industry Analysis", "Policy Proposal",
    "Technical", "Philosophy/Ethics",
]

INFLUENCE_TYPES = [
    "Decision-maker", "Advisor/strategist", "Researcher/analyst",
    "Funder/investor", "Builder", "Organizer/advocate",
    "Narrator", "Implementer", "Connector/convener",
]

# Major orgs we expect full executive team coverage for (CEO/CTO/Chief
# Scientist/Head of Policy). Each entry is (display_label, SQL_ILIKE_pattern).
# The first entity matched becomes the canonical one for that slot.
KEY_ORG_PATTERNS = [
    # Frontier labs
    ("OpenAI",              "OpenAI"),
    ("Anthropic",           "Anthropic"),
    ("Google DeepMind",     "Google DeepMind"),
    ("Meta AI",             "Meta AI"),
    ("xAI",                 "xAI"),
    ("Mistral AI",          "Mistral AI"),
    ("Cohere",              "Cohere"),
    ("Inflection AI",       "Inflection%"),
    # Major tech
    ("Microsoft",           "Microsoft"),
    ("Google",              "Google"),
    ("Amazon",              "Amazon"),
    ("Apple",               "Apple"),
    ("Meta",                "Meta"),
    ("NVIDIA",              "Nvidia"),
    # Federal agencies (match by longer formal name)
    ("NIST",                "National Institute of Standards and Technology"),
    ("OSTP",                "%Office of Science and Technology Policy%"),
    ("FTC",                 "Federal Trade Commission"),
    ("NSF",                 "%National Science Foundation%"),
    ("US AISI (NIST)",      "U.S. AI Safety Institute (NIST)"),
    ("Commerce Dept",       "Department of Commerce"),
    ("State Department",    "%State Department%"),
    ("DoD",                 "Department of Defense"),
    ("OMB",                 "Office of Management and Budget"),
    ("NSC",                 "%National Security Council%"),
    ("PCAST",               "%President%Council of Advisors%"),
    ("CAISI",               "CAISI"),
    ("BIS",                 "%Bureau of Industry%"),
    # Top think tanks
    ("Brookings",           "Brookings Institution"),
    ("RAND",                "RAND Corporation"),
    ("CSIS",                "Center for Strategic and International Studies"),
    ("CAIS",                "Center for AI Safety (CAIS)"),
    ("CAIP",                "Center for AI Policy (CAIP)"),
    ("FLI",                 "Future of Life Institute"),
    ("MIRI",                "Machine Intelligence Research Institute (MIRI)"),
    ("Apollo Research",     "Apollo Research"),
    ("METR",                "Model Evaluation & Threat Research (METR)"),
]

# Roles we care about for executive coverage (substring match, lowered)
KEY_ROLES = {
    "CEO":        ["ceo", "chief executive", "president"],
    "CTO":        ["cto", "chief technology"],
    "Chief Sci":  ["chief scientist", "chief science",
                   "chief research officer"],
    "Policy":     ["head of policy", "vp of policy",
                   "policy lead", "chief policy", "director of policy",
                   "head of global affairs", "chief global"],
}

# Watchlist — prominent names we'd expect to appear in a US AI policy DB.
# This is intentionally short; the goal is spot-checking, not completeness.
WATCHLIST = [
    # Executives
    "Sam Altman", "Dario Amodei", "Demis Hassabis", "Mark Zuckerberg",
    "Sundar Pichai", "Satya Nadella", "Elon Musk", "Jensen Huang",
    # Researchers
    "Yoshua Bengio", "Geoffrey Hinton", "Stuart Russell",
    "Yann LeCun", "Ilya Sutskever", "Andrej Karpathy",
    # Policymakers
    "Chuck Schumer", "Ted Cruz", "Mike Johnson", "Nancy Pelosi",
    "Josh Hawley", "Ron Wyden",
    # Agencies / figures
    "Arati Prabhakar", "Lina Khan", "Gina Raimondo",
    # Orgs / misc
    "SAG-AFTRA", "Writers Guild of America",
    "Electronic Frontier Foundation", "ACLU",
]


# ── Helpers ──────────────────────────────────────────────────────────────

def pct(part, whole):
    if whole == 0:
        return "0.0%"
    return f"{100 * part / whole:.1f}%"


class Reporter:
    def __init__(self):
        self.lines = []

    def __call__(self, line=""):
        self.lines.append(line)
        print(line)

    def write(self, path):
        with open(path, "w") as f:
            f.write("\n".join(self.lines) + "\n")


# ── Queries ──────────────────────────────────────────────────────────────

def q_category_counts(cur):
    """Count entities grouped by entity_type + category."""
    cur.execute("""
        SELECT entity_type, COALESCE(category, '(NULL)'), COUNT(*)
        FROM entity
        GROUP BY 1, 2
        ORDER BY 1, 3 DESC
    """)
    return cur.fetchall()


def q_resource_breakdown(cur):
    cur.execute("""
        SELECT COALESCE(resource_type, '(NULL)'),
               COALESCE(resource_category, '(NULL)'),
               COUNT(*)
        FROM entity
        WHERE entity_type = 'resource'
        GROUP BY 1, 2
        ORDER BY 1, 2
    """)
    return cur.fetchall()


def q_orphans_by_category(cur):
    """Entities with zero edges (neither as source nor target)."""
    cur.execute("""
        SELECT e.entity_type, COALESCE(e.category, '(NULL)'), COUNT(*)
        FROM entity e
        WHERE NOT EXISTS (
            SELECT 1 FROM edge WHERE source_id = e.id OR target_id = e.id
        )
        GROUP BY 1, 2
        ORDER BY 1, 3 DESC
    """)
    return cur.fetchall()


def q_influence_type_by_category(cur):
    """Cross-tab: for each person category, how many hold each influence_type."""
    cur.execute("""
        SELECT category, influence_type
        FROM entity
        WHERE entity_type = 'person'
    """)
    rows = cur.fetchall()
    table = {}  # (category, infl) -> count
    cat_totals = {}
    for cat, infl in rows:
        cat = cat or "(NULL)"
        cat_totals[cat] = cat_totals.get(cat, 0) + 1
        if infl:
            # influence_type is comma-separated
            for piece in infl.split(","):
                p = piece.strip()
                if not p:
                    continue
                # Keep only the leading token (before any parens/slashes)
                key = p
                table[(cat, key)] = table.get((cat, key), 0) + 1
    return table, cat_totals


def q_org_staff_distribution(cur):
    """For every org, count inbound employer edges."""
    cur.execute("""
        SELECT e.id, e.name, COALESCE(e.category, '(NULL)'),
               COUNT(ed.id) AS staff_edges
        FROM entity e
        LEFT JOIN edge ed
          ON ed.target_id = e.id AND ed.edge_type = 'employer'
        WHERE e.entity_type = 'organization'
        GROUP BY e.id, e.name, e.category
        ORDER BY staff_edges ASC, e.name
    """)
    return cur.fetchall()


def q_resolve_key_orgs(cur, patterns):
    """
    Resolve each (label, pattern) to a single canonical entity id.
    Prefer exact-name match, else first ILIKE hit. Returns list of
    (label, pattern, entity_id or None, entity_name or None).
    """
    resolved = []
    for label, patt in patterns:
        # Try exact match first
        cur.execute(
            "SELECT id, name FROM entity "
            "WHERE entity_type = 'organization' AND name = %s "
            "ORDER BY id LIMIT 1", (patt,))
        row = cur.fetchone()
        if not row:
            # Fall back to ILIKE
            like = patt if "%" in patt else f"%{patt}%"
            cur.execute(
                "SELECT id, name FROM entity "
                "WHERE entity_type = 'organization' AND name ILIKE %s "
                "ORDER BY id LIMIT 1", (like,))
            row = cur.fetchone()
        resolved.append((label, patt, row[0] if row else None,
                         row[1] if row else None))
    return resolved


def q_exec_coverage_by_id(cur, org_ids):
    """
    For a set of org IDs, list inbound employer/founder/member/advisor edges.
    Returns {org_id: [(person_name, role), ...]}.
    """
    if not org_ids:
        return {}
    cur.execute("""
        SELECT t.id, s.name, COALESCE(ed.role, '')
        FROM edge ed
        JOIN entity s ON ed.source_id = s.id
        JOIN entity t ON ed.target_id = t.id
        WHERE ed.edge_type IN ('employer', 'founder', 'member', 'advisor')
          AND t.id = ANY(%s)
    """, (org_ids,))
    out = {}
    for oid, person, role in cur.fetchall():
        out.setdefault(oid, []).append((person, role))
    return out


def q_watchlist_presence(cur, names):
    """Check which names on the watchlist exist in entity.name (exact match)."""
    cur.execute("""
        SELECT name, entity_type, category
        FROM entity
        WHERE name = ANY(%s)
    """, (names,))
    found = {r[0]: (r[1], r[2]) for r in cur.fetchall()}
    return found


def q_belief_coverage_by_category(cur):
    """For persons, how many have each belief field populated (non-NULL/Unknown)."""
    cur.execute("""
        SELECT COALESCE(category, '(NULL)'),
               COUNT(*) AS total,
               SUM(CASE WHEN belief_regulatory_stance IS NOT NULL
                         AND belief_regulatory_stance NOT IN ('Unknown', '')
                        THEN 1 ELSE 0 END) AS has_stance,
               SUM(CASE WHEN belief_agi_timeline IS NOT NULL
                         AND belief_agi_timeline NOT IN ('Unknown', '')
                        THEN 1 ELSE 0 END) AS has_timeline,
               SUM(CASE WHEN belief_ai_risk IS NOT NULL
                         AND belief_ai_risk NOT IN ('Unknown', '')
                        THEN 1 ELSE 0 END) AS has_risk
        FROM entity
        WHERE entity_type = 'person'
        GROUP BY 1
        ORDER BY 2 DESC
    """)
    return cur.fetchall()


# ── Report sections ──────────────────────────────────────────────────────

def section_header(out, now):
    out("# Gap Analysis — Phase 5A")
    out(f"*{now}*")
    out()
    out("Coverage gaps across the staging DB. No changes made — read-only report.")
    out()


def section_category_counts(out, cur):
    out("## 1. Entity counts by category")
    out()

    rows = q_category_counts(cur)
    by_type = {"person": [], "organization": [], "resource": []}
    for etype, cat, n in rows:
        by_type.setdefault(etype, []).append((cat, n))

    # Persons
    out("### Persons")
    out()
    out("| Category | Count | In canonical list? |")
    out("| --- | ---: | --- |")
    seen = {c: n for c, n in by_type.get("person", [])}
    total_p = sum(seen.values())
    for cat in PERSON_CATEGORIES:
        n = seen.get(cat, 0)
        marker = "✓" if cat in seen else "— **missing**"
        out(f"| {cat} | {n} | ✓ |")
    for cat, n in seen.items():
        if cat not in PERSON_CATEGORIES:
            out(f"| {cat} | {n} | ✗ non-canonical |")
    out(f"| **Total** | **{total_p}** | |")
    out()

    # Orgs
    out("### Organizations")
    out()
    out("| Category | Count | In canonical list? |")
    out("| --- | ---: | --- |")
    seen = {c: n for c, n in by_type.get("organization", [])}
    total_o = sum(seen.values())
    for cat in ORG_CATEGORIES:
        n = seen.get(cat, 0)
        out(f"| {cat} | {n} | ✓ |")
    for cat, n in seen.items():
        if cat not in ORG_CATEGORIES:
            out(f"| {cat} | {n} | ✗ non-canonical |")
    out(f"| **Total** | **{total_o}** | |")
    out()

    # Resources
    total_r = sum(n for _, n in by_type.get("resource", []))
    out(f"### Resources — total: {total_r}")
    out()


def section_resource_breakdown(out, cur):
    out("## 2. Resource breakdown (type × category)")
    out()
    rows = q_resource_breakdown(cur)
    # Aggregate per resource_type and per resource_category
    by_type = {}
    by_cat = {}
    total = 0
    for rt, rc, n in rows:
        by_type[rt] = by_type.get(rt, 0) + n
        by_cat[rc] = by_cat.get(rc, 0) + n
        total += n

    out("### By resource_type")
    out()
    out("| resource_type | Count | Canonical? |")
    out("| --- | ---: | --- |")
    for rt in RESOURCE_TYPES:
        n = by_type.get(rt, 0)
        marker = "✓" if rt in by_type else "— **missing**"
        out(f"| {rt} | {n} | {marker} |")
    for rt, n in by_type.items():
        if rt not in RESOURCE_TYPES:
            out(f"| {rt} | {n} | ✗ non-canonical |")
    out(f"| **Total** | **{total}** | |")
    out()

    out("### By resource_category")
    out()
    out("| resource_category | Count | Canonical? |")
    out("| --- | ---: | --- |")
    for rc in RESOURCE_CATEGORIES:
        n = by_cat.get(rc, 0)
        marker = "✓" if rc in by_cat else "— **missing**"
        out(f"| {rc} | {n} | {marker} |")
    for rc, n in by_cat.items():
        if rc not in RESOURCE_CATEGORIES:
            out(f"| {rc} | {n} | ✗ non-canonical |")
    out()


def section_orphans(out, cur):
    out("## 3. Orphan entities (zero edges)")
    out()
    rows = q_orphans_by_category(cur)
    total = sum(n for _, _, n in rows)
    out(f"**Total orphans:** {total}")
    out()
    out("| entity_type | category | Count |")
    out("| --- | --- | ---: |")
    for etype, cat, n in rows:
        out(f"| {etype} | {cat} | {n} |")
    out()


def section_exec_coverage(out, cur):
    out("## 4. Executive team coverage (key orgs)")
    out()
    out("For each listed org, we show whether someone fills CEO / CTO / Chief Scientist / "
        "Head of Policy based on inbound `employer`/`founder`/`member`/`advisor` edges. "
        "Match is substring on the edge `role` field. Orgs are resolved by "
        "exact-name first, then `ILIKE` fallback.")
    out()

    resolved = q_resolve_key_orgs(cur, KEY_ORG_PATTERNS)
    org_ids = [r[2] for r in resolved if r[2] is not None]
    coverage = q_exec_coverage_by_id(cur, org_ids)

    headers = list(KEY_ROLES.keys())
    out("| Label | Matched DB entity | " + " | ".join(headers) +
        " | Total linked |")
    out("| --- | --- | " + " | ".join(["---"] * len(headers)) + " | ---: |")

    not_in_db = []
    no_leadership = []
    for label, patt, oid, oname in resolved:
        if oid is None:
            not_in_db.append((label, patt))
            out(f"| **{label}** | _not in DB_ | — | — | — | — | 0 |")
            continue
        staff = coverage.get(oid, [])
        if not staff:
            no_leadership.append((label, oid, oname))
            out(f"| **{label}** | [{oid}] {oname} | — | — | — | — | 0 |")
            continue
        row_cells = []
        for role_label, keywords in KEY_ROLES.items():
            hit = None
            for person, role in staff:
                rlow = (role or "").lower()
                if any(k in rlow for k in keywords):
                    hit = person
                    break
            row_cells.append(hit or "—")
        out(f"| {label} | [{oid}] {oname} | " + " | ".join(row_cells) +
            f" | {len(staff)} |")
    out()

    if not_in_db:
        out(f"### Not in DB — real seeding gap ({len(not_in_db)})")
        out()
        for label, patt in not_in_db:
            out(f"- **{label}** (searched `{patt}`)")
        out()

    if no_leadership:
        out(f"### In DB but zero leadership edges ({len(no_leadership)})")
        out()
        for label, oid, oname in no_leadership:
            out(f"- **{label}** → [{oid}] {oname}")
        out()


def section_org_staff_distribution(out, cur):
    out("## 5. Organizations by staff edge count")
    out()
    rows = q_org_staff_distribution(cur)
    buckets = {"0": 0, "1": 0, "2-4": 0, "5-9": 0, "10+": 0}
    zero_list = []
    for org_id, name, cat, n in rows:
        if n == 0:
            buckets["0"] += 1
            zero_list.append((org_id, name, cat))
        elif n == 1:
            buckets["1"] += 1
        elif n < 5:
            buckets["2-4"] += 1
        elif n < 10:
            buckets["5-9"] += 1
        else:
            buckets["10+"] += 1

    total = sum(buckets.values())
    out("| Employer edges in | Orgs |")
    out("| --- | ---: |")
    for k in ["0", "1", "2-4", "5-9", "10+"]:
        out(f"| {k} | {buckets[k]} |")
    out(f"| **Total orgs** | **{total}** |")
    out()
    out(f"**Orgs with zero employer edges pointing in:** {len(zero_list)} "
        f"({pct(len(zero_list), total)}). Sample (first 30):")
    out()
    out("| ID | Name | Category |")
    out("| ---: | --- | --- |")
    for org_id, name, cat in zero_list[:30]:
        out(f"| {org_id} | {name} | {cat} |")
    out()


def section_influence_cross(out, cur):
    out("## 6. Influence-type coverage by person category")
    out()
    table, cat_totals = q_influence_type_by_category(cur)
    # Aggregate columns = union of influence types found (cap to canonical first tokens)
    columns = sorted({k[1] for k in table.keys()})
    if not columns:
        out("No influence_type data.")
        out()
        return
    out("| Category | Total | " + " | ".join(columns) + " |")
    out("| --- | ---: | " + " | ".join(["---:"] * len(columns)) + " |")
    for cat in sorted(cat_totals.keys()):
        cells = []
        for col in columns:
            v = table.get((cat, col), 0)
            cells.append(str(v) if v else "·")
        out(f"| {cat} | {cat_totals[cat]} | " + " | ".join(cells) + " |")
    out()


def section_belief_coverage(out, cur):
    out("## 7. Belief-field coverage by person category")
    out()
    rows = q_belief_coverage_by_category(cur)
    out("| Category | Persons | stance | agi_timeline | ai_risk |")
    out("| --- | ---: | ---: | ---: | ---: |")
    for cat, tot, stance, tl, risk in rows:
        out(f"| {cat} | {tot} | {stance} ({pct(stance, tot)}) | "
            f"{tl} ({pct(tl, tot)}) | {risk} ({pct(risk, tot)}) |")
    out()


def section_watchlist(out, cur):
    out("## 8. Watchlist presence check")
    out()
    out("Spot-check for high-profile names we'd expect in the DB. Exact name match only.")
    out()
    found = q_watchlist_presence(cur, WATCHLIST)
    missing = [n for n in WATCHLIST if n not in found]
    out(f"- **Present:** {len(found)} / {len(WATCHLIST)}")
    out(f"- **Missing (by exact name):** {len(missing)}")
    out()
    if missing:
        out("| Missing name |")
        out("| --- |")
        for n in missing:
            out(f"| {n} |")
        out()
        out("*Note: may exist under a variant spelling (e.g., full name vs. known-as). "
            "Investigate before seeding.*")
        out()


# ── Main ────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Phase 5A coverage gap analysis.")
    parser.add_argument("-o", "--output", help="Write report to file")
    args = parser.parse_args()

    out = Reporter()
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    conn = psycopg2.connect(DATABASE_URL)
    with conn.cursor() as cur:
        section_header(out, now)
        section_category_counts(out, cur)
        section_resource_breakdown(out, cur)
        section_orphans(out, cur)
        section_exec_coverage(out, cur)
        section_org_staff_distribution(out, cur)
        section_influence_cross(out, cur)
        section_belief_coverage(out, cur)
        section_watchlist(out, cur)

    conn.close()

    if args.output:
        out.write(args.output)
        print(f"\nReport saved to {args.output}")


if __name__ == "__main__":
    main()
