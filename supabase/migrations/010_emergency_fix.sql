-- ═══════════════════════════════════════════════════════════════════════════
-- EMERGENCY FIX: Handle missing columns + broken RLS + missing profile
-- Run this entire script in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Add missing columns to profiles (safe if already exists) ────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS enterprise_config jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS admin_notes text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS override_by uuid DEFAULT NULL REFERENCES public.profiles(id);

-- ── 2. Fix constraints on profiles ─────────────────────────────────────────

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_subscription_type_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_subscription_type_check
  CHECK (subscription_type IN ('free','starter','business','pro','enterprise','custom'));

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_user_type_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_user_type_check
  CHECK (user_type IN ('user','admin','super_admin'));

-- ── 3. Ensure trigger is correct ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, subscription_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'plan', 'free')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ── 4. Create profile for user if missing ──────────────────────────────────

INSERT INTO public.profiles (id, username, subscription_type, user_type)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'username', SPLIT_PART(au.email, '@', 1)),
  COALESCE(au.raw_user_meta_data->>'plan', 'free'),
  'user'
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- ── 5. Nuclear reset: PROFILES RLS ───────────────────────────────────────

ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users full access" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── 6. Nuclear reset: PRODUCTS RLS ───────────────────────────────────────

ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own products" ON public.products;
DROP POLICY IF EXISTS "Users can view own products" ON public.products;
DROP POLICY IF EXISTS "Users can insert own products" ON public.products;
DROP POLICY IF EXISTS "Users can update own products" ON public.products;
DROP POLICY IF EXISTS "Users can delete own products" ON public.products;
DROP POLICY IF EXISTS "Allow authenticated users full access" ON public.products;

CREATE POLICY "Users manage own products"
  ON public.products FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 7. Nuclear reset: VARIATIONS RLS ─────────────────────────────────────

ALTER TABLE public.variations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.variations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own variations" ON public.variations;
DROP POLICY IF EXISTS "Users can view own variations" ON public.variations;
DROP POLICY IF EXISTS "Users can insert own variations" ON public.variations;
DROP POLICY IF EXISTS "Users can update own variations" ON public.variations;
DROP POLICY IF EXISTS "Users can delete own variations" ON public.variations;
DROP POLICY IF EXISTS "Allow authenticated users full access" ON public.variations;

CREATE POLICY "Users manage own variations"
  ON public.variations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 8. SUBSCRIPTION_PLANS: disable RLS completely ─────────────────────────
-- This table should be publicly readable

ALTER TABLE public.subscription_plans DISABLE ROW LEVEL SECURITY;

-- Insert free plan if missing
INSERT INTO public.subscription_plans (id, name, price_usd, max_products, max_variations_per_product, features, active)
VALUES ('free', 'Free Trial', 0, 1, 1, '1 barcode/month, 1 QR code/month, EAN-13 & UPC-A, PNG download', true)
ON CONFLICT (id) DO NOTHING;

-- ── 9. DIAGNOSTIC: verify everything ─────────────────────────────────────
SELECT '=== Profile for current user ===' AS status;
SELECT id, username, subscription_type, user_type, created_at
FROM public.profiles
WHERE id = 'c5eb18df-38dc-4074-a148-9d8936a9ef41';

SELECT '=== All policies on products ===' AS status;
SELECT policyname, cmd, qual IS NOT NULL AS has_using, with_check IS NOT NULL AS has_with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'products';

SELECT '=== All policies on variations ===' AS status;
SELECT policyname, cmd, qual IS NOT NULL AS has_using, with_check IS NOT NULL AS has_with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'variations';

SELECT '=== All policies on profiles ===' AS status;
SELECT policyname, cmd, qual IS NOT NULL AS has_using, with_check IS NOT NULL AS has_with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles';

SELECT '=== RLS enabled status ===' AS status;
SELECT relname, relrowsecurity AS rls_enabled
FROM pg_class
WHERE relname IN ('profiles', 'products', 'variations', 'subscription_plans')
AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
