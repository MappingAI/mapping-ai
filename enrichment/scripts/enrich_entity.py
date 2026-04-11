#!/usr/bin/env python3
"""
Single-entity enrichment — convenience wrapper around enrich_batch.py.

Usage:
    python scripts/enrich_entity.py --id 123
    python scripts/enrich_entity.py --id 123 --dry-run
    python scripts/enrich_entity.py --id 123 --no-exa
    python scripts/enrich_entity.py --id 123 --model claude-opus-4-6
"""

import argparse
import subprocess
import sys
from pathlib import Path

batch_script = Path(__file__).parent / "enrich_batch.py"


def main():
    parser = argparse.ArgumentParser(
        description="Enrich a single entity (wrapper around enrich_batch.py)"
    )
    parser.add_argument("--id", required=True, type=int, help="Entity ID to enrich")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--no-exa", action="store_true")
    parser.add_argument("--model", default=None)
    args = parser.parse_args()

    cmd = [sys.executable, str(batch_script), "--ids", str(args.id)]
    if args.dry_run:
        cmd.append("--dry-run")
    if args.no_exa:
        cmd.append("--no-exa")
    if args.model:
        cmd += ["--model", args.model]

    sys.exit(subprocess.call(cmd))


if __name__ == "__main__":
    main()
