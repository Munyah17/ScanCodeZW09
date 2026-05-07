-- ScanCodeZW — Migration 003: API key management
-- Run in Supabase Dashboard → SQL Editor

-- ── API keys issued to clients ────────────────────────────────────────────────
-- When a client wants to connect their POS or other system to ScanCodeZW.
-- The full key is shown once on generation; only the SHA-256 hash is stored.

create table if not exists public.api_keys (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  name         text not null,              -- e.g. "My POS System"
  key_prefix   text not null,              -- first 8 chars, shown in UI for identification
  key_hash     text not null unique,       -- SHA-256 of full key (never stored in plaintext)
  scopes       text[] not null default '{}',
  active       boolean not null default true,
  last_used_at timestamptz,
  expires_at   timestamptz,
  created_at   timestamptz not null default now()
);

alter table public.api_keys enable row level security;

create policy "Users manage own api keys"
  on public.api_keys for all
  using (auth.uid() = user_id);

create index if not exists idx_api_keys_user    on public.api_keys(user_id);
create index if not exists idx_api_keys_hash    on public.api_keys(key_hash);

-- ── External credentials we hold ─────────────────────────────────────────────
-- When a client or partner gives us THEIR API key for integration work.
-- Values are encrypted at the application layer — only admins access this table.

create table if not exists public.external_credentials (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,         -- e.g. "ACME POS — API Key"
  provider         text not null,         -- e.g. "acme_pos"
  credential_type  text not null default 'api_key',   -- api_key | bearer_token | oauth_client | webhook_secret
  encrypted_value  text not null,         -- AES-256-GCM encrypted; key = EXTERNAL_CREDS_SECRET env var
  purpose          text,                  -- human notes on what this credential is used for
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- No user-level RLS — only accessible via service role key in API functions
alter table public.external_credentials enable row level security;
-- (No policies added → only service-role key bypasses RLS)
