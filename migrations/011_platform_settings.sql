-- ─────────────────────────────────────────────────────────────────────────────
-- ScanCodeZW — platform_settings key-value store
-- Applied to live DB via the Supabase management API; kept here so repo
-- schema matches reality.
-- ─────────────────────────────────────────────────────────────────────────────

-- Backs both the Super Admin "Configurations" tab (label printer defaults,
-- web analytics integration) and the "Settings" tab (maintenance mode,
-- signup toggle, support contact) — one table, filtered by category, so
-- there is exactly one place platform config lives rather than one bespoke
-- table per settings screen.
create table if not exists public.platform_settings (
  key         text primary key,
  value       jsonb not null,
  category    text not null default 'general',
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id) on delete set null
);

alter table public.platform_settings enable row level security;
grant select, insert, update, delete on table public.platform_settings to service_role;

insert into public.platform_settings (key, value, category) values
  ('label_printer_width_mm',   '38',   'configurations'),
  ('label_printer_dpi',        '300',  'configurations'),
  ('label_printer_format',     '"PNG"', 'configurations'),
  ('default_barcode_country',  '"ZW"',  'configurations'),
  ('web_analytics_provider',   '"none"', 'configurations'),
  ('web_analytics_tracking_id','""',     'configurations'),
  ('maintenance_mode',         'false', 'settings'),
  ('signup_enabled',           'true',  'settings'),
  ('free_generation_enabled',  'true',  'settings'),
  ('support_email',            '"support@scancode.co.zw"', 'settings'),
  ('support_whatsapp',         '"+263773909307"', 'settings')
on conflict (key) do nothing;

notify pgrst, 'reload schema';
