import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';

const fmtDate = (s) => s ? new Date(s).toLocaleDateString() : '-';

export default function SAApiKeys() {
  const { user }      = useAuth();
  const [keys, setKeys]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr]         = useState(null);
  const [search, setSearch]   = useState('');
  const [revoking, setRevoking] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/all-api-keys', { headers: { Authorization: `Bearer ${user?.token}` } })
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setKeys(d.keys ?? []); })
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [user?.token]);

  useEffect(() => { load(); }, [load]);

  const revoke = async (id) => {
    if (!confirm('Revoke this API key? This cannot be undone.')) return;
    setRevoking(id);
    const res = await fetch('/api/admin/all-api-keys', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${user?.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ key_id: id }),
    }).then(r => r.json());
    setRevoking(null);
    if (res.error) { alert(res.error); return; }
    load();
  };

  const filtered = keys.filter(k =>
    !search ||
    k.name?.toLowerCase().includes(search.toLowerCase()) ||
    k.key_prefix?.toLowerCase().includes(search.toLowerCase()) ||
    k.profiles?.username?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="sa-loading">Loading API keys…</div>;
  if (err)     return <div className="sa-error">{err}</div>;

  return (
    <div className="sa-tab-content">
      <div className="sa-toolbar">
        <h3 style={{ margin: 0 }}>Platform API Keys ({keys.length})</h3>
        <input className="sa-search" placeholder="Search name, prefix, user…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="sa-table-wrap">
        <table className="sa-table">
          <thead>
            <tr><th>Name</th><th>Key Prefix</th><th>Owner</th><th>Scopes</th><th>Requests</th><th>Last Used</th><th>Created</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.map(k => (
              <tr key={k.id}>
                <td><strong>{k.name}</strong></td>
                <td className="mono">{k.key_prefix}…</td>
                <td>{k.profiles?.username ?? '-'}</td>
                <td style={{ fontSize: '0.75rem', color: '#6b7280' }}>{(k.scopes ?? []).join(', ') || 'all'}</td>
                <td>{k.request_count ?? 0}</td>
                <td>{fmtDate(k.last_used_at)}</td>
                <td>{fmtDate(k.created_at)}</td>
                <td>
                  <button
                    className="sa-btn sa-btn-sm sa-btn-danger"
                    onClick={() => revoke(k.id)}
                    disabled={revoking === k.id}
                  >
                    {revoking === k.id ? '…' : 'Revoke'}
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={8} className="sa-empty">No API keys found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
