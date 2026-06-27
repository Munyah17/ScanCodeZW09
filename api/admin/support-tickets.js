import { requireAdmin }  from '../_utils/require-admin.js';
import { supabaseAdmin } from '../_utils/supabase-admin.js';
import { j }             from '../_utils/response.js';
import { isValidLength, firstError } from '../_utils/validate.js';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });

  const { auth: admin, error } = await requireAdmin(req);
  if (error) return error;

  if (req.method === 'GET') {
    try {
      const { data, error: dbErr } = await supabaseAdmin
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (dbErr) throw dbErr;
      return j({ tickets: data ?? [] });
    } catch (err) {
      console.error('[Admin support-tickets GET]', err.message);
      return j({ error: 'Internal server error.' }, 500);
    }
  }

  if (req.method === 'POST') {
    let body;
    try { body = await req.json(); } catch { body = {}; }
    const { ticket_id, reply } = body;

    const ticketNum = Number(ticket_id);
    const valErr = firstError([
      { check: Number.isInteger(ticketNum) && ticketNum > 0, msg: 'Invalid ticket_id.' },
      { check: isValidLength(reply, 1, 5000),                msg: 'Reply must be 1–5000 characters.' },
    ]);
    if (valErr) return j({ error: valErr }, 400);

    try {
      const { error: msgErr } = await supabaseAdmin
        .from('ticket_replies')
        .insert({ ticket_id: ticketNum, sender_name: 'Admin', is_agent: true, body: reply.trim() });
      if (msgErr) throw msgErr;

      const { error: ticketErr } = await supabaseAdmin
        .from('support_tickets')
        .update({ status: 'answered', updated_at: new Date().toISOString() })
        .eq('id', ticket_id);
      if (ticketErr) throw ticketErr;

      return j({ success: true });
    } catch (err) {
      console.error('[Admin support-tickets POST]', err.message);
      return j({ error: 'Internal server error.' }, 500);
    }
  }

  return j({ error: 'Method not allowed' }, 405);
};

export const config = { path: '/api/admin/support-tickets' };
