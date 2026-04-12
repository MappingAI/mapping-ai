#!/usr/bin/env python3
"""
Audit Phase 3 enrichments for hallucination signals.

Three tiers of checks, escalating in cost:

  Tier 1 — URL verification (zero LLM tokens)
      HEAD-request every URL in notes_sources. Dead/invalid links
      are a strong hallucination signal.

  Tier 2 — SQL consistency checks (zero LLM tokens)
      Cross-reference enriched fields against the graph structure
      to surface logical contradictions.

  Tier 3 prep — Export batches for LLM review (generates file only)
      Packs enriched entities into batches of 25 for a single-prompt
      hallucination spot-check. Output: JSON file ready to feed to
      a separate review script or manual Claude session.

Usage:
    python scripts/audit_enrichment.py                      # full audit, report to stdout
    python scripts/audit_enrichment.py -o logs/audit.md     # write report to file
    python scripts/audit_enrichment.py --skip-urls          # skip slow URL checks
    python scripts/audit_enrichment.py --tier3              # also export LLM review batches
    python scripts/audit_enrichment.py --tier3 --tier3-run  # export AND run LLM review
    python scripts/audit_enrichment.py --url-timeout 3      # custom URL timeout (seconds)
    python scripts/audit_enrichment.py --ids 1532,1533      # audit specific entities only
"""

import argparse
import json
import os
import re
import sys
import ssl
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

import psycopg2
from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

DATABASE_URL = os.environ.get("DATABASE_URL")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")

if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set. Check your .env file.", file=sys.stderr)
    sys.exit(1)

# Reuse helpers from audit.py
ROLE_KEYWORDS = {
    "CEO": ["employer", "founder"],
    "CTO": ["employer", "founder"],
    "CFO": ["employer"],
    "COO": ["employer"],
    "President": ["employer", "founder", "member"],
    "Director": ["employer", "member"],
    "Chair": ["employer", "member", "advisor"],
    "Co-founder": ["founder"],
    "co-founder": ["founder"],
    "Founder": ["founder"],
    "founder": ["founder"],
    "Professor": ["employer", "member"],
    "Senior Fellow": ["member", "advisor"],
    "Fellow": ["member", "advisor"],
    "Board Member": ["member"],
    "board member": ["member"],
}

INFLUENCE_EDGE_MAP = {
    "Funder/investor": {"funder"},
    "Builder": {"employer", "founder"},
    "Researcher/analyst": {"employer", "member"},
    "Advisor/strategist": {"advisor", "member"},
    "Narrator": {"employer", "author"},
}


# ---------------------------------------------------------------------------
# DB
# ---------------------------------------------------------------------------

def get_connection():
    return psycopg2.connect(DATABASE_URL)


def fetch_enriched_entities(conn, ids=None):
    """Fetch all phase3-enriched entities with their edge counts."""
    with conn.cursor() as cur:
        if ids:
            cur.execute("""
                SELECT e.id, e.name, e.entity_type, e.category, e.notes,
                       e.notes_sources, e.notes_confidence,
                       e.belief_regulatory_stance, e.belief_agi_timeline,
                       e.belief_ai_risk, e.belief_evidence_source,
                       e.influence_type, e.enrichment_version, e.qa_approved,
                       COUNT(DISTINCT es.id) + COUNT(DISTINCT et.id) AS edge_count
                FROM entity e
                LEFT JOIN edge es ON e.id = es.source_id
                LEFT JOIN edge et ON e.id = et.target_id
                WHERE e.id = ANY(%s)
                GROUP BY e.id
                ORDER BY e.id
            """, (ids,))
        else:
            cur.execute("""
                SELECT e.id, e.name, e.entity_type, e.category, e.notes,
                       e.notes_sources, e.notes_confidence,
                       e.belief_regulatory_stance, e.belief_agi_timeline,
                       e.belief_ai_risk, e.belief_evidence_source,
                       e.influence_type, e.enrichment_version, e.qa_approved,
                       COUNT(DISTINCT es.id) + COUNT(DISTINCT et.id) AS edge_count
                FROM entity e
                LEFT JOIN edge es ON e.id = es.source_id
                LEFT JOIN edge et ON e.id = et.target_id
                WHERE e.enrichment_version LIKE 'phase3%%'
                GROUP BY e.id
                ORDER BY e.id
            """)
        return cur.fetchall()


def fetch_entity_edges(conn, entity_id):
    """Return all edges for an entity."""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT e.edge_type, e.role,
                   e.source_id, s.name, s.entity_type,
                   e.target_id, t.name, t.entity_type
            FROM edge e
            JOIN entity s ON e.source_id = s.id
            JOIN entity t ON e.target_id = t.id
            WHERE e.source_id = %s OR e.target_id = %s
        """, (entity_id, entity_id))
        return cur.fetchall()


def fetch_all_entity_names(conn):
    """Return set of all entity names (lowercased) for cross-reference."""
    with conn.cursor() as cur:
        cur.execute("SELECT LOWER(name) FROM entity")
        return {row[0] for row in cur.fetchall()}


# ---------------------------------------------------------------------------
# Tier 1: URL verification
# ---------------------------------------------------------------------------

def check_url(url, timeout=5):
    """HEAD-request a URL. Returns (url, status_code, error_msg)."""
    # Skip obviously non-URL strings
    if not url or not url.startswith("http"):
        return (url, None, "not a URL")

    # Relaxed SSL context — some sites have bad certs and we just
    # want to know if the page exists, not verify the cert chain.
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) mapping-ai-audit/1.0",
    }

    # Try HEAD first, fall back to GET (some servers reject HEAD)
    for method in ("HEAD", "GET"):
        try:
            req = urllib.request.Request(url, method=method, headers=headers)
            with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
                return (url, resp.status, None)
        except urllib.error.HTTPError as e:
            if method == "HEAD" and e.code in (403, 405, 406):
                continue  # try GET
            return (url, e.code, f"HTTP {e.code}")
        except urllib.error.URLError as e:
            return (url, None, str(e.reason)[:80])
        except Exception as e:
            return (url, None, str(e)[:80])

    return (url, None, "HEAD and GET both failed")


def tier1_url_check(entities, timeout=5, max_workers=10):
    """Check all notes_sources URLs. Returns {entity_id: [(url, status, error)]}."""
    # Collect all (entity_id, url) pairs
    url_tasks = []
    for ent in entities:
        eid = ent[0]
        sources_raw = ent[5]  # notes_sources (JSON string or None)
        if not sources_raw:
            continue
        try:
            urls = json.loads(sources_raw) if isinstance(sources_raw, str) else sources_raw
        except (json.JSONDecodeError, TypeError):
            urls = []
        for url in urls:
            if url and isinstance(url, str):
                url_tasks.append((eid, url.strip()))

    if not url_tasks:
        return {}, 0, 0

    results = {}  # eid -> [(url, status, error)]
    total_checked = 0
    total_dead = 0

    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        future_map = {}
        for eid, url in url_tasks:
            future = pool.submit(check_url, url, timeout)
            future_map[future] = eid

        for future in as_completed(future_map):
            eid = future_map[future]
            url, status, error = future.result()
            total_checked += 1
            if error or (status and status >= 400):
                total_dead += 1
                results.setdefault(eid, []).append((url, status, error))

    return results, total_checked, total_dead


# ---------------------------------------------------------------------------
# Tier 2: SQL consistency checks
# ---------------------------------------------------------------------------

def tier2_consistency_checks(entities, conn):
    """Run consistency checks. Returns list of (entity_id, name, check_name, detail)."""
    flags = []

    for ent in entities:
        eid, name, etype, category, notes = ent[0], ent[1], ent[2], ent[3], ent[4]
        confidence = ent[6]
        reg_stance, agi_timeline, ai_risk, evidence = ent[7], ent[8], ent[9], ent[10]
        influence_type = ent[11]
        enrichment_version = ent[12]
        is_auto = enrichment_version and "auto" in enrichment_version

        if not notes:
            continue

        edges = fetch_entity_edges(conn, eid)
        edge_types = {e[0] for e in edges}

        # --- Check 1: "Explicitly stated" evidence but low confidence ---
        if evidence == "Explicitly stated" and confidence is not None and confidence < 4:
            flags.append((eid, name, "evidence_vs_confidence",
                          f'evidence="Explicitly stated" but confidence={confidence}'))

        # --- Check 2: High confidence with zero source URLs ---
        # Only flag auto-enriched entities — manual enrichments stored
        # sources in batch logs, not always in the DB field.
        sources_raw = ent[5]
        try:
            urls = json.loads(sources_raw) if isinstance(sources_raw, str) and sources_raw else []
        except (json.JSONDecodeError, TypeError):
            urls = []
        if is_auto and confidence is not None and confidence >= 4 and len(urls) < 2:
            flags.append((eid, name, "high_confidence_few_sources",
                          f'confidence={confidence} but only {len(urls)} source URL(s)'))

        # --- Check 3: Role keywords in notes without matching edge ---
        # Only run on persons — role claims about orgs/resources usually
        # describe OTHER people in the notes (e.g., book author, org
        # leadership), not the entity itself. Use word-boundary regex
        # to avoid substring false positives (CTO matching "sector"/"actor",
        # COO matching "cooperation", CEO matching "ceo" in the phrase
        # "Anthropic CEO" about someone else).
        if etype == "person":
            for keyword, expected_edges in ROLE_KEYWORDS.items():
                # Case-insensitive, word-boundary match
                if re.search(rf'\b{re.escape(keyword)}\b', notes, re.IGNORECASE):
                    if not edge_types.intersection(expected_edges):
                        flags.append((eid, name, "role_without_edge",
                                      f'notes mention "{keyword}" but no {"/".join(expected_edges)} edge'))
                        break  # one flag per entity for this check

        # --- Check 4: Influence type without supporting edges ---
        if influence_type:
            for inf_type in [t.strip() for t in influence_type.split(",")]:
                expected = INFLUENCE_EDGE_MAP.get(inf_type)
                if expected and not edge_types.intersection(expected):
                    flags.append((eid, name, "influence_without_edge",
                                  f'influence_type="{inf_type}" but no {"/".join(expected)} edges'))
                    break  # one flag per entity

        # --- Check 5: All belief fields null for high-confidence entity ---
        # Skip resource-type entities — books, papers, EOs etc. don't
        # have beliefs themselves. Skip orgs in Government/Agency and
        # Academic — beliefs often genuinely don't apply to institutional
        # entities.
        skip_categories = {"Government/Agency", "Academic"}
        beliefs = [reg_stance, agi_timeline, ai_risk]
        non_null_beliefs = [b for b in beliefs if b and b != "Unknown"]
        if (confidence is not None and confidence >= 4
                and len(non_null_beliefs) == 0
                and etype != "resource"
                and category not in skip_categories):
            flags.append((eid, name, "no_beliefs_high_confidence",
                          f'confidence={confidence} but all belief fields are null/Unknown'))

        # --- Check 6: Notes suspiciously short for high confidence ---
        if confidence is not None and confidence >= 4 and len(notes) < 150:
            flags.append((eid, name, "short_notes_high_confidence",
                          f'confidence={confidence} but notes only {len(notes)} chars'))

        # --- Check 8: Duplicate notes (exact match) ---
        # Done in a second pass below

    # --- Check 8: Duplicate notes ---
    notes_map = {}
    for ent in entities:
        eid, name, notes = ent[0], ent[1], ent[4]
        if notes and len(notes) > 50:
            key = notes.strip()[:200]
            notes_map.setdefault(key, []).append((eid, name))
    for key, dupes in notes_map.items():
        if len(dupes) > 1:
            ids_str = ", ".join(f"{eid} ({n})" for eid, n in dupes)
            for eid, name in dupes:
                flags.append((eid, name, "duplicate_notes",
                              f'same notes prefix as: {ids_str}'))

    return flags


# ---------------------------------------------------------------------------
# Tier 3: Export batches for LLM review
# ---------------------------------------------------------------------------

def tier3_export_batches(entities, batch_size=25):
    """Group entities into batches for LLM hallucination review."""
    batches = []
    current = []

    for ent in entities:
        eid, name, etype, category, notes = ent[0], ent[1], ent[2], ent[3], ent[4]
        confidence = ent[6]
        reg_stance, agi_timeline, ai_risk, evidence = ent[7], ent[8], ent[9], ent[10]
        influence_type = ent[11]

        if not notes:
            continue

        current.append({
            "id": eid,
            "name": name,
            "type": etype,
            "category": category,
            "notes": notes,
            "confidence": confidence,
            "beliefs": {
                "regulatory_stance": reg_stance,
                "ai_risk": ai_risk,
                "agi_timeline": agi_timeline,
                "evidence_source": evidence,
            },
            "influence_type": influence_type,
        })

        if len(current) >= batch_size:
            batches.append(current)
            current = []

    if current:
        batches.append(current)

    return batches


def tier3_run_llm_review(batches, model="claude-sonnet-4-6"):
    """Run LLM hallucination review on exported batches. Returns list of flags."""
    try:
        import anthropic
    except ImportError:
        print("ERROR: anthropic package required for --tier3-run. Run: pip install anthropic",
              file=sys.stderr)
        return []

    if not ANTHROPIC_API_KEY:
        print("ERROR: ANTHROPIC_API_KEY not set for --tier3-run.", file=sys.stderr)
        return []

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    all_flags = []

    system = (
        "You are auditing entity records in a U.S. AI policy stakeholder database "
        "for hallucinated or fabricated information. You are skeptical and precise. "
        "Return ONLY valid JSON — no markdown, no explanation."
    )

    for i, batch in enumerate(batches):
        print(f"  Tier 3 batch {i+1}/{len(batches)} ({len(batch)} entities)...",
              end=" ", flush=True)

        entity_summaries = []
        for ent in batch:
            beliefs_str = ", ".join(
                f"{k}={v}" for k, v in ent["beliefs"].items()
                if v and v != "Unknown"
            ) or "none set"
            entity_summaries.append(
                f"[ID {ent['id']}] {ent['name']} ({ent['type']}, {ent['category']})\n"
                f"  confidence: {ent['confidence']}\n"
                f"  beliefs: {beliefs_str}\n"
                f"  influence: {ent['influence_type']}\n"
                f"  notes: {ent['notes']}"
            )

        prompt = (
            "Below are entity records from our AI policy stakeholder database. "
            "For EACH entity, assess whether any factual claims in the notes appear "
            "fabricated, implausible, or likely hallucinated. Common hallucination patterns:\n"
            "- Invented dollar amounts, funding rounds, or valuations\n"
            "- Wrong job titles or organizational affiliations\n"
            "- Fabricated awards, publications, or dates\n"
            "- Plausible-sounding but non-existent organizations or programs\n"
            "- Belief assignments that contradict widely known public positions\n\n"
            "Return a JSON array of objects, one per flagged entity. Each object:\n"
            '  {"id": <int>, "name": "<str>", "suspect_claims": ["<claim1>", ...], '
            '"severity": "low|medium|high"}\n\n'
            "If an entity looks clean, SKIP it — do not include it in the output. "
            "An empty array [] is valid if nothing looks suspicious.\n\n"
            "---\n\n" + "\n\n---\n\n".join(entity_summaries)
        )

        try:
            message = client.messages.create(
                model=model,
                max_tokens=2048,
                system=system,
                messages=[{"role": "user", "content": prompt}],
            )
            raw = message.content[0].text.strip()
            raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.MULTILINE)
            raw = re.sub(r"\s*```$", "", raw, flags=re.MULTILINE)
            flags = json.loads(raw)
            all_flags.extend(flags)
            print(f"{len(flags)} flags")
        except json.JSONDecodeError as e:
            print(f"FAILED (bad JSON): {e}", file=sys.stderr)
        except Exception as e:
            print(f"FAILED: {e}", file=sys.stderr)

    return all_flags


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------

def fmt_table(headers, rows, align=None):
    """Render a Markdown table."""
    if not rows:
        return "*(none)*\n"
    rows = [[str(c) for c in row] for row in rows]
    widths = [len(h) for h in headers]
    for row in rows:
        for i, cell in enumerate(row):
            widths[i] = max(widths[i], len(cell))
    if align is None:
        align = ["l"] * len(headers)

    def pad(text, width, a):
        return text.rjust(width) if a == "r" else text.ljust(width)

    lines = []
    lines.append("| " + " | ".join(pad(h, widths[i], align[i]) for i, h in enumerate(headers)) + " |")
    sep = []
    for i, a in enumerate(align):
        sep.append("-" * (widths[i] - 1) + ":" if a == "r" else "-" * widths[i])
    lines.append("| " + " | ".join(sep) + " |")
    for row in rows:
        lines.append("| " + " | ".join(pad(row[i], widths[i], align[i]) for i in range(len(headers))) + " |")
    return "\n".join(lines) + "\n"


def build_report(entities, url_flags, url_total, url_dead,
                 consistency_flags, tier3_flags=None, skip_urls=False):
    """Build the full Markdown audit report."""
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    lines = [
        f"# Enrichment Hallucination Audit",
        f"*Generated: {timestamp}*",
        f"*Entities audited: {len(entities)}*",
        "",
    ]

    # --- Summary ---
    # Collect all flagged entity IDs
    all_flagged = set()
    for eid, *_ in consistency_flags:
        all_flagged.add(eid)
    for eid in url_flags:
        all_flagged.add(eid)
    if tier3_flags:
        for f in tier3_flags:
            all_flagged.add(f["id"])

    lines += [
        "## Summary",
        "",
        f"| Metric | Value |",
        f"| ------ | ----: |",
        f"| Entities audited | {len(entities)} |",
        f"| Entities flagged (any tier) | {len(all_flagged)} |",
    ]
    if not skip_urls:
        lines.append(f"| URLs checked | {url_total} |")
        lines.append(f"| Dead/broken URLs | {url_dead} |")
        lines.append(f"| Entities with dead URLs | {len(url_flags)} |")
    lines.append(f"| Consistency flags | {len(consistency_flags)} |")
    if tier3_flags is not None:
        lines.append(f"| LLM-flagged entities | {len(tier3_flags)} |")
    lines += ["", "---", ""]

    # --- Tier 1: URL results ---
    if not skip_urls:
        lines += ["## Tier 1: URL Verification", ""]
        if url_flags:
            lines.append(f"**{len(url_flags)} entities with dead/broken URLs:**\n")
            rows = []
            for eid, url_results in sorted(url_flags.items()):
                ent_name = next((e[1] for e in entities if e[0] == eid), f"#{eid}")
                for url, status, error in url_results:
                    status_str = str(status) if status else "—"
                    short_url = url[:60] + "..." if len(url) > 60 else url
                    rows.append((str(eid), ent_name, short_url, status_str, error or ""))
            lines.append(fmt_table(
                ["ID", "Name", "URL", "Status", "Error"],
                rows, align=["r", "l", "l", "r", "l"]
            ))
        else:
            lines.append("All URLs passed.\n")
        lines += ["---", ""]

    # --- Tier 2: Consistency ---
    lines += ["## Tier 2: Consistency Checks", ""]
    if consistency_flags:
        # Group by check type
        by_check = {}
        for eid, name, check, detail in consistency_flags:
            by_check.setdefault(check, []).append((eid, name, detail))

        for check, items in sorted(by_check.items()):
            lines.append(f"### {check} ({len(items)} flags)\n")
            rows = [(str(eid), name, detail) for eid, name, detail in items]
            lines.append(fmt_table(["ID", "Name", "Detail"], rows, align=["r", "l", "l"]))
    else:
        lines.append("No consistency issues found.\n")
    lines += ["---", ""]

    # --- Tier 3: LLM flags ---
    if tier3_flags is not None:
        lines += ["## Tier 3: LLM Hallucination Review", ""]
        if tier3_flags:
            lines.append(f"**{len(tier3_flags)} entities flagged:**\n")
            for f in sorted(tier3_flags, key=lambda x: x.get("id", 0)):
                severity = f.get("severity", "?")
                lines.append(f"### [{f['id']}] {f['name']} (severity: {severity})\n")
                for claim in f.get("suspect_claims", []):
                    lines.append(f"- {claim}")
                lines.append("")
        else:
            lines.append("No hallucinations flagged by LLM review.\n")
        lines += ["---", ""]

    # --- Priority review list ---
    lines += ["## Priority Review List", ""]
    lines.append("Entities flagged by multiple tiers (highest risk):\n")

    # Count flags per entity
    flag_counts = {}
    for eid in url_flags:
        ent_name = next((e[1] for e in entities if e[0] == eid), f"#{eid}")
        flag_counts.setdefault(eid, {"name": ent_name, "tiers": set()})
        flag_counts[eid]["tiers"].add("T1-url")
    for eid, name, check, detail in consistency_flags:
        flag_counts.setdefault(eid, {"name": name, "tiers": set()})
        flag_counts[eid]["tiers"].add(f"T2-{check}")
    if tier3_flags:
        for f in tier3_flags:
            eid = f["id"]
            flag_counts.setdefault(eid, {"name": f["name"], "tiers": set()})
            flag_counts[eid]["tiers"].add("T3-llm")

    # Sort by number of distinct tier categories, then by ID
    ranked = sorted(flag_counts.items(), key=lambda x: (-len(x[1]["tiers"]), x[0]))
    if ranked:
        rows = []
        for eid, info in ranked:
            tier_str = ", ".join(sorted(info["tiers"]))
            rows.append((str(eid), info["name"], str(len(info["tiers"])), tier_str))
        lines.append(fmt_table(
            ["ID", "Name", "Flag Count", "Tiers"],
            rows, align=["r", "l", "r", "l"]
        ))
    else:
        lines.append("*(no entities flagged)*\n")

    return "\n".join(lines) + "\n"


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Audit Phase 3 enrichments for hallucination signals"
    )
    parser.add_argument("-o", "--output", help="Write report to file (default: stdout)")
    parser.add_argument("--skip-urls", action="store_true",
                        help="Skip Tier 1 URL verification (faster)")
    parser.add_argument("--url-timeout", type=int, default=5,
                        help="URL check timeout in seconds (default: 5)")
    parser.add_argument("--url-workers", type=int, default=10,
                        help="Concurrent URL checks (default: 10)")
    parser.add_argument("--tier3", action="store_true",
                        help="Export Tier 3 LLM review batches to JSON")
    parser.add_argument("--tier3-run", action="store_true",
                        help="Run Tier 3 LLM review (requires ANTHROPIC_API_KEY)")
    parser.add_argument("--tier3-model", default="claude-sonnet-4-6",
                        help="Model for Tier 3 review (default: claude-sonnet-4-6)")
    parser.add_argument("--ids", help="Comma-separated entity IDs to audit (default: all phase3)")
    args = parser.parse_args()

    ids = [int(i.strip()) for i in args.ids.split(",")] if args.ids else None

    conn = get_connection()
    entities = fetch_enriched_entities(conn, ids=ids)

    if not entities:
        print("No enriched entities found to audit.")
        conn.close()
        return

    print(f"Auditing {len(entities)} enriched entities...\n")

    # --- Tier 1 ---
    url_flags, url_total, url_dead = {}, 0, 0
    if not args.skip_urls:
        print("Tier 1: Checking URLs...", flush=True)
        url_flags, url_total, url_dead = tier1_url_check(
            entities, timeout=args.url_timeout, max_workers=args.url_workers
        )
        print(f"  {url_total} URLs checked, {url_dead} dead/broken, "
              f"{len(url_flags)} entities affected\n")

    # --- Tier 2 ---
    print("Tier 2: Running consistency checks...", flush=True)
    consistency_flags = tier2_consistency_checks(entities, conn)
    unique_flagged = len(set(f[0] for f in consistency_flags))
    print(f"  {len(consistency_flags)} flags across {unique_flagged} entities\n")

    # --- Tier 3 ---
    tier3_flags = None
    if args.tier3 or args.tier3_run:
        print("Tier 3: Preparing LLM review batches...", flush=True)
        batches = tier3_export_batches(entities)
        print(f"  {len(batches)} batches of ~25 entities\n")

        # Write batches to JSON
        log_dir = Path(__file__).parent.parent / "logs"
        log_dir.mkdir(parents=True, exist_ok=True)
        batch_path = log_dir / "tier3-review-batches.json"
        batch_path.write_text(json.dumps(batches, indent=2, ensure_ascii=False))
        print(f"  Batches exported to {batch_path}\n")

        if args.tier3_run:
            print(f"Tier 3: Running LLM review ({args.tier3_model})...", flush=True)
            tier3_flags = tier3_run_llm_review(batches, model=args.tier3_model)
            print(f"  {len(tier3_flags)} entities flagged by LLM\n")

            # Save LLM flags
            flags_path = log_dir / "tier3-llm-flags.json"
            flags_path.write_text(json.dumps(tier3_flags, indent=2, ensure_ascii=False))
            print(f"  LLM flags saved to {flags_path}\n")

    conn.close()

    # --- Build report ---
    report = build_report(
        entities, url_flags, url_total, url_dead,
        consistency_flags, tier3_flags, skip_urls=args.skip_urls
    )

    if args.output:
        out_path = Path(args.output)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(report, encoding="utf-8")
        print(f"Report written to {args.output}")
    else:
        print(report)


if __name__ == "__main__":
    main()
