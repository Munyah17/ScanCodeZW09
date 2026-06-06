-- ═══════════════════════════════════════════════════════════════════════════
-- ScanCodeZW — Migration 013: Fix handle_new_user trigger
--
-- Problem: trigger fails if plan value isn't in the constraint, or if the
-- generated username collides with an existing one. Any trigger failure on
-- auth.users surfaces as "Database error saving new user" in the client.
--
-- Run in: Supabase Dashboard → SQL Editor → New query → Run All
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Lock down constraints to the full current set ─────────────────────────

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_subscription_type_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_subscription_type_check
  CHECK (subscription_type IN (
    'free', 'starter', 'business', 'pro', 'enterprise', 'lifetime', 'custom'
  ));

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_user_type_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_user_type_check
  CHECK (user_type IN (
    'super_admin', 'admin', 'technical_support',
    'clerk', 'assistant', 'finance', 'user'
  ));

-- ── 2. Replace the trigger function with a bulletproof version ────────────────
--
-- Key improvements over previous versions:
--   • Validates plan against allowed values before inserting
--   • Handles duplicate usernames (appends short random suffix)
--   • EXCEPTION block guarantees the trigger NEVER blocks user creation

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username text;
  v_plan     text;
BEGIN
  -- Derive username from metadata or email prefix
  v_username := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''),
    SPLIT_PART(NEW.email, '@', 1)
  );

  -- Sanitise plan; anything outside the allowed set defaults to 'free'
  v_plan := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'plan'), ''), 'free');
  IF v_plan NOT IN ('free','starter','business','pro','enterprise','lifetime') THEN
    v_plan := 'free';
  END IF;

  -- Primary insert — handle duplicate username by appending a short uid suffix
  BEGIN
    INSERT INTO public.profiles (id, username, subscription_type, user_type)
    VALUES (NEW.id, v_username, v_plan, 'user');
  EXCEPTION WHEN unique_violation THEN
    INSERT INTO public.profiles (id, username, subscription_type, user_type)
    VALUES (
      NEW.id,
      v_username || '_' || SUBSTRING(NEW.id::text, 1, 6),
      v_plan,
      'user'
    )
    ON CONFLICT (id) DO NOTHING;
  END;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  -- Last resort: never let a trigger failure block user creation
  INSERT INTO public.profiles (id, username, subscription_type, user_type)
  VALUES (NEW.id, NEW.id::text, 'free', 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ── 3. Re-attach the trigger ──────────────────────────────────────────────────

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ── 4. Verify ─────────────────────────────────────────────────────────────────

SELECT
  p.proname AS function_name,
  p.prosecdef AS security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'handle_new_user';

SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';
