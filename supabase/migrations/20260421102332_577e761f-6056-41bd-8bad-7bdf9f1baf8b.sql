-- Make sure Vault is available (Supabase ships it by default)
CREATE EXTENSION IF NOT EXISTS supabase_vault;

-- Helper: reads a secret stored in vault.secrets by name.
-- Returns NULL if missing.
CREATE OR REPLACE FUNCTION public.get_vault_secret(secret_name text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, vault
AS $$
  SELECT decrypted_secret
  FROM vault.decrypted_secrets
  WHERE name = secret_name
  LIMIT 1;
$$;

-- Lock it down: only the postgres role (used by pg_cron) can call it.
REVOKE ALL ON FUNCTION public.get_vault_secret(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_vault_secret(text) FROM anon, authenticated;