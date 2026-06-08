# Codebase Inefficiencies

## Critical (causes bugs)

**`SA*.jsx` used `user?.token`** — AuthContext exposes `user.accessToken`, not `user.token`. Every fetch call sent `Authorization: Bearer undefined`, causing 401 failures on all super admin API endpoints. Fixed by deleting SA* components and moving functionality into AdminPage using supabase client directly.

---

## Performance

**`AuthContext.jsx:52` — hydrateUser fires on every token refresh**
Supabase auto-refreshes the JWT every ~50 minutes. `onAuthStateChange` fires on every refresh, triggering a `profiles` DB query every time even though nothing changed. Should check `event === 'SIGNED_IN'` or compare `session.user.id` before re-querying.

**`AdminPage.jsx:UsersTab` — `select('*')` on profiles**
Fetches all columns including the potentially large `enterprise_config` JSON blob. Should use an explicit column list: `select('id, username, user_type, subscription_type, subscription_end_date, created_at')`.

**`Dashboard.jsx` admin mode — fetches ALL profiles for MRR**
`supabase.from('profiles').select('subscription_type, subscription_end_date, created_at')` has no `.limit()`. Acceptable at current user count but grows O(n). Replace with a Supabase RPC that returns pre-aggregated MRR and counts when user count exceeds ~1000.

**`AdminPage.jsx:RevenueTab` — full client-side fetch with hard limit**
Fetches the last 200 payment rows and sums them in the browser. As transaction volume grows, replace with a Supabase RPC that returns pre-aggregated totals so only summary numbers cross the wire.

**`AdminPage.jsx:AnalyticsTab` — linear scan on every render**
After fetch, monthly aggregation does two nested loops over potentially thousands of rows on the main thread. This is fine at current scale but should move to a server-side RPC (`DATE_TRUNC + GROUP BY`) if user/payment counts exceed a few thousand.

**`AdminPage.jsx:SupportTab` — no pagination**
Previously had no `.limit()` — now limited to 100. Still a full-table scan server-side. Add a status filter default (`status != 'closed'`) to keep the default result set small.

---

## Architecture

**`api/admin/analytics.js` and `api/admin/revenue.js` aggregate in Node**
Both endpoints fetch all rows from `profiles`/`payments` and aggregate in JavaScript. For large tables this is O(n) memory in the function. Replace with Supabase RPC functions using `DATE_TRUNC('month', created_at)` + `GROUP BY` — returns only 12 rows regardless of dataset size. These endpoints are deployed but currently unused (AdminPage uses supabase client directly).

**`DashLayout.jsx:buildNav` — no memoisation**
`buildNav(user)` runs on every render of DashSidebar. Currently cheap (pure computation), but worth a `useMemo` if the nav item list grows further.

**Duplicate admin data-fetching paths**
`api/admin/revenue.js`, `api/admin/analytics.js`, `api/admin/all-api-keys.js`, `api/admin/staff.js`, `api/admin/update-user.js` duplicate what AdminPage now does via supabase client. The API endpoints are only needed if a server-side aggregation or service-role operation is required (e.g. creating new users). Consider removing the redundant ones to reduce surface area.
