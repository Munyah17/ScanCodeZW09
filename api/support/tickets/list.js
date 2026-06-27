import { supabaseAdmin } from '../../_utils/supabase-admin.js';
import { j }             from '../../_utils/response.js';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'GET') return j({ error: 'Method not allowed' }, 405);

  // Verify admin
  let isAdmin = false;
  try {
    const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/, '') || null;
    if (token) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) {
        const { data: profile } = await supabaseAdmin.from('profiles').select('user_type').eq('id', user.id).single();
        isAdmin = profile?.user_type === 'admin';
      }
    }
  } catch { /* not authenticated */ }

  if (!isAdmin) return j({ error: 'Admin access required.' }, 403);

  const params = new URL(req.url).searchParams;
  const status   = params.get('status');
  const priority = params.get('priority');
  const limit    = Number(params.get('limit')  ?? 50);
  const offset   = Number(params.get('offset') ?? 0);

  try {
    let query = supabaseAdmin
      .from('support_tickets')
      .select('id, ticket_number, user_id, guest_name, guest_email, subject, status, priority, source, assigned_to, created_at, updated_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status)   query = query.eq('status',   status);
    if (priority) query = query.eq('priority', priority);

    const { data, error } = await query;
    if (error) throw error;
    return j(data);
  } catch (err) {
    console.error('[tickets/list]', err.message);
    return j({ error: 'Internal server error.' }, 500);
  }
};

export const config = { path: '/api/support/tickets/list' };
