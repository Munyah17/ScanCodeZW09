-- ═══════════════════════════════════════════════════════════════════════════
-- ScanCodeZW — Migration 012: Full Role System + Lifetime Plan
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Expand user_type to full role hierarchy ──────────────────────────────
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_user_type_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_user_type_check
  CHECK (user_type IN (
    'super_admin',
    'admin',
    'technical_support',
    'clerk',
    'assistant',
    'finance',
    'user'
  ));

-- ── 2. Expand subscription_type to include lifetime ─────────────────────────
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_subscription_type_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_subscription_type_check
  CHECK (subscription_type IN (
    'free',
    'starter',
    'business',
    'pro',
    'enterprise',
    'lifetime'
  ));

-- ── 3. Add lifetime plan to subscription_plans ─────────────────────────────
INSERT INTO public.subscription_plans (id, name, price_usd, max_products, max_variations_per_product, features, active)
VALUES
  ('lifetime', 'Lifetime', 129.99, -1, -1, 'Unlimited everything. One-time payment. No renewals.', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price_usd = EXCLUDED.price_usd,
  max_products = EXCLUDED.max_products,
  max_variations_per_product = EXCLUDED.max_variations_per_product,
  features = EXCLUDED.features,
  active = EXCLUDED.active;

-- ── 4. Update existing plans with correct prices ────────────────────────────
UPDATE public.subscription_plans SET price_usd = 4.79,  max_products = 3,   max_variations_per_product = 3  WHERE id = 'starter';
UPDATE public.subscription_plans SET price_usd = 11.99, max_products = 20,  max_variations_per_product = 15 WHERE id = 'business';
UPDATE public.subscription_plans SET price_usd = 24.99, max_products = 100, max_variations_per_product = 50 WHERE id = 'pro';

-- ── 5. Unified admin policy — all elevated roles can manage profiles ─────────
DROP POLICY IF EXISTS "Super admins can view all profiles"  ON public.profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles" ON public.profiles;

CREATE POLICY "Admins and elevated roles can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.user_type IN ('super_admin', 'admin', 'technical_support', 'clerk', 'assistant', 'finance')
    )
  );

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.user_type IN ('super_admin', 'admin')
    )
  );

-- ── 6. Add payments status constraint if missing ────────────────────────────
ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_status_check;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_status_check
  CHECK (status IN ('pending', 'paid', 'failed', 'cancelled', 'refunded', 'disputed'));

-- ── 7. Helper view for role-based access ───────────────────────────────────
CREATE OR REPLACE VIEW public.elevated_roles AS
SELECT id, user_type FROM public.profiles
WHERE user_type IN ('super_admin', 'admin', 'technical_support', 'clerk', 'assistant', 'finance');

-- ── 8. Grant select on view ────────────────────────────────────────────────
GRANT SELECT ON public.elevated_roles TO authenticated;
