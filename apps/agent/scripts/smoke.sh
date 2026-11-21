#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <url>" >&2
  exit 1
fi

BASE_URL="${1%/}"

HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health" || true)
if [ "$HEALTH_STATUS" != "200" ]; then
  echo "FAIL: GET /health expected 200, got $HEALTH_STATUS" >&2
  exit 1
fi

REQUESTS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/agent/requests" \
  -H "Content-Type: application/json" \
  -d '{"goal":"smoke-check"}' || true)
if [ "$REQUESTS_STATUS" != "401" ]; then
  echo "FAIL: POST /agent/requests without token expected 401, got $REQUESTS_STATUS" >&2
  exit 1
fi

echo "OK: smoke check passed for $BASE_URL"
