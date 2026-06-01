import crypto            from 'crypto';
import { supabaseAdmin } from './supabase-admin.js';
import { j }             from './response.js';

export async function requireApiKey(req, requiredScope = null) {
  // Accept key via X-API-Key header (preferred) or Authorization: Bearer <key>
  const xApiKey = req.headers.get('x-api-key');
  const bearer  = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/, '');
  const rawKey  = xApiKey || (bearer.startsWith('scz_') ? bearer : null);

  if (!rawKey) {
    return { auth: null, error: j({ error: 'Missing API key. Provide it via X-API-Key header.' }, 401) };
  }

  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  const { data: key } = await supabaseAdmin
    .from('api_keys')
    .select('id, user_id, scopes, active, expires_at')
    .eq('key_hash', keyHash)
    .single();

  if (!key)       return { auth: null, error: j({ error: 'Invalid API key.' }, 401) };
  if (!key.active) return { auth: null, error: j({ error: 'This API key has been revoked.' }, 401) };
  if (key.expires_at && new Date(key.expires_at) < new Date()) {
    return { auth: null, error: j({ error: 'This API key has expired.' }, 401) };
  }
  if (requiredScope && !key.scopes.includes(requiredScope)) {
    return { auth: null, error: j({ error: `This key does not have the required scope: ${requiredScope}` }, 403) };
  }

  // Fire-and-forget
  supabaseAdmin.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', key.id).then(() => {});

  return { auth: { userId: key.user_id, keyId: key.id, scopes: key.scopes }, error: null };
}
