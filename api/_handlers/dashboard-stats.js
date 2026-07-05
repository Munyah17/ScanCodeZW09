import { requireAuth }   from '../_utils/require-auth.js';
import { supabaseAdmin } from '../_utils/supabase-admin.js';
import { j }             from '../_utils/response.js';

const VALID_FILTERS = new Set(['all', '12m', '3m', '30d', 'today']);

function getStartDate(filter) {
  const d = new Date();
  if (filter === '12m')   { d.setFullYear(d.getFullYear() - 1); return d; }
  if (filter === '3m')    { d.setMonth(d.getMonth() - 3);       return d; }
  if (filter === '30d')   { d.setDate(d.getDate() - 30);        return d; }
  if (filter === 'today') { d.setHours(0, 0, 0, 0);             return d; }
  const past = new Date(); past.setFullYear(past.getFullYear() - 3); return past;
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'GET') return j({ error: 'Method not allowed' }, 405);

  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const rawFilter = new URL(req.url).searchParams.get('filter') ?? 'all';
  const filter    = VALID_FILTERS.has(rawFilter) ? rawFilter : 'all';
  const start     = getStartDate(filter).toISOString();

  try {
    const [{ data: products }, { data: barcodes }] = await Promise.all([
      supabaseAdmin.from('products').select('created_at')
        .eq('user_id', auth.userId).gte('created_at', start),
      supabaseAdmin.from('variations').select('created_at')
        .eq('user_id', auth.userId).gte('created_at', start),
    ]);

    return j({ products: products ?? [], barcodes: barcodes ?? [] });
  } catch (err) {
    console.error('[dashboard/stats]', err.message);
    return j({ error: 'Internal server error.' }, 500);
  }
};

export const config = { path: '/api/dashboard/stats' };
