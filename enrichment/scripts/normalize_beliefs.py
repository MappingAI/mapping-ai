#!/usr/bin/env python3
"""
Phase 2.3: Belief Field Normalization

Audits all belief fields for non-canonical values and normalizes them.
Single-value fields normalized: belief_regulatory_stance, belief_agi_timeline,
                                belief_ai_risk, belief_evidence_source
Audited only (multi-value): belief_threat_models

Usage:
    python normalize_beliefs.py              # dry run (default)
    python normalize_beliefs.py --live       # apply changes
    python normalize_beliefs.py -o FILE      # write report to file
"""

import argparse
import os
import sys
from datetime import datetime, timezone

import psycopg2
from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(env_path)

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set in .env")
    sys.exit(1)

CANONICAL_VALUES = {
    "belief_regulatory_stance": {
        "Accelerate", "Light-touch", "Targeted", "Moderate",
        "Restrictive", "Precautionary", "Nationalize", "Mixed/unclear", "Other",
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

# Known non-canonical → canonical mappings.
# Values not listed here will be flagged as UNMAPPED in the report.
FIELD_MAPPINGS = {
    "belief_agi_timeline": {
        "Ill-defined concept": "Ill-defined",
    },
    "belief_evidence_source": {
        # Inferred from behavior / associations / financial patterns
        "Inferred from actions":                                              "Inferred",
        "Inferred from associations":                                         "Inferred",
        "Campaign backing and endorsements":                                  "Inferred",
        "Super PAC spending, Campaign positions, Organization endorsements":  "Inferred",
        "Super PAC mission statement and candidate support patterns":         "Inferred",
        "FEC filings, candidate support patterns, stated mission":            "Inferred",
        "Campaign backing, Super PAC support":                               "Inferred",
        # Explicit public statements / published positions
        "Public statements":                                                 "Explicitly stated",
        "Public statements, Campaign messaging":                             "Explicitly stated",
        "Policy proposals":                                                  "Explicitly stated",
    },
}

CANONICAL_THREAT_MODELS = {
    "Labor displacement", "Economic inequality", "Power concentration",
    "Democratic erosion", "Cybersecurity", "Misinformation", "Environmental",
    "Weapons", "Loss of control", "Copyright/IP", "Existential risk",
}

SINGLE_VALUE_FIELDS = list(CANONICAL_VALUES.keys())

# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------

def get_connection():
    return psycopg2.connect(DATABASE_URL)


def field_distribution(conn, field):
    """Return [(value, count)] sorted by count desc. NULLs excluded."""
    with conn.cursor() as cur:
        cur.execute(f"""
            SELECT {field}, COUNT(*)
            FROM entity
            WHERE entity_type IN ('person', 'organization')
              AND {field} IS NOT NULL
            GROUP BY {field}
            ORDER BY COUNT(*) DESC
        """)
        return cur.fetchall()


def entity_ids_for_value(conn, field, value):
    """Return sorted list of entity IDs with this exact field value."""
    with conn.cursor() as cur:
        cur.execute(f"""
            SELECT id FROM entity
            WHERE entity_type IN ('person', 'organization')
              AND {field} = %s
            ORDER BY id
        """, (value,))
        return [row[0] for row in cur.fetchall()]


def apply_mapping(cur, field, old_value, new_value):
    cur.execute(f"""
        UPDATE entity SET {field} = %s
        WHERE entity_type IN ('person', 'organization')
          AND {field} = %s
    """, (new_value, old_value))
    return cur.rowcount


def threat_model_audit(conn):
    """Return [(individual_value, count)] for items in belief_threat_models."""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT belief_threat_models FROM entity
            WHERE entity_type IN ('person', 'organization')
              AND belief_threat_models IS NOT NULL
        """)
        rows = cur.fetchall()
    counts = {}
    for (raw,) in rows:
        for item in raw.split(","):
            item = item.strip()
            if item:
                counts[item] = counts.get(item, 0) + 1
    return sorted(counts.items(), key=lambda x: -x[1])


def format_ids(ids):
    return "(none)" if not ids else ", ".join(str(i) for i in ids)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Normalize non-standard belief field values to canonical"
    )
    parser.add_argument("--live", action="store_true",
                        help="Apply changes (default is dry run)")
    parser.add_argument("-o", "--output", help="Write report to file")
    args = parser.parse_args()

    lines = []
    def out(line=""):
        lines.append(line)
        print(line)

    conn = get_connection()
    mode = "LIVE RUN" if args.live else "DRY RUN"
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    out(f"# Belief Field Normalization — {mode}")
    out(f"*{now}*")
    out()

    # Discover non-canonical values in each field
    field_plans = []
    for field in SINGLE_VALUE_FIELDS:
        canonical = CANONICAL_VALUES[field]
        mapping = FIELD_MAPPINGS.get(field, {})
        dist = field_distribution(conn, field)
        mapped   = [(v, c) for v, c in dist if v not in canonical and v in mapping]
        unmapped = [(v, c) for v, c in dist if v not in canonical and v not in mapping]
        field_plans.append((field, dist, mapped, unmapped))

    # Per-field distribution + planned mappings
    for field, dist, mapped, unmapped in field_plans:
        canonical = CANONICAL_VALUES[field]
        mapping = FIELD_MAPPINGS.get(field, {})

        out(f"## Field: `{field}`")
        out()
        out("### Current Distribution")
        out()
        out("| Value | Count | Canonical? |")
        out("| ----- | ----: | ---------- |")
        for value, count in dist:
            tag = "yes" if value in canonical else "**NO**"
            out(f"| {value} | {count} | {tag} |")
        out()

        if not mapped and not unmapped:
            out("*All values canonical — no changes needed.*")
            out()
            continue

        if mapped:
            out("### Planned Mappings")
            out()
            out("| Current Value | Count | → Canonical |")
            out("| ------------- | ----: | ------------ |")
            for value, count in mapped:
                out(f"| {value} | {count} | {mapping[value]} |")
            out()

        if unmapped:
            out("### Unmapped (manual review needed)")
            out()
            out("| Value | Count |")
            out("| ----- | ----: |")
            for value, count in unmapped:
                out(f"| {value} | {count} |")
            out()

    # Summary (dry run)
    total_to_change = sum(count for _, _, mapped, _ in field_plans for _, count in mapped)
    total_unmapped = sum(count for _, _, _, unmapped in field_plans for _, count in unmapped)

    if not args.live:
        out("## Summary")
        out()
        out(f"**Entities to update:** {total_to_change}")
        if total_unmapped:
            out(f"**Entities with unmapped values (manual review):** {total_unmapped}")
        out()

    # Apply changes (live only)
    total_changed = 0
    if args.live:
        out("## Results")
        out()
        with conn.cursor() as cur:
            for field, dist, mapped, unmapped in field_plans:
                if not mapped:
                    continue
                mapping = FIELD_MAPPINGS.get(field, {})
                out(f"### `{field}`")
                out()
                for value, expected in mapped:
                    ids = entity_ids_for_value(conn, field, value)
                    affected = apply_mapping(cur, field, value, mapping[value])
                    total_changed += affected
                    check = "" if affected == expected else f" (expected {expected})"
                    out(f"#### `{value}` → `{mapping[value]}`: **{affected}**{check}")
                    out(f"- Entity IDs: {format_ids(ids)}")
                    out()
        conn.commit()

        out(f"**Total entities updated:** {total_changed}")
        out()

        # Post-normalization distributions for changed fields only
        out("## Post-Normalization Distributions")
        out()
        for field, dist, mapped, unmapped in field_plans:
            if not mapped:
                continue
            canonical = CANONICAL_VALUES[field]
            out(f"### `{field}`")
            out()
            out("| Value | Count | Canonical? |")
            out("| ----- | ----: | ---------- |")
            for value, count in field_distribution(conn, field):
                tag = "yes" if value in canonical else "**NO**"
                out(f"| {value} | {count} | {tag} |")
            out()

    # Threat model audit — read-only in all modes
    out("## Audit: `belief_threat_models` (multi-value, not rewritten)")
    out()
    tm_counts = threat_model_audit(conn)
    out("| Individual Value | Count | Canonical? |")
    out("| ---------------- | ----: | ---------- |")
    for value, count in tm_counts:
        tag = "yes" if value in CANONICAL_THREAT_MODELS else "**NO**"
        out(f"| {value} | {count} | {tag} |")
    out()

    conn.close()

    if not args.live:
        out("---")
        out("*Dry run — no changes applied. Run with `--live` to execute.*")

    if args.output:
        with open(args.output, "w") as f:
            f.write("\n".join(lines) + "\n")
        print(f"\nReport saved to {args.output}")


if __name__ == "__main__":
    main()
