import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import Sidebar from '../components/Sidebar';
import Alert from '../components/Alert';
import { COUNTRY_STANDARDS } from '../utils/barcodeUtils';

const API_BASE = import.meta.env.DEV ? 'http://localhost:3000' : '';

function adminFetch(path, method = 'GET', body = null, token) {
  return fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }).then(r => r.json());
}

const TABS = [
  { id: 'overview',  icon: 'fas fa-chart-line', label: 'Overview'    },
  { id: 'users',     icon: 'fas fa-users',       label: 'Users'       },
  { id: 'plans',     icon: 'fas fa-crown',       label: 'Plans'       },
  { id: 'api-keys',  icon: 'fas fa-key',         label: 'API Keys'    },
  { id: 'support',   icon: 'fas fa-headset',     label: 'Support'     },
];

const PLAN_OPTIONS = ['starter', 'business', 'pro', 'enterprise', 'custom'];
const SUB_COLORS   = { starter: '#10b981', business: '#4f46e5', pro: '#8b5cf6', enterprise: '#f59e0b', custom: '#6b7280' };

// ── Admin Login ───────────────────────────────────────────────────────────────

function AdminLoginForm() {
  const { login } = useAuth();
  const navigate  = useNavigate();

  const [form, setForm]       = useState({ email: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(form.email, form.password);
      if (result.success) navigate('/admin');
      else setError(result.error || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <main className="auth-page">
        <div className="auth-container">
          <div className="auth-card">
            <h2><i className="fas fa-user-shield"></i> Admin Login</h2>
            <p className="auth-subtitle">Restricted area — authorised administrators only</p>
            {error && <Alert type="error" message={error} onClose={() => setError('')} />}
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label>Admin Email *</label>
                <div className="input-with-icon">
                  <i className="fas fa-envelope"></i>
                  <input type="email" name="email" required placeholder="Admin email address"
                    value={form.email} onChange={handle} autoComplete="email" />
                </div>
              </div>
              <div className="form-group">
                <label>Password *</label>
                <div className="input-with-icon">
                  <i className="fas fa-lock"></i>
                  <input type="password" name="password" required placeholder="Admin password"
                    value={form.password} onChange={handle} autoComplete="current-password" />
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                <i className="fas fa-sign-in-alt"></i> {loading ? 'Logging in…' : 'Admin Login'}
              </button>
            </form>
            <div className="auth-footer">
              <p><a href="/login"><i className="fas fa-arrow-left"></i> Back to Client Login</a></p>
            </div>
          </div>
          <div className="auth-info">
            <div className="info-box">
              <h3><i className="fas fa-user-shield"></i> Admin Access</h3>
              <ul>
                <li><i className="fas fa-check"></i> Manage all user subscriptions</li>
                <li><i className="fas fa-check"></i> Edit pricing plans live</li>
                <li><i className="fas fa-check"></i> Issue & manage API keys</li>
                <li><i className="fas fa-check"></i> Handle support tickets & live chat</li>
                <li><i className="fas fa-check"></i> View platform analytics</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}

// ── User Override Modal ───────────────────────────────────────────────────────

function UserOverrideModal({ targetUser, token, onClose, onSaved }) {
  const [form, setForm] = useState({
    subscription_type:     targetUser.subscription_type,
    subscription_end_date: targetUser.subscription_end_date?.split('T')[0] ?? '',
    admin_notes:           targetUser.admin_notes ?? '',
    custom_max_products:   targetUser.enterprise_config?.max_products ?? '',
    custom_max_variations: targetUser.enterprise_config?.max_variations_per_product ?? '',
    custom_features:       targetUser.enterprise_config?.features ?? '',
    custom_name:           targetUser.enterprise_config?.name ?? '',
  });
  const [saving, setSaving] = useState(false);

  const isCustom = ['enterprise', 'custom'].includes(form.subscription_type);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const enterprise_config = isCustom ? {
      max_products:               form.custom_max_products   ? Number(form.custom_max_products)   : null,
      max_variations_per_product: form.custom_max_variations ? Number(form.custom_max_variations) : null,
      features:    form.custom_features || null,
      name:        form.custom_name || null,
    } : null;

    await adminFetch('/api/admin/users', 'PATCH', {
      userId:               targetUser.id,
      subscription_type:    form.subscription_type,
      subscription_end_date: form.subscription_end_date || null,
      enterprise_config,
      admin_notes:          form.admin_notes || null,
    }, token);

    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div className="modal open" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h2>Override Subscription — {targetUser.username}</h2>
          <button className="close-modal" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSave} className="modal-form">
          <div className="form-group">
            <label>Subscription Plan</label>
            <select className="form-select" value={form.subscription_type}
              onChange={e => setForm(f => ({ ...f, subscription_type: e.target.value }))}>
              {PLAN_OPTIONS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </div>

          {isCustom && (
            <div style={{ background: '#f9fafb', borderRadius: 10, padding: '1rem', marginBottom: '1rem' }}>
              <p style={{ fontWeight: 600, marginBottom: '0.75rem', color: '#4f46e5' }}>
                <i className="fas fa-sliders-h"></i> Custom Enterprise Config
              </p>
              <div className="ent-form-row-2">
                <div className="form-group">
                  <label>Plan Display Name</label>
                  <input className="form-input" placeholder="e.g. Enterprise Plus"
                    value={form.custom_name} onChange={e => setForm(f => ({ ...f, custom_name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Max Products</label>
                  <input type="number" className="form-input" placeholder="Leave blank = unlimited"
                    value={form.custom_max_products} onChange={e => setForm(f => ({ ...f, custom_max_products: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label>Max Variations per Product</label>
                <input type="number" className="form-input" placeholder="Leave blank = unlimited"
                  value={form.custom_max_variations} onChange={e => setForm(f => ({ ...f, custom_max_variations: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Custom Features Description</label>
                <textarea className="form-input" rows={2} placeholder="e.g. Unlimited products, White-label, Dedicated support"
                  value={form.custom_features} onChange={e => setForm(f => ({ ...f, custom_features: e.target.value }))} />
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Subscription End Date</label>
            <input type="date" className="form-input" value={form.subscription_end_date}
              onChange={e => setForm(f => ({ ...f, subscription_end_date: e.target.value }))} />
            <p className="form-hint">Leave empty for no expiration</p>
          </div>
          <div className="form-group">
            <label>Admin Notes (internal only)</label>
            <textarea className="form-input" rows={2} placeholder="Notes visible only to admins…"
              value={form.admin_notes} onChange={e => setForm(f => ({ ...f, admin_notes: e.target.value }))} />
          </div>
          <div className="modal-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Create User Modal ─────────────────────────────────────────────────────────

function CreateUserModal({ token, onClose, onSaved }) {
  const [form,  setForm]  = useState({ username: '', email: '', password: '', subscription_type: 'starter' });
  const [saving,setSaving]= useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const data = await adminFetch('/api/admin/create-user', 'POST', form, token);
    setSaving(false);
    if (data.success) { onSaved(); onClose(); }
    else setError(data.error || 'Failed to create user.');
  };

  return (
    <div className="modal open" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>Create New User</h2>
          <button className="close-modal" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleCreate} className="modal-form">
          {error && <Alert type="error" message={error} />}
          <div className="form-group">
            <label>Username *</label>
            <input type="text" className="form-input" required placeholder="Username" value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Email *</label>
            <input type="email" className="form-input" required placeholder="Email address" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Password * (min 6 characters)</label>
            <input type="password" className="form-input" required placeholder="Temporary password" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Subscription Plan *</label>
            <select className="form-select" value={form.subscription_type}
              onChange={e => setForm(f => ({ ...f, subscription_type: e.target.value }))}>
              {PLAN_OPTIONS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </div>
          <div className="modal-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create User'}</button>
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Add Credential Modal ──────────────────────────────────────────────────────

function AddCredentialModal({ token, onClose, onSaved }) {
  const [form,  setForm]  = useState({ name: '', provider: '', credential_type: 'api_key', value: '', purpose: '' });
  const [saving,setSaving]= useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await adminFetch('/api/admin/external-credentials', 'POST', form, token);
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div className="modal open" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>Add External Credential</h2>
          <button className="close-modal" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="ent-form-row-2">
            <div className="form-group">
              <label>Name *</label>
              <input className="form-input" required placeholder="e.g. ACME POS API Key" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Provider *</label>
              <input className="form-input" required placeholder="e.g. acme_pos" value={form.provider}
                onChange={e => setForm(f => ({ ...f, provider: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label>Type</label>
            <select className="form-select" value={form.credential_type}
              onChange={e => setForm(f => ({ ...f, credential_type: e.target.value }))}>
              {['api_key','bearer_token','oauth_client','webhook_secret'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Credential Value *</label>
            <input type="password" className="form-input" required placeholder="The actual key/token (encrypted on save)" value={form.value}
              onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Purpose / Notes</label>
            <textarea className="form-input" rows={2} placeholder="What is this used for?" value={form.purpose}
              onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} />
          </div>
          <div className="modal-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Credential'}</button>
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Ticket Detail Modal ───────────────────────────────────────────────────────

function TicketModal({ ticket, token, onClose, onSaved }) {
  const { user } = useAuth();
  const [replies, setReplies] = useState([]);
  const [replyBody, setReplyBody] = useState('');
  const [sending, setSending]    = useState(false);

  useEffect(() => { loadReplies(); }, []);

  const loadReplies = async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from('ticket_replies')
      .select('*')
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: true });
    setReplies(data ?? []);
  };

  const sendReply = async () => {
    if (!replyBody.trim()) return;
    setSending(true);
    await adminFetch('/api/support/tickets/reply', 'POST', {
      ticketId:   ticket.id,
      senderName: user.username,
      senderId:   user.id,
      body:       replyBody,
      isAgent:    true,
    }, token);
    setReplyBody('');
    setSending(false);
    loadReplies();
    onSaved();
  };

  const updateStatus = async (status) => {
    await adminFetch('/api/support/tickets/update', 'PATCH', { ticketId: ticket.id, status }, token);
    onSaved();
    onClose();
  };

  return (
    <div className="modal open" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content" style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <div>
            <h2>{ticket.ticket_number} — {ticket.subject}</h2>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.85rem' }}>
              {ticket.guest_name ?? ticket.guest_email} · {new Date(ticket.created_at).toLocaleString()}
            </p>
          </div>
          <button className="close-modal" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body" style={{ padding: '1.5rem 2rem', maxHeight: '50vh', overflowY: 'auto' }}>
          <div className="chat-msg chat-msg-user" style={{ marginBottom: '1rem' }}>
            <div className="chat-msg-bubble" style={{ background: '#f3f4f6' }}>{ticket.body}</div>
          </div>
          {replies.map(r => (
            <div key={r.id} className={`chat-msg ${r.is_agent ? 'chat-msg-agent' : 'chat-msg-user'}`}>
              <div className="chat-msg-bubble">{r.body}</div>
              <div className="chat-msg-meta">{r.sender_name} · {new Date(r.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
        <div style={{ padding: '1rem 2rem', borderTop: '1px solid #f3f4f6' }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <textarea className="form-input" rows={3} placeholder="Reply to this ticket…"
              style={{ flex: 1, resize: 'none' }} value={replyBody}
              onChange={e => setReplyBody(e.target.value)} />
            <button className="btn btn-primary" disabled={!replyBody.trim() || sending} onClick={sendReply}
              style={{ alignSelf: 'flex-end' }}>
              {sending ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-paper-plane"></i> Reply</>}
            </button>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn-outline btn-sm" onClick={() => updateStatus('in_progress')}>Mark In Progress</button>
            <button className="btn btn-outline btn-sm" style={{ color: '#10b981', borderColor: '#10b981' }} onClick={() => updateStatus('resolved')}>Mark Resolved</button>
            <button className="btn btn-outline btn-sm" style={{ color: '#6b7280', borderColor: '#6b7280' }} onClick={() => updateStatus('closed')}>Close</button>
            <button className="btn btn-outline btn-sm" style={{ marginLeft: 'auto' }} onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Admin Dashboard ───────────────────────────────────────────────────────────

function AdminDashboardView({ user }) {
  const token = user.accessToken;

  const [activeTab,     setActiveTab]     = useState('overview');
  const [stats,         setStats]         = useState(null);
  const [users,         setUsers]         = useState([]);
  const [plans,         setPlans]         = useState([]);
  const [allApiKeys,    setAllApiKeys]    = useState([]);
  const [extCreds,      setExtCreds]      = useState([]);
  const [tickets,       setTickets]       = useState([]);
  const [chatQueue,     setChatQueue]     = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [message,       setMessage]       = useState('');
  const [editUser,      setEditUser]      = useState(null);
  const [showCreate,    setShowCreate]    = useState(false);
  const [showAddCred,   setShowAddCred]   = useState(false);
  const [viewTicket,    setViewTicket]    = useState(null);
  const [planEdits,     setPlanEdits]     = useState({});
  const [migrating,     setMigrating]     = useState(false);
  const [userSearch,    setUserSearch]    = useState('');
  const [ticketFilter,  setTicketFilter]  = useState('open');

  const realtimeRef = useRef(null);

  useEffect(() => {
    loadAll();
    subscribeToQueue();
    return () => realtimeRef.current?.unsubscribe();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, u, p] = await Promise.all([
        adminFetch('/api/admin/stats', 'GET', null, token),
        adminFetch('/api/admin/users', 'GET', null, token),
        adminFetch('/api/admin/plans', 'GET', null, token),
      ]);
      setStats(s);
      setUsers(Array.isArray(u) ? u : []);
      setPlans(Array.isArray(p) ? p : []);
    } finally {
      setLoading(false);
    }
  };

  const loadSupportData = async () => {
    const [t, q] = await Promise.all([
      adminFetch(`/api/support/tickets/list?status=${ticketFilter}&limit=50`, 'GET', null, token),
      supabase ? supabase.from('chat_sessions').select('*').eq('status', 'waiting').order('started_at').then(r => r.data) : Promise.resolve([]),
    ]);
    setTickets(Array.isArray(t) ? t : []);
    setChatQueue(q ?? []);
  };

  const loadApiKeysTab = async () => {
    if (!supabase) return;
    const [{ data: keys }, creds] = await Promise.all([
      supabase.from('api_keys').select('id, user_id, name, key_prefix, scopes, active, last_used_at, created_at').order('created_at', { ascending: false }),
      adminFetch('/api/admin/external-credentials', 'GET', null, token),
    ]);
    setAllApiKeys(keys ?? []);
    setExtCreds(Array.isArray(creds) ? creds : []);
  };

  useEffect(() => {
    if (activeTab === 'support')  loadSupportData();
    if (activeTab === 'api-keys') loadApiKeysTab();
  }, [activeTab, ticketFilter]);

  const subscribeToQueue = () => {
    if (!supabase) return;
    realtimeRef.current = supabase
      .channel('admin-queue')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_sessions' }, () => {
        if (activeTab === 'support') loadSupportData();
      })
      .subscribe();
  };

  const handleSaved = (msg = 'Changes saved.') => { setMessage(msg); loadAll(); };

  const claimChat = async (sessionId) => {
    await adminFetch('/api/support/chat/claim', 'POST', { sessionId }, token);
    loadSupportData();
  };

  const savePlan = async (planId) => {
    const edits = planEdits[planId];
    if (!edits) return;
    await adminFetch('/api/admin/plans', 'PUT', { id: planId, ...edits }, token);
    setPlanEdits(prev => { const n = { ...prev }; delete n[planId]; return n; });
    setMessage('Plan updated.');
    const p = await adminFetch('/api/admin/plans', 'GET', null, token);
    setPlans(Array.isArray(p) ? p : []);
  };

  const runMigration = async () => {
    setMigrating(true);
    const data = await adminFetch('/api/admin/migrate-plans', 'POST', {}, token);
    setMigrating(false);
    setMessage(`Migration complete — ${data.total_migrated ?? 0} accounts updated.`);
    loadAll();
  };

  const deleteExtCred = async (id) => {
    await adminFetch('/api/admin/external-credentials', 'DELETE', { id }, token);
    setExtCreds(prev => prev.filter(c => c.id !== id));
  };

  if (loading) return <div className="loading"><i className="fas fa-spinner fa-spin"></i> Loading admin panel…</div>;

  const filteredUsers = users.filter(u =>
    !userSearch || u.username?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <>
      <main className="dashboard admin-dashboard">
        <Sidebar activeItem="admin" productCount={users.length} barcodeCount={stats?.total_barcodes ?? 0} subscription={null} />

        <div className="main-content">
          <div className="dashboard-header">
            <h1><i className="fas fa-user-shield"></i> Admin Panel</h1>
            <p>Manage users, plans, API keys, and customer support.</p>
          </div>

          {message && <Alert type="success" message={message} onClose={() => setMessage('')} />}

          {/* Tab nav */}
          <div className="admin-tabs">
            {TABS.map(t => (
              <button key={t.id}
                className={`admin-tab${activeTab === t.id ? ' active' : ''}`}
                onClick={() => setActiveTab(t.id)}>
                <i className={t.icon}></i> {t.label}
              </button>
            ))}
          </div>

          {/* ── Overview ── */}
          {activeTab === 'overview' && (
            <>
              <div className="stats-grid">
                {[
                  { label: 'Total Users',   value: stats?.total_users ?? 0,             icon: 'fas fa-users',           color: '#4f46e5' },
                  { label: 'Barcodes Made', value: stats?.total_barcodes ?? 0,          icon: 'fas fa-barcode',         color: '#10b981' },
                  { label: 'Monthly Revenue', value: `$${(stats?.total_revenue ?? 0).toFixed(2)}`, icon: 'fas fa-money-bill-wave', color: '#f59e0b' },
                  { label: 'Countries',     value: stats?.country_stats?.length ?? 0,   icon: 'fas fa-globe',           color: '#ef4444' },
                ].map(s => (
                  <div key={s.label} className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: s.color }}><i className={s.icon}></i></div>
                    <div className="stat-info"><h3>{s.value}</h3><p>{s.label}</p></div>
                  </div>
                ))}
              </div>

              <div className="overview-cards">
                <div className="overview-card">
                  <h4>Subscription Distribution</h4>
                  <div className="subscription-chart">
                    {Object.entries(stats?.subscription_distribution ?? {}).map(([type, count]) => (
                      <div key={type} className="chart-item">
                        <div className="chart-label">
                          <span className="chart-color" style={{ backgroundColor: SUB_COLORS[type] ?? '#6b7280' }}></span>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </div>
                        <div className="chart-bar">
                          <div className="chart-fill" style={{
                            width: `${stats.total_users ? (count / stats.total_users) * 100 : 0}%`,
                            backgroundColor: SUB_COLORS[type] ?? '#6b7280'
                          }}></div>
                        </div>
                        <div className="chart-value">{count}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="overview-card">
                  <h4>Revenue by Plan</h4>
                  <table className="data-table" style={{ fontSize: '0.85rem' }}>
                    <thead><tr><th>Plan</th><th>Users</th><th>Monthly</th><th>Annual</th></tr></thead>
                    <tbody>
                      {(stats?.revenue_by_plan ?? []).map(row => (
                        <tr key={row.name}>
                          <td><strong>{row.name}</strong></td>
                          <td>{row.user_count}</td>
                          <td>${row.monthly_revenue.toFixed(2)}</td>
                          <td>${(row.monthly_revenue * 12).toFixed(2)}</td>
                        </tr>
                      ))}
                      <tr className="total-row">
                        <td colSpan={2}><strong>Total</strong></td>
                        <td><strong>${(stats?.total_revenue ?? 0).toFixed(2)}</strong></td>
                        <td><strong>${((stats?.total_revenue ?? 0) * 12).toFixed(2)}</strong></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {(stats?.country_stats?.length ?? 0) > 0 && (
                <div className="dashboard-section">
                  <div className="section-header"><h2><i className="fas fa-globe"></i> Country Usage</h2></div>
                  <div className="table-container">
                    <table className="data-table">
                      <thead><tr><th>Country</th><th>Code</th><th>Barcodes</th><th>Format</th></tr></thead>
                      <tbody>
                        {stats.country_stats.map(c => {
                          const info = COUNTRY_STANDARDS[c.barcode_country];
                          return (
                            <tr key={c.barcode_country}>
                              <td><i className="fas fa-flag"></i> {info?.country_name ?? 'Unknown'}</td>
                              <td><code>{c.barcode_country}</code></td>
                              <td>{c.count}</td>
                              <td>{info?.standard_format ?? 'EAN13'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Users ── */}
          {activeTab === 'users' && (
            <div className="dashboard-section">
              <div className="section-header">
                <h2><i className="fas fa-users"></i> Users ({users.length})</h2>
                <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                  <i className="fas fa-user-plus"></i> Create User
                </button>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <input className="form-input" style={{ maxWidth: 320 }} placeholder="Search by username or email…"
                  value={userSearch} onChange={e => setUserSearch(e.target.value)} />
              </div>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr><th>Username</th><th>Email</th><th>Plan</th><th>Products</th><th>Barcodes</th><th>Joined</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => {
                      const expired = u.subscription_end_date && new Date(u.subscription_end_date) < new Date();
                      return (
                        <tr key={u.id}>
                          <td><strong>{u.username}</strong></td>
                          <td style={{ fontSize: '0.85rem', color: '#6b7280' }}>{u.email}</td>
                          <td>
                            <span className="badge" style={{ background: `${SUB_COLORS[u.subscription_type] ?? '#6b7280'}20`, color: SUB_COLORS[u.subscription_type] ?? '#6b7280', border: `1px solid ${SUB_COLORS[u.subscription_type] ?? '#6b7280'}40` }}>
                              {u.subscription_type}
                            </span>
                          </td>
                          <td>{u.product_count}</td>
                          <td>{u.barcode_count}</td>
                          <td>{new Date(u.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                          <td><span className={`badge ${expired ? 'badge-danger' : 'badge-success'}`}>{expired ? 'Expired' : 'Active'}</span></td>
                          <td>
                            <button className="btn-action btn-sm" onClick={() => setEditUser(u)}>
                              <i className="fas fa-edit"></i> Override
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredUsers.length === 0 && (
                      <tr><td colSpan={8} style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>No users found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Plans ── */}
          {activeTab === 'plans' && (
            <div className="dashboard-section">
              <div className="section-header">
                <h2><i className="fas fa-crown"></i> Subscription Plans</h2>
                <button className="btn btn-outline" onClick={runMigration} disabled={migrating}>
                  {migrating ? <><i className="fas fa-spinner fa-spin"></i> Running…</> : <><i className="fas fa-sync"></i> Run Plan Migration</>}
                </button>
              </div>
              <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '1rem' }}>
                Edit prices and limits directly. Changes take effect immediately for new checkouts. "Run Plan Migration" remaps old plan names (basic → starter, premium → business) for existing accounts.
              </p>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr><th>Plan</th><th>Price (USD/mo)</th><th>Max Products</th><th>Max Variations</th><th>Active</th><th>Save</th></tr>
                  </thead>
                  <tbody>
                    {plans.map(p => {
                      const e = planEdits[p.id] ?? {};
                      const val = (field, dflt) => e[field] !== undefined ? e[field] : (p[field] ?? dflt);
                      const edit = (field, value) => setPlanEdits(prev => ({ ...prev, [p.id]: { ...(prev[p.id] ?? {}), [field]: value } }));
                      return (
                        <tr key={p.id}>
                          <td><strong>{p.name}</strong><br /><small style={{ color: '#9ca3af' }}>{p.id}</small></td>
                          <td><input type="number" step="0.01" className="form-input" style={{ width: 90 }} value={val('price_usd', '')} onChange={e2 => edit('price_usd', e2.target.value)} placeholder="Custom" /></td>
                          <td><input type="number" className="form-input" style={{ width: 90 }} value={val('max_products', '')} onChange={e2 => edit('max_products', e2.target.value)} placeholder="Unlimited" /></td>
                          <td><input type="number" className="form-input" style={{ width: 90 }} value={val('max_variations_per_product', '')} onChange={e2 => edit('max_variations_per_product', e2.target.value)} placeholder="Unlimited" /></td>
                          <td>
                            <input type="checkbox" checked={val('active', true)} onChange={e2 => edit('active', e2.target.checked)} />
                          </td>
                          <td>
                            {planEdits[p.id] && (
                              <button className="btn btn-primary btn-sm" onClick={() => savePlan(p.id)}>
                                <i className="fas fa-save"></i> Save
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── API Keys ── */}
          {activeTab === 'api-keys' && (
            <>
              <div className="dashboard-section">
                <div className="section-header"><h2><i className="fas fa-key"></i> Issued API Keys</h2></div>
                <div className="table-container">
                  <table className="data-table">
                    <thead><tr><th>User</th><th>Name</th><th>Prefix</th><th>Scopes</th><th>Last Used</th><th>Status</th></tr></thead>
                    <tbody>
                      {allApiKeys.map(k => (
                        <tr key={k.id}>
                          <td style={{ fontSize: '0.85rem', color: '#6b7280' }}>{k.user_id?.slice(0, 8)}…</td>
                          <td><strong>{k.name}</strong></td>
                          <td><code>{k.key_prefix}…</code></td>
                          <td style={{ fontSize: '0.8rem' }}>{(k.scopes ?? []).join(', ') || '—'}</td>
                          <td>{k.last_used_at ? new Date(k.last_used_at).toLocaleDateString('en-GB') : 'Never'}</td>
                          <td><span className={`badge ${k.active ? 'badge-success' : 'badge-danger'}`}>{k.active ? 'Active' : 'Revoked'}</span></td>
                        </tr>
                      ))}
                      {allApiKeys.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>No API keys yet</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="dashboard-section">
                <div className="section-header">
                  <h2><i className="fas fa-lock"></i> External Credentials</h2>
                  <button className="btn btn-primary" onClick={() => setShowAddCred(true)}>
                    <i className="fas fa-plus"></i> Add Credential
                  </button>
                </div>
                <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  Store partner / client API keys that ScanCodeZW uses to call external services. Values are encrypted — they cannot be retrieved after saving.
                </p>
                <div className="table-container">
                  <table className="data-table">
                    <thead><tr><th>Name</th><th>Provider</th><th>Type</th><th>Purpose</th><th>Active</th><th>Added</th><th>Action</th></tr></thead>
                    <tbody>
                      {extCreds.map(c => (
                        <tr key={c.id}>
                          <td><strong>{c.name}</strong></td>
                          <td><code>{c.provider}</code></td>
                          <td>{c.credential_type}</td>
                          <td style={{ fontSize: '0.85rem', color: '#6b7280' }}>{c.purpose ?? '—'}</td>
                          <td><span className={`badge ${c.active ? 'badge-success' : 'badge-danger'}`}>{c.active ? 'Active' : 'Inactive'}</span></td>
                          <td>{new Date(c.created_at).toLocaleDateString('en-GB')}</td>
                          <td>
                            <button className="btn-action btn-sm" style={{ color: '#ef4444' }} onClick={() => deleteExtCred(c.id)}>
                              <i className="fas fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                      {extCreds.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>No external credentials stored</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ── Support ── */}
          {activeTab === 'support' && (
            <>
              {/* Live Chat Queue */}
              <div className="dashboard-section">
                <div className="section-header">
                  <h2><i className="fas fa-comments"></i> Live Chat Queue</h2>
                  <span className="badge" style={{ background: chatQueue.length > 0 ? '#ef444420' : '#10b98120', color: chatQueue.length > 0 ? '#ef4444' : '#10b981', border: `1px solid ${chatQueue.length > 0 ? '#ef444440' : '#10b98140'}` }}>
                    {chatQueue.length} waiting
                  </span>
                </div>
                {chatQueue.length === 0 ? (
                  <p style={{ color: '#9ca3af', padding: '1rem 0' }}>No sessions waiting.</p>
                ) : (
                  <div className="table-container">
                    <table className="data-table">
                      <thead><tr><th>Name</th><th>Email</th><th>Waiting Since</th><th>Action</th></tr></thead>
                      <tbody>
                        {chatQueue.map(s => (
                          <tr key={s.id}>
                            <td>{s.guest_name ?? 'Unknown'}</td>
                            <td>{s.guest_email}</td>
                            <td>{new Date(s.started_at).toLocaleTimeString()}</td>
                            <td>
                              <button className="btn btn-primary btn-sm" onClick={() => claimChat(s.id)}>
                                <i className="fas fa-headset"></i> Claim
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Tickets */}
              <div className="dashboard-section">
                <div className="section-header">
                  <h2><i className="fas fa-ticket-alt"></i> Support Tickets</h2>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {['open','in_progress','resolved','closed'].map(s => (
                      <button key={s} className={`btn btn-sm ${ticketFilter === s ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setTicketFilter(s)}>{s.replace('_',' ')}</button>
                    ))}
                  </div>
                </div>
                <div className="table-container">
                  <table className="data-table">
                    <thead><tr><th>#</th><th>From</th><th>Subject</th><th>Priority</th><th>Source</th><th>Created</th><th>Action</th></tr></thead>
                    <tbody>
                      {tickets.map(t => (
                        <tr key={t.id}>
                          <td><code>{t.ticket_number}</code></td>
                          <td style={{ fontSize: '0.85rem' }}>{t.guest_name ?? ''}<br /><span style={{ color: '#9ca3af' }}>{t.guest_email}</span></td>
                          <td>{t.subject}</td>
                          <td><span className={`badge badge-${t.priority === 'urgent' ? 'danger' : t.priority === 'high' ? 'warning' : 'success'}`}>{t.priority}</span></td>
                          <td>{t.source}</td>
                          <td>{new Date(t.created_at).toLocaleDateString('en-GB')}</td>
                          <td>
                            <button className="btn-action btn-sm" onClick={() => setViewTicket(t)}>
                              <i className="fas fa-reply"></i> Reply
                            </button>
                          </td>
                        </tr>
                      ))}
                      {tickets.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>No {ticketFilter} tickets</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {editUser   && <UserOverrideModal targetUser={editUser} token={token} onClose={() => setEditUser(null)}  onSaved={() => handleSaved('Subscription updated.')} />}
      {showCreate && <CreateUserModal   token={token}         onClose={() => setShowCreate(false)}              onSaved={() => handleSaved('User created.')} />}
      {showAddCred && <AddCredentialModal token={token}       onClose={() => setShowAddCred(false)}             onSaved={loadApiKeysTab} />}
      {viewTicket  && <TicketModal ticket={viewTicket} token={token} onClose={() => setViewTicket(null)}        onSaved={loadSupportData} />}
    </>
  );
}

// ── Route entry point ─────────────────────────────────────────────────────────

export default function AdminPage() {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading"><i className="fas fa-spinner fa-spin"></i> Loading…</div>;
  if (!user || user.user_type !== 'admin') return <AdminLoginForm />;

  return (
    <Layout>
      <AdminDashboardView user={user} />
    </Layout>
  );
}
