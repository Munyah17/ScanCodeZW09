import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';

const PLANS = ['free', 'starter', 'business', 'pro', 'enterprise', 'lifetime'];
const fmtDate = (s) => s ? new Date(s).toLocaleDateString() : '-';

export default function SAUsers() {
  const { user } = useAuth();
  const [users,   setUsers]   = useState([]);
  const [search,  setSearch]  = useState('');
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState(null);
  const [editing, setEditing] = useState(null); // { id, subscription_type }
  const [saving,  setSaving]  = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/users', { headers: { Authorization: `Bearer ${user?.token}` } })
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setUsers(d.users ?? []); })
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [user?.token]);

  useEffect(() => { load(); }, [load]);

  const filtered = users.filter(u =>
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    const res = await fetch('/api/admin/update-user', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${user?.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: editing.id, subscription_type: editing.subscription_type }),
    }).then(r => r.json());
    setSaving(false);
    if (res.error) { alert(res.error); return; }
    setEditing(null);
    load();
  };

  if (loading) return <div className="sa-loading">Loading users…</div>;
  if (err)     return <div className="sa-error">{err}</div>;

  return (
    <div className="sa-tab-content">
      <div className="sa-toolbar">
        <input className="sa-search" placeholder="Search by username or email…" value={search} onChange={e => setSearch(e.target.value)} />
        <span className="sa-count">{filtered.length} users</span>
      </div>

      <div className="sa-table-wrap">
        <table className="sa-table">
          <thead>
            <tr><th>Username</th><th>Email</th><th>Plan</th><th>Joined</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id}>
                <td><strong>{u.username}</strong></td>
                <td className="mono">{u.email}</td>
                <td>
                  {editing?.id === u.id ? (
                    <select
                      value={editing.subscription_type ?? ''}
                      onChange={e => setEditing({ ...editing, subscription_type: e.target.value })}
                      className="sa-select-inline"
                    >
                      {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  ) : (
                    <span className={`sa-badge sa-badge-${u.subscription_type ?? 'free'}`}>{u.subscription_type ?? 'free'}</span>
                  )}
                </td>
                <td>{fmtDate(u.created_at)}</td>
                <td>
                  {editing?.id === u.id ? (
                    <>
                      <button className="sa-btn sa-btn-sm sa-btn-primary" onClick={saveEdit} disabled={saving}>{saving ? '…' : 'Save'}</button>
                      <button className="sa-btn sa-btn-sm" onClick={() => setEditing(null)}>Cancel</button>
                    </>
                  ) : (
                    <button className="sa-btn sa-btn-sm" onClick={() => setEditing({ id: u.id, subscription_type: u.subscription_type ?? 'free' })}>
                      Edit Plan
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={5} className="sa-empty">No users found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
