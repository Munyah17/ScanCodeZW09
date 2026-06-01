import crypto            from 'crypto';
import { requireAdmin }  from '../_utils/require-admin.js';
import { supabaseAdmin } from '../_utils/supabase-admin.js';
import { j }             from '../_utils/response.js';

const SECRET = process.env.EXTERNAL_CREDS_SECRET ?? 'change-me-in-production-32-bytes!';

function encrypt(plaintext) {
  const iv  = crypto.randomBytes(12);
  const key = crypto.scryptSync(SECRET, 'scz-salt', 32);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });

  const { error } = await requireAdmin(req);
  if (error) return error;

  if (req.method === 'GET') {
    const { data, error: dbErr } = await supabaseAdmin
      .from('external_credentials')
      .select('id, name, provider, credential_type, purpose, active, created_at')
      .order('created_at', { ascending: false });
    if (dbErr) return j({ error: dbErr.message }, 500);
    return j(data);
  }

  let body;
  try { body = await req.json(); } catch { body = {}; }

  if (req.method === 'POST') {
    const { name, provider, credential_type = 'api_key', value, purpose } = body;
    if (!name || !provider || !value) return j({ error: 'name, provider, and value are required.' }, 400);

    const { error: dbErr } = await supabaseAdmin.from('external_credentials').insert({
      name, provider, credential_type, encrypted_value: encrypt(value), purpose,
    });
    if (dbErr) return j({ error: dbErr.message }, 500);
    return j({ success: true });
  }

  if (req.method === 'PATCH') {
    const { id, name, purpose, active, value } = body;
    if (!id) return j({ error: 'id is required.' }, 400);

    const update = { updated_at: new Date().toISOString() };
    if (name    !== undefined) update.name    = name;
    if (purpose !== undefined) update.purpose = purpose;
    if (active  !== undefined) update.active  = active;
    if (value   !== undefined) update.encrypted_value = encrypt(value);

    const { error: dbErr } = await supabaseAdmin.from('external_credentials').update(update).eq('id', id);
    if (dbErr) return j({ error: dbErr.message }, 500);
    return j({ success: true });
  }

  if (req.method === 'DELETE') {
    const { id } = body;
    if (!id) return j({ error: 'id is required.' }, 400);
    const { error: dbErr } = await supabaseAdmin.from('external_credentials').delete().eq('id', id);
    if (dbErr) return j({ error: dbErr.message }, 500);
    return j({ success: true });
  }

  return j({ error: 'Method not allowed' }, 405);
};

export const config = { path: '/api/admin/external-credentials' };
