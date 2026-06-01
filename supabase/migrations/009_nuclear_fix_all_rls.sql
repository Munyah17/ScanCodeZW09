-- ═══════════════════════════════════════════════════════════════════════════
-- NUCLEAR FIX: Resolve all RLS and permission issues in one go
-- Run this entire script in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Fix profiles check constraint (must include 'free') ─────────────────

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_subscription_type_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_subscription_type_check
  CHECK (subscription_type IN ('free','starter','business','pro','enterprise','custom'));

-- Also fix user_type constraint to include super_admin
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_user_type_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_user_type_check
  CHECK (user_type IN ('user','admin','super_admin'));

-- Ensure default is 'free'
ALTER TABLE public.profiles
  ALTER COLUMN subscription_type SET DEFAULT 'free';

-- ── 2. Fix the trigger function to handle plan from metadata ──────────────

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

-- Make sure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ── 3. Nuclear fix for products RLS ────────────────────────────────────────

-- Disable and re-enable RLS to clear any stale state
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Drop ALL policies on products
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'products'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.products', pol.policyname);
  END LOOP;
END $$;

-- Create one clean policy
CREATE POLICY "Users manage own products"
  ON public.products FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 4. Nuclear fix for variations RLS ─────────────────────────────────────

ALTER TABLE public.variations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.variations ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'variations'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.variations', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Users manage own variations"
  ON public.variations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 5. Ensure profiles RLS is correct ─────────────────────────────────────

ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.profiles', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admin policies
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.user_type IN ('admin', 'super_admin')
  ));

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.user_type IN ('admin', 'super_admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.user_type IN ('admin', 'super_admin')
  ));

-- ── 6. Fix subscription_plans (ensure no RLS) ─────────────────────────────

ALTER TABLE public.subscription_plans DISABLE ROW LEVEL SECURITY;

-- Insert free plan if missing
INSERT INTO public.subscription_plans (id, name, price_usd, max_products, max_variations_per_product, features, active)
VALUES ('free', 'Free Trial', 0, 1, 1, '1 barcode/month, 1 QR code/month, EAN-13 & UPC-A, PNG download', true)
ON CONFLICT (id) DO NOTHING;

-- ── 7. Ensure the current user has a valid profile ─────────────────────────
-- This inserts missing profiles for existing auth users

INSERT INTO public.profiles (id, username, subscription_type, user_type)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'username', SPLIT_PART(au.email, '@', 1)),
  COALESCE(au.raw_user_meta_data->>'plan', 'free'),
  'user'
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL;

-- ── 8. Verify: show current state ─────────────────────────────────────────
SELECT 'Policies on products:' AS info;
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'products';

SELECT 'Policies on variations:' AS info;
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'variations';

SELECT 'Policies on profiles:' AS info;
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles';

SELECT 'Current user profile:' AS info;
SELECT id, username, subscription_type, user_type
FROM public.profiles
WHERE id = 'c5eb18df-38dc-4074-a148-9d8936a9ef41';
