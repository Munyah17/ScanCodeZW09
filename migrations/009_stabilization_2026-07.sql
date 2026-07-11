-- ─────────────────────────────────────────────────────────────────────────────
-- ScanCodeZW — Stabilization migration (applied to live DB on 2026-07-10/11
-- via the Supabase management API; kept here so repo schema matches reality).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. SECURITY ───────────────────────────────────────────────────────────────

-- subscription_plans had RLS DISABLED while anon/authenticated hold full DML
-- grants — anyone with the public anon key could rewrite plan prices.
-- Enabling RLS activates the existing read-only policies.
alter table public.subscription_plans enable row level security;

-- This policy was defined for role {public} with USING(true)/CHECK(true).
-- The service role bypasses RLS anyway, so its only real effect was granting
-- every anon-key holder full read/write on the payments table.
drop policy if exists "Service role manages payments" on public.payments;

-- ── 2. Developer-platform tables (from migrations/002, never applied live) ────
-- developer_wallets, wallet_transactions, api_pricing, webhook_endpoints,
-- webhook_deliveries + deduct_wallet_balance / credit_wallet_balance RPCs.
-- See migrations/002_developer_platform.sql for the definitions; that file
-- was applied piecewise (skipping the two tables that already existed).

-- ── 3. Notifications ─────────────────────────────────────────────────────────

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  message    text not null default '',
  type       text not null default 'info',
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

drop policy if exists "Users view own notifications" on public.notifications;
create policy "Users view own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create index if not exists idx_notifications_user
  on public.notifications(user_id, created_at desc);

-- ── 4. Grants ─────────────────────────────────────────────────────────────────
-- Tables created via the management API do not inherit Supabase's default
-- grants (same issue as supabase/migrations/008_fix_table_grants.sql).

grant select, insert, update, delete on table
  public.notifications,
  public.developer_wallets,
  public.wallet_transactions,
  public.api_pricing,
  public.webhook_endpoints,
  public.webhook_deliveries
to service_role;

grant select on table
  public.notifications,
  public.developer_wallets,
  public.wallet_transactions,
  public.webhook_endpoints,
  public.webhook_deliveries
to authenticated;

notify pgrst, 'reload schema';
