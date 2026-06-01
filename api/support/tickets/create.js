import { supabaseAdmin } from '../../_utils/supabase-admin.js';
import { j }             from '../../_utils/response.js';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'POST') return j({ error: 'Method not allowed' }, 405);

  let body;
  try { body = await req.json(); } catch { body = {}; }
  const {
    guestName, guestEmail, subject, body: ticketBody,
    userId = null, source = 'widget', sessionId = null, priority = 'normal',
  } = body;

  if (!guestEmail || !subject || !ticketBody) {
    return j({ error: 'guestEmail, subject, and body are required.' }, 400);
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('support_tickets')
      .insert({ user_id: userId, guest_name: guestName ?? null, guest_email: guestEmail, subject, body: ticketBody, source, priority })
      .select('id, ticket_number')
      .single();

    if (error) throw error;

    if (sessionId) {
      await supabaseAdmin
        .from('chat_sessions')
        .update({ ticket_id: data.id, status: 'timed_out', ended_at: new Date().toISOString() })
        .eq('id', sessionId);
    }

    return j({ success: true, ticketId: data.id, ticketNumber: data.ticket_number });
  } catch (err) {
    console.error('[tickets/create]', err.message);
    return j({ error: err.message }, 500);
  }
};

export const config = { path: '/api/support/tickets/create' };
