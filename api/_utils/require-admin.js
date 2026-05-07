/**
 * Shared middleware: verify the request comes from an authenticated admin.
 * Reads Authorization: Bearer <supabase-jwt> from the request header.
 * Returns the admin profile on success, or sends a 401/403 and returns null.
 */

import { supabaseAdmin } from './supabase-admin.js';

export async function requireAdmin(req, res) {
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
    .select('id, username, user_type')
    .eq('id', user.id)
    .single();

  if (!profile || profile.user_type !== 'admin') {
    res.status(403).json({ error: 'Admin access required.' });
    return null;
  }

  return profile;
}
