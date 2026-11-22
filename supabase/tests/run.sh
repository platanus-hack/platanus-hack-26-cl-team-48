#!/usr/bin/env bash
# Runs the SQL tests against a throwaway pgvector Postgres: stub, migrations in order, then every *.test.sql.
set -uo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
migrations="$here/../migrations"
name="nodomics-sql-tests-$$"

cleanup() { docker rm -f "$name" >/dev/null 2>&1; }
trap cleanup EXIT

docker run -d --name "$name" -e POSTGRES_PASSWORD=test pgvector/pgvector:pg17 >/dev/null || { echo "FAIL: cannot start container"; exit 1; }

ready=0
for _ in $(seq 1 60); do
  # The image restarts Postgres once after init, so require two consecutive successes.
  if docker exec "$name" pg_isready -U postgres -q && sleep 1 && docker exec "$name" pg_isready -U postgres -q; then ready=1; break; fi
  sleep 1
done
[ "$ready" = 1 ] || { echo "FAIL: database did not start"; exit 1; }

psql_file() {
  docker exec -i "$name" psql -U postgres -v ON_ERROR_STOP=1 -q -f - < "$1"
}

echo "== stub"
psql_file "$here/support/supabase-stub.sql" || { echo "FAIL: stub"; exit 1; }

for f in $(ls "$migrations"/*.sql | sort); do
  echo "== migration $(basename "$f")"
  psql_file "$f" || { echo "FAIL: migration $(basename "$f")"; exit 1; }
done

failed=0
for t in $(ls "$here"/*.test.sql | sort); do
  echo "== test $(basename "$t")"
  if psql_file "$t"; then
    echo "PASS $(basename "$t")"
  else
    echo "FAIL $(basename "$t")"
    failed=1
  fi
done

[ "$failed" = 0 ] && echo "PASS" || { echo "FAIL"; exit 1; }
