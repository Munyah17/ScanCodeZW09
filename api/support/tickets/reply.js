import { supabaseAdmin } from '../../_utils/supabase-admin.js';
import { j }             from '../../_utils/response.js';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'POST') return j({ error: 'Method not allowed' }, 405);

  let body;
  try { body = await req.json(); } catch { body = {}; }
  const { ticketId, senderName, body: replyBody, isAgent = false, senderId } = body;
  if (!ticketId || !replyBody || !senderName) {
    return j({ error: 'ticketId, senderName, and body are required.' }, 400);
  }

  try {
    const { data: ticket } = await supabaseAdmin
      .from('support_tickets')
      .select('id, status')
      .eq('id', ticketId)
      .single();

    if (!ticket) return j({ error: 'Ticket not found.' }, 404);
    if (ticket.status === 'closed') return j({ error: 'Cannot reply to a closed ticket.' }, 400);

    const { error: replyErr } = await supabaseAdmin.from('ticket_replies').insert({
      ticket_id: ticketId, sender_id: senderId ?? null, sender_name: senderName, is_agent: isAgent, body: replyBody,
    });
    if (replyErr) throw replyErr;

    await supabaseAdmin.from('support_tickets').update({
      status:     (isAgent && ticket.status === 'open') ? 'in_progress' : ticket.status,
      updated_at: new Date().toISOString(),
    }).eq('id', ticketId);

    return j({ success: true });
  } catch (err) {
    console.error('[tickets/reply]', err.message);
    return j({ error: err.message }, 500);
  }
};

export const config = { path: '/api/support/tickets/reply' };
