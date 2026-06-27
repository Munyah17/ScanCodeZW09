import crypto            from 'crypto';
import { requireAuth }   from '../_utils/require-auth.js';
import { supabaseAdmin } from '../_utils/supabase-admin.js';
import { j }             from '../_utils/response.js';

const ALLOWED_SCOPES = new Set([
  'read:barcodes', 'read:products', 'write:products', 'write:barcodes', 'read:subscription',
]);

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'POST') return j({ error: 'Method not allowed' }, 405);

  const { auth, error } = await requireAuth(req);
  if (error) return error;

  let body;
  try { body = await req.json(); } catch { body = {}; }
  const { name, scopes = [], expiresAt } = body;

  if (!name) return j({ error: 'Key name is required.' }, 400);

  const invalidScopes = scopes.filter(s => !ALLOWED_SCOPES.has(s));
  if (invalidScopes.length) return j({ error: `Invalid scopes: ${invalidScopes.join(', ')}` }, 400);

  const rawKey    = `scz_live_${crypto.randomBytes(32).toString('hex')}`;
  const keyHash   = crypto.createHash('sha256').update(rawKey).digest('hex');
  const keyPrefix = rawKey.slice(0, 12);

  try {
    const { error: dbErr } = await supabaseAdmin.from('api_keys').insert({
      user_id:    auth.userId,
      name,
      key_prefix: keyPrefix,
      key_hash:   keyHash,
      scopes,
      expires_at: expiresAt ?? null,
    });
    if (dbErr) throw dbErr;
    return j({ key: rawKey, prefix: keyPrefix, name, scopes });
  } catch (err) {
    console.error('[keys/generate]', err.message);
    return j({ error: 'Internal server error.' }, 500);
  }
};

export const config = { path: '/api/keys/generate' };
