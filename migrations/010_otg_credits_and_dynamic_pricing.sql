-- ─────────────────────────────────────────────────────────────────────────────
-- ScanCodeZW — OTG (one-time-generation) credits + DB-driven pricing
-- Applied to live DB via the Supabase management API; kept here so repo
-- schema matches reality.
-- ─────────────────────────────────────────────────────────────────────────────

-- subscription_plans becomes the single source of truth for what a plan
-- costs and how it's billed. Stripe/Paynow checkout now reads price_usd and
-- billing_type from here instead of a hardcoded map in each handler — so
-- editing a row (Super Admin Pricing page) actually changes what's charged.
alter table public.subscription_plans
  add column if not exists billing_type text not null default 'subscription' check (billing_type in ('subscription','one_time')),
  add column if not exists otg_credits int,
  add column if not exists sort_order int;

-- price_usd had drifted from what checkout actually charged (a pre-existing
-- dual-source-of-truth bug); align it before checkout starts reading from it.
update public.subscription_plans set price_usd = 5.90,  sort_order = 1 where id = 'starter';
update public.subscription_plans set price_usd = 16.90, sort_order = 2 where id = 'business';
update public.subscription_plans set price_usd = 29.90, sort_order = 3 where id = 'pro';
update public.subscription_plans set sort_order = 0 where id = 'free';
update public.subscription_plans set sort_order = 5 where id = 'enterprise';

-- 'lifetime' was referenced throughout checkout/webhook code but had no row.
insert into public.subscription_plans (id, name, price_usd, max_products, max_variations_per_product, active, billing_type, sort_order)
values ('lifetime', 'Lifetime Access', 129.99, null, null, true, 'subscription', 4)
on conflict (id) do update set name = excluded.name, price_usd = excluded.price_usd, sort_order = excluded.sort_order;

-- "Once in a While Use" one-time generation packs.
insert into public.subscription_plans (id, name, price_usd, max_products, max_variations_per_product, active, billing_type, otg_credits, sort_order)
values
  ('otg_single', '1 Barcode Generation',  10.00, null, null, true, 'one_time', 1,  10),
  ('otg_triple', '3 Barcode Generations', 20.00, null, null, true, 'one_time', 3,  11),
  ('otg_ten',    '10 Barcode Generations',50.00, null, null, true, 'one_time', 10, 12)
on conflict (id) do update set
  name = excluded.name, price_usd = excluded.price_usd, billing_type = excluded.billing_type,
  otg_credits = excluded.otg_credits, sort_order = excluded.sort_order;

-- Per-user generation credit balance. Previously, buying an OTG pack
-- overwrote profiles.subscription_type/subscription_end_date directly —
-- which both mis-modeled a one-time purchase as a 30-day subscription AND
-- downgraded any real paid plan the user already had. Credits sit alongside
-- subscription_type instead, spent only once a user's plan limit is reached.
alter table public.profiles add column if not exists otg_credits int not null default 0;

create or replace function public.consume_otg_credit(p_user_id uuid)
returns boolean
language plpgsql
security definer
as $$
declare
  v_remaining int;
begin
  update public.profiles
  set otg_credits = otg_credits - 1
  where id = p_user_id and otg_credits > 0
  returning otg_credits into v_remaining;

  return v_remaining is not null;
end;
$$;

grant execute on function public.consume_otg_credit(uuid) to service_role;
notify pgrst, 'reload schema';
