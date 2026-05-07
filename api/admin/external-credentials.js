/**
 * GET    /api/admin/external-credentials  — list all (values never returned)
 * POST   /api/admin/external-credentials  — add new credential
 * PATCH  /api/admin/external-credentials  — update metadata or active flag
 * DELETE /api/admin/external-credentials  — delete by id
 *
 * Values are AES-256-GCM encrypted using EXTERNAL_CREDS_SECRET env var.
 * Requires admin JWT.
 */

import crypto            from 'crypto';
import { requireAdmin }  from '../_utils/require-admin.js';
import { supabaseAdmin } from '../_utils/supabase-admin.js';

const SECRET = process.env.EXTERNAL_CREDS_SECRET ?? 'change-me-in-production-32-bytes!';

function encrypt(plaintext) {
  const iv  = crypto.randomBytes(12);
  const key = crypto.scryptSync(SECRET, 'scz-salt', 32);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

function decrypt(encoded) {
  const buf = Buffer.from(encoded, 'base64');
  const iv  = buf.slice(0, 12);
  const tag = buf.slice(12, 28);
  const encrypted = buf.slice(28);
  const key = crypto.scryptSync(SECRET, 'scz-salt', 32);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('external_credentials')
      .select('id, name, provider, credential_type, purpose, active, created_at')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);  // encrypted_value intentionally omitted
  }

  if (req.method === 'POST') {
    const { name, provider, credential_type = 'api_key', value, purpose } = req.body ?? {};
    if (!name || !provider || !value) {
      return res.status(400).json({ error: 'name, provider, and value are required.' });
    }

    const { error } = await supabaseAdmin.from('external_credentials').insert({
      name,
      provider,
      credential_type,
      encrypted_value: encrypt(value),
      purpose,
    });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  if (req.method === 'PATCH') {
    const { id, name, purpose, active, value } = req.body ?? {};
    if (!id) return res.status(400).json({ error: 'id is required.' });

    const update = { updated_at: new Date().toISOString() };
    if (name    !== undefined) update.name    = name;
    if (purpose !== undefined) update.purpose = purpose;
    if (active  !== undefined) update.active  = active;
    if (value   !== undefined) update.encrypted_value = encrypt(value);

    const { error } = await supabaseAdmin
      .from('external_credentials')
      .update(update)
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  if (req.method === 'DELETE') {
    const { id } = req.body ?? {};
    if (!id) return res.status(400).json({ error: 'id is required.' });

    const { error } = await supabaseAdmin
      .from('external_credentials')
      .delete()
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
