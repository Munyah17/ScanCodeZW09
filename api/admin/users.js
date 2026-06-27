import { requireAdmin }  from '../_utils/require-admin.js';
import { supabaseAdmin } from '../_utils/supabase-admin.js';
import { j }             from '../_utils/response.js';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });

  const { auth: admin, error } = await requireAdmin(req);
  if (error) return error;

  if (req.method === 'GET') {
    try {
      const { data: profiles, error: dbErr } = await supabaseAdmin
        .from('profiles')
        .select('id, username, subscription_type, subscription_end_date, enterprise_config, admin_notes, user_type, created_at')
        .order('created_at', { ascending: false });

      if (dbErr) throw dbErr;

      const userIds = profiles.map(p => p.id);

      const [productRows, barcodeRows, authUserList] = await Promise.all([
        userIds.length
          ? supabaseAdmin.from('products').select('user_id').in('user_id', userIds).then(r => r.data ?? [])
          : Promise.resolve([]),
        userIds.length
          ? supabaseAdmin.from('variations').select('user_id').in('user_id', userIds).then(r => r.data ?? [])
          : Promise.resolve([]),
        supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }).then(r => r.data?.users ?? []),
      ]);

      const productMap = {};
      const barcodeMap = {};
      const emailMap   = {};
      for (const r of productRows)  productMap[r.user_id] = (productMap[r.user_id] ?? 0) + 1;
      for (const r of barcodeRows)  barcodeMap[r.user_id] = (barcodeMap[r.user_id] ?? 0) + 1;
      for (const u of authUserList) emailMap[u.id]        = u.email;

      return j(profiles.map(p => ({
        ...p,
        email:         emailMap[p.id]   ?? '',
        product_count: productMap[p.id] ?? 0,
        barcode_count: barcodeMap[p.id] ?? 0,
      })));
    } catch (err) {
      console.error('[Admin users GET]', err.message);
      return j({ error: 'Internal server error.' }, 500);
    }
  }

  if (req.method === 'PATCH') {
    let body;
    try { body = await req.json(); } catch { body = {}; }
    const { userId, subscription_type, subscription_end_date, enterprise_config, admin_notes, user_type } = body;

    if (!userId) return j({ error: 'userId is required.' }, 400);

    if (user_type !== undefined && admin.user_type !== 'super_admin') {
      return j({ error: 'Super admin only.' }, 403);
    }

    const validPlans = ['free', 'starter', 'business', 'pro', 'enterprise', 'lifetime', 'custom'];
    if (subscription_type && !validPlans.includes(subscription_type)) {
      return j({ error: `Invalid plan: "${subscription_type}"` }, 400);
    }

    const validRoles = ['user', 'admin', 'technical_support', 'clerk', 'assistant', 'finance', 'super_admin'];
    if (user_type && !validRoles.includes(user_type)) {
      return j({ error: `Invalid role: "${user_type}"` }, 400);
    }

    try {
      const update = { updated_at: new Date().toISOString(), override_by: admin.id };
      if (subscription_type     !== undefined) update.subscription_type     = subscription_type;
      if (subscription_end_date !== undefined) update.subscription_end_date = subscription_end_date || null;
      if (enterprise_config     !== undefined) update.enterprise_config     = enterprise_config;
      if (admin_notes           !== undefined) update.admin_notes           = admin_notes;
      if (user_type             !== undefined) update.user_type             = user_type;

      const { error: dbErr } = await supabaseAdmin.from('profiles').update(update).eq('id', userId);
      if (dbErr) throw dbErr;
      return j({ success: true });
    } catch (err) {
      console.error('[Admin users PATCH]', err.message);
      return j({ error: 'Internal server error.' }, 500);
    }
  }

  if (req.method === 'DELETE') {
    if (admin.user_type !== 'super_admin') return j({ error: 'Super admin only.' }, 403);
    let body;
    try { body = await req.json(); } catch { body = {}; }
    const { userId } = body;
    if (!userId) return j({ error: 'userId is required.' }, 400);
    try {
      const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (authErr) throw authErr;
      return j({ success: true });
    } catch (err) {
      console.error('[Admin users DELETE]', err.message);
      return j({ error: 'Internal server error.' }, 500);
    }
  }

  return j({ error: 'Method not allowed' }, 405);
};

export const config = { path: '/api/admin/users' };
