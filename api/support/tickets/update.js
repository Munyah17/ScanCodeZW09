/**
 * PATCH /api/support/tickets/update
 * Updates ticket status, priority, or assignment. Requires admin JWT.
 * Body: { ticketId, status?, priority?, assignedTo? }
 */

import { requireAdmin }  from '../../_utils/require-admin.js';
import { supabaseAdmin } from '../../_utils/supabase-admin.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const { ticketId, status, priority, assignedTo } = req.body ?? {};
  if (!ticketId) return res.status(400).json({ error: 'ticketId is required.' });

  const update = { updated_at: new Date().toISOString() };
  if (status     !== undefined) update.status      = status;
  if (priority   !== undefined) update.priority    = priority;
  if (assignedTo !== undefined) update.assigned_to = assignedTo;
  if (status === 'resolved')    update.resolved_at = new Date().toISOString();

  const { error } = await supabaseAdmin
    .from('support_tickets')
    .update(update)
    .eq('id', ticketId);

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ success: true });
}
