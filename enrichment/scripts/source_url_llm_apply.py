#!/usr/bin/env python3
"""
Phase 4C.2b apply: load proposals from Sonnet subagents, validate URL
reachability, write accepted ones to edge.source_url.

Reads every tmp/source_url_proposals/batch_*.json, validates each URL
via HEAD (with GET fallback for servers that reject HEAD), and — in live
mode — writes the URL to edge.source_url.

Acceptance rule:
  - confidence ∈ {high, medium}
  - URL resolves to HTTP 2xx or 3xx (following redirects)
  - URL is not obviously a bare homepage of one of the endpoints
    (optional tightening — warn only, don't block)

Usage:
    python scripts/source_url_llm_apply.py                 # dry run
    python scripts/source_url_llm_apply.py --live          # apply to DB
    python scripts/source_url_llm_apply.py --include-low   # also accept low confidence
    python scripts/source_url_llm_apply.py -o LOG.md       # custom log path
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

import psycopg2
import urllib.request
import urllib.error
from dotenv import load_dotenv

env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set", file=sys.stderr)
    sys.exit(1)

PROPOSAL_DIR = Path(__file__).parent.parent / "tmp" / "source_url_proposals"
DEFAULT_LOG = (Path(__file__).parent.parent / "logs" /
               f"source-url-llm-{datetime.now().strftime('%Y%m%d')}.md")

USER_AGENT = ("Mozilla/5.0 (source-url-validator; mapping-ai.org research; "
              "contact: research@mapping-ai.org)")
TIMEOUT = 10


def validate_url(url):
    """Return (ok, status_or_error). Tries HEAD then GET as a fallback."""
    try:
        req = urllib.request.Request(url, method="HEAD",
                                     headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            return (200 <= resp.status < 400), f"HEAD {resp.status}"
    except urllib.error.HTTPError as e:
        # Some servers reject HEAD with 403/405 — try GET
        if e.code in (403, 405, 406):
            try:
                req = urllib.request.Request(url, method="GET",
                                             headers={"User-Agent": USER_AGENT})
                with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
                    return (200 <= resp.status < 400), f"GET {resp.status}"
            except Exception as ee:
                return False, f"GET after HEAD {e.code}: {ee.__class__.__name__}"
        return False, f"HTTP {e.code}"
    except Exception as e:
        return False, f"{e.__class__.__name__}: {str(e)[:80]}"


def load_proposals(proposal_dir):
    rows = []
    for f in sorted(proposal_dir.glob("batch_*.json")):
        try:
            data = json.loads(f.read_text())
        except json.JSONDecodeError as exc:
            print(f"  skipping malformed {f.name}: {exc}", file=sys.stderr)
            continue
        for r in data:
            rows.append((f.name, r))
    return rows


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--live", action="store_true",
                        help="Write accepted URLs to DB (default: dry run)")
    parser.add_argument("--include-low", action="store_true",
                        help="Also accept confidence=low (default: high+medium only)")
    parser.add_argument("-o", "--output", default=str(DEFAULT_LOG),
                        help=f"Log file (default: {DEFAULT_LOG})")
    parser.add_argument("--proposal-dir", default=str(PROPOSAL_DIR))
    args = parser.parse_args()

    accept_levels = {"high", "medium"}
    if args.include_low:
        accept_levels.add("low")

    proposals = load_proposals(Path(args.proposal_dir))
    if not proposals:
        print(f"No proposals found in {args.proposal_dir}")
        return

    # Validate each URL
    lines = []
    def out(s=""):
        lines.append(s)
        print(s)

    mode = "LIVE" if args.live else "DRY RUN"
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    out(f"# Source URL LLM Apply — {mode}")
    out(f"*{now}*")
    out()
    out(f"- Proposals loaded: {len(proposals)}")
    out(f"- Accepted confidence: {', '.join(sorted(accept_levels))}")
    out()

    # Bucket results
    accepted = []       # (edge_id, url, conf, batch, justification, validation)
    rejected_conf = []
    rejected_null = []
    rejected_url  = []

    for batch_name, r in proposals:
        eid   = r["edge_id"]
        url   = r.get("proposed_url")
        conf  = (r.get("confidence") or "none").lower()
        just  = r.get("justification", "")

        if url is None:
            rejected_null.append((eid, conf, batch_name, just))
            continue
        if conf not in accept_levels:
            rejected_conf.append((eid, conf, batch_name, just, url))
            continue

        ok, note = validate_url(url)
        if ok:
            accepted.append((eid, url, conf, batch_name, just, note))
        else:
            rejected_url.append((eid, conf, batch_name, url, note, just))

    # Summary
    out("## Summary")
    out()
    out(f"- Accepted (will write): **{len(accepted)}**")
    out(f"- Rejected — confidence below threshold: {len(rejected_conf)}")
    out(f"- Rejected — proposal was null: {len(rejected_null)}")
    out(f"- Rejected — URL unreachable: {len(rejected_url)}")
    out()

    # Detail tables
    if accepted:
        out("## Accepted")
        out()
        out("| edge_id | conf | batch | URL | justification |")
        out("| ------: | ---- | ----- | --- | ------------- |")
        for eid, url, conf, batch, just, note in accepted:
            short_url = url if len(url) < 70 else url[:67] + "..."
            short_j = (just[:100] + "…") if len(just) > 100 else just
            out(f"| {eid} | {conf} | {batch} | {short_url} | {short_j} |")
        out()

    if rejected_url:
        out("## Rejected — URL unreachable")
        out()
        out("| edge_id | conf | URL | reason |")
        out("| ------: | ---- | --- | ------ |")
        for eid, conf, _batch, url, note, _just in rejected_url:
            short_url = url if len(url) < 70 else url[:67] + "..."
            out(f"| {eid} | {conf} | {short_url} | {note} |")
        out()

    if rejected_null:
        out("## Rejected — agent returned null")
        out()
        out("| edge_id | justification |")
        out("| ------: | ------------- |")
        for eid, _conf, _batch, just in rejected_null:
            short_j = (just[:140] + "…") if len(just) > 140 else just
            out(f"| {eid} | {short_j} |")
        out()

    if rejected_conf:
        out("## Rejected — confidence below threshold")
        out()
        out("| edge_id | conf | URL |")
        out("| ------: | ---- | --- |")
        for eid, conf, _batch, _just, url in rejected_conf:
            short_url = url if len(url) < 70 else url[:67] + "..."
            out(f"| {eid} | {conf} | {short_url} |")
        out()

    # Apply
    if args.live and accepted:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        try:
            written = 0
            for eid, url, _conf, _batch, _just, _note in accepted:
                cur.execute(
                    "UPDATE edge SET source_url = %s WHERE id = %s "
                    "AND (source_url IS NULL OR source_url = '')",
                    (url, eid)
                )
                if cur.rowcount:
                    written += 1
            conn.commit()

            cur.execute("SELECT COUNT(*) FROM edge")
            total = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM edge "
                        "WHERE source_url IS NOT NULL AND source_url != ''")
            filled = cur.fetchone()[0]
        finally:
            conn.close()

        out("## Applied")
        out()
        out(f"- Rows written: **{written}** / {len(accepted)} accepted "
            f"(remainder were already filled after proposal generation)")
        out(f"- Coverage after run: **{filled} / {total} "
            f"({100*filled/total:.1f}%)**")
        out()
    elif not args.live:
        out("---")
        out("*Dry run — no DB writes. Pass `--live` to apply.*")

    Path(args.output).write_text("\n".join(lines) + "\n")
    print(f"\nReport: {args.output}")


if __name__ == "__main__":
    main()
