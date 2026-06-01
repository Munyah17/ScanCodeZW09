-- Migration 008: Grant authenticated role proper table + sequence permissions
-- Run in Supabase Dashboard → SQL Editor
--
-- Supabase creates tables via SQL but does NOT auto-grant DML to the
-- `authenticated` role — that only happens via the GUI. Without these grants,
-- INSERT/UPDATE/DELETE silently fail with "permission denied" even when RLS
-- policies would allow the operation.

-- ── Products ──────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.products_id_seq TO authenticated;

-- ── Variations ────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.variations TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.variations_id_seq TO authenticated;

-- ── Payments ─────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.payments_id_seq TO authenticated;

-- ── Profiles ─────────────────────────────────────────────────────────────────
GRANT SELECT, UPDATE ON public.profiles TO authenticated;

-- ── API keys ─────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE ON public.api_keys TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.api_keys_id_seq TO authenticated;

-- ── Support tickets ───────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.support_tickets_id_seq TO authenticated;

-- ── Verify: check what the authenticated role can see ────────────────────────
SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'authenticated'
  AND table_schema = 'public'
ORDER BY table_name, privilege_type;
