/**
 * GET    /api/dev/keys         â€” list developer API keys
 * POST   /api/dev/keys         â€” create a new key
 * DELETE /api/dev/keys         â€” revoke a key  (body: { keyId })
 */

import crypto            from 'crypto';
import { requireAuth }   from './_utils/require-auth.js';
import { supabaseAdmin } from './_utils/supabase-admin.js';
import { j }             from './_utils/response.js';

const ALLOWED_SCOPES = new Set([
  'barcode:generate', 'barcode:list',
  'qr:generate',
  'products:read',
]);

const DEFAULT_SCOPES = ['barcode:generate', 'barcode:list', 'qr:generate', 'products:read'];
const MAX_KEYS       = 10;

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });

  const { auth, error } = await requireAuth(req);
  if (error) return error;

  // â”€â”€ List â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (req.method === 'GET') {
    const { data: keys } = await supabaseAdmin
      .from('dev_api_keys')
      .select('id, name, key_prefix, environment, scopes, active, rate_limit, last_used_at, created_at')
      .eq('user_id', auth.userId)
      .order('created_at', { ascending: false });

    return j({ keys: keys ?? [] });
  }

  // â”€â”€ Create â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (req.method === 'POST') {
    let body;
    try { body = await req.json(); } catch { body = {}; }
    const { name, environment = 'sandbox', scopes = DEFAULT_SCOPES } = body;

    if (!name?.trim()) return j({ error: 'name is required.' }, 400);
    if (!['sandbox', 'live'].includes(environment)) {
      return j({ error: "environment must be 'sandbox' or 'live'." }, 400);
    }

    const invalid = scopes.filter(s => !ALLOWED_SCOPES.has(s));
    if (invalid.length) return j({ error: `Invalid scopes: ${invalid.join(', ')}` }, 400);

    // Enforce per-user key limit
    const { count } = await supabaseAdmin
      .from('dev_api_keys')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', auth.userId)
      .eq('active', true);

    if ((count ?? 0) >= MAX_KEYS) {
      return j({ error: `Maximum of ${MAX_KEYS} active keys allowed. Revoke unused keys first.` }, 409);
    }

    const prefix = environment === 'sandbox' ? 'scz_test_' : 'scz_live_';
    const rawKey    = `${prefix}${crypto.randomBytes(28).toString('hex')}`;
    const keyHash   = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.slice(0, 12);

    const { error: dbErr } = await supabaseAdmin.from('dev_api_keys').insert({
      user_id:     auth.userId,
      name:        name.trim(),
      key_prefix:  keyPrefix,
      key_hash:    keyHash,
      environment,
      scopes,
    });

    if (dbErr) {
      console.error('[dev/keys POST]', dbErr.message);
      return j({ error: 'Internal server error.' }, 500);
    }

    return j({
      success:     true,
      key:         rawKey,
      prefix:      keyPrefix,
      environment,
      scopes,
      note:        'Store this key securely â€” it will not be shown again.',
    }, 201);
  }

  // â”€â”€ Revoke â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (req.method === 'DELETE') {
    let body;
    try { body = await req.json(); } catch { body = {}; }
    const { keyId } = body;

    if (!keyId) return j({ error: 'keyId is required.' }, 400);

    const { error: dbErr } = await supabaseAdmin
      .from('dev_api_keys')
      .update({ active: false })
      .eq('id', keyId)
      .eq('user_id', auth.userId);

    if (dbErr) return j({ error: 'Internal server error.' }, 500);
    return j({ success: true });
  }

  return j({ error: 'Method not allowed' }, 405);
};

export const config = { path: '/api/dev/keys' };
