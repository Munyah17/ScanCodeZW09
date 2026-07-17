import { requireAdmin }  from '../_utils/require-admin.js';
import { supabaseAdmin } from '../_utils/supabase-admin.js';
import { j }             from '../_utils/response.js';

/**
 * GET /api/admin/statistics
 * Real internal metrics only — signups over time, plan mix, barcode-country
 * distribution, and a login-recency retention proxy from Supabase Auth.
 *
 * Deliberately does NOT fabricate site-visitor/keyword/demographic numbers —
 * this app has no web analytics provider wired up. Those figures require an
 * external analytics platform (see Configurations > Web Analytics); once a
 * tracking ID is set there, this endpoint is the natural place to merge in
 * that provider's API data.
 */
export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'GET') return j({ error: 'Method not allowed' }, 405);

  const { auth: admin, error } = await requireAdmin(req);
  if (error) return error;

  try {
    const [{ data: profiles }, { data: countryRows }, { data: settingsRow }] = await Promise.all([
      supabaseAdmin.from('profiles').select('subscription_type, created_at, user_type').eq('user_type', 'user'),
      supabaseAdmin.from('variations').select('barcode_country').not('barcode_country', 'is', null),
      supabaseAdmin.from('platform_settings').select('key, value').in('key', ['web_analytics_provider', 'web_analytics_tracking_id']),
    ]);

    const now = new Date();
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days.push({ date: d.toISOString().slice(0, 10), signups: 0 });
    }
    for (const p of profiles ?? []) {
      const day = new Date(p.created_at).toISOString().slice(0, 10);
      const slot = days.find(d => d.date === day);
      if (slot) slot.signups += 1;
    }

    const planDist = {};
    for (const p of profiles ?? []) planDist[p.subscription_type ?? 'free'] = (planDist[p.subscription_type ?? 'free'] ?? 0) + 1;

    const countryDist = {};
    for (const r of countryRows ?? []) countryDist[r.barcode_country] = (countryDist[r.barcode_country] ?? 0) + 1;

    // Retention proxy: last_sign_in_at recency from Supabase Auth (real accounts, not fabricated).
    let retention = null;
    try {
      const { data: authList } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      const users = authList?.users ?? [];
      const withSignIn = users.filter(u => u.last_sign_in_at);
      const active7d  = withSignIn.filter(u => now - new Date(u.last_sign_in_at) <= 7  * 24 * 60 * 60 * 1000).length;
      const active30d = withSignIn.filter(u => now - new Date(u.last_sign_in_at) <= 30 * 24 * 60 * 60 * 1000).length;
      retention = {
        total_accounts:    users.length,
        signed_in_ever:    withSignIn.length,
        active_last_7d:    active7d,
        active_last_30d:   active30d,
        active_7d_pct:  users.length ? Math.round((active7d  / users.length) * 1000) / 10 : 0,
        active_30d_pct: users.length ? Math.round((active30d / users.length) * 1000) / 10 : 0,
      };
    } catch (err) {
      console.warn('[Admin statistics] auth.admin.listUsers failed:', err.message);
    }

    const analytics = {};
    for (const s of settingsRow ?? []) analytics[s.key] = s.value;

    return j({
      signup_trend:      days,
      plan_distribution: Object.entries(planDist).map(([name, value]) => ({ name, value })),
      country_distribution: Object.entries(countryDist).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      retention,
      web_analytics: {
        provider:    analytics.web_analytics_provider ?? 'none',
        tracking_id: analytics.web_analytics_tracking_id ?? '',
        connected:   (analytics.web_analytics_provider ?? 'none') !== 'none' && !!analytics.web_analytics_tracking_id,
        note: 'Site visitors, organic traffic, search keywords, and audience demographics require an external web analytics provider (e.g. Plausible or Google Analytics). Configure it in Configurations → Web Analytics to enable those figures here.',
      },
    });
  } catch (err) {
    console.error('[Admin statistics]', err.message);
    return j({ error: 'Internal server error.' }, 500);
  }
};

export const config = { path: '/api/admin/statistics' };
