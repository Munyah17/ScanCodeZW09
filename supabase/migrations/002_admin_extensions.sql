-- ScanCodeZW — Migration 002: Admin extensions + enterprise config
-- Run in Supabase Dashboard → SQL Editor

-- ── profiles additions ────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists enterprise_config  jsonb,      -- custom limits for enterprise/custom plans
  add column if not exists admin_notes        text,       -- internal notes visible only to admins
  add column if not exists override_by        uuid references public.profiles(id);  -- which admin last changed this

-- Allow 'custom' as a valid subscription_type (for per-client overrides)
-- We drop and recreate the check constraint to add 'custom'
alter table public.profiles
  drop constraint if exists profiles_subscription_type_check;

alter table public.profiles
  add constraint profiles_subscription_type_check
  check (subscription_type in ('starter','business','pro','enterprise','custom'));

-- ── subscription_plans: expose features as JSONB for richer editing ────────────
-- The existing 'features' column is text — add a jsonb variant for structured data
alter table public.subscription_plans
  add column if not exists features_json jsonb;

-- Admins can read enterprise_config on any profile
create policy "Admins can read enterprise_config"
  on public.profiles for select
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.user_type = 'admin'
  ));
