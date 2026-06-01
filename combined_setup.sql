-- ═══════════════════════════════════════════════════════════════════════════
-- ScanCodeZW — Combined Supabase Setup
-- Run this ONCE in: Supabase Dashboard → SQL Editor → New query → Run
-- ═══════════════════════════════════════════════════════════════════════════



-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- MIGRATION 001 — Initial Schema
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ── Profiles ─────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  username              text unique not null,
  subscription_type     text not null default 'starter' check (subscription_type in ('starter','business','pro','enterprise')),
  subscription_end_date timestamptz,
  user_type             text not null default 'user' check (user_type in ('user','admin')),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles for select
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.user_type = 'admin'
  ));

create policy "Admins can update all profiles"
  on public.profiles for update
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.user_type = 'admin'
  ));

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Products ──────────────────────────────────────────────────────────────────
create table if not exists public.products (
  id           bigserial primary key,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  product_name text not null,
  category     text,
  created_at   timestamptz not null default now()
);

alter table public.products enable row level security;

create policy "Users manage own products"
  on public.products for all
  using (auth.uid() = user_id);

-- ── Variations ────────────────────────────────────────────────────────────────
create table if not exists public.variations (
  id               bigserial primary key,
  product_id       bigint not null references public.products(id) on delete cascade,
  user_id          uuid not null references public.profiles(id) on delete cascade,
  variation_type   text not null,
  variation_value  text not null,
  barcode_data     text not null unique,
  barcode_format   text not null default 'EAN13',
  barcode_country  text not null default 'ZW',
  qrcode_generated boolean not null default false,
  created_at       timestamptz not null default now()
);

alter table public.variations enable row level security;

create policy "Users manage own variations"
  on public.variations for all
  using (auth.uid() = user_id);

-- ── Payments ──────────────────────────────────────────────────────────────────
create table if not exists public.payments (
  id              bigserial primary key,
  reference       text unique not null,
  user_id         uuid references public.profiles(id) on delete set null,
  plan            text not null,
  amount_usd      numeric(10,2) not null,
  method          text not null,
  status          text not null default 'pending',
  stripe_pi       text,
  paynow_poll_url text,
  paynow_ref      text,
  paid_at         timestamptz,
  created_at      timestamptz not null default now()
);

alter table public.payments enable row level security;

create policy "Users view own payments"
  on public.payments for select
  using (auth.uid() = user_id);

create policy "Service role manages payments"
  on public.payments for all
  using (true)
  with check (true);

-- ── Subscription plan config ──────────────────────────────────────────────────
create table if not exists public.subscription_plans (
  id                          text primary key,
  name                        text not null,
  price_usd                   numeric(10,2),
  max_products                int,
  max_variations_per_product  int,
  features                    text,
  active                      boolean not null default true
);

insert into public.subscription_plans values
  ('starter',    'Starter',    1.59,  3,   3,   'EAN-13 & UPC-A, QR code, PNG & PDF downloads, Email support',                      true),
  ('business',   'Business',   4.99,  20,  15,  'All barcode formats, Custom branding, Priority support, Advanced exports',          true),
  ('pro',        'Pro',        11.99, 100, 50,  'All formats, 24/7 support, API access (read-only), Advanced analytics',             true),
  ('enterprise', 'Enterprise', null,  null,null, 'Unlimited, White-label, Full API, SLA, On-premise, Dedicated account manager',     true)
on conflict (id) do nothing;

-- ── Indexes ───────────────────────────────────────────────────────────────────
create index if not exists idx_products_user_id   on public.products(user_id);
create index if not exists idx_variations_product on public.variations(product_id);
create index if not exists idx_variations_user    on public.variations(user_id);
create index if not exists idx_payments_user      on public.payments(user_id);
create index if not exists idx_payments_reference on public.payments(reference);



-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- MIGRATION 002 — Admin extensions + enterprise config
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

alter table public.profiles
  add column if not exists enterprise_config  jsonb,
  add column if not exists admin_notes        text,
  add column if not exists override_by        uuid references public.profiles(id);

-- Extend subscription_type to include 'custom'
alter table public.profiles
  drop constraint if exists profiles_subscription_type_check;

alter table public.profiles
  add constraint profiles_subscription_type_check
  check (subscription_type in ('starter','business','pro','enterprise','custom'));

-- Extend user_type to include 'support' (for support agents)
alter table public.profiles
  drop constraint if exists profiles_user_type_check;

alter table public.profiles
  add constraint profiles_user_type_check
  check (user_type in ('user','admin','support'));

alter table public.subscription_plans
  add column if not exists features_json jsonb;

create policy "Admins can read enterprise_config"
  on public.profiles for select
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.user_type = 'admin'
  ));



-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- MIGRATION 003 — API key management + external credentials
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

create table if not exists public.api_keys (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  name         text not null,
  key_prefix   text not null,
  key_hash     text not null unique,
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

create index if not exists idx_api_keys_user on public.api_keys(user_id);
create index if not exists idx_api_keys_hash on public.api_keys(key_hash);

create table if not exists public.external_credentials (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  provider         text not null,
  credential_type  text not null default 'api_key',
  encrypted_value  text not null,
  purpose          text,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.external_credentials enable row level security;
-- No policies — only accessible via service-role key



-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- MIGRATION 004 — Live chat + ticket support system
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

create table if not exists public.support_tickets (
  id            bigserial primary key,
  ticket_number text unique,
  user_id       uuid references public.profiles(id) on delete set null,
  guest_name    text,
  guest_email   text not null,
  subject       text not null,
  body          text not null,
  status        text not null default 'open',
  priority      text not null default 'normal',
  source        text not null default 'widget',
  assigned_to   uuid references public.profiles(id),
  resolved_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create or replace function public.set_ticket_number()
returns trigger language plpgsql as $$
begin
  new.ticket_number = 'TKT-' || lpad(new.id::text, 5, '0');
  return new;
end;
$$;

drop trigger if exists trg_set_ticket_number on public.support_tickets;
create trigger trg_set_ticket_number
  before insert on public.support_tickets
  for each row execute function public.set_ticket_number();

alter table public.support_tickets enable row level security;

create policy "Users view own tickets"
  on public.support_tickets for select
  using (auth.uid() = user_id);

create policy "Admins manage all tickets"
  on public.support_tickets for all
  using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.user_type = 'admin'
  ));

create table if not exists public.ticket_replies (
  id          bigserial primary key,
  ticket_id   bigint not null references public.support_tickets(id) on delete cascade,
  sender_id   uuid references public.profiles(id),
  sender_name text not null,
  is_agent    boolean not null default false,
  body        text not null,
  created_at  timestamptz not null default now()
);

alter table public.ticket_replies enable row level security;

create policy "Users view replies on own tickets"
  on public.ticket_replies for select
  using (exists (
    select 1 from public.support_tickets t
    where t.id = ticket_id and t.user_id = auth.uid()
  ));

create policy "Admins manage all replies"
  on public.ticket_replies for all
  using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.user_type = 'admin'
  ));

create table if not exists public.chat_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete set null,
  guest_name  text,
  guest_email text,
  status      text not null default 'waiting',
  agent_id    uuid references public.profiles(id),
  ticket_id   bigint references public.support_tickets(id),
  started_at  timestamptz not null default now(),
  assigned_at timestamptz,
  ended_at    timestamptz
);

alter table public.chat_sessions enable row level security;

create policy "Users view own sessions"
  on public.chat_sessions for select
  using (auth.uid() = user_id);

create policy "Anyone can insert a session"
  on public.chat_sessions for insert
  with check (true);

create policy "Admins manage all sessions"
  on public.chat_sessions for all
  using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.user_type = 'admin'
  ));

create table if not exists public.chat_messages (
  id          bigserial primary key,
  session_id  uuid not null references public.chat_sessions(id) on delete cascade,
  sender_id   uuid references public.profiles(id),
  sender_name text not null,
  is_agent    boolean not null default false,
  body        text not null,
  created_at  timestamptz not null default now()
);

alter table public.chat_messages enable row level security;

create policy "Session participants view messages"
  on public.chat_messages for select
  using (
    exists (
      select 1 from public.chat_sessions s
      where s.id = session_id and (s.user_id = auth.uid() or s.agent_id = auth.uid())
    )
  );

create policy "Anyone can insert messages"
  on public.chat_messages for insert
  with check (true);

create policy "Admins manage all messages"
  on public.chat_messages for all
  using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.user_type = 'admin'
  ));

create index if not exists idx_tickets_user_id on public.support_tickets(user_id);
create index if not exists idx_tickets_status  on public.support_tickets(status);
create index if not exists idx_replies_ticket  on public.ticket_replies(ticket_id);
create index if not exists idx_chat_user       on public.chat_sessions(user_id);
create index if not exists idx_chat_status     on public.chat_sessions(status);
create index if not exists idx_chat_msgs       on public.chat_messages(session_id);
