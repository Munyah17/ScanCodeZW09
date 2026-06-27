import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import DashLayout, { PLAN_LIMITS } from '../components/DashLayout';

const ROLE_OPTIONS = [
  { value: 'member',  label: 'Member',  desc: 'Can generate barcodes and view products' },
  { value: 'manager', label: 'Manager', desc: 'Can also add/edit products' },
];

function InviteModal({ token, orgId, onClose, onCreated, plan }) {
  const limit     = PLAN_LIMITS[plan]?.subUsers ?? 0;
  const [form,    setForm]    = useState({ email: '', username: '', password: '', role: 'member' });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.username || !form.password) { setError('All fields are required.'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setSaving(true); setError('');
    try {
      const res  = await fetch('/api/team/invite', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ email: form.email.trim(), username: form.username.trim(), password: form.password, role: form.role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create team member');
      onCreated();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal open" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', color: '#e5e7eb', maxWidth: 460 }}>
        <div className="modal-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <h2 style={{ color: '#f0f0f0', fontSize: '1rem' }}>Add Team Member</h2>
          <button className="close-modal" onClick={onClose} style={{ color: '#9ca3af' }}>&times;</button>
        </div>
        <div className="modal-body" style={{ padding: '1.5rem' }}>
          {error && <div className="dp-alert dp-alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
          <form onSubmit={submit}>
            <div className="dp-form-grid">
              <div className="dp-form-row">
                <label className="dp-label">Email *</label>
                <input className="dp-input" type="email" name="email" value={form.email} onChange={handle} placeholder="worker@yourcompany.com" required />
              </div>
              <div className="dp-form-row">
                <label className="dp-label">Username *</label>
                <input className="dp-input" name="username" value={form.username} onChange={handle} placeholder="johnsmith" required />
              </div>
            </div>
            <div className="dp-form-row">
              <label className="dp-label">Password *</label>
              <input className="dp-input" type="password" name="password" value={form.password} onChange={handle} placeholder="Min. 6 characters" required />
              <p className="dp-hint">They can change this after first login.</p>
            </div>
            <div className="dp-form-row">
              <label className="dp-label">Role</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.4rem' }}>
                {ROLE_OPTIONS.map(r => (
                  <label key={r.value} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', cursor: 'pointer', padding: '0.6rem', borderRadius: 8, border: `1px solid ${form.role === r.value ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.07)'}`, background: form.role === r.value ? 'rgba(59,130,246,0.08)' : 'transparent' }}>
                    <input type="radio" name="role" value={r.value} checked={form.role === r.value} onChange={handle} style={{ marginTop: 2, accentColor: '#3b82f6' }} />
                    <div>
                      <div style={{ fontSize: '0.85rem', color: '#e5e7eb', fontWeight: 500 }}>{r.label}</div>
                      <div style={{ fontSize: '0.76rem', color: '#6b7280' }}>{r.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
              <button type="submit" className="dp-btn dp-btn-primary" disabled={saving} style={{ flex: 1, justifyContent: 'center' }}>
                {saving ? 'Creating…' : 'Add Member'}
              </button>
              <button type="button" className="dp-btn dp-btn-ghost" onClick={onClose}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function TeamPage() {
  const { user }   = useAuth();
  const plan       = user?.subscription_type ?? 'free';
  const limit      = PLAN_LIMITS[plan]?.subUsers ?? 0;

  const [members,     setMembers]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showInvite,  setShowInvite]  = useState(false);
  const [msg,         setMsg]         = useState('');

  useEffect(() => { loadMembers(); }, []);

  const loadMembers = async () => {
    const res = await fetch('/api/team/members', {
      headers: { Authorization: `Bearer ${user.accessToken}` },
    });
    const data = await res.json().catch(() => ({}));
    setMembers(data.members ?? []);
    setLoading(false);
  };

  const removeAccess = async (memberId) => {
    if (!confirm('Remove this team member? They will lose access to your organisation.')) return;
    const res = await fetch('/api/team/remove', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.accessToken}` },
      body:    JSON.stringify({ memberId }),
    });
    if (!res.ok) { setMsg('Failed to remove member. Please try again.'); return; }
    setMembers(prev => prev.filter(m => m.id !== memberId));
    setMsg('Member removed.');
  };

  const canAdd = limit === -1 || members.length < limit;

  const actions = canAdd ? (
    <button className="dp-btn dp-btn-primary" onClick={() => setShowInvite(true)}>+ Add Member</button>
  ) : null;

  return (
    <DashLayout active="team" title="My Team" actions={actions}>
      {msg && (
        <div className="dp-alert dp-alert-success" onClick={() => setMsg('')} style={{ cursor: 'pointer', marginBottom: '1rem' }}>
          {msg} ✕
        </div>
      )}

      {/* Plan info banner */}
      <div className="dp-section" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <p className="dp-section-title">Organisation Team</p>
            <p className="dp-section-sub">
              Add employees or workers who can use ScanCodeZW under your account.
              They share your product catalogue and barcode quota.
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>Team seats used</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f0f0f0', lineHeight: 1.1 }}>
              {members.length}
              <span style={{ fontSize: '0.9rem', color: '#4b5563', fontWeight: 400 }}>
                {' '}/ {limit === -1 ? '∞' : limit}
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#4b5563', marginTop: 2 }}>{plan.charAt(0).toUpperCase() + plan.slice(1)} plan</div>
          </div>
        </div>

        {!canAdd && limit !== -1 && (
          <div className="dp-alert dp-alert-warn" style={{ marginTop: '1rem' }}>
            You have reached the team limit for your plan. Upgrade to Pro to add up to 10 members.
          </div>
        )}
      </div>

      {/* Permissions overview */}
      <div className="dp-section" style={{ marginBottom: '1.25rem' }}>
        <p className="dp-section-title" style={{ marginBottom: '0.75rem' }}>What team members can do</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
          {[
            { role: 'Member',  color: '#60a5fa', perms: ['Generate barcodes', 'View products', 'Download barcodes', 'View My Barcodes'] },
            { role: 'Manager', color: '#34d399', perms: ['Everything in Member', 'Add / edit products', 'Delete own barcodes', 'View team usage'] },
          ].map(({ role, color, perms }) => (
            <div key={role} style={{ background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '1rem' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color, marginBottom: '0.6rem' }}>{role}</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.78rem', color: '#6b7280', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {perms.map(p => <li key={p}>✓ {p}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <p style={{ fontSize: '0.78rem', color: '#4b5563', marginTop: '0.75rem' }}>
          Team members cannot change billing, subscription, or invite other members.
        </p>
      </div>

      {/* Members table */}
      <div className="dp-section">
        <p className="dp-section-title" style={{ marginBottom: '1rem' }}>Team Members</p>
        {loading ? (
          <div className="dp-loading"><div className="dp-spinner" /></div>
        ) : members.length === 0 ? (
          <div className="dp-empty">
            <div className="dp-empty-icon">👥</div>
            <p>No team members yet.</p>
            {canAdd && (
              <button className="dp-btn dp-btn-primary" onClick={() => setShowInvite(true)} style={{ marginTop: '0.75rem' }}>
                Add First Member
              </button>
            )}
          </div>
        ) : (
          <div className="dp-table-wrap">
            <table className="dp-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Added</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.id}>
                    <td style={{ color: '#f0f0f0', fontWeight: 500 }}>{m.username}</td>
                    <td>
                      <span className={`dp-badge ${m.sub_role === 'manager' ? 'dp-badge-green' : 'dp-badge-blue'}`}>
                        {m.sub_role === 'manager' ? 'Manager' : 'Member'}
                      </span>
                    </td>
                    <td>{new Date(m.created_at).toLocaleDateString('en-GB')}</td>
                    <td>
                      <button className="dp-btn dp-btn-danger dp-btn-sm" onClick={() => removeAccess(m.id)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showInvite && (
        <InviteModal
          token={user.accessToken}
          orgId={user.id}
          plan={plan}
          onClose={() => setShowInvite(false)}
          onCreated={() => { loadMembers(); setMsg('Team member added successfully.'); }}
        />
      )}
    </DashLayout>
  );
}
