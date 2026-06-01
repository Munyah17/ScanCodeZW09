-- ─────────────────────────────────────────────────────────────────────────────
-- ScanCodeZW  —  Developer Platform Schema (Migration 002)
-- Run in: Supabase Dashboard → SQL Editor
-- Architecture: API module extends the main platform. Core tables (products,
-- variations, profiles) remain the single source of truth. This schema adds
-- the access-layer tables only.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Developer Wallets ─────────────────────────────────────────────────────────
-- One wallet per user. Created on first developer portal access.

create table if not exists public.developer_wallets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  balance    numeric(14, 6) not null default 0,
  currency   text not null default 'USD',
  status     text not null default 'active'
               check (status in ('active', 'suspended', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

alter table public.developer_wallets enable row level security;

create policy "Users view own wallet"
  on public.developer_wallets for select
  using (auth.uid() = user_id);

-- ── Wallet Transaction Ledger ─────────────────────────────────────────────────
-- Append-only. Never delete or update rows. Every balance change creates a row.

create table if not exists public.wallet_transactions (
  id             uuid primary key default gen_random_uuid(),
  wallet_id      uuid not null references public.developer_wallets(id) on delete cascade,
  type           text not null
                   check (type in ('topup', 'deduction', 'refund', 'adjustment')),
  amount         numeric(14, 6) not null,   -- positive for credits, negative for debits
  balance_before numeric(14, 6) not null,
  balance_after  numeric(14, 6) not null,
  reference      text,                      -- payment reference for topups
  description    text not null,
  metadata       jsonb,
  created_at     timestamptz not null default now()
);

alter table public.wallet_transactions enable row level security;

create policy "Users view own transactions"
  on public.wallet_transactions for select
  using (
    wallet_id in (
      select id from public.developer_wallets where user_id = auth.uid()
    )
  );

create index if not exists idx_wallet_txns_wallet
  on public.wallet_transactions(wallet_id, created_at desc);

-- ── Developer API Keys ────────────────────────────────────────────────────────
-- Separate from the main platform api_keys table.
-- Each key is scoped to either sandbox or live environment.

create table if not exists public.dev_api_keys (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  key_prefix   text not null,
  key_hash     text not null unique,
  environment  text not null default 'sandbox'
                 check (environment in ('sandbox', 'live')),
  scopes       text[] not null default array[
    'barcode:generate', 'barcode:list',
    'qr:generate',
    'products:read'
  ],
  rate_limit   int not null default 120,   -- requests per minute
  active       boolean not null default true,
  last_used_at timestamptz,
  created_at   timestamptz not null default now()
);

alter table public.dev_api_keys enable row level security;

create policy "Users manage own dev keys"
  on public.dev_api_keys for all
  using (auth.uid() = user_id);

create index if not exists idx_dev_api_keys_hash on public.dev_api_keys(key_hash);
create index if not exists idx_dev_api_keys_user on public.dev_api_keys(user_id);

-- ── API Usage Logs ────────────────────────────────────────────────────────────
-- One row per API call. Used for billing audit, analytics, and debugging.

create table if not exists public.api_usage_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  api_key_id    uuid references public.dev_api_keys(id) on delete set null,
  environment   text not null check (environment in ('sandbox', 'live')),
  endpoint      text not null,
  operation     text not null,
  status_code   int not null,
  cost_usd      numeric(14, 6) not null default 0,
  request_meta  jsonb,
  response_meta jsonb,
  duration_ms   int,
  created_at    timestamptz not null default now()
);

alter table public.api_usage_logs enable row level security;

create policy "Users view own usage"
  on public.api_usage_logs for select
  using (auth.uid() = user_id);

create index if not exists idx_api_usage_user
  on public.api_usage_logs(user_id, created_at desc);
create index if not exists idx_api_usage_key
  on public.api_usage_logs(api_key_id, created_at desc);

-- ── API Pricing ───────────────────────────────────────────────────────────────
-- Configurable pricing. Admins update this table; no code changes needed.

create table if not exists public.api_pricing (
  operation   text primary key,
  cost_usd    numeric(14, 6) not null,
  description text,
  active      boolean not null default true,
  updated_at  timestamptz not null default now()
);

insert into public.api_pricing (operation, cost_usd, description) values
  ('barcode_generate',      0.001,  'Single EAN-13 / UPC-A barcode generation'),
  ('barcode_generate_bulk', 0.0008, 'Barcode in a bulk request (>10 per call)'),
  ('qr_generate',           0.001,  'Single QR code generation'),
  ('qr_generate_bulk',      0.0008, 'QR code in a bulk request (>10 per call)'),
  ('barcode_list',          0,      'List barcodes — free'),
  ('products_list',         0,      'List products — free')
on conflict (operation) do nothing;

-- ── Webhook Endpoints ─────────────────────────────────────────────────────────

create table if not exists public.webhook_endpoints (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  url         text not null,
  events      text[] not null default array[
    'wallet.low_balance', 'wallet.topup', 'api.key_revoked'
  ],
  secret      text not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.webhook_endpoints enable row level security;

create policy "Users manage own webhooks"
  on public.webhook_endpoints for all
  using (auth.uid() = user_id);

-- ── Webhook Delivery Log ──────────────────────────────────────────────────────

create table if not exists public.webhook_deliveries (
  id              uuid primary key default gen_random_uuid(),
  webhook_id      uuid not null references public.webhook_endpoints(id) on delete cascade,
  event           text not null,
  payload         jsonb not null,
  response_status int,
  attempt         int not null default 1,
  success         boolean not null default false,
  created_at      timestamptz not null default now()
);

alter table public.webhook_deliveries enable row level security;

create policy "Users view own webhook deliveries"
  on public.webhook_deliveries for select
  using (
    webhook_id in (
      select id from public.webhook_endpoints where user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Atomic Wallet Functions (called via supabase.rpc())
-- These run inside a single DB transaction with row-level locking,
-- ensuring no race conditions between concurrent API requests.
-- ─────────────────────────────────────────────────────────────────────────────

-- Deduct funds atomically. Returns success/failure + new balance.
create or replace function public.deduct_wallet_balance(
  p_user_id    uuid,
  p_amount     numeric,
  p_operation  text,
  p_metadata   jsonb default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_wallet   public.developer_wallets%rowtype;
  v_new_bal  numeric;
  v_txn_id   uuid;
begin
  -- Lock the wallet row to prevent concurrent over-draws
  select * into v_wallet
  from public.developer_wallets
  where user_id = p_user_id and status = 'active'
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error',   'WALLET_NOT_FOUND'
    );
  end if;

  if v_wallet.balance < p_amount then
    return jsonb_build_object(
      'success',  false,
      'error',    'INSUFFICIENT_BALANCE',
      'balance',  v_wallet.balance,
      'required', p_amount
    );
  end if;

  v_new_bal := v_wallet.balance - p_amount;

  update public.developer_wallets
  set balance = v_new_bal, updated_at = now()
  where id = v_wallet.id;

  insert into public.wallet_transactions
    (wallet_id, type, amount, balance_before, balance_after, description, metadata)
  values
    (v_wallet.id, 'deduction', -p_amount, v_wallet.balance, v_new_bal,
     'API: ' || p_operation, p_metadata)
  returning id into v_txn_id;

  return jsonb_build_object(
    'success',  true,
    'balance',  v_new_bal,
    'txn_id',   v_txn_id
  );
end;
$$;

-- Credit funds atomically (topup, refund, admin adjustment).
create or replace function public.credit_wallet_balance(
  p_user_id     uuid,
  p_amount      numeric,
  p_type        text,           -- 'topup' | 'refund' | 'adjustment'
  p_reference   text default null,
  p_description text default 'Wallet credit'
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_wallet  public.developer_wallets%rowtype;
  v_new_bal numeric;
  v_txn_id  uuid;
begin
  -- Create wallet if first time
  insert into public.developer_wallets (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select * into v_wallet
  from public.developer_wallets
  where user_id = p_user_id
  for update;

  v_new_bal := v_wallet.balance + p_amount;

  update public.developer_wallets
  set balance = v_new_bal, updated_at = now()
  where id = v_wallet.id;

  insert into public.wallet_transactions
    (wallet_id, type, amount, balance_before, balance_after, reference, description)
  values
    (v_wallet.id, p_type, p_amount, v_wallet.balance, v_new_bal,
     p_reference, p_description)
  returning id into v_txn_id;

  return jsonb_build_object(
    'success', true,
    'balance', v_new_bal,
    'txn_id',  v_txn_id
  );
end;
$$;
