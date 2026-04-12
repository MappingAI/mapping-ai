#!/usr/bin/env python3
"""
Phase 5 helper: seed a batch of new entities (with their structural edges)
from a Python list of specs.

Each spec is a dict:
    {
        "name":           str,        # required, unique-ish
        "entity_type":    str,        # "organization" | "person" | "resource"
        "category":       str,        # canonical category
        "website":        str | None,
        "parent_org_id":  int | None,
        "notes":          str,
        "notes_sources":  str,        # newline-separated URLs
        "other_categories": str | None,
        "edges": [
            {
                "direction":  "from_new" | "to_new",   # direction relative to new entity
                "other_id":   int,                     # other endpoint (existing entity)
                "edge_type":  str,
                "role":       str | None,
                "is_primary": bool,
                "evidence":   str,
                "source_url": str | None,
            },
            ...
        ],
    }

All inserts run inside one transaction. Dry-run by default.

Usage:
    from scripts.seed_entity import seed_all
    seed_all(SPECS, live=False, output="logs/seeding-NN.md")

Or, as a library used by a caller script.
"""

import os
import sys
from datetime import datetime, timezone

import psycopg2
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set", file=sys.stderr); sys.exit(1)


CANONICAL_EDGE_TYPES = {
    "employer", "founder", "advisor", "member",
    "funder", "partner", "parent_company", "collaborator",
    "critic", "supporter", "author", "publisher",
}

DEFAULT_ENRICHMENT_VERSION = "phase5-seed"
DEFAULT_CREATED_BY = "phase5-seed"
DEFAULT_CONFIDENCE = 3  # conservative: seeds use training-data knowledge,
                        # should be verified against sources before promoting


def _validate_spec(spec):
    required = {"name", "entity_type", "notes"}
    missing = required - spec.keys()
    if missing:
        raise ValueError(f"spec {spec.get('name','?')}: missing fields {missing}")
    if spec["entity_type"] not in ("organization", "person", "resource"):
        raise ValueError(f"{spec['name']}: invalid entity_type {spec['entity_type']}")
    for e in spec.get("edges", []):
        if e["direction"] not in ("from_new", "to_new"):
            raise ValueError(f"{spec['name']}: edge direction must be from_new|to_new")
        if e["edge_type"] not in CANONICAL_EDGE_TYPES:
            raise ValueError(f"{spec['name']}: edge_type '{e['edge_type']}' not canonical")


def _check_existing_name(cur, name, entity_type):
    """Return list of (id, name, enrichment_version) of existing entities with
    matching or near-matching name — warn before duplicating."""
    cur.execute("""
        SELECT id, name, enrichment_version
        FROM entity
        WHERE entity_type = %s
          AND (name = %s OR name ILIKE %s)
        ORDER BY id
        LIMIT 5
    """, (entity_type, name, f"%{name}%"))
    return cur.fetchall()


def seed_all(specs, live=False, output=None,
             created_by=DEFAULT_CREATED_BY,
             enrichment_version=DEFAULT_ENRICHMENT_VERSION,
             confidence=DEFAULT_CONFIDENCE):
    """Seed all specs in one transaction. Return dict with report info."""
    # Validate up front
    for s in specs:
        _validate_spec(s)

    lines = []
    def out(line=""):
        lines.append(line); print(line)

    mode = "LIVE RUN" if live else "DRY RUN"
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    out(f"# Seed entities — {mode}")
    out(f"*{now}*")
    out()
    out(f"- `created_by`: `{created_by}`")
    out(f"- `enrichment_version`: `{enrichment_version}`")
    out(f"- `confidence` (edges): {confidence}")
    out(f"- Specs: {len(specs)}")
    out()

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    # Sanity: collision check
    out("## Pre-flight: duplicate-name check")
    out()
    for s in specs:
        hits = _check_existing_name(cur, s["name"], s["entity_type"])
        if hits:
            out(f"- **{s['name']}** — existing near-name hits:")
            for h in hits:
                out(f"    - [{h[0]}] {h[1]} (enrichment_version={h[2]})")
    out()

    # Verify edge endpoints exist
    out("## Pre-flight: edge endpoint check")
    out()
    for s in specs:
        for e in s.get("edges", []):
            cur.execute("SELECT name, entity_type FROM entity WHERE id=%s",
                        (e["other_id"],))
            r = cur.fetchone()
            if not r:
                out(f"- ⚠️ {s['name']}: edge endpoint id={e['other_id']} DOES NOT EXIST — will FAIL")
            else:
                out(f"- {s['name']} {e['direction']} "
                    f"[{e['other_id']}] {r[0]} ({r[1]}) / {e['edge_type']}")
    out()

    # Parent_org_id check
    for s in specs:
        pid = s.get("parent_org_id")
        if pid:
            cur.execute("SELECT name, entity_type FROM entity WHERE id=%s", (pid,))
            r = cur.fetchone()
            if not r:
                out(f"- ⚠️ {s['name']}: parent_org_id={pid} does not exist")
            elif r[1] != "organization":
                out(f"- ⚠️ {s['name']}: parent_org_id={pid} is {r[1]}, not org")

    # Planned entity inserts
    out("## Planned entity inserts")
    out()
    out("| name | type | category | website | edges | notes preview |")
    out("| --- | --- | --- | --- | ---: | --- |")
    for s in specs:
        preview = (s["notes"][:60] + "…") if len(s["notes"]) > 60 else s["notes"]
        out(f"| {s['name']} | {s['entity_type']} | {s.get('category','')} | "
            f"{s.get('website','') or ''} | {len(s.get('edges', []))} | {preview} |")
    out()

    # APPLY
    results = []  # (spec_name, new_id, edges_inserted)
    if live:
        try:
            for s in specs:
                cur.execute("""
                    INSERT INTO entity (
                        entity_type, name, category, website, parent_org_id,
                        notes, notes_sources, other_categories,
                        enrichment_version, status, created_at, updated_at
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'approved',
                            NOW(), NOW())
                    RETURNING id
                """, (
                    s["entity_type"], s["name"], s.get("category"),
                    s.get("website"), s.get("parent_org_id"),
                    s["notes"], s.get("notes_sources", ""),
                    s.get("other_categories"),
                    enrichment_version,
                ))
                new_id = cur.fetchone()[0]

                edge_count = 0
                for e in s.get("edges", []):
                    if e["direction"] == "from_new":
                        src, tgt = new_id, e["other_id"]
                    else:
                        src, tgt = e["other_id"], new_id

                    cur.execute("""
                        INSERT INTO edge (
                            source_id, target_id, edge_type, role,
                            is_primary, evidence, source_url,
                            confidence, created_by
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        src, tgt, e["edge_type"], e.get("role"),
                        e.get("is_primary", False),
                        e.get("evidence"),
                        e.get("source_url"),
                        confidence, created_by,
                    ))
                    edge_count += 1
                results.append((s["name"], new_id, edge_count))

            conn.commit()
            out("## Applied")
            out()
            out("| name | new_id | edges inserted |")
            out("| --- | ---: | ---: |")
            for n, nid, ec in results:
                out(f"| {n} | {nid} | {ec} |")
            out()
        except Exception as exc:
            conn.rollback()
            out(f"## ERROR — rolled back: {exc}")
            raise
    else:
        out("---")
        out("*Dry run — no changes. Pass `live=True` to apply.*")

    conn.close()

    if output:
        with open(output, "w") as f:
            f.write("\n".join(lines) + "\n")
        print(f"\nReport saved to {output}")

    return {"results": results, "report_path": output}


if __name__ == "__main__":
    print("seed_entity.py is a library. Import seed_all() from your batch script.")
    print("Example: scripts/seed_tier_b.py")
