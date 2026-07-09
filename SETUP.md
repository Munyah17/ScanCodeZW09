# ScanCodeZW — Full Setup Guide (Netlify + Supabase)

> **⚠️ OUTDATED — the app now deploys on Vercel, not Netlify.**
> Production: GitHub `main` → Vercel project **scancodeappzw** → [www.scancode.co.zw](https://www.scancode.co.zw)
> Deployment config lives in `vercel.json` (functions under `api/`, SPA rewrites, cache headers).
> Environment variables are managed in the Vercel dashboard. The Netlify instructions below are kept only as a historical reference for the Supabase/Stripe/Paynow setup steps, which are still accurate — substitute your Vercel URL wherever a `netlify.app` URL appears.

## Architecture

```
Browser
  │
  ├── Frontend (React/Vite static build)  ─────────────────────┐
  └── API (Netlify Functions, /api/*)     ←── same deployment ─┘
                                                  │
                                          Supabase (PostgreSQL + Auth)
```

Everything deploys to a **single Netlify site**. The API functions live in the `api/` directory and are served at `/api/*` on the same domain as the frontend — no CORS, no separate service.

**Payment providers**:
- **Stripe** — card payments (Visa/Mastercard/Amex), hosted checkout page
- **Paynow** — Zimbabwe mobile money (EcoCash, OneMoney, InnBucks, ZIPIT, Omari)

---

## Estimated setup time: 45–60 minutes

| Section | Time |
|---------|------|
| Supabase — database & auth | ~10 min |
| Netlify — deploy & env vars | ~10 min |
| Stripe — card payments | ~10 min |
| Paynow — mobile money | ~10 min |
| Admin & Realtime | ~5 min |
| Testing | ~10 min |

---

## PART 1 — Supabase (Database + Auth)

### Step 1.1 — Create the Supabase project

1. Go to **https://supabase.com** → sign in (free)
2. Click **New Project**
3. Fill in:
   - **Name**: `scancodezw`
   - **Database Password**: use a strong password — save it securely
   - **Region**: `South Africa (Cape Town)` is closest to Zimbabwe
4. Click **Create new project** and wait ~60 seconds

### Step 1.2 — Collect your credentials

Go to **Settings → API** in the Supabase sidebar:

| Credential | Where to find it |
|------------|-----------------|
| Project URL | Top of the page, e.g. `https://abcxyz.supabase.co` |
| `anon` / `public` key | Under "Project API keys" |
| `service_role` key | Click **Reveal** under "Project API keys" |

> The `service_role` key bypasses Row Level Security — **never expose it in the browser**.

### Step 1.3 — Run the database schema

1. Supabase sidebar → **SQL Editor → New query**
2. Open `combined_setup.sql` from the project root
3. Copy the entire file contents → paste into the editor → click **Run**
4. Expect: `Success. No rows returned.`

This creates 9 tables with all policies, triggers, and indexes in one shot.

### Step 1.4 — Configure Auth

#### URL Configuration
Supabase sidebar → **Authentication → URL Configuration**:
- **Site URL**: `https://YOUR-SITE.netlify.app`
- **Redirect URLs**: Add both:
  ```
  https://YOUR-SITE.netlify.app/**
  http://localhost:8888/**
  ```

#### Email confirmation
**Authentication → Providers → Email**:
- **Confirm email**: ON for production (emails users must click to confirm)
- Turn OFF during initial testing if you want instant logins

---

## PART 2 — Netlify Deployment

### Step 2.1 — Connect your repository

If you haven't already:
1. Push the project to GitHub
2. Go to **https://app.netlify.com** → **Add new site → Import an existing project**
3. Connect GitHub and select this repository

### Step 2.2 — Build settings

Netlify should auto-detect these from `netlify.toml`, but verify:
- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Functions directory**: `api`

### Step 2.3 — Set environment variables

Go to **Site configuration → Environment variables → Add a variable** and add each of the following.

#### Frontend variables (Netlify reads these at build time — must have `VITE_` prefix)

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | `https://YOUR_PROJECT.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` (anon/public key from Supabase) |
| `VITE_APP_URL` | `https://YOUR-SITE.netlify.app` |

#### Function variables (Netlify injects these into the serverless functions at runtime)

| Variable | Value | Notes |
|----------|-------|-------|
| `SUPABASE_URL` | `https://YOUR_PROJECT.supabase.co` | Same URL as above |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Service role key — keep secret |
| `STRIPE_SECRET_KEY` | `sk_live_...` | From Stripe Dashboard (Part 3) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | From Stripe Webhooks (Part 3) |
| `PAYNOW_INTEGRATION_ID` | `12345` | From Paynow Dashboard (Part 4) |
| `PAYNOW_INTEGRATION_KEY` | `abc123...` | From Paynow Dashboard (Part 4) |
| `APP_URL` | `https://YOUR-SITE.netlify.app` | Your Netlify URL |
| `STRIPE_SUCCESS_URL` | `https://YOUR-SITE.netlify.app/payment/return` | After card payment |
| `STRIPE_CANCEL_URL` | `https://YOUR-SITE.netlify.app/payment/cancel` | If card payment cancelled |
| `PAYNOW_RETURN_URL` | `https://YOUR-SITE.netlify.app/payment/return` | After Paynow payment |
| `PAYNOW_RESULT_URL` | `https://YOUR-SITE.netlify.app/api/paynow/callback` | Paynow webhook |
| `EXTERNAL_CREDS_SECRET` | *(generate below)* | AES key for credential vault |

**Generate `EXTERNAL_CREDS_SECRET`** — run this anywhere Node.js is available:
```bash
node -e "console.log(require('crypto').randomBytes(24).toString('base64'))"
```

### Step 2.4 — Deploy

After adding all variables:
1. Click **Deploys → Trigger deploy → Deploy site**
2. Wait for the build to complete (~2 minutes)
3. Click **Open production deploy** to see the site

### Step 2.5 — Verify the API is working

Open in your browser:
```
https://YOUR-SITE.netlify.app/api/health
```

Expected response:
```json
{ "status": "ok", "db": "connected", "db_ms": 45, "version": "1.0.0" }
```

If you see `"status": "degraded"` — check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Netlify.
If you see a 404 — the functions directory wasn't detected; check `netlify.toml` is in the repo root.

---

## PART 3 — Stripe (Card Payments)

### Step 3.1 — Create a Stripe account

Go to **https://stripe.com** → sign up (free, no business registration needed to start).

### Step 3.2 — Get API keys

Stripe Dashboard → **Developers → API keys**:
- Copy the **Publishable key** (`pk_live_...` or `pk_test_...`)
- Click **Reveal** and copy the **Secret key** (`sk_live_...` or `sk_test_...`)

Add to Netlify: `STRIPE_SECRET_KEY` = the secret key

> Start with test keys (`pk_test_` / `sk_test_`) until you're ready to go live.
> You do NOT need to add the publishable key to Netlify — it's only used client-side if you build custom payment forms.

### Step 3.3 — Create a webhook

Stripe Dashboard → **Developers → Webhooks → Add endpoint**:
- **Endpoint URL**: `https://YOUR-SITE.netlify.app/api/stripe/webhook`
- **Events to send**:
  - `checkout.session.completed`
  - `checkout.session.expired`
- Click **Add endpoint**
- Open the endpoint → click **Reveal** on the Signing secret (`whsec_...`)

Add to Netlify: `STRIPE_WEBHOOK_SECRET` = that value, then **redeploy**.

### Step 3.4 — Test card payments

In the payment modal, select Visa/Mastercard and use:
```
Card number:  4242 4242 4242 4242
Expiry:       12/28
CVC:          123
Name:         Any name
```
After payment, your subscription should activate automatically via the webhook.

---

## PART 4 — Paynow (Zimbabwe Mobile Money)

### Step 4.1 — Register a Paynow merchant account

1. Go to **https://www.paynow.co.zw**
2. Register as a merchant (requires a Zimbabwean bank account or mobile money account)
3. Complete identity verification

### Step 4.2 — Create an integration

Paynow merchant dashboard → **Integrations → New Integration**:
- **Name**: `ScanCodeZW`
- **Type**: **Web** (not USSD/Mobile — we use the browser redirect flow)
- **Return URL**: `https://YOUR-SITE.netlify.app/payment/return`
- **Result URL**: `https://YOUR-SITE.netlify.app/api/paynow/callback`
  > This is where Paynow POSTs payment confirmations — must be your live Netlify URL.

Save and note:
- **Integration ID** (a number, e.g. `12345`)
- **Integration Key** (a long hex string)

### Step 4.3 — Add to Netlify

- `PAYNOW_INTEGRATION_ID` = the Integration ID
- `PAYNOW_INTEGRATION_KEY` = the Integration Key

Redeploy after adding these.

---

## PART 5 — First Admin User

### Step 5.1 — Register an account

Go to your live Netlify site → click **Register** → create an account with your email.

Confirm the email if email confirmation is enabled (check your inbox).

### Step 5.2 — Promote yourself to admin

In Supabase Dashboard → **SQL Editor → New query**, run:
```sql
update public.profiles
set user_type = 'admin'
where id = (
  select id from auth.users where email = 'YOUR-EMAIL@example.com'
);
```
Replace `YOUR-EMAIL@example.com` with your actual email, then click **Run**.

### Step 5.3 — Access the Admin Panel

Log into the app → navigate to `/admin`. You should see:
- Dashboard with user count, revenue, barcode stats
- User management (update plans, enterprise config)
- Subscription plan editor
- Support ticket queue
- Live chat management
- External credentials vault (encrypted)

---

## PART 6 — Enable Realtime (Live Chat)

Supabase Realtime powers the live chat widget for instant message delivery.

1. Supabase Dashboard → **Database → Replication**
2. Click the **Tables** tab
3. Toggle **ON** for:
   - `chat_sessions`
   - `chat_messages`
   - `ticket_replies`

---

## PART 7 — Local Development

To develop locally with the functions working:

### Install Netlify CLI (once)
```bash
npm install -g netlify-cli
```

### Link your site
```bash
netlify login
netlify link
```
This links the local project to your Netlify site and pulls environment variables automatically.

### Run the dev server
```bash
npm run dev:netlify
# or
netlify dev
```

This starts:
- Vite dev server (React hot-reload)
- Netlify Functions runtime (handles `/api/*`)
- Everything available at **http://localhost:8888**

> Do not use plain `npm run dev` if you need the API — Vite alone can't serve functions.

### Environment variables locally
Netlify CLI pulls your env vars from Netlify when you run `netlify dev`.
Alternatively, create a `.env.local` file (already in `.gitignore`) with:
```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PAYNOW_INTEGRATION_ID=REPLACE_ME
PAYNOW_INTEGRATION_KEY=REPLACE_ME
APP_URL=http://localhost:8888
EXTERNAL_CREDS_SECRET=any-32-char-string-for-local-dev
```

---

## PART 8 — Testing Checklist

Work through this after completing setup:

### Core
- [ ] `https://YOUR-SITE.netlify.app` — landing page loads
- [ ] `https://YOUR-SITE.netlify.app/api/health` → `{ "status": "ok" }`
- [ ] Register new user account → email confirmation received
- [ ] Login → redirected to `/dashboard`
- [ ] Generate a barcode → PNG downloads
- [ ] Save a product with multiple variations

### Stripe
- [ ] Click **Upgrade** → payment modal appears
- [ ] Select Visa/Mastercard → redirects to Stripe Checkout
- [ ] Use test card `4242 4242 4242 4242` → payment completes
- [ ] Returns to `/payment/return`
- [ ] `subscription_type` updated in Supabase `profiles` table

### Paynow
- [ ] Select EcoCash → redirects to Paynow hosted page
- [ ] (Full testing requires a live Paynow merchant account)

### Admin
- [ ] `/admin` loads after promotion
- [ ] User list shows correct data
- [ ] Ticket queue visible

### Live Chat
- [ ] Chat widget appears (bottom-right corner)
- [ ] Start a session
- [ ] Messages appear in real time

---

## Troubleshooting

### `/api/health` returns 404
Netlify Functions not found. Check:
- `netlify.toml` exists in the repo root with `functions = "api"`
- The `api/` directory is committed and pushed
- Redeploy after pushing

### `/api/health` returns `"status": "degraded"`
Supabase unreachable from the function. Check Netlify env vars:
- `SUPABASE_URL` correct?
- `SUPABASE_SERVICE_ROLE_KEY` pasted in full?
- Redeploy after fixing

### "Database not configured" on login/register
Frontend can't connect to Supabase. Check Netlify env vars:
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` present?
- These are **build-time** vars — after adding them, you must **redeploy** (not just restart)

### Stripe webhook not activating subscriptions
- Confirm `STRIPE_WEBHOOK_SECRET` in Netlify matches the one in Stripe Dashboard
- Check Stripe Dashboard → Webhooks → your endpoint → Recent deliveries
- Make sure the endpoint URL is `https://YOUR-SITE.netlify.app/api/stripe/webhook` (not a Vercel URL)

### User registration fails (trigger error)
The `handle_new_user` trigger may not have run. In Supabase SQL Editor:
```sql
-- Re-run just the trigger (safe to run again)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)));
  return new;
end;
$$;
```

### Emails not arriving
Supabase's shared SMTP has rate limits. For production, add a custom SMTP provider:
Supabase Dashboard → **Authentication → SMTP Settings → Custom SMTP**
Recommended: Resend (free tier), SendGrid, or Mailgun.

---

## Custom Domain

1. Netlify Dashboard → your site → **Domain management → Add custom domain**
2. Add `scancodezw.com` and follow the DNS instructions
3. Netlify provisions SSL automatically (Let's Encrypt)

After adding a domain, update these:
- Supabase → **Authentication → URL Configuration → Site URL** → your domain
- Supabase → **Redirect URLs** → add `https://scancodezw.com/**`
- Netlify env vars: `VITE_APP_URL`, `APP_URL`, `STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL`, `PAYNOW_RETURN_URL`, `PAYNOW_RESULT_URL` — all pointing to your domain
- Paynow integration **Return URL** and **Result URL** → update to your domain
- Stripe webhook endpoint URL → update to your domain

---

## Quick Reference — All Environment Variables

### Netlify (set in Site configuration → Environment variables)

```env
# Frontend (build-time, must have VITE_ prefix)
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
VITE_APP_URL=https://YOUR-SITE.netlify.app

# Functions (runtime)
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
PAYNOW_INTEGRATION_ID=12345
PAYNOW_INTEGRATION_KEY=abc123...
APP_URL=https://YOUR-SITE.netlify.app
STRIPE_SUCCESS_URL=https://YOUR-SITE.netlify.app/payment/return
STRIPE_CANCEL_URL=https://YOUR-SITE.netlify.app/payment/cancel
PAYNOW_RETURN_URL=https://YOUR-SITE.netlify.app/payment/return
PAYNOW_RESULT_URL=https://YOUR-SITE.netlify.app/api/paynow/callback
EXTERNAL_CREDS_SECRET=<32-char-random-string>
```
