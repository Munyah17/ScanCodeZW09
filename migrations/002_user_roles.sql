-- ═══════════════════════════════════════════════════════════════════════════
-- ScanCodeZW — Migration 002: Enhanced User Roles
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Extend user_type to include super_admin ────────────────────────────
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_user_type_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_user_type_check
  CHECK (user_type IN ('user', 'admin', 'super_admin'));

-- ── 2. Super admins can see and manage ALL profiles ───────────────────────
DROP POLICY IF EXISTS "Super admins can view all profiles"  ON public.profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles" ON public.profiles;

CREATE POLICY "Super admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.user_type IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Super admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.user_type IN ('admin', 'super_admin')
    )
  );

-- ── 3. Add enterprise_config column if not present ────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS enterprise_config jsonb DEFAULT NULL;

-- ── 4. Revenue / analytics view for admins ────────────────────────────────
CREATE OR REPLACE VIEW public.admin_revenue_summary AS
SELECT
  date_trunc('week', created_at)::date AS week,
  SUM(amount_usd)::numeric(10,2)       AS revenue,
  COUNT(*)                              AS payment_count
FROM public.payments
WHERE status = 'paid'
GROUP BY 1
ORDER BY 1;

-- Grant admins access to the view
GRANT SELECT ON public.admin_revenue_summary TO authenticated;

-- ── 5. Active subscriptions view ──────────────────────────────────────────
CREATE OR REPLACE VIEW public.admin_subscription_summary AS
SELECT
  subscription_type,
  COUNT(*) AS count
FROM public.profiles
WHERE subscription_type IS NOT NULL
GROUP BY subscription_type;

GRANT SELECT ON public.admin_subscription_summary TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- Done. Now run scripts/create-test-accounts.js to create the 3 test users.
-- ═══════════════════════════════════════════════════════════════════════════
