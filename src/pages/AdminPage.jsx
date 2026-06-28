import { useState, useEffect } from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DashLayout from '../components/DashLayout';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDate  = d => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtMoney = n => `$${Number(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PLAN_COLOR   = { starter: 'dp-badge-gray', business: 'dp-badge-blue', pro: 'dp-badge-purple', enterprise: 'dp-badge-yellow', lifetime: 'dp-badge-green' };
const STATUS_COLOR = { paid: 'dp-badge-green', pending: 'dp-badge-yellow', failed: 'dp-badge-red', cancelled: 'dp-badge-red' };
const PIE_COLORS   = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#ec4899'];
const STAFF_ROLES  = ['admin','technical_support','clerk','assistant','finance'];
const SUPER_ADMIN_EMAIL = 'munyamuzvidziwa19@gmail.com';

const CHART_TOOLTIP = { background: '#1f2937', border: '1px solid #374151', borderRadius: 8 };
const CHART_LABEL   = { color: '#f9fafb' };

// ── Tab: Users ────────────────────────────────────────────────────────────────
const EMPTY_ENT_CONFIG = { max_products: '', max_variations_per_product: '', unlimited_products: false, unlimited_variations: false };

function EnterpriseConfigEditor({ userId, existing, token, onSaved, onCancel }) {
  const [cfg, setCfg] = useState(() => {
    const e = existing ?? {};
    return {
      max_products:              e.max_products            === null ? '' : (e.max_products ?? ''),
      max_variations_per_product: e.max_variations_per_product === null ? '' : (e.max_variations_per_product ?? ''),
      unlimited_products:        e.max_products            === null,
      unlimited_variations:      e.max_variations_per_product === null,
    };
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const enterprise_config = {
      max_products:             cfg.unlimited_products   ? null : (parseInt(cfg.max_products, 10)              || null),
      max_variations_per_product: cfg.unlimited_variations ? null : (parseInt(cfg.max_variations_per_product, 10) || null),
    };
    const res  = await fetch('/api/admin/users', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify({ userId, subscription_type: 'enterprise', enterprise_config }),
    });
    setSaving(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { alert(data.error || 'Failed to save.'); return; }
    onSaved();
  };

  const row = (label, field, unlimitedField) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.6rem' }}>
      <span style={{ minWidth: 200, fontSize: '0.85rem', color: '#9ca3af' }}>{label}</span>
      {cfg[unlimitedField] ? (
        <span className="dp-badge dp-badge-green" style={{ fontSize: '0.78rem' }}>Unlimited</span>
      ) : (
        <input
          type="number" min="0" className="dp-input" style={{ width: 100, padding: '0.3rem 0.5rem', fontSize: '0.85rem' }}
          value={cfg[field]}
          onChange={e => setCfg(c => ({ ...c, [field]: e.target.value }))}
        />
      )}
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: '#6b7280', cursor: 'pointer' }}>
        <input type="checkbox" checked={cfg[unlimitedField]} onChange={e => setCfg(c => ({ ...c, [unlimitedField]: e.target.checked }))} />
        Unlimited
      </label>
    </div>
  );

  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e3a8a', borderRadius: 10, padding: '1rem', marginTop: '0.5rem' }}>
      <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#93c5fd', marginBottom: '0.75rem' }}>Enterprise Config</p>
      {row('Max products', 'max_products', 'unlimited_products')}
      {row('Max variations/product', 'max_variations_per_product', 'unlimited_variations')}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
        <button className="dp-btn dp-btn-primary dp-btn-sm" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save Enterprise'}
        </button>
        <button className="dp-btn dp-btn-ghost dp-btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function UsersTab({ token, isSuperAdmin, clientsOnly }) {
  const [users,      setUsers]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [msg,        setMsg]        = useState('');
  const [err,        setErr]        = useState('');
  const [editId,     setEditId]     = useState(null);
  const [entEditId,  setEntEditId]  = useState(null);

  const loadUsers = async () => {
    setLoading(true);
    const res  = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json().catch(() => []);
    const all  = Array.isArray(data) ? data : [];
    setUsers(clientsOnly ? all.filter(u => u.user_type === 'user') : all);
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  const updatePlan = async (userId, plan) => {
    if (plan === 'enterprise') { setEditId(null); setEntEditId(userId); return; }
    const res  = await fetch('/api/admin/users', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify({ userId, subscription_type: plan }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setErr(data.error || 'Failed to update plan.'); return; }
    setMsg('Plan updated.'); setEditId(null); loadUsers();
  };

  const updateRole = async (userId, userType) => {
    const u = users.find(u => u.id === userId);
    if (u?.email === SUPER_ADMIN_EMAIL) { setErr('Super Admin role cannot be changed.'); return; }
    const res  = await fetch('/api/admin/users', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify({ userId, user_type: userType }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setErr(data.error || 'Failed to update role.'); return; }
    setMsg('Role updated.'); loadUsers();
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('Permanently delete this account? This cannot be undone.')) return;
    const res  = await fetch('/api/admin/users', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify({ userId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setErr(data.error || 'Failed to delete account.'); return; }
    setMsg('Account deleted.'); loadUsers();
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return (!search || (u.username ?? '').toLowerCase().includes(q))
        && (!planFilter || u.subscription_type === planFilter);
  });

  return (
    <>
      <div className="dp-filterbar">
        <input className="dp-input" style={{ maxWidth: 240 }} placeholder="Search by username…" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="dp-select" style={{ maxWidth: 140 }} value={planFilter} onChange={e => setPlanFilter(e.target.value)}>
          <option value="">All plans</option>
          {['starter','business','pro','enterprise','lifetime'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <span className="dp-filterbar-count">{filtered.length} account{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {msg && <div className="dp-alert dp-alert-success" onClick={() => setMsg('')} style={{ cursor: 'pointer' }}>{msg} ✕</div>}
      {err && <div className="dp-alert dp-alert-error"  onClick={() => setErr('')} style={{ cursor: 'pointer' }}>{err} ✕</div>}

      <div className="dp-section">
        {loading ? (
          <div className="dp-loading"><div className="dp-spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="dp-empty"><p>No accounts found.</p></div>
        ) : (
          <div className="dp-table-wrap">
            <table className="dp-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Plan</th>
                  {isSuperAdmin && <th>Role</th>}
                  <th>Subscription Expires</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id}>
                    <td style={{ color: '#f0f0f0', fontWeight: 500 }}>{u.username}</td>
                    <td>
                      {editId === u.id ? (
                        <select
                          className="dp-select"
                          style={{ maxWidth: 120, padding: '0.25rem 0.5rem', fontSize: '0.78rem' }}
                          defaultValue={u.subscription_type}
                          onChange={e => updatePlan(u.id, e.target.value)}
                        >
                          {['starter','business','pro','enterprise','lifetime'].map(p => (
                            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`dp-badge ${PLAN_COLOR[u.subscription_type] ?? 'dp-badge-gray'}`}>
                          {u.subscription_type ?? 'none'}
                        </span>
                      )}
                    </td>
                    {isSuperAdmin && (
                      <td>
                        <select
                          className="dp-select"
                          style={{ maxWidth: 130, padding: '0.25rem 0.5rem', fontSize: '0.78rem' }}
                          value={u.user_type}
                          onChange={e => updateRole(u.id, e.target.value)}
                        >
                          <option value="user">Client / User</option>
                          <option value="admin">Admin</option>
                          <option value="technical_support">Technical Support</option>
                          <option value="clerk">Clerk</option>
                          <option value="assistant">Assistant</option>
                          <option value="finance">Finance</option>
                          <option value="super_admin">Super Admin</option>
                        </select>
                      </td>
                    )}
                    <td style={{ color: '#6b7280' }}>
                      {u.subscription_end_date ? fmtDate(u.subscription_end_date) : <span style={{ color: '#374151' }}>—</span>}
                    </td>
                    <td style={{ color: '#6b7280' }}>{fmtDate(u.created_at)}</td>
                    <td>
                      <div className="dp-row-actions">
                        <button
                          className="dp-btn dp-btn-ghost dp-btn-sm"
                          onClick={() => { setEditId(editId === u.id ? null : u.id); setEntEditId(null); }}
                        >
                          {editId === u.id ? 'Done' : 'Edit Plan'}
                        </button>
                        {u.subscription_type === 'enterprise' && (
                          <button
                            className="dp-btn dp-btn-ghost dp-btn-sm"
                            style={{ color: '#93c5fd', borderColor: '#1e3a8a' }}
                            onClick={() => { setEntEditId(entEditId === u.id ? null : u.id); setEditId(null); }}
                          >
                            {entEditId === u.id ? 'Close' : 'Ent. Config'}
                          </button>
                        )}
                        {isSuperAdmin && (
                          <button className="dp-btn dp-btn-danger dp-btn-sm" onClick={() => deleteUser(u.id)}>
                            Delete
                          </button>
                        )}
                      </div>
                      {entEditId === u.id && (
                        <EnterpriseConfigEditor
                          userId={u.id}
                          existing={u.enterprise_config}
                          token={token}
                          onSaved={() => { setEntEditId(null); setMsg('Enterprise config saved.'); loadUsers(); }}
                          onCancel={() => setEntEditId(null)}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

// ── Tab: Staff ────────────────────────────────────────────────────────────────
function StaffTab({ token }) {
  const [staff,   setStaff]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState('');
  const [msg,     setMsg]     = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form,    setForm]    = useState({ email: '', username: '', password: '', role: 'admin' });
  const [saving,  setSaving]  = useState(false);

  const loadStaff = async () => {
    setLoading(true);
    const res  = await fetch('/api/admin/staff', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json().catch(() => ({}));
    setStaff(data.staff ?? []);
    setLoading(false);
  };

  useEffect(() => { loadStaff(); }, []);

  const createStaff = async () => {
    if (!form.email || !form.username || !form.password) { setErr('All fields required.'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      }).then(r => r.json());
      if (res.error) { setErr(res.error); return; }
      setMsg('Staff account created.'); setShowAdd(false);
      setForm({ email: '', username: '', password: '', role: 'admin' });
      loadStaff();
    } finally { setSaving(false); }
  };

  const changeRole = async (id, role) => {
    const res  = await fetch('/api/admin/staff', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify({ user_id: id, role }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setErr(data.error || 'Failed to change role.'); return; }
    loadStaff();
  };

  const demote = async (id) => {
    if (!window.confirm('Remove staff status? They become a regular user.')) return;
    const res  = await fetch('/api/admin/staff', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify({ user_id: id }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setErr(data.error || 'Failed to remove staff.'); return; }
    setMsg('Staff member demoted.'); loadStaff();
  };

  return (
    <>
      {msg && <div className="dp-alert dp-alert-success" onClick={() => setMsg('')} style={{ cursor: 'pointer' }}>{msg} ✕</div>}
      {err && <div className="dp-alert dp-alert-error"  onClick={() => setErr('')} style={{ cursor: 'pointer' }}>{err} ✕</div>}

      <div className="dp-section">
        <div className="dp-section-header">
          <p className="dp-section-title">Staff Accounts ({staff.length})</p>
          <button className="dp-btn dp-btn-primary dp-btn-sm" onClick={() => setShowAdd(v => !v)}>
            {showAdd ? 'Cancel' : '+ Add Staff'}
          </button>
        </div>

        {showAdd && (
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '1.25rem', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="dp-2col">
              <div className="dp-form-row">
                <label className="dp-label">Email</label>
                <input className="dp-input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
              </div>
              <div className="dp-form-row">
                <label className="dp-label">Username</label>
                <input className="dp-input" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="username" />
              </div>
            </div>
            <div className="dp-2col">
              <div className="dp-form-row">
                <label className="dp-label">Temporary Password</label>
                <input className="dp-input" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
              </div>
              <div className="dp-form-row">
                <label className="dp-label">Role</label>
                <select className="dp-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  {STAFF_ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
            </div>
            <button className="dp-btn dp-btn-primary" onClick={createStaff} disabled={saving} style={{ marginTop: '0.5rem' }}>
              {saving ? 'Creating…' : 'Create Staff Account'}
            </button>
          </div>
        )}

        {loading ? (
          <div className="dp-loading"><div className="dp-spinner" /></div>
        ) : staff.length === 0 ? (
          <div className="dp-empty"><p>No staff accounts yet.</p></div>
        ) : (
          <div className="dp-table-wrap">
            <table className="dp-table">
              <thead>
                <tr><th>Username</th><th>Role</th><th>Joined</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {staff.map(s => (
                  <tr key={s.id}>
                    <td style={{ color: '#f0f0f0', fontWeight: 500 }}>{s.username}</td>
                    <td>
                      <select
                        className="dp-select"
                        style={{ maxWidth: 160, padding: '0.25rem 0.5rem', fontSize: '0.78rem' }}
                        value={s.user_type}
                        onChange={e => changeRole(s.id, e.target.value)}
                      >
                        {STAFF_ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                      </select>
                    </td>
                    <td style={{ color: '#6b7280' }}>{fmtDate(s.created_at)}</td>
                    <td>
                      <button className="dp-btn dp-btn-danger dp-btn-sm" onClick={() => demote(s.id)}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

// ── Tab: Analytics ────────────────────────────────────────────────────────────
function AnalyticsTab({ token }) {
  const [analytics, setAnalytics] = useState(null);
  const [revenue,   setRevenue]   = useState(null);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch('/api/admin/analytics', { headers }).then(r => r.json()).catch(() => null),
      fetch('/api/admin/revenue',   { headers }).then(r => r.json()).catch(() => null),
    ]).then(([a, r]) => { setAnalytics(a); setRevenue(r); setLoading(false); });
  }, []);

  if (loading) return <div className="dp-loading"><div className="dp-spinner" /></div>;
  if (!analytics || !revenue) return <div className="dp-alert dp-alert-error">Failed to load analytics.</div>;

  const monthSlots = (analytics.monthly_trend ?? []).map((slot, i) => ({
    label:   slot.label,
    users:   slot.new_users ?? 0,
    revenue: Math.round(((revenue.monthly_trend ?? [])[i]
      ? ((revenue.monthly_trend[i].stripe ?? 0) + (revenue.monthly_trend[i].paynow ?? 0))
      : 0) * 100) / 100,
  }));

  const subDist    = analytics.subscription_dist ?? [];
  const methodDist = [
    { name: 'stripe', value: Math.round((revenue.stripe_total ?? 0) * 100) / 100 },
    { name: 'paynow', value: Math.round((revenue.paynow_total  ?? 0) * 100) / 100 },
  ].filter(d => d.value > 0);

  const paidTxCount = (revenue.transactions ?? []).filter(t => t.status === 'paid').length;

  return (
    <>
      <div className="dp-stat-row">
        <div className="dp-stat"><div className="dp-stat-label">Total Users</div><div className="dp-stat-value">{analytics.total_users ?? 0}</div></div>
        <div className="dp-stat"><div className="dp-stat-label">Total Revenue</div><div className="dp-stat-value">{fmtMoney(revenue.total ?? 0)}</div></div>
        <div className="dp-stat"><div className="dp-stat-label">Paid Transactions</div><div className="dp-stat-value">{paidTxCount}</div></div>
      </div>

      <div className="dp-section">
        <div className="dp-section-header"><p className="dp-section-title">User Growth (12 months)</p></div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthSlots}>
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} />
            <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} allowDecimals={false} />
            <Tooltip contentStyle={CHART_TOOLTIP} labelStyle={CHART_LABEL} />
            <Bar dataKey="users" name="New Users" fill="rgba(59,130,246,0.75)" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="dp-section">
        <div className="dp-section-header"><p className="dp-section-title">Monthly Revenue (12 months)</p></div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={monthSlots}>
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} />
            <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={v => `$${v}`} />
            <Tooltip contentStyle={CHART_TOOLTIP} labelStyle={CHART_LABEL} formatter={v => [fmtMoney(v), 'Revenue']} />
            <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#34d399" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="dp-2col">
        <div className="dp-section" style={{ marginBottom: 0 }}>
          <div className="dp-section-header"><p className="dp-section-title">Subscription Mix</p></div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={subDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                {subDist.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="dp-section" style={{ marginBottom: 0 }}>
          <div className="dp-section-header"><p className="dp-section-title">Revenue by Gateway</p></div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={methodDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                {methodDist.map((_, i) => <Cell key={i} fill={PIE_COLORS[(i + 2) % PIE_COLORS.length]} />)}
              </Pie>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}

// ── Tab: Revenue ──────────────────────────────────────────────────────────────
function RevenueTab({ token }) {
  const [payments, setPayments] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    fetch('/api/admin/revenue', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).catch(() => ({}))
      .then(data => { setPayments(data.transactions ?? []); setLoading(false); });
  }, []);

  const paid    = payments.filter(p => p.status === 'paid');
  const pending = payments.filter(p => p.status === 'pending');

  return (
    <>
      <div className="dp-stat-row">
        <div className="dp-stat"><div className="dp-stat-label">Total Revenue</div><div className="dp-stat-value">{fmtMoney(paid.reduce((s, p) => s + Number(p.amount_usd ?? 0), 0))}</div></div>
        <div className="dp-stat"><div className="dp-stat-label">Paid Transactions</div><div className="dp-stat-value">{paid.length}</div></div>
        <div className="dp-stat"><div className="dp-stat-label">Pending</div><div className="dp-stat-value">{pending.length}</div></div>
      </div>
      <div className="dp-section">
        <div className="dp-section-header"><p className="dp-section-title">All Transactions</p></div>
        {loading ? (
          <div className="dp-loading"><div className="dp-spinner" /></div>
        ) : payments.length === 0 ? (
          <div className="dp-empty"><p>No transactions yet.</p></div>
        ) : (
          <div className="dp-table-wrap">
            <table className="dp-table">
              <thead>
                <tr><th>Reference</th><th>Plan</th><th>Amount</th><th>Method</th><th>Status</th><th>Date</th></tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id}>
                    <td><code>{p.reference}</code></td>
                    <td><span className={`dp-badge ${PLAN_COLOR[p.plan] ?? 'dp-badge-gray'}`}>{p.plan}</span></td>
                    <td style={{ color: '#f0f0f0', fontWeight: 600 }}>{fmtMoney(p.amount_usd)}</td>
                    <td style={{ color: '#9ca3af', textTransform: 'capitalize' }}>{p.method}</td>
                    <td><span className={`dp-badge ${STATUS_COLOR[p.status] ?? 'dp-badge-gray'}`}>{p.status}</span></td>
                    <td style={{ color: '#6b7280' }}>{fmtDate(p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

// ── Tab: Support ──────────────────────────────────────────────────────────────
function SupportTab({ token }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active,  setActive]  = useState(null);
  const [reply,   setReply]   = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch('/api/admin/support-tickets', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).catch(() => ({}))
      .then(data => { setTickets(data.tickets ?? []); setLoading(false); });
  }, []);

  const sendReply = async () => {
    if (!reply.trim() || !active) return;
    setSending(true);
    const res = await fetch('/api/admin/support-tickets', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify({ ticket_id: active.id, reply: reply.trim() }),
    });
    if (res.ok) {
      setTickets(prev => prev.map(t => t.id === active.id ? { ...t, status: 'answered' } : t));
      setActive(prev => ({ ...prev, status: 'answered' }));
      setReply('');
    }
    setSending(false);
  };

  const TC = { open: 'dp-badge-blue', answered: 'dp-badge-green', closed: 'dp-badge-gray' };

  if (loading) return <div className="dp-loading"><div className="dp-spinner" /></div>;

  return (
    <div className="dp-2col" style={{ alignItems: 'flex-start' }}>
      <div className="dp-section" style={{ marginBottom: 0 }}>
        <div className="dp-section-header">
          <p className="dp-section-title">Tickets</p>
          <span className="dp-badge dp-badge-blue">{tickets.filter(t => t.status === 'open').length} open</span>
        </div>
        {tickets.length === 0 ? (
          <div className="dp-empty"><p>No tickets yet.</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {tickets.map(t => (
              <button key={t.id} onClick={() => setActive(t)}
                style={{
                  background: active?.id === t.id ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${active?.id === t.id ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: 8, padding: '0.75rem 1rem', cursor: 'pointer', textAlign: 'left',
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#e5e7eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</span>
                  <span className={`dp-badge ${TC[t.status] ?? 'dp-badge-gray'}`} style={{ fontSize: '0.68rem', flexShrink: 0 }}>{t.status}</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#4b5563', marginTop: '0.2rem' }}>{fmtDate(t.created_at)}</div>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="dp-section" style={{ marginBottom: 0 }}>
        {!active ? (
          <div className="dp-empty"><p>Select a ticket to reply.</p></div>
        ) : (
          <>
            <div className="dp-section-header">
              <div>
                <p className="dp-section-title">{active.subject}</p>
                <p className="dp-section-sub">{fmtDate(active.created_at)}</p>
              </div>
              <span className={`dp-badge ${TC[active.status] ?? 'dp-badge-gray'}`}>{active.status}</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '0.875rem', marginBottom: '1rem', fontSize: '0.875rem', color: '#d1d5db', lineHeight: 1.6 }}>
              {active.body}
            </div>
            <div className="dp-form-row">
              <label className="dp-label">Your Reply</label>
              <textarea className="dp-input" rows={4} placeholder="Type your reply…" value={reply} onChange={e => setReply(e.target.value)} style={{ resize: 'vertical' }} />
            </div>
            <button className="dp-btn dp-btn-primary" disabled={!reply.trim() || sending} onClick={sendReply} style={{ width: '100%', justifyContent: 'center' }}>
              {sending ? 'Sending…' : 'Send Reply'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Tab: Plans ────────────────────────────────────────────────────────────────
function PlansTab({ token }) {
  const [plans,   setPlans]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [editId,  setEditId]  = useState(null);
  const [draft,   setDraft]   = useState({});
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState('');

  const loadPlans = async () => {
    setLoading(true);
    const res  = await fetch('/api/admin/plans', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json().catch(() => []);
    setPlans(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { loadPlans(); }, []);

  const startEdit = (p) => { setEditId(p.id); setDraft({ price_usd: p.price_usd, max_products: p.max_products, max_variations_per_product: p.max_variations_per_product, active: p.active }); };

  const savePlan = async () => {
    setSaving(true);
    const res  = await fetch('/api/admin/plans', {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify({ id: editId, ...draft }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) { setMsg(data.error || 'Failed to update plan.'); return; }
    setMsg('Plan updated.'); setEditId(null); loadPlans();
  };

  return (
    <>
      {msg && <div className="dp-alert dp-alert-success" onClick={() => setMsg('')} style={{ cursor: 'pointer' }}>{msg} ✕</div>}
      <div className="dp-section">
        <div className="dp-section-header"><p className="dp-section-title">Subscription Plans</p></div>
        {loading ? (
          <div className="dp-loading"><div className="dp-spinner" /></div>
        ) : (
          <div className="dp-table-wrap">
            <table className="dp-table">
              <thead>
                <tr><th>Plan</th><th>Price/mo</th><th>Max Products</th><th>Max Variations</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {plans.map(p => (
                  <tr key={p.id}>
                    <td style={{ color: '#f0f0f0', fontWeight: 600, textTransform: 'capitalize' }}>{p.name}</td>
                    <td>
                      {editId === p.id
                        ? <input className="dp-input" type="number" step="0.01" style={{ maxWidth: 90, padding: '0.25rem 0.5rem' }} value={draft.price_usd ?? ''} onChange={e => setDraft({ ...draft, price_usd: e.target.value })} />
                        : <span style={{ color: '#60a5fa', fontWeight: 600 }}>{p.price_usd ? `$${p.price_usd}` : 'Custom'}</span>}
                    </td>
                    <td>
                      {editId === p.id
                        ? <input className="dp-input" type="number" style={{ maxWidth: 80, padding: '0.25rem 0.5rem' }} value={draft.max_products ?? ''} onChange={e => setDraft({ ...draft, max_products: Number(e.target.value) || null })} />
                        : (p.max_products ?? <span style={{ color: '#34d399' }}>Unlimited</span>)}
                    </td>
                    <td>
                      {editId === p.id
                        ? <input className="dp-input" type="number" style={{ maxWidth: 80, padding: '0.25rem 0.5rem' }} value={draft.max_variations_per_product ?? ''} onChange={e => setDraft({ ...draft, max_variations_per_product: Number(e.target.value) || null })} />
                        : (p.max_variations_per_product ?? <span style={{ color: '#34d399' }}>Unlimited</span>)}
                    </td>
                    <td>
                      {editId === p.id
                        ? <select className="dp-select" style={{ maxWidth: 100, padding: '0.25rem 0.5rem' }} value={String(draft.active)} onChange={e => setDraft({ ...draft, active: e.target.value === 'true' })}>
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                          </select>
                        : <span className={`dp-badge ${p.active ? 'dp-badge-green' : 'dp-badge-red'}`}>{p.active ? 'Active' : 'Inactive'}</span>}
                    </td>
                    <td>
                      {editId === p.id
                        ? <div className="dp-row-actions">
                            <button className="dp-btn dp-btn-primary dp-btn-sm" onClick={savePlan} disabled={saving}>{saving ? '…' : 'Save'}</button>
                            <button className="dp-btn dp-btn-ghost dp-btn-sm" onClick={() => setEditId(null)}>Cancel</button>
                          </div>
                        : <button className="dp-btn dp-btn-ghost dp-btn-sm" onClick={() => startEdit(p)}>Edit</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

// ── Tab: API Keys ─────────────────────────────────────────────────────────────
function ApiKeysTab({ token }) {
  const [keys,    setKeys]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState('');
  const [search,  setSearch]  = useState('');

  const loadKeys = async () => {
    setLoading(true);
    const res  = await fetch('/api/admin/all-api-keys', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json().catch(() => ({}));
    setKeys(data.keys ?? []);
    setLoading(false);
  };

  useEffect(() => { loadKeys(); }, []);

  const revoke = async (id) => {
    if (!window.confirm('Permanently revoke this API key?')) return;
    const res  = await fetch('/api/admin/all-api-keys', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify({ key_id: id }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setErr(data.error || 'Failed to revoke key.'); return; }
    loadKeys();
  };

  const filtered = keys.filter(k =>
    !search ||
    k.name?.toLowerCase().includes(search.toLowerCase()) ||
    k.key_prefix?.toLowerCase().includes(search.toLowerCase()) ||
    k.profiles?.username?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {err && <div className="dp-alert dp-alert-error" onClick={() => setErr('')} style={{ cursor: 'pointer' }}>{err} ✕</div>}
      <div className="dp-filterbar">
        <input className="dp-input" style={{ maxWidth: 240 }} placeholder="Search name, prefix, user…" value={search} onChange={e => setSearch(e.target.value)} />
        <span className="dp-filterbar-count">{filtered.length} key{filtered.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="dp-section">
        {loading ? (
          <div className="dp-loading"><div className="dp-spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="dp-empty"><p>No API keys found.</p></div>
        ) : (
          <div className="dp-table-wrap">
            <table className="dp-table">
              <thead>
                <tr><th>Name</th><th>Key Prefix</th><th>Owner</th><th>Requests</th><th>Last Used</th><th>Created</th><th></th></tr>
              </thead>
              <tbody>
                {filtered.map(k => (
                  <tr key={k.id}>
                    <td style={{ color: '#f0f0f0', fontWeight: 500 }}>{k.name}</td>
                    <td><code style={{ fontSize: '0.78rem', color: '#9ca3af' }}>{k.key_prefix}…</code></td>
                    <td style={{ color: '#6b7280' }}>{k.profiles?.username ?? '—'}</td>
                    <td>{k.request_count ?? 0}</td>
                    <td style={{ color: '#6b7280' }}>{k.last_used_at ? fmtDate(k.last_used_at) : '—'}</td>
                    <td style={{ color: '#6b7280' }}>{fmtDate(k.created_at)}</td>
                    <td>
                      <button className="dp-btn dp-btn-danger dp-btn-sm" onClick={() => revoke(k.id)}>Revoke</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { user }   = useAuth();
  const [params]   = useSearchParams();
  const [activeTab, setActiveTab] = useState(params.get('tab') ?? 'users');

  // Sync tab when URL query param changes (sidebar nav clicks)
  useEffect(() => {
    const t = params.get('tab') ?? 'users';
    setActiveTab(t);
  }, [params]);

  if (!user?.isStaff) return <Navigate to="/dashboard" replace />;

  const isSuperAdmin = user.isSuperAdmin;

  let tabs;
  if (isSuperAdmin) {
    tabs = [
      { key: 'users',     label: 'Users'     },
      { key: 'staff',     label: 'Staff'     },
      { key: 'analytics', label: 'Analytics' },
      { key: 'revenue',   label: 'Revenue'   },
      { key: 'support',   label: 'Support'   },
      { key: 'api-keys',  label: 'API Keys'  },
      { key: 'plans',     label: 'Plans'     },
    ];
  } else if (user.isAdmin) {
    tabs = [
      { key: 'users',     label: 'Customers' },
      { key: 'analytics', label: 'Analytics' },
      { key: 'revenue',   label: 'Revenue'   },
      { key: 'support',   label: 'Support'   },
    ];
  } else if (user.isTechnicalSupport || user.isClerk) {
    tabs = [
      { key: 'users',   label: 'Users'   },
      { key: 'support', label: 'Support' },
    ];
  } else if (user.isFinance) {
    tabs = [
      { key: 'analytics', label: 'Analytics' },
      { key: 'revenue',   label: 'Revenue'   },
    ];
  } else {
    tabs = [
      { key: 'analytics', label: 'Analytics' },
      { key: 'support',   label: 'Support'   },
    ];
  }

  const navKeyMap = {
    users: 'customers', staff: 'staff',
    analytics: 'analytics', revenue: 'sales',
    support: 'support', 'api-keys': 'api', plans: 'settings',
  };
  const navKey = navKeyMap[activeTab] ?? 'customers';

  const title = isSuperAdmin ? 'Master Dashboard' : user.isAdmin ? 'Admin Portal' : 'Operations';

  return (
    <DashLayout active={navKey} title={title}>
      <div className="dp-tabs">
        {tabs.map(t => (
          <button
            key={t.key}
            className={`dp-tab${activeTab === t.key ? ' dp-tab-active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'users'     && <UsersTab token={user.accessToken} isSuperAdmin={isSuperAdmin} clientsOnly={!isSuperAdmin} />}
      {activeTab === 'staff'     && isSuperAdmin && <StaffTab token={user.accessToken} />}
      {activeTab === 'analytics' && <AnalyticsTab token={user.accessToken} />}
      {activeTab === 'revenue'   && <RevenueTab token={user.accessToken} />}
      {activeTab === 'support'   && <SupportTab token={user.accessToken} />}
      {activeTab === 'api-keys'  && isSuperAdmin && <ApiKeysTab token={user.accessToken} />}
      {activeTab === 'plans'     && isSuperAdmin && <PlansTab token={user.accessToken} />}
    </DashLayout>
  );
}
