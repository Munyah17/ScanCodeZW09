import { requireAdmin }  from './_utils/require-admin.js';
import { supabaseAdmin } from './_utils/supabase-admin.js';
import { j }             from './_utils/response.js';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'PATCH') return j({ error: 'Method not allowed' }, 405);

  const { error } = await requireAdmin(req);
  if (error) return error;

  let body;
  try { body = await req.json(); } catch { body = {}; }
  const { ticketId, status, priority, assignedTo } = body;
  if (!ticketId) return j({ error: 'ticketId is required.' }, 400);

  const update = { updated_at: new Date().toISOString() };
  if (status     !== undefined) update.status      = status;
  if (priority   !== undefined) update.priority    = priority;
  if (assignedTo !== undefined) update.assigned_to = assignedTo;
  if (status === 'resolved')    update.resolved_at = new Date().toISOString();

  const { error: dbErr } = await supabaseAdmin.from('support_tickets').update(update).eq('id', ticketId);
  if (dbErr) return j({ error: 'Internal server error.' }, 500);
  return j({ success: true });
};

export const config = { path: '/api/support/tickets/update' };
