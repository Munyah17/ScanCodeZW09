# Engineering Log — Stabilization, 2026-07-10 → 2026-07-11

Scope: full audit → root-cause fixes → production verification of the
ScanCodeZW app (React/Vite SPA + consolidated Vercel API function + Supabase).

---

## 1. Total production API outage (CRITICAL — fixed)

**Symptom.** Every `/api/*` request returned `500 FUNCTION_INVOCATION_FAILED`.
The static site loaded, but login roles, dashboards, checkout, chat — anything
touching the API — failed. This is the root cause behind both previously
reported issues: *checkout requests not going through* and *admins being
routed to the client dashboard* (role comes from `/api/profile/me`; when it
failed, every admin fell back to `user_type: 'user'`).

**Root cause.** Confirmed via Vercel runtime logs: the catch-all function was
written Web-standard style (`Request` in, `Response` out — a Netlify Functions
v2 convention), but Vercel's Node runtime invokes `(req, res)` with `req.url`
as a *relative* path. `new URL(req.url)` threw `ERR_INVALID_URL` on every
invocation, before any handler ran.

**Fix.** `api/index.js` now exports a Node-style handler containing a
Node→Web adapter at the single dispatch point: it builds a real `Request`
(absolute URL from forwarded headers, raw body from the unconsumed stream) and
writes the handler's `Response` back to `res`. All 53 handlers stayed
untouched and platform-neutral. `NODEJS_HELPERS=0` is set on the Vercel
project so the raw body reaches the function (required for Stripe webhook
signature verification); the adapter still tolerates helpers being on.

**Second layer of the same outage.** After the adapter fix, only
single-segment paths (`/api/health`) reached the function; Vercel's bracketed
`[...path].js` catch-all never matched nested paths (`/api/profile/me` → 
platform 404). Renamed the function to `api/index.js` and added the standard
`vercel.json` rewrite `/api/:path*` → `/api`.

**Verified.** All route shapes, methods, auth gating, query params, and POST
bodies tested locally and against production. Authenticated E2E (user create →
login → profile/stats/barcodes/keys) passes in production.

## 2. Local dev API server crashed on startup (fixed)

`scripts/dev-api-server.js` imported handler files deleted during the
"consolidate 53 functions" refactor. Rewritten to serve `api/index.js`
directly — local dev now exercises the exact production code path on port
3042 (the Vite proxy target).

## 3. Database security (CRITICAL — fixed)

Audited the live DB (not just migration files — they had diverged):

- **`subscription_plans` had RLS disabled** while `anon` held full DML grants:
  anyone with the public anon key (ships in the JS bundle) could rewrite plan
  prices. RLS enabled; existing read-only policies now active.
- **`payments` had a policy `USING(true) WITH CHECK(true)` for role `public`**
  ("Service role manages payments" — a misconception: the service role
  bypasses RLS, so the policy's only effect was exposing all payments to
  everyone). Dropped.
- All 19 public tables now have RLS enabled; frontend performs **zero** direct
  table access (verified) — everything goes through the service-role API.

## 4. Live schema was missing the developer-platform tables (fixed)

`developer_wallets`, `wallet_transactions`, `api_pricing`,
`webhook_endpoints`, `webhook_deliveries` and the atomic wallet RPCs existed
only in `migrations/002_developer_platform.sql`, never in the live DB — every
`/dev` portal endpoint failed. Applied piecewise (skipping the two tables that
already existed). Note: tables created via the management API don't inherit
Supabase's default grants; explicit grants added (same trap as
`supabase/migrations/008_fix_table_grants.sql`). Recorded in
`migrations/009_stabilization_2026-07.sql`.

## 5. Checkout / payments (fixed + verified)

The architecture was already the standard, correct one: backend creates the
session → user redirected to Stripe/Paynow hosted checkout → provider webhook
updates the DB → return page polls `/api/payments/status`. It failed only
because of item 1, plus one genuinely missing piece:

- **`STRIPE_WEBHOOK_SECRET` was absent on Vercel** (local `.env` held
  `whsec_REPLACE_ME`), so even with the API up, subscriptions would never
  activate. Created the webhook endpoint on the live Stripe account via API
  (`we_1Trj2ZE6tsHu9xT4uahF6WhL`, events: `checkout.session.completed`,
  `checkout.session.expired`, `invoice.paid`,
  `customer.subscription.deleted`) and stored its signing secret in Vercel.

**Verified in production:** live Stripe Checkout session created (200 with
`checkout.stripe.com` URL), Paynow initiation returns a real
`paynow.co.zw/Payment/ConfirmPayment` redirect, `payments/status` returns
`pending` for fresh references, and the webhook rejects unsigned payloads with
400 (signature verification active). Not exercised end-to-end with real money:
an actual card charge / EcoCash payment. Recommend one $5.90 live test.

## 6. Auth URL configuration (fixed)

- **Supabase `site_url` was `http://localhost:3000`** with an empty redirect
  allow-list — all auth emails (password reset, confirmation) linked to
  localhost. Now `https://www.scancode.co.zw` + allow-list covering www, apex,
  and localhost dev ports.
- **`APP_URL`/`VITE_APP_URL` pointed at the apex domain**, which 308-redirects
  to `www`. Fine for browsers, risky for Paynow's server-to-server `resultUrl`
  POST (redirects can drop the POST). Both now `https://www.scancode.co.zw`.
- Dead `scancodezw.netlify.app` fallbacks in payment handlers replaced with
  the real domain.
- `API_BASE` in six frontend files used dev-only localhost ternaries
  (ChatWidget pointed at port 3000 where nothing listens — dev chat was
  broken). All are now same-origin `''`; the Vite proxy forwards `/api` in dev.

## 7. Admin / Super Admin routing (verified working)

Login → `/dashboard` → role-based redirect (`super_admin` → `/super-admin`,
staff roles → `/admin`) was always implemented correctly; it misbehaved because
the role fetch failed (item 1). Verified in production for all three roles.
Hardening added: `hydrateUser` retries the profile fetch once, so a single
transient failure can't silently demote an admin to the client dashboard, and
token refreshes no longer re-fetch the profile (just swap the JWT in state).

## 8. Notifications feature had no backend (implemented)

`NotificationsPage` called `/api/notifications/{list,mark-read,delete}` —
none existed. Implemented all three (own-row scoped, service-role writes),
created the `notifications` table (RLS: own-row select), and wired payment
events to produce notifications: plan activation (Stripe + Paynow), wallet
top-up, subscription cancellation. Verified E2E in production.

## 9. Cleanup

- Removed duplicated role-check block in `ProtectedRoute`.
- Deleted `e.md` (stale analysis; its one still-valid point — profile re-fetch
  on token refresh — is now fixed) and `scripts/fix-error-leaks.js`
  (self-described one-off).

---

## Remaining risks / launch checklist

1. **Live payment test** — one real card payment ($5.90 starter) and one
   EcoCash payment end-to-end, confirming `profiles.subscription_type` flips
   and the in-app notification appears. Everything up to the pay button is
   verified.
2. **Stripe key is LIVE mode** (`sk_live_…`). Real cards will be charged.
3. **Paynow result URL**: the integration's dashboard-registered URLs should
   match `https://www.scancode.co.zw/…` (the code passes them per-transaction,
   which Paynow honors, but keeping the dashboard consistent avoids surprises).
4. **Supabase auth emails** use the shared SMTP pool (rate-limited). Add
   custom SMTP (Resend/SendGrid) before real signup volume.
5. **`mailer_autoconfirm` is ON** — users are not required to confirm email.
   Deliberate for now; revisit at launch.
6. **Old admin sessions**: anyone who logged in while the API was down has a
   cached 'user'-role view until next login (roles re-resolve on each page
   load via `hydrateUser`, so in practice a refresh fixes it).
7. `subscription_plans` prices vs. hardcoded `PLAN_AMOUNTS` in
   `paymentService.js` / payment handlers — two sources of truth. Not a bug
   today (values match), but consolidate eventually.
8. Credentials shared during this session (Vercel token, Supabase PAT/service
   key, Stripe key implicitly via env) — **rotate the 7-day tokens after
   launch** as planned; the service-role key should be rotated if this chat
   transcript ever leaves your control.
