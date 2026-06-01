-- ═══════════════════════════════════════════════════════════════════════════
-- ScanCodeZW — Migration 003: Set Test Account Roles
-- Run AFTER migration 002 (which adds super_admin to the check constraint).
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- ═══════════════════════════════════════════════════════════════════════════

-- Step 1: Make sure super_admin is allowed
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_user_type_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_user_type_check
  CHECK (user_type IN ('user', 'admin', 'super_admin'));

-- Step 2: Update the 3 test accounts to their correct roles + unlimited access
UPDATE public.profiles
SET
  user_type         = 'super_admin',
  subscription_type = 'enterprise',
  enterprise_config = '{"max_products": null, "max_variations_per_product": null}'::jsonb
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'superadmin@scancodezw.co.zw'
);

UPDATE public.profiles
SET
  user_type         = 'admin',
  subscription_type = 'enterprise',
  enterprise_config = '{"max_products": null, "max_variations_per_product": null}'::jsonb
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'admin@scancodezw.co.zw'
);

UPDATE public.profiles
SET
  user_type         = 'user',
  subscription_type = 'enterprise',
  enterprise_config = '{"max_products": null, "max_variations_per_product": null}'::jsonb
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'client@scancodezw.co.zw'
);

-- Verify
SELECT
  u.email,
  p.username,
  p.user_type,
  p.subscription_type
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
WHERE u.email IN (
  'superadmin@scancodezw.co.zw',
  'admin@scancodezw.co.zw',
  'client@scancodezw.co.zw'
);
