import { requireAdmin }  from '../_utils/require-admin.js';
import { supabaseAdmin } from '../_utils/supabase-admin.js';
import { j }             from '../_utils/response.js';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'PATCH') return j({ error: 'Method not allowed' }, 405);

  const { auth: admin, error } = await requireAdmin(req);
  if (error) return error;

  const { user_id, subscription_type, user_type, enterprise_config } = await req.json().catch(() => ({}));
  if (!user_id) return j({ error: 'user_id required' }, 400);

  const patch = {};
  if (subscription_type !== undefined) patch.subscription_type = subscription_type;
  if (enterprise_config  !== undefined) patch.enterprise_config  = enterprise_config;
  // Only super_admin may change user_type
  if (user_type !== undefined) {
    if (admin.user_type !== 'super_admin') return j({ error: 'Super admin only.' }, 403);
    patch.user_type = user_type;
  }

  if (Object.keys(patch).length === 0) return j({ error: 'Nothing to update.' }, 400);

  const { error: e } = await supabaseAdmin.from('profiles').update(patch).eq('id', user_id);
  if (e) return j({ error: e.message }, 500);
  return j({ success: true });
};

export const config = { path: '/api/admin/update-user' };
