#!/usr/bin/env bash
# Load test wrapper — sources .env for API_BASE and runs artillery
# Usage: ./scripts/load-test.sh [artillery-args...]
#   e.g. ./scripts/load-test.sh --output report.json
#        ./scripts/load-test.sh --target http://localhost:3000

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Source .env if it exists
if [ -f "$PROJECT_DIR/.env" ]; then
  set -a
  source "$PROJECT_DIR/.env"
  set +a
fi

# Default API_BASE to production if not set
export API_BASE="${API_BASE:-https://j8jamvdf6i.execute-api.eu-west-2.amazonaws.com}"

echo "=== mapping-ai load test ==="
echo "Target: $API_BASE"
echo "Config: $SCRIPT_DIR/load-test.yml"
echo ""

npx artillery run "$SCRIPT_DIR/load-test.yml" "$@"
