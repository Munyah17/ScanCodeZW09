-- ScanCodeZW — Initial Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- Or via: supabase db push (if using Supabase CLI)

-- ── Profiles ─────────────────────────────────────────────────────────────────
-- Extends Supabase Auth (auth.users) with app-specific fields.
-- Automatically created on signup via the trigger below.

create table if not exists public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  username              text unique not null,
  subscription_type     text not null default 'starter' check (subscription_type in ('starter','business','pro','enterprise')),
  subscription_end_date timestamptz,
  user_type             text not null default 'user' check (user_type in ('user','admin')),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Row Level Security: users can only read/update their own profile
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
  method          text not null,                     -- stripe | ecocash | onemoney | innbucks | omari
  status          text not null default 'pending',   -- pending | paid | failed | cancelled | refunded
  stripe_pi       text,                              -- Stripe PaymentIntent ID
  paynow_poll_url text,
  paynow_ref      text,                              -- Paynow's own reference
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
  with check (true);   -- bypassed by service-role key in API functions

-- ── Subscription plan config ──────────────────────────────────────────────────

create table if not exists public.subscription_plans (
  id                          text primary key,   -- starter | business | pro | enterprise
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
