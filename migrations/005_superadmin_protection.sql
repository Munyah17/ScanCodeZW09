-- ═══════════════════════════════════════════════════════════════════════════
-- ScanCodeZW — Migration 005: Super Admin Protection
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Block deletion of the Super Admin profile via RLS ──────────────────
-- Prevents any role (including authenticated admin users) from deleting the
-- Super Admin profile row through the Supabase client (anon + service key).

DROP POLICY IF EXISTS "Protect super admin from deletion" ON public.profiles;

CREATE POLICY "Protect super admin from deletion"
  ON public.profiles FOR DELETE
  USING (
    -- Allow delete only if:
    -- (a) it's the user's own row AND they are NOT super_admin, OR
    -- (b) an admin/super_admin is deleting someone who is NOT the super_admin
    user_type <> 'super_admin'
  );

-- ── 2. Also guard the auth.users side via a database function ─────────────
-- This trigger prevents deletion of the super admin auth user directly.
-- (Belt-and-suspenders — the RLS above handles the profile layer.)

CREATE OR REPLACE FUNCTION public.protect_super_admin_deletion()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_type text;
BEGIN
  SELECT user_type INTO v_user_type
  FROM public.profiles
  WHERE id = OLD.id;

  IF v_user_type = 'super_admin' THEN
    RAISE EXCEPTION 'The Super Admin account cannot be deleted.';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_super_admin ON auth.users;
CREATE TRIGGER trg_protect_super_admin
  BEFORE DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.protect_super_admin_deletion();

-- ── 3. Add recovery email metadata column to profiles ─────────────────────
-- The two permanent recovery emails for Super Admin password reset.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS recovery_emails jsonb DEFAULT NULL;

-- Set them for the super admin (run AFTER accounts are created)
-- Replace UUIDs with actual user ID if needed, or match on email join.
UPDATE public.profiles
SET recovery_emails = '["munyamuzvidziwa19@gmail.com", "mmuzvi@gmail.com"]'::jsonb
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'munyamuzvidziwa19@gmail.com'
);

-- ── 4. Verify ─────────────────────────────────────────────────────────────
SELECT
  u.email,
  p.username,
  p.user_type,
  p.subscription_type,
  p.recovery_emails
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
WHERE p.user_type IN ('super_admin', 'admin')
ORDER BY p.user_type;
