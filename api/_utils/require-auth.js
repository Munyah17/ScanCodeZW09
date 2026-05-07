/**
 * Shared middleware: verify the request comes from an authenticated user
 * via Supabase JWT (Authorization: Bearer <token>).
 * Returns { userId, profile } on success, or sends 401 and returns null.
 */

import { supabaseAdmin } from './supabase-admin.js';

export async function requireAuth(req, res) {
  const authHeader = req.headers['authorization'] ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: 'Missing authorization token.' });
    return null;
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    res.status(401).json({ error: 'Invalid or expired token.' });
    return null;
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, username, subscription_type, enterprise_config, user_type')
    .eq('id', user.id)
    .single();

  return { userId: user.id, profile };
}
