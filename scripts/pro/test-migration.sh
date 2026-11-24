#!/usr/bin/env bash
# Applique la migration Pro sur un Postgres jetable (stub Supabase) et rejoue
# les tests RLS / immutabilité. Usage :
#   PGHOST=/tmp PGPORT=54329 PGUSER=postgres scripts/pro/test-migration.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
DB="seedow_pro_test_$$"
createdb "$DB"
trap 'dropdb --if-exists "$DB"' EXIT
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f supabase/tests/pro/supabase-stub.sql
for m in supabase/migrations/2026112412*_pro_*.sql supabase/migrations/2026112413*_pro_*.sql; do
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$m"
done
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f supabase/tests/pro/pro_rls.sql
