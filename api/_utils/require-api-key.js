/**
 * Middleware: authenticate a request using an X-API-Key header.
 * Hashes the provided key with SHA-256 and looks it up in the api_keys table.
 * Returns { userId, keyId, scopes } on success, or sends 401/403 and returns null.
 *
 * Usage in API handlers:
 *   const apiAuth = await requireApiKey(req, res, 'read:barcodes');
 *   if (!apiAuth) return;
 */

import crypto            from 'crypto';
import { supabaseAdmin } from './supabase-admin.js';

export async function requireApiKey(req, res, requiredScope = null) {
  const rawKey = req.headers['x-api-key'];

  if (!rawKey) {
    res.status(401).json({ error: 'Missing X-API-Key header.' });
    return null;
  }

  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  const { data: key } = await supabaseAdmin
    .from('api_keys')
    .select('id, user_id, scopes, active, expires_at')
    .eq('key_hash', keyHash)
    .single();

  if (!key) {
    res.status(401).json({ error: 'Invalid API key.' });
    return null;
  }

  if (!key.active) {
    res.status(401).json({ error: 'This API key has been revoked.' });
    return null;
  }

  if (key.expires_at && new Date(key.expires_at) < new Date()) {
    res.status(401).json({ error: 'This API key has expired.' });
    return null;
  }

  if (requiredScope && !key.scopes.includes(requiredScope)) {
    res.status(403).json({ error: `This key does not have the required scope: ${requiredScope}` });
    return null;
  }

  // Update last_used_at (fire-and-forget)
  supabaseAdmin
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', key.id)
    .then(() => {});

  return { userId: key.user_id, keyId: key.id, scopes: key.scopes };
}
