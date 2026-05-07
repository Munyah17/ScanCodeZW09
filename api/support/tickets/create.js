/**
 * POST /api/support/tickets/create
 * Creates a support ticket. Can be called by a logged-in user, a guest, or
 * automatically when a chat session times out.
 * Body: { guestName, guestEmail, subject, body, userId?, source?, sessionId? }
 */

import { supabaseAdmin } from '../../_utils/supabase-admin.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    guestName,
    guestEmail,
    subject,
    body,
    userId    = null,
    source    = 'widget',
    sessionId = null,
    priority  = 'normal',
  } = req.body ?? {};

  if (!guestEmail || !subject || !body) {
    return res.status(400).json({ error: 'guestEmail, subject, and body are required.' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('support_tickets')
      .insert({
        user_id:     userId,
        guest_name:  guestName ?? null,
        guest_email: guestEmail,
        subject,
        body,
        source,
        priority,
      })
      .select('id, ticket_number')
      .single();

    if (error) throw error;

    // If converted from a chat session, link the ticket and mark session timed_out
    if (sessionId) {
      await supabaseAdmin
        .from('chat_sessions')
        .update({ ticket_id: data.id, status: 'timed_out', ended_at: new Date().toISOString() })
        .eq('id', sessionId);
    }

    return res.status(200).json({
      success:       true,
      ticketId:      data.id,
      ticketNumber:  data.ticket_number,
    });
  } catch (err) {
    console.error('[tickets/create]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
