/**
 * GET /api/support/tickets/list
 * Admins: returns all tickets with filter/sort params.
 * Users:  returns only their own tickets (by userId query param + JWT check).
 *
 * Query params: status, priority, limit (default 50), offset (default 0)
 */

import { supabaseAdmin } from '../../_utils/supabase-admin.js';
import { requireAdmin }  from '../../_utils/require-admin.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // Try admin auth first
  let isAdmin = false;
  try {
    const authHeader = req.headers['authorization'] ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (token) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) {
        const { data: profile } = await supabaseAdmin
          .from('profiles').select('user_type').eq('id', user.id).single();
        isAdmin = profile?.user_type === 'admin';
      }
    }
  } catch { /* not authenticated */ }

  if (!isAdmin) {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  const { status, priority, limit = 50, offset = 0 } = req.query;

  try {
    let query = supabaseAdmin
      .from('support_tickets')
      .select('id, ticket_number, user_id, guest_name, guest_email, subject, status, priority, source, assigned_to, created_at, updated_at')
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (status)   query = query.eq('status',   status);
    if (priority) query = query.eq('priority', priority);

    const { data, error } = await query;
    if (error) throw error;
    return res.status(200).json(data);
  } catch (err) {
    console.error('[tickets/list]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
