#!/usr/bin/env bash
# État de Seedow Pro en production — LECTURE SEULE.
# Toutes les requêtes SQL passent par une session `default_transaction_read_only`.
# N'affiche jamais une valeur de secret : seulement « présent / absent ».
set -uo pipefail
export PGOPTIONS="-c default_transaction_read_only=on -c statement_timeout=20000"

q() { psql "$SUPABASE_DB_URL" -X -At -v ON_ERROR_STOP=1 -c "$1" 2>&1; }

echo "## Secrets disponibles pour ce run (présence seulement)"
for s in SUPABASE_DB_URL SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY ANTHROPIC_API_KEY; do
  if [ -n "${!s:-}" ]; then echo "- $s : présent"; else echo "- $s : ABSENT"; fi
done

echo; echo "## Quelle base ? (comparaison avec le projet de l'application, .env versionné)"
# L'identifiant du projet Lovable Cloud est public (il est dans .env) ; on ne
# compare que des booléens, sans afficher l'URL ni l'identifiant des secrets.
app_ref=$(grep -E '^VITE_SUPABASE_PROJECT_ID=' .env | cut -d'"' -f2)
same() { if [ -n "$1" ] && [ -n "$app_ref" ] && printf '%s' "$1" | grep -q "$app_ref"; then echo "oui"; else echo "NON"; fi; }
echo "- projet de l'application publiée : lu dans .env (${#app_ref} caractères)"
echo "- SUPABASE_URL vise ce projet : $(same "${SUPABASE_URL:-}")"
echo "- SUPABASE_DB_URL vise ce projet : $(same "${SUPABASE_DB_URL:-}")"

echo; echo "## Tables Pro (lignes)"
for t in pro_funds pro_fund_documents pro_fund_sustainability_data pro_cabinets \
         pro_client_profiles pro_predefined_profiles pro_collection_records pro_reports \
         pro_contract_uc_lists; do
  echo "- $t : $(q "select count(*) from public.$t")"
done
echo "- pro_fund_sustainability_data par statut : $(q "select coalesce(string_agg(status||'='||n, ' '), '(vide)') from (select status, count(*) n from public.pro_fund_sustainability_data group by 1) s")"

echo; echo "## Stockage"
q "select bucket_id || ' : ' || count(*) || ' objet(s)' from storage.objects where bucket_id in ('pro-annexes','pro-reports') group by bucket_id" || true
echo "- annexes en attente (inbox/) : $(q "select count(*) from storage.objects where bucket_id='pro-annexes' and name like 'inbox/%'")"
echo "- buckets : $(q "select string_agg(id || (case when public then '(public)' else '(privé)' end), ' ') from storage.buckets where id like 'pro-%'")"

echo; echo "## Sécurité : RLS activée sur les tables pro_*"
q "select c.relname || ' : RLS=' || c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relname like 'pro\_%' order by 1"

echo; echo "## Rôles applicatifs"
q "select 'app_role = ' || string_agg(e.enumlabel, ', ' order by e.enumsortorder) from pg_enum e join pg_type t on t.oid=e.enumtypid where t.typname='app_role'"
echo "- comptes utilisateurs (auth.users) : $(q "select count(*) from auth.users")"

echo; echo "## Catalogue B2C réutilisable"
echo "- assets : $(q "select count(*) from public.assets")"
echo "- assets avec ISIN FR/LU : $(q "select count(*) from public.assets where isin ~ '^(FR|LU)'")"

echo; echo "## API REST (PostgREST voit-il les tables Pro ?)"
if [ -n "${SUPABASE_URL:-}" ] && [ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  for t in pro_funds pro_predefined_profiles pro_collection_records; do
    code=$(curl -s -o /tmp/rest.json -w '%{http_code}' "$SUPABASE_URL/rest/v1/$t?select=*&limit=0" \
      -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY")
    echo "- $t : HTTP $code $(grep -o '"code":"[^"]*"' /tmp/rest.json || true)"
  done
else
  echo "- non testé (secrets Supabase absents)"
fi

echo; echo "## Application publiée"
for path in / /pro /auth; do
  echo "- https://seedow.lovable.app$path : HTTP $(curl -s -o /dev/null -w '%{http_code}' -L "https://seedow.lovable.app$path")"
done
# La route /pro est rendue côté client : on cherche sa trace dans les bundles servis.
html=$(curl -s -L https://seedow.lovable.app/pro)
if printf '%s' "$html" | grep -qi "Seedow Pro\|/pro/"; then echo "- trace de /pro dans le HTML : oui"; else echo "- trace de /pro dans le HTML : non trouvée"; fi

echo; echo "## Clé Anthropic (appel gratuit : liste des modèles)"
if [ -n "${ANTHROPIC_API_KEY:-}" ]; then
  code=$(curl -s -o /tmp/models.json -w '%{http_code}' https://api.anthropic.com/v1/models \
    -H "x-api-key: $ANTHROPIC_API_KEY" -H "anthropic-version: 2023-06-01")
  echo "- GET /v1/models : HTTP $code"
  [ "$code" = 200 ] && echo "- modèles visibles : $(grep -o '"id":"claude-[^"]*"' /tmp/models.json | cut -d'"' -f4 | head -8 | tr '\n' ' ')"
else
  echo "- secret ANTHROPIC_API_KEY absent : extraction impossible"
fi
