import { requireAdmin }  from '../_utils/require-admin.js';
import { supabaseAdmin } from '../_utils/supabase-admin.js';
import { j }             from '../_utils/response.js';

/**
 * Generic key-value platform config store. Used by both the Configurations
 * tab (label printer defaults, integrations) and the Settings tab
 * (maintenance mode, signup toggle, support contact) — same table, filtered
 * by `category` on read, so there is exactly one place platform config lives.
 */
export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });

  const { auth, error } = await requireAdmin(req);
  if (error) return error;

  if (req.method === 'GET') {
    const url      = new URL(req.url);
    const category = url.searchParams.get('category');

    let query = supabaseAdmin.from('platform_settings').select('key, value, category, updated_at');
    if (category) query = query.eq('category', category);
    const { data, error: dbErr } = await query.order('key', { ascending: true });

    if (dbErr) return j({ error: 'Internal server error.' }, 500);
    return j({ settings: data ?? [] });
  }

  if (req.method === 'PUT') {
    let body;
    try { body = await req.json(); } catch { body = {}; }
    const { settings } = body; // [{ key, value }]
    if (!Array.isArray(settings) || settings.length === 0) {
      return j({ error: 'settings array is required.' }, 400);
    }

    for (const { key, value } of settings) {
      if (!key) continue;
      const { error: dbErr } = await supabaseAdmin
        .from('platform_settings')
        .update({ value, updated_at: new Date().toISOString(), updated_by: auth.id })
        .eq('key', key);
      if (dbErr) return j({ error: `Failed to save "${key}".` }, 500);
    }

    return j({ success: true });
  }

  return j({ error: 'Method not allowed' }, 405);
};

export const config = { path: '/api/admin/platform-settings' };
