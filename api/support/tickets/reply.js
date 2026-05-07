/**
 * POST /api/support/tickets/reply
 * Adds a reply to a support ticket.
 * Body: { ticketId, senderName, body, isAgent?, senderId? }
 */

import { supabaseAdmin } from '../../_utils/supabase-admin.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { ticketId, senderName, body, isAgent = false, senderId } = req.body ?? {};
  if (!ticketId || !body || !senderName) {
    return res.status(400).json({ error: 'ticketId, senderName, and body are required.' });
  }

  try {
    // Verify ticket exists
    const { data: ticket } = await supabaseAdmin
      .from('support_tickets')
      .select('id, status')
      .eq('id', ticketId)
      .single();

    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });
    if (ticket.status === 'closed') {
      return res.status(400).json({ error: 'Cannot reply to a closed ticket.' });
    }

    const { error: replyErr } = await supabaseAdmin.from('ticket_replies').insert({
      ticket_id:   ticketId,
      sender_id:   senderId ?? null,
      sender_name: senderName,
      is_agent:    isAgent,
      body,
    });

    if (replyErr) throw replyErr;

    // Move ticket to in_progress if it was open and this is an agent reply
    if (isAgent && ticket.status === 'open') {
      await supabaseAdmin
        .from('support_tickets')
        .update({ status: 'in_progress', updated_at: new Date().toISOString() })
        .eq('id', ticketId);
    } else {
      await supabaseAdmin
        .from('support_tickets')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', ticketId);
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[tickets/reply]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
