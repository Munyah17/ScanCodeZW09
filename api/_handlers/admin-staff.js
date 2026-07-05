import { requireAdmin }  from '../_utils/require-admin.js';
import { supabaseAdmin } from '../_utils/supabase-admin.js';
import { j }             from '../_utils/response.js';

const STAFF_ROLES = ['admin', 'technical_support', 'clerk', 'assistant', 'finance'];

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });

  const { auth: admin, error } = await requireAdmin(req);
  if (error) return error;

  // List staff
  if (req.method === 'GET') {
    const { data, error: e } = await supabaseAdmin
      .from('profiles')
      .select('id, username, user_type, created_at, subscription_type')
      .in('user_type', STAFF_ROLES)
      .order('created_at', { ascending: false });
    if (e) return j({ error: 'Internal server error.' }, 500);
    return j({ staff: data ?? [] });
  }

  // Create staff account â€” only super_admin can do this
  if (req.method === 'POST') {
    if (admin.user_type !== 'super_admin') return j({ error: 'Super admin only.' }, 403);
    const { email, username, password, role } = await req.json().catch(() => ({}));
    if (!email || !username || !password || !role) return j({ error: 'email, username, password, role required' }, 400);
    if (!STAFF_ROLES.includes(role)) return j({ error: 'Invalid role' }, 400);

    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email, password, email_confirm: true,
    });
    if (createErr) return j({ error: 'Internal server error.' }, 500);

    const { error: profileErr } = await supabaseAdmin
      .from('profiles')
      .update({ username, user_type: role })
      .eq('id', newUser.user.id);
    if (profileErr) return j({ error: 'Internal server error.' }, 500);

    return j({ success: true, id: newUser.user.id });
  }

  // Update staff role
  if (req.method === 'PATCH') {
    if (admin.user_type !== 'super_admin') return j({ error: 'Super admin only.' }, 403);
    const { user_id, role } = await req.json().catch(() => ({}));
    if (!user_id || !role) return j({ error: 'user_id and role required' }, 400);
    if (!STAFF_ROLES.includes(role)) return j({ error: 'Invalid role' }, 400);
    const { error: e } = await supabaseAdmin.from('profiles').update({ user_type: role }).eq('id', user_id);
    if (e) return j({ error: 'Internal server error.' }, 500);
    return j({ success: true });
  }

  // Remove staff (demote to user)
  if (req.method === 'DELETE') {
    if (admin.user_type !== 'super_admin') return j({ error: 'Super admin only.' }, 403);
    const { user_id } = await req.json().catch(() => ({}));
    if (!user_id) return j({ error: 'user_id required' }, 400);
    const { error: e } = await supabaseAdmin.from('profiles').update({ user_type: 'user' }).eq('id', user_id);
    if (e) return j({ error: 'Internal server error.' }, 500);
    return j({ success: true });
  }

  return j({ error: 'Method not allowed' }, 405);
};

export const config = { path: '/api/admin/staff' };
