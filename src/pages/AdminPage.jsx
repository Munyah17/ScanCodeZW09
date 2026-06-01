import { useState, useEffect } from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import DashLayout from '../components/DashLayout';

// ── Shared helpers ────────────────────────────────────────────────────────────
const fmtDate  = d => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtMoney = n => `$${Number(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PLAN_COLOR   = { starter: 'dp-badge-gray', business: 'dp-badge-blue', pro: 'dp-badge-purple', enterprise: 'dp-badge-yellow', lifetime: 'dp-badge-green' };
const STATUS_COLOR = { paid: 'dp-badge-green', pending: 'dp-badge-yellow', failed: 'dp-badge-red', cancelled: 'dp-badge-red' };

const SUPER_ADMIN_EMAIL = 'munyamuzvidziwa19@gmail.com';

// ── Tab: Users / Customers ────────────────────────────────────────────────────
function UsersTab({ isSuperAdmin, clientsOnly }) {
  const [users,      setUsers]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [msg,        setMsg]        = useState('');
  const [err,        setErr]        = useState('');
  const [editId,     setEditId]     = useState(null);

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    const query = supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (clientsOnly) query.eq('user_type', 'user');
    const { data, error } = await query;
    if (error) setErr(error.message);
    else setUsers(data ?? []);
    setLoading(false);
  };

  const updatePlan = async (userId, plan) => {
    const { error } = await supabase.from('profiles').update({ subscription_type: plan }).eq('id', userId);
    if (error) { setErr(error.message); return; }
    setMsg('Plan updated.'); setEditId(null); loadUsers();
  };

  const updateRole = async (userId, userType) => {
    const u = users.find(u => u.id === userId);
    if (u?.email === SUPER_ADMIN_EMAIL) { setErr('Super Admin role cannot be changed.'); return; }
    const { error } = await supabase.from('profiles').update({ user_type: userType }).eq('id', userId);
    if (error) { setErr(error.message); return; }
    setMsg('Role updated.'); loadUsers();
  };

  const deleteUser = async (userId) => {
    const u = users.find(u => u.id === userId);
    if (u?.email === SUPER_ADMIN_EMAIL) { setErr('The Super Admin account cannot be deleted.'); return; }
    if (!window.confirm('Permanently delete this account? This cannot be undone.')) return;
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (error) { setErr(error.message); return; }
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
                          {u.subscription_type}
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
                          onClick={() => setEditId(editId === u.id ? null : u.id)}
                        >
                          {editId === u.id ? 'Done' : 'Edit Plan'}
                        </button>
                        {isSuperAdmin && (
                          <button className="dp-btn dp-btn-danger dp-btn-sm" onClick={() => deleteUser(u.id)}>
                            Delete
                          </button>
                        )}
                      </div>
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

// ── Tab: Revenue ──────────────────────────────────────────────────────────────
function RevenueTab() {
  const [payments, setPayments] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.from('payments').select('*').order('created_at', { ascending: false }).limit(200)
      .then(({ data }) => { setPayments(data ?? []); setLoading(false); });
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
function SupportTab() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active,  setActive]  = useState(null);
  const [reply,   setReply]   = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.from('support_tickets').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setTickets(data ?? []); setLoading(false); });
  }, []);

  const sendReply = async () => {
    if (!reply.trim() || !active) return;
    setSending(true);
    await supabase.from('support_messages').insert({ ticket_id: active.id, body: reply.trim(), sender_role: 'admin' });
    await supabase.from('support_tickets').update({ status: 'answered', updated_at: new Date().toISOString() }).eq('id', active.id);
    setTickets(prev => prev.map(t => t.id === active.id ? { ...t, status: 'answered' } : t));
    setActive(prev => ({ ...prev, status: 'answered' }));
    setReply('');
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

// ── Tab: Plans (Super Admin only) ─────────────────────────────────────────────
function PlansTab() {
  const [plans, setPlans]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.from('subscription_plans').select('*').order('price_usd', { ascending: true })
      .then(({ data }) => { setPlans(data ?? []); setLoading(false); });
  }, []);

  if (loading) return <div className="dp-loading"><div className="dp-spinner" /></div>;

  return (
    <div className="dp-section">
      <div className="dp-section-header"><p className="dp-section-title">Subscription Plans</p></div>
      <div className="dp-table-wrap">
        <table className="dp-table">
          <thead>
            <tr><th>Plan</th><th>Price/mo</th><th>Max Products</th><th>Max Variations</th><th>Features</th><th>Status</th></tr>
          </thead>
          <tbody>
            {plans.map(p => (
              <tr key={p.id}>
                <td style={{ color: '#f0f0f0', fontWeight: 600, textTransform: 'capitalize' }}>{p.name}</td>
                <td style={{ color: '#60a5fa', fontWeight: 600 }}>{p.price_usd ? `$${p.price_usd}` : 'Custom'}</td>
                <td>{p.max_products ?? <span style={{ color: '#34d399' }}>Unlimited</span>}</td>
                <td>{p.max_variations_per_product ?? <span style={{ color: '#34d399' }}>Unlimited</span>}</td>
                <td style={{ fontSize: '0.78rem', color: '#9ca3af', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.features}</td>
                <td><span className={`dp-badge ${p.active ? 'dp-badge-green' : 'dp-badge-red'}`}>{p.active ? 'Active' : 'Inactive'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Admin Page ───────────────────────────────────────────────────────────
export default function AdminPage() {
  const { user }   = useAuth();
  const [params]   = useSearchParams();
  const defaultTab = params.get('tab') ?? 'users';
  const [activeTab, setActiveTab] = useState(defaultTab);

  if (!user?.isStaff) return <Navigate to="/dashboard" replace />;

  const isSuperAdmin = user?.isSuperAdmin;

  const tabs = [
    { key: 'users',   label: isSuperAdmin ? 'All Users' : 'Customers' },
    ...(isSuperAdmin ? [{ key: 'admins', label: 'Admins' }] : []),
    { key: 'revenue', label: 'Revenue'  },
    { key: 'support', label: 'Support'  },
    ...(isSuperAdmin ? [{ key: 'plans', label: 'Plans' }] : []),
  ];

  const navKey = activeTab === 'revenue' ? 'revenue'
    : activeTab === 'support' ? 'support'
    : 'customers';

  return (
    <DashLayout active={navKey} title={isSuperAdmin ? 'Admin Portal' : 'Operations'}>
      <div className="dp-tabs">
        {tabs.map(t => (
          <button key={t.key} className={`dp-tab${activeTab === t.key ? ' dp-tab-active' : ''}`} onClick={() => setActiveTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'users'   && <UsersTab isSuperAdmin={isSuperAdmin} clientsOnly={!isSuperAdmin} />}
      {activeTab === 'admins'  && <UsersTab isSuperAdmin={isSuperAdmin} clientsOnly={false} />}
      {activeTab === 'revenue' && <RevenueTab />}
      {activeTab === 'support' && <SupportTab />}
      {activeTab === 'plans'   && <PlansTab />}
    </DashLayout>
  );
}
