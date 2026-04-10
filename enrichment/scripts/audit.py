"""
Baseline audit of the mapping_ai_staging database.

Produces a Markdown report covering entity counts, field completeness,
edge statistics, orphan entities, belief field coverage, and known
quality issues (citation artifacts, non-standard edge types, etc.).

Usage:
    source .venv/bin/activate
    python scripts/audit.py              # prints to stdout
    python scripts/audit.py -o logs/baseline-audit.md   # writes to file
"""

import argparse
import os
import re
import sys
from datetime import datetime, timezone

import psycopg2
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set. Check your .env file.", file=sys.stderr)
    sys.exit(1)


# ── Canonical reference values (from ONBOARDING.md) ─────────────────────

CANONICAL_EDGE_TYPES = {
    "employer", "founder", "advisor", "member",
    "funder", "partner", "parent_company", "collaborator",
    "critic", "supporter", "author", "publisher",
}

CANONICAL_BELIEF_FIELDS = {
    "belief_regulatory_stance": {
        "Accelerate", "Light-touch", "Targeted", "Moderate",
        "Restrictive", "Precautionary", "Nationalize", "Mixed/unclear",
        "Other",
    },
    "belief_agi_timeline": {
        "Already here", "2-3 years", "5-10 years", "10-25 years",
        "25+ years or never", "Ill-defined", "Unknown",
    },
    "belief_ai_risk": {
        "Overstated", "Manageable", "Serious", "Catastrophic",
        "Existential", "Mixed/nuanced", "Unknown",
    },
    "belief_evidence_source": {
        "Explicitly stated", "Inferred", "Unknown",
    },
}

CITATION_PATTERN = re.compile(r"\[\d+(?:,\s*\d+)*\]")


# ── Helpers ──────────────────────────────────────────────────────────────

def run_query(cur, sql, params=None):
    """Execute a query and return all rows."""
    cur.execute(sql, params)
    return cur.fetchall()


def run_scalar(cur, sql, params=None):
    """Execute a query and return a single scalar value."""
    cur.execute(sql, params)
    return cur.fetchone()[0]


def pct(part, whole):
    """Return percentage string, handling division by zero."""
    if whole == 0:
        return "0.0%"
    return f"{100 * part / whole:.1f}%"


def fmt_table(headers, rows, align=None):
    """Render a simple Markdown table."""
    if not rows:
        return "*(no data)*\n"

    # Convert all cells to strings
    rows = [[str(c) for c in row] for row in rows]

    widths = [len(h) for h in headers]
    for row in rows:
        for i, cell in enumerate(row):
            widths[i] = max(widths[i], len(cell))

    if align is None:
        align = ["l"] * len(headers)

    def pad(text, width, a):
        if a == "r":
            return text.rjust(width)
        return text.ljust(width)

    header_line = "| " + " | ".join(pad(h, widths[i], align[i]) for i, h in enumerate(headers)) + " |"
    sep_parts = []
    for i, a in enumerate(align):
        if a == "r":
            sep_parts.append("-" * (widths[i] - 1) + ":")
        else:
            sep_parts.append("-" * widths[i])
    sep_line = "| " + " | ".join(sep_parts) + " |"
    data_lines = []
    for row in rows:
        data_lines.append("| " + " | ".join(pad(row[i], widths[i], align[i]) for i in range(len(headers))) + " |")

    return "\n".join([header_line, sep_line] + data_lines) + "\n"


# ── Audit sections ──────────────────────────────────────────────────────

def audit_entity_counts(cur):
    lines = ["## 1. Entity Counts\n"]
    rows = run_query(cur, "SELECT entity_type, COUNT(*) FROM entity GROUP BY entity_type ORDER BY COUNT(*) DESC")
    total = sum(r[1] for r in rows)
    rows.append(("**TOTAL**", total))
    lines.append(fmt_table(["Type", "Count"], rows, align=["l", "r"]))
    return "\n".join(lines)


def audit_entity_categories(cur):
    lines = ["## 2. Entity Categories\n"]
    for etype in ("person", "organization", "resource"):
        rows = run_query(cur, """
            SELECT COALESCE(category, '(null)'), COUNT(*)
            FROM entity WHERE entity_type = %s
            GROUP BY category ORDER BY COUNT(*) DESC
        """, (etype,))
        total = sum(r[1] for r in rows)
        lines.append(f"### {etype.title()}s ({total} total)\n")
        lines.append(fmt_table(["Category", "Count"], rows, align=["l", "r"]))
    return "\n".join(lines)


def audit_entity_status(cur):
    lines = ["## 3. Entity Status\n"]
    rows = run_query(cur, "SELECT COALESCE(status, '(null)'), COUNT(*) FROM entity GROUP BY status ORDER BY COUNT(*) DESC")
    lines.append(fmt_table(["Status", "Count"], rows, align=["l", "r"]))
    return "\n".join(lines)


def audit_field_completeness(cur):
    lines = ["## 4. Field Completeness\n"]
    total = run_scalar(cur, "SELECT COUNT(*) FROM entity")

    # Core fields (all entity types)
    core_fields = ["name", "category", "notes", "notes_html", "notes_sources",
                   "influence_type", "thumbnail_url"]
    lines.append("### Core fields (all entities)\n")
    rows = []
    for f in core_fields:
        filled = run_scalar(cur, f"SELECT COUNT(*) FROM entity WHERE {f} IS NOT NULL AND {f} != ''")
        empty = total - filled
        rows.append((f, filled, pct(filled, total), empty))
    lines.append(fmt_table(["Field", "Filled", "Rate", "Empty"], rows, align=["l", "r", "r", "r"]))

    # Person fields
    person_count = run_scalar(cur, "SELECT COUNT(*) FROM entity WHERE entity_type = 'person'")
    person_fields = ["title", "primary_org", "other_orgs", "twitter", "bluesky", "location"]
    lines.append(f"### Person fields ({person_count} people)\n")
    rows = []
    for f in person_fields:
        filled = run_scalar(cur, f"SELECT COUNT(*) FROM entity WHERE entity_type = 'person' AND {f} IS NOT NULL AND {f} != ''")
        rows.append((f, filled, pct(filled, person_count)))
    lines.append(fmt_table(["Field", "Filled", "Rate"], rows, align=["l", "r", "r"]))

    # Org fields
    org_count = run_scalar(cur, "SELECT COUNT(*) FROM entity WHERE entity_type = 'organization'")
    org_fields = ["website", "funding_model", "parent_org_id", "location"]
    lines.append(f"### Organization fields ({org_count} orgs)\n")
    rows = []
    for f in org_fields:
        if f == "parent_org_id":
            filled = run_scalar(cur, f"SELECT COUNT(*) FROM entity WHERE entity_type = 'organization' AND {f} IS NOT NULL")
        else:
            filled = run_scalar(cur, f"SELECT COUNT(*) FROM entity WHERE entity_type = 'organization' AND {f} IS NOT NULL AND {f} != ''")
        rows.append((f, filled, pct(filled, org_count)))
    lines.append(fmt_table(["Field", "Filled", "Rate"], rows, align=["l", "r", "r"]))

    # Resource fields
    res_count = run_scalar(cur, "SELECT COUNT(*) FROM entity WHERE entity_type = 'resource'")
    res_fields = ["resource_title", "resource_url", "resource_author", "resource_type",
                  "resource_category", "resource_year", "resource_key_argument"]
    lines.append(f"### Resource fields ({res_count} resources)\n")
    rows = []
    for f in res_fields:
        filled = run_scalar(cur, f"SELECT COUNT(*) FROM entity WHERE entity_type = 'resource' AND {f} IS NOT NULL AND {f} != ''")
        rows.append((f, filled, pct(filled, res_count)))
    lines.append(fmt_table(["Field", "Filled", "Rate"], rows, align=["l", "r", "r"]))

    # Enrichment tracking
    lines.append("### Enrichment tracking (all entities)\n")
    qa_approved = run_scalar(cur, "SELECT COUNT(*) FROM entity WHERE qa_approved = TRUE")
    has_confidence = run_scalar(cur, "SELECT COUNT(*) FROM entity WHERE notes_confidence IS NOT NULL")
    has_version = run_scalar(cur, "SELECT COUNT(*) FROM entity WHERE enrichment_version IS NOT NULL AND enrichment_version != ''")
    has_v1 = run_scalar(cur, "SELECT COUNT(*) FROM entity WHERE notes_v1 IS NOT NULL AND notes_v1 != ''")
    rows = [
        ("qa_approved = TRUE", qa_approved, pct(qa_approved, total)),
        ("notes_confidence set", has_confidence, pct(has_confidence, total)),
        ("enrichment_version set", has_version, pct(has_version, total)),
        ("notes_v1 (backup) set", has_v1, pct(has_v1, total)),
    ]
    lines.append(fmt_table(["Metric", "Count", "Rate"], rows, align=["l", "r", "r"]))

    return "\n".join(lines)


def audit_edges(cur):
    lines = ["## 5. Edge Statistics\n"]

    total_edges = run_scalar(cur, "SELECT COUNT(*) FROM edge")
    lines.append(f"**Total edges:** {total_edges}\n")

    # Edges by type
    lines.append("### Edge types\n")
    rows = run_query(cur, "SELECT COALESCE(edge_type, '(null)'), COUNT(*) FROM edge GROUP BY edge_type ORDER BY COUNT(*) DESC")
    annotated = []
    for etype, count in rows:
        canonical = "yes" if etype in CANONICAL_EDGE_TYPES else "**NO**"
        annotated.append((etype, count, canonical))
    lines.append(fmt_table(["Type", "Count", "Canonical?"], annotated, align=["l", "r", "l"]))

    # Edge field completeness
    lines.append("### Edge field completeness\n")
    edge_fields = [
        ("role", "role IS NOT NULL AND role != ''"),
        ("evidence", "evidence IS NOT NULL AND evidence != ''"),
        ("source_url", "source_url IS NOT NULL AND source_url != ''"),
        ("confidence", "confidence IS NOT NULL"),
        ("is_primary", "is_primary IS NOT NULL"),
        ("start_date", "start_date IS NOT NULL AND start_date != ''"),
        ("end_date", "end_date IS NOT NULL AND end_date != ''"),
        ("created_by", "created_by IS NOT NULL AND created_by != ''"),
    ]
    rows = []
    for label, condition in edge_fields:
        filled = run_scalar(cur, f"SELECT COUNT(*) FROM edge WHERE {condition}")
        rows.append((label, filled, pct(filled, total_edges)))
    lines.append(fmt_table(["Field", "Filled", "Rate"], rows, align=["l", "r", "r"]))

    return "\n".join(lines)


def audit_orphans(cur):
    lines = ["## 6. Orphan Entities (zero edges)\n"]
    rows = run_query(cur, """
        SELECT e.entity_type, COUNT(*) FROM entity e
        LEFT JOIN edge src ON e.id = src.source_id
        LEFT JOIN edge tgt ON e.id = tgt.target_id
        WHERE src.id IS NULL AND tgt.id IS NULL
        GROUP BY e.entity_type ORDER BY COUNT(*) DESC
    """)
    total_orphans = sum(r[1] for r in rows)
    total_entities = run_scalar(cur, "SELECT COUNT(*) FROM entity")
    lines.append(f"**{total_orphans} orphan entities** ({pct(total_orphans, total_entities)} of all entities)\n")
    lines.append(fmt_table(["Type", "Orphans"], rows, align=["l", "r"]))
    return "\n".join(lines)


def audit_beliefs(cur):
    lines = ["## 7. Belief Fields\n"]

    applicable = run_scalar(cur, "SELECT COUNT(*) FROM entity WHERE entity_type IN ('person', 'organization')")
    lines.append(f"Applicable entities (people + orgs): **{applicable}**\n")

    for field, canonical_values in CANONICAL_BELIEF_FIELDS.items():
        filled = run_scalar(cur, f"SELECT COUNT(*) FROM entity WHERE entity_type IN ('person', 'organization') AND {field} IS NOT NULL AND {field} != ''")
        lines.append(f"### {field}\n")
        lines.append(f"Filled: {filled} / {applicable} ({pct(filled, applicable)})\n")

        rows = run_query(cur, f"""
            SELECT {field}, COUNT(*) FROM entity
            WHERE entity_type IN ('person', 'organization') AND {field} IS NOT NULL AND {field} != ''
            GROUP BY {field} ORDER BY COUNT(*) DESC
        """)
        if rows:
            annotated = []
            for val, count in rows:
                canonical = "yes" if val in canonical_values else "**NO**"
                annotated.append((val, count, canonical))
            lines.append(fmt_table(["Value", "Count", "Canonical?"], annotated, align=["l", "r", "l"]))

    # Detail fields
    for detail_field in ["belief_regulatory_stance_detail", "belief_threat_models"]:
        filled = run_scalar(cur, f"SELECT COUNT(*) FROM entity WHERE entity_type IN ('person', 'organization') AND {detail_field} IS NOT NULL AND {detail_field} != ''")
        lines.append(f"### {detail_field}\n")
        lines.append(f"Filled: {filled} / {applicable} ({pct(filled, applicable)})\n")

    return "\n".join(lines)


def audit_citation_artifacts(cur):
    lines = ["## 8. Citation Artifacts\n"]

    # Check notes field for [n] or [n,n] patterns
    rows = run_query(cur, "SELECT id, name, entity_type, notes FROM entity WHERE notes IS NOT NULL AND notes != ''")
    affected = []
    for eid, name, etype, notes in rows:
        matches = CITATION_PATTERN.findall(notes)
        if matches:
            affected.append((eid, name, etype, len(matches), ", ".join(matches[:5])))

    lines.append(f"**{len(affected)} entities** have citation artifacts (`[n]` patterns) in notes.\n")
    if affected:
        # Show first 15 examples
        preview = affected[:15]
        lines.append(fmt_table(
            ["ID", "Name", "Type", "Count", "Examples"],
            preview,
            align=["r", "l", "l", "r", "l"],
        ))
        if len(affected) > 15:
            lines.append(f"*...and {len(affected) - 15} more.*\n")

    return "\n".join(lines)


def audit_notes_quality(cur):
    lines = ["## 9. Notes Quality Overview\n"]

    total = run_scalar(cur, "SELECT COUNT(*) FROM entity")
    null_or_empty = run_scalar(cur, "SELECT COUNT(*) FROM entity WHERE notes IS NULL OR notes = ''")
    short_notes = run_scalar(cur, "SELECT COUNT(*) FROM entity WHERE notes IS NOT NULL AND notes != '' AND LENGTH(notes) < 50")
    medium_notes = run_scalar(cur, "SELECT COUNT(*) FROM entity WHERE LENGTH(notes) BETWEEN 50 AND 200")
    long_notes = run_scalar(cur, "SELECT COUNT(*) FROM entity WHERE LENGTH(notes) > 200")

    rows = [
        ("Empty / null", null_or_empty, pct(null_or_empty, total)),
        ("Short (< 50 chars)", short_notes, pct(short_notes, total)),
        ("Medium (50–200 chars)", medium_notes, pct(medium_notes, total)),
        ("Long (> 200 chars)", long_notes, pct(long_notes, total)),
    ]
    lines.append(fmt_table(["Category", "Count", "Rate"], rows, align=["l", "r", "r"]))

    return "\n".join(lines)


def audit_edge_connectivity(cur):
    lines = ["## 10. Edge Connectivity\n"]

    # Distribution of edges per entity
    lines.append("### Edges per entity (distribution)\n")
    rows = run_query(cur, """
        WITH edge_counts AS (
            SELECT e.id,
                   COUNT(DISTINCT src.id) + COUNT(DISTINCT tgt.id) AS edge_count
            FROM entity e
            LEFT JOIN edge src ON e.id = src.source_id
            LEFT JOIN edge tgt ON e.id = tgt.target_id
            GROUP BY e.id
        )
        SELECT
            CASE
                WHEN edge_count = 0 THEN '0 (orphan)'
                WHEN edge_count = 1 THEN '1'
                WHEN edge_count BETWEEN 2 AND 5 THEN '2-5'
                WHEN edge_count BETWEEN 6 AND 10 THEN '6-10'
                WHEN edge_count BETWEEN 11 AND 20 THEN '11-20'
                ELSE '21+'
            END AS bucket,
            COUNT(*) AS entities
        FROM edge_counts
        GROUP BY
            CASE
                WHEN edge_count = 0 THEN 0
                WHEN edge_count = 1 THEN 1
                WHEN edge_count BETWEEN 2 AND 5 THEN 2
                WHEN edge_count BETWEEN 6 AND 10 THEN 3
                WHEN edge_count BETWEEN 11 AND 20 THEN 4
                ELSE 5
            END,
            CASE
                WHEN edge_count = 0 THEN '0 (orphan)'
                WHEN edge_count = 1 THEN '1'
                WHEN edge_count BETWEEN 2 AND 5 THEN '2-5'
                WHEN edge_count BETWEEN 6 AND 10 THEN '6-10'
                WHEN edge_count BETWEEN 11 AND 20 THEN '11-20'
                ELSE '21+'
            END
        ORDER BY
            CASE
                WHEN edge_count = 0 THEN 0
                WHEN edge_count = 1 THEN 1
                WHEN edge_count BETWEEN 2 AND 5 THEN 2
                WHEN edge_count BETWEEN 6 AND 10 THEN 3
                WHEN edge_count BETWEEN 11 AND 20 THEN 4
                ELSE 5
            END
    """)
    lines.append(fmt_table(["Edges", "Entities"], rows, align=["l", "r"]))

    # Top 15 most-connected entities
    lines.append("### Top 15 most-connected entities\n")
    rows = run_query(cur, """
        WITH edge_counts AS (
            SELECT e.id, e.name, e.entity_type,
                   COUNT(DISTINCT src.id) + COUNT(DISTINCT tgt.id) AS edge_count
            FROM entity e
            LEFT JOIN edge src ON e.id = src.source_id
            LEFT JOIN edge tgt ON e.id = tgt.target_id
            GROUP BY e.id, e.name, e.entity_type
        )
        SELECT name, entity_type, edge_count
        FROM edge_counts ORDER BY edge_count DESC LIMIT 15
    """)
    lines.append(fmt_table(["Name", "Type", "Edges"], rows, align=["l", "l", "r"]))

    return "\n".join(lines)


def audit_summary(cur):
    """Quick summary stats at the top of the report."""
    lines = ["## Summary\n"]

    total_entities = run_scalar(cur, "SELECT COUNT(*) FROM entity")
    total_edges = run_scalar(cur, "SELECT COUNT(*) FROM edge")
    empty_notes = run_scalar(cur, "SELECT COUNT(*) FROM entity WHERE notes IS NULL OR notes = ''")
    edges_no_source = run_scalar(cur, "SELECT COUNT(*) FROM edge WHERE source_url IS NULL OR source_url = ''")
    orphans = run_scalar(cur, """
        SELECT COUNT(*) FROM entity e
        LEFT JOIN edge src ON e.id = src.source_id
        LEFT JOIN edge tgt ON e.id = tgt.target_id
        WHERE src.id IS NULL AND tgt.id IS NULL
    """)

    rows = [
        ("Total entities", str(total_entities)),
        ("Total edges", str(total_edges)),
        ("Empty notes", f"{empty_notes} ({pct(empty_notes, total_entities)})"),
        ("Edges missing source_url", f"{edges_no_source} ({pct(edges_no_source, total_edges)})"),
        ("Orphan entities", f"{orphans} ({pct(orphans, total_entities)})"),
    ]
    lines.append(fmt_table(["Metric", "Value"], rows))

    return "\n".join(lines)


# ── Main ─────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Audit the mapping_ai_staging database")
    parser.add_argument("-o", "--output", help="Write report to this file instead of stdout")
    args = parser.parse_args()

    conn = psycopg2.connect(DATABASE_URL)
    try:
        with conn.cursor() as cur:
            timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
            sections = [
                f"# Baseline Audit — mapping_ai_staging\n\n*Generated: {timestamp}*\n",
                audit_summary(cur),
                audit_entity_counts(cur),
                audit_entity_categories(cur),
                audit_entity_status(cur),
                audit_field_completeness(cur),
                audit_edges(cur),
                audit_orphans(cur),
                audit_beliefs(cur),
                audit_citation_artifacts(cur),
                audit_notes_quality(cur),
                audit_edge_connectivity(cur),
            ]
            report = "\n---\n\n".join(sections) + "\n"
    finally:
        conn.close()

    if args.output:
        os.makedirs(os.path.dirname(args.output) or ".", exist_ok=True)
        with open(args.output, "w") as f:
            f.write(report)
        print(f"Audit written to {args.output}")
    else:
        print(report)


if __name__ == "__main__":
    main()
