import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';

const ROLES = ['admin','technical_support','clerk','assistant','finance'];
const ROLE_LABELS = { admin: 'Admin', technical_support: 'Tech Support', clerk: 'Clerk', assistant: 'Assistant', finance: 'Finance' };

export default function SAStaff() {
  const { user } = useAuth();
  const [staff,   setStaff]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form,    setForm]    = useState({ email: '', username: '', password: '', role: 'admin' });
  const [saving,  setSaving]  = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/staff', { headers: { Authorization: `Bearer ${user?.token}` } })
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setStaff(d.staff ?? []); })
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [user?.token]);

  useEffect(() => { load(); }, [load]);

  const createStaff = async () => {
    if (!form.email || !form.username || !form.password) { alert('All fields required'); return; }
    setSaving(true);
    const res = await fetch('/api/admin/staff', {
      method: 'POST',
      headers: { Authorization: `Bearer ${user?.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    }).then(r => r.json());
    setSaving(false);
    if (res.error) { alert(res.error); return; }
    setShowAdd(false);
    setForm({ email: '', username: '', password: '', role: 'admin' });
    load();
  };

  const demote = async (id) => {
    if (!confirm('Remove staff status? They will become a regular user.')) return;
    const res = await fetch('/api/admin/staff', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${user?.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: id }),
    }).then(r => r.json());
    if (res.error) { alert(res.error); return; }
    load();
  };

  const changeRole = async (id, role) => {
    const res = await fetch('/api/admin/staff', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${user?.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: id, role }),
    }).then(r => r.json());
    if (res.error) { alert(res.error); return; }
    load();
  };

  if (loading) return <div className="sa-loading">Loading staff…</div>;
  if (err)     return <div className="sa-error">{err}</div>;

  return (
    <div className="sa-tab-content">
      <div className="sa-toolbar">
        <h3 style={{ margin: 0 }}>Staff Accounts ({staff.length})</h3>
        <button className="sa-btn sa-btn-primary" onClick={() => setShowAdd(true)}>
          <i className="fas fa-user-plus"></i> Add Staff
        </button>
      </div>

      {showAdd && (
        <div className="sa-modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="sa-modal" onClick={e => e.stopPropagation()}>
            <h3>Create Staff Account</h3>
            <label>Email</label>
            <input className="sa-input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
            <label>Username</label>
            <input className="sa-input" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="username" />
            <label>Password</label>
            <input className="sa-input" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="password" />
            <label>Role</label>
            <select className="sa-input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
              {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
            <div className="sa-modal-actions">
              <button className="sa-btn sa-btn-primary" onClick={createStaff} disabled={saving}>{saving ? 'Creating…' : 'Create'}</button>
              <button className="sa-btn" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="sa-table-wrap">
        <table className="sa-table">
          <thead>
            <tr><th>Username</th><th>Role</th><th>Joined</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {staff.map(s => (
              <tr key={s.id}>
                <td><strong>{s.username}</strong></td>
                <td>
                  <select
                    className="sa-select-inline"
                    value={s.user_type}
                    onChange={e => changeRole(s.id, e.target.value)}
                  >
                    {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                </td>
                <td>{new Date(s.created_at).toLocaleDateString()}</td>
                <td>
                  <button className="sa-btn sa-btn-sm sa-btn-danger" onClick={() => demote(s.id)}>Remove</button>
                </td>
              </tr>
            ))}
            {staff.length === 0 && <tr><td colSpan={4} className="sa-empty">No staff accounts yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
