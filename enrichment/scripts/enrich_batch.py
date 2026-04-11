#!/usr/bin/env python3
"""
Phase 3: Batch entity enrichment using Exa web search + Claude API.

Selects unenriched entities ordered by edge count (highest graph value first),
enriches them with notes, belief fields, and source citations, then writes
changes to the staging DB. Every run appends a batch log to
logs/entity-enrichment/.

Skips entities already marked enrichment_version='phase3-manual'.
Auto-enriched entities are set qa_approved=FALSE so they can be reviewed
before being promoted to approved.

Usage:
    python scripts/enrich_batch.py --dry-run
    python scripts/enrich_batch.py --batch-size 10
    python scripts/enrich_batch.py --ids 123,456,789
    python scripts/enrich_batch.py --entity-type organization
    python scripts/enrich_batch.py --min-edges 0     # include orphans
    python scripts/enrich_batch.py --no-exa          # Claude knowledge only
    python scripts/enrich_batch.py --model claude-opus-4-6
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import psycopg2
from dotenv import load_dotenv

try:
    import anthropic
except ImportError:
    print("ERROR: anthropic package not installed. Run: pip install anthropic", file=sys.stderr)
    sys.exit(1)

try:
    from exa_py import Exa
    EXA_AVAILABLE = True
except ImportError:
    EXA_AVAILABLE = False

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

DATABASE_URL = os.environ.get("DATABASE_URL")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
EXA_API_KEY = os.environ.get("EXA_API_KEY")

if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set in .env", file=sys.stderr)
    sys.exit(1)
if not ANTHROPIC_API_KEY:
    print("ERROR: ANTHROPIC_API_KEY not set in .env", file=sys.stderr)
    sys.exit(1)

DEFAULT_MODEL = "claude-sonnet-4-6"
ENRICHMENT_VERSION = "phase3-auto"

# Canonical values from canon.md
REGULATORY_STANCE = [
    "Accelerate", "Light-touch", "Targeted", "Moderate",
    "Restrictive", "Precautionary", "Nationalize", "Mixed/unclear", "Other",
]
AGI_TIMELINE = [
    "Already here", "2-3 years", "5-10 years", "10-25 years",
    "25+ years or never", "Ill-defined", "Unknown",
]
AI_RISK = [
    "Overstated", "Manageable", "Serious", "Catastrophic",
    "Existential", "Mixed/nuanced", "Unknown",
]
EVIDENCE_SOURCE = ["Explicitly stated", "Inferred", "Unknown"]
INFLUENCE_TYPES = [
    "Decision-maker", "Advisor/strategist", "Researcher/analyst",
    "Funder/investor", "Builder", "Organizer/advocate",
    "Narrator", "Implementer", "Connector/convener",
]


# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------

def get_connection():
    return psycopg2.connect(DATABASE_URL)


def fetch_entities(conn, batch_size, entity_types, ids=None, min_edges=1):
    """Return unenriched entities ordered by edge count descending."""
    with conn.cursor() as cur:
        if ids:
            cur.execute("""
                SELECT e.id, e.name, e.entity_type, e.category, e.notes,
                       e.belief_regulatory_stance, e.belief_agi_timeline,
                       e.belief_ai_risk, e.belief_evidence_source,
                       e.funding_model, e.influence_type,
                       e.enrichment_version, e.qa_approved,
                       COUNT(DISTINCT es.id) + COUNT(DISTINCT et.id) AS edge_count
                FROM entity e
                LEFT JOIN edge es ON e.id = es.source_id
                LEFT JOIN edge et ON e.id = et.target_id
                WHERE e.id = ANY(%s)
                GROUP BY e.id
                ORDER BY edge_count DESC
            """, (ids,))
        else:
            cur.execute("""
                SELECT e.id, e.name, e.entity_type, e.category, e.notes,
                       e.belief_regulatory_stance, e.belief_agi_timeline,
                       e.belief_ai_risk, e.belief_evidence_source,
                       e.funding_model, e.influence_type,
                       e.enrichment_version, e.qa_approved,
                       COUNT(DISTINCT es.id) + COUNT(DISTINCT et.id) AS edge_count
                FROM entity e
                LEFT JOIN edge es ON e.id = es.source_id
                LEFT JOIN edge et ON e.id = et.target_id
                WHERE e.entity_type = ANY(%s)
                  AND (e.enrichment_version IS NULL
                       OR e.enrichment_version NOT LIKE 'phase3%%')
                GROUP BY e.id
                HAVING COUNT(DISTINCT es.id) + COUNT(DISTINCT et.id) >= %s
                ORDER BY edge_count DESC
                LIMIT %s
            """, (list(entity_types), min_edges, batch_size))
        return cur.fetchall()


def fetch_edges(conn, entity_id):
    """Return up to 15 edges for an entity (source or target)."""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT e.edge_type, e.role,
                   s.name, s.entity_type,
                   t.name, t.entity_type
            FROM edge e
            JOIN entity s ON e.source_id = s.id
            JOIN entity t ON e.target_id = t.id
            WHERE e.source_id = %s OR e.target_id = %s
            LIMIT 15
        """, (entity_id, entity_id))
        return cur.fetchall()


def write_entity(conn, entity_id, result):
    """Write enrichment result to DB. notes_v1 is only set if notes existed."""
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE entity
            SET notes             = %s,
                notes_v1          = CASE
                                      WHEN notes IS NOT NULL AND notes_v1 IS NULL
                                      THEN notes
                                      ELSE notes_v1
                                    END,
                notes_sources     = %s,
                notes_confidence  = %s,
                belief_regulatory_stance = %s,
                belief_agi_timeline      = %s,
                belief_ai_risk           = %s,
                belief_evidence_source   = %s,
                funding_model     = %s,
                influence_type    = %s,
                enrichment_version = %s,
                qa_approved       = FALSE,
                updated_at        = NOW()
            WHERE id = %s
        """, (
            result["notes"],
            json.dumps(result.get("notes_sources", [])),
            result.get("notes_confidence"),
            result.get("belief_regulatory_stance"),
            result.get("belief_agi_timeline"),
            result.get("belief_ai_risk"),
            result.get("belief_evidence_source"),
            result.get("funding_model"),
            result.get("influence_type"),
            ENRICHMENT_VERSION,
            entity_id,
        ))
    conn.commit()


# ---------------------------------------------------------------------------
# Exa search
# ---------------------------------------------------------------------------

def exa_search(name, entity_type):
    """Return a formatted string of Exa search results, or None on failure."""
    if not EXA_AVAILABLE:
        print("    ⚠  exa-py not installed — skipping Exa search", file=sys.stderr)
        return None
    if not EXA_API_KEY:
        print("    ⚠  EXA_API_KEY not set — skipping Exa search", file=sys.stderr)
        return None

    try:
        exa = Exa(api_key=EXA_API_KEY)
        if entity_type == "person":
            query = f'"{name}" AI policy artificial intelligence researcher technologist'
        else:
            query = f'"{name}" artificial intelligence policy'

        response = exa.search_and_contents(
            query,
            num_results=5,
            use_autoprompt=True,
            text={"max_characters": 600},
            highlights={"num_sentences": 2},
        )

        parts = []
        for r in response.results:
            excerpt = ""
            if r.highlights:
                excerpt = " ... ".join(r.highlights[:2])
            elif r.text:
                excerpt = r.text[:400]
            if excerpt:
                parts.append(f"URL: {r.url}\nTitle: {r.title}\n{excerpt}")

        return "\n\n".join(parts) if parts else None

    except Exception as exc:
        print(f"    ⚠  Exa search failed: {exc}", file=sys.stderr)
        return None


# ---------------------------------------------------------------------------
# Claude API
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = (
    "You are a researcher enriching entity records in the U.S. AI policy "
    "stakeholder database (mapping-ai.org). Your output must be accurate, "
    "concise, and sourced. Return ONLY valid JSON — no markdown, no explanation."
)


def build_prompt(entity, edges, search_results):
    eid, name, etype, category, notes, reg, agi, risk, evidence, funding, influence, ev, qa, edge_count = entity

    # Build edge list for context
    edge_lines = []
    for et_type, role, src_name, src_type, tgt_name, tgt_type in edges:
        role_str = f" [{role}]" if role else ""
        edge_lines.append(f"  {et_type}{role_str}: {src_name} ({src_type}) → {tgt_name} ({tgt_type})")
    edge_text = "\n".join(edge_lines) if edge_lines else "  (none)"

    # Summarize existing data
    existing = []
    if notes:
        existing.append(f"notes: {notes[:300]}{'...' if len(notes) > 300 else ''}")
    for label, val in [("regulatory_stance", reg), ("agi_timeline", agi),
                       ("ai_risk", risk), ("evidence_source", evidence)]:
        if val:
            existing.append(f"belief_{label}: {val}")
    existing_str = "\n".join(existing) if existing else "(no prior enrichment)"

    search_section = (
        f"\nWeb search results:\n---\n{search_results}\n---"
        if search_results
        else "\n(No web search results — use training knowledge only.)"
    )

    return f"""Enrich this entity:

Name: {name}
Type: {etype} / {category or "(no category)"}
Edge count: {edge_count}

Existing data:
{existing_str}

Known relationships:
{edge_text}
{search_section}

Return JSON with these exact fields:
- "notes": plain text 400-600 chars, focused on AI policy relevance. No markdown, no [n] artifacts.
- "notes_sources": array of 3-5 real, verifiable URLs
- "notes_confidence": integer 1-5 (5=primary sources verified; 3=secondary; 1=mostly inferred)
- "belief_regulatory_stance": one of {json.dumps(REGULATORY_STANCE)} or null
- "belief_agi_timeline": one of {json.dumps(AGI_TIMELINE)} or null
- "belief_ai_risk": one of {json.dumps(AI_RISK)} or null
- "belief_evidence_source": one of {json.dumps(EVIDENCE_SOURCE)}
- "funding_model": short string e.g. "Corporate", "Government", "University/Grants", "VC-backed" — or null
- "influence_type": comma-separated from {json.dumps(INFLUENCE_TYPES)}, 1-3 values
- "rationale": 1-2 sentences on confidence and key inferences
"""


def call_claude(entity, edges, search_results, model):
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    prompt = build_prompt(entity, edges, search_results)

    message = client.messages.create(
        model=model,
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = message.content[0].text.strip()
    # Strip markdown fences if the model includes them despite instructions
    raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.MULTILINE)
    raw = re.sub(r"\s*```$", "", raw, flags=re.MULTILINE)

    return json.loads(raw)


# ---------------------------------------------------------------------------
# Batch log
# ---------------------------------------------------------------------------

def next_batch_number(log_dir):
    nums = []
    for f in log_dir.glob("entity-enrichment-batch-*.md"):
        m = re.search(r"batch-(\d+)\.md$", f.name)
        if m:
            nums.append(int(m.group(1)))
    return max(nums) + 1 if nums else 1


def write_batch_log(log_path, batch_num, entities, results, dry_run, model):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    mode = f"dry-run ({model})" if dry_run else f"auto (exa + {model})"

    lines = [
        f"# Entity Enrichment — Batch {batch_num:02d}",
        f"*{today}*",
        f"Mode: {mode}",
        f"Entities processed: {len(results)}",
        f"Fields updated: {len(results) * 11} (~11 per entity)",
        "",
        "---",
        "",
        "## Summary",
        "",
        "| ID | Name | Fields Updated | Confidence |",
        "| -: | ---- | -------------- | ---------: |",
    ]
    for eid, name, result in results:
        conf = result.get("notes_confidence", "?")
        lines.append(f"| {eid} | {name} | 11 | {conf} |")

    lines += ["", "---", ""]

    entity_map = {e[0]: e for e in entities}

    for eid, name, result in results:
        e = entity_map[eid]
        etype, category, notes = e[2], e[3], e[4]
        reg, agi, risk, evidence = e[5], e[6], e[7], e[8]
        funding, influence, ev = e[9], e[10], e[11]

        cat_str = f" ({category})" if category else ""
        lines += [
            f"### [{eid}] {name} — {etype}{cat_str}",
            "",
            "| Field | Before | After |",
            "| ----- | ------ | ----- |",
        ]

        if notes:
            short = notes[:60].replace("|", "\\|")
            lines.append(f"| notes | {short}... | Updated (original in `notes_v1`) |")
        else:
            short = result["notes"][:80].replace("|", "\\|")
            lines.append(f"| notes | null | {short}... |")

        lines += [
            f"| notes_v1 | null | {'backed up' if notes else 'null (no original)'} |",
            f"| notes_sources | null | {len(result.get('notes_sources', []))} URLs |",
            f"| notes_confidence | null | {result.get('notes_confidence')} |",
            f"| belief_regulatory_stance | {reg or 'null'} | {result.get('belief_regulatory_stance') or 'null'} |",
            f"| belief_agi_timeline | {agi or 'null'} | {result.get('belief_agi_timeline') or 'null'} |",
            f"| belief_ai_risk | {risk or 'null'} | {result.get('belief_ai_risk') or 'null'} |",
            f"| belief_evidence_source | {evidence or 'null'} | {result.get('belief_evidence_source') or 'null'} |",
            f"| funding_model | {funding or 'null'} | {result.get('funding_model') or 'null'} |",
            f"| influence_type | {influence or 'null'} | {result.get('influence_type') or 'null'} |",
            f"| enrichment_version | {ev or 'null'} | {ENRICHMENT_VERSION} |",
            f"| qa_approved | {e[12] or 'null'} | FALSE (pending review) |",
            "",
        ]

        sources = result.get("notes_sources", [])
        if sources:
            lines.append("**Sources:**")
            for url in sources:
                lines.append(f"- {url}")
            lines.append("")

        conf = result.get("notes_confidence", "?")
        rationale = result.get("rationale", "")
        lines.append(f"**Confidence:** {conf}/5 — {rationale}")
        lines += ["", "---", ""]

    Path(log_path).write_text("\n".join(lines), encoding="utf-8")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Batch entity enrichment via Exa + Claude API"
    )
    parser.add_argument("--batch-size", type=int, default=24,
                        help="Entities to process per run (default: 24)")
    parser.add_argument("--entity-type", default="person,organization",
                        help="Comma-separated entity types (default: person,organization)")
    parser.add_argument("--ids", help="Comma-separated entity IDs (overrides --batch-size)")
    parser.add_argument("--min-edges", type=int, default=1,
                        help="Minimum edge count to include (default: 1; use 0 for orphans)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show what would happen without writing to DB")
    parser.add_argument("--no-exa", action="store_true",
                        help="Skip Exa search — rely on Claude training knowledge")
    parser.add_argument("--model", default=DEFAULT_MODEL,
                        help=f"Claude model (default: {DEFAULT_MODEL})")
    args = parser.parse_args()

    entity_types = [t.strip() for t in args.entity_type.split(",")]
    ids = [int(i.strip()) for i in args.ids.split(",")] if args.ids else None

    log_dir = Path(__file__).parent.parent / "logs" / "entity-enrichment"
    log_dir.mkdir(parents=True, exist_ok=True)
    batch_num = next_batch_number(log_dir)
    log_path = log_dir / f"entity-enrichment-batch-{batch_num:02d}.md"

    conn = get_connection()

    entities = fetch_entities(conn, args.batch_size, entity_types, ids=ids, min_edges=args.min_edges)
    if not entities:
        print("No unenriched entities found matching criteria.")
        conn.close()
        return

    label = "[DRY RUN] " if args.dry_run else ""
    print(f"{label}Batch {batch_num} — {len(entities)} entities — model: {args.model}")
    if args.dry_run:
        print("(No DB writes will occur)\n")

    results = []

    for entity in entities:
        eid, name, etype = entity[0], entity[1], entity[2]
        print(f"  [{eid}] {name} ({etype})")

        search_results = None
        if not args.no_exa:
            print("    → Exa...", end=" ", flush=True)
            search_results = exa_search(name, etype)
            print("ok" if search_results else "no results")

        edges = fetch_edges(conn, eid)

        print(f"    → Claude ({args.model})...", end=" ", flush=True)
        try:
            result = call_claude(entity, edges, search_results, args.model)
        except json.JSONDecodeError as exc:
            print(f"FAILED (bad JSON): {exc}", file=sys.stderr)
            continue
        except anthropic.APIError as exc:
            print(f"FAILED (API error): {exc}", file=sys.stderr)
            continue

        print(f"ok (confidence: {result.get('notes_confidence', '?')})")
        results.append((eid, name, result))

        if not args.dry_run:
            write_entity(conn, eid, result)

    conn.close()

    if not results:
        print("\nNo entities enriched.")
        return

    write_batch_log(log_path, batch_num, entities, results, args.dry_run, args.model)

    print(f"\n{label}{len(results)}/{len(entities)} entities enriched")
    print(f"Batch log: {log_path}")


if __name__ == "__main__":
    main()
