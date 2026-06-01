import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import DashLayout from '../components/DashLayout';

const ROLE_LABELS = { super_admin: 'Super Admin', admin: 'Admin', user: 'Client' };
const PLAN_LABELS = { free: 'Free Trial', starter: 'Starter', business: 'Business', pro: 'Pro', enterprise: 'Enterprise' };

export default function ProfilePage() {
  const { user } = useAuth();

  const [username, setUsername] = useState(user?.username ?? '');
  const [pwForm,   setPwForm]   = useState({ newPw: '', confirm: '' });
  const [msg,      setMsg]      = useState('');
  const [err,      setErr]      = useState('');
  const [saving,   setSaving]   = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    if (!supabase || !user) return;
    setSaving(true); setMsg(''); setErr('');
    const { error } = await supabase.from('profiles').update({ username: username.trim() }).eq('id', user.id);
    setSaving(false);
    if (error) setErr(error.message);
    else setMsg('Username updated successfully.');
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPw !== pwForm.confirm) { setErr('Passwords do not match.'); return; }
    if (pwForm.newPw.length < 8) { setErr('Password must be at least 8 characters.'); return; }
    setSavingPw(true); setMsg(''); setErr('');
    const { error } = await supabase.auth.updateUser({ password: pwForm.newPw });
    setSavingPw(false);
    if (error) setErr(error.message);
    else { setMsg('Password changed successfully.'); setPwForm({ newPw: '', confirm: '' }); }
  };

  const planLabel = PLAN_LABELS[user?.subscription_type] ?? 'Starter';
  const roleLabel = ROLE_LABELS[user?.user_type] ?? 'Client';

  return (
    <DashLayout active="customers" title="My Profile">
      {msg && <div className="dp-alert dp-alert-success">{msg}</div>}
      {err && <div className="dp-alert dp-alert-error" style={{ cursor: 'pointer' }} onClick={() => setErr('')}>{err} ✕</div>}

      <div className="dp-2col">

        {/* Account info */}
        <div className="dp-section">
          <div className="dp-section-header">
            <div>
              <p className="dp-section-title">Account Information</p>
              <p className="dp-section-sub">Update your display name</p>
            </div>
          </div>

          <form onSubmit={saveProfile}>
            <div className="dp-form-row">
              <label className="dp-label">Username</label>
              <input className="dp-input" value={username} onChange={e => setUsername(e.target.value)} required />
            </div>
            <div className="dp-form-row">
              <label className="dp-label">Email</label>
              <input className="dp-input" value={user?.email ?? ''} disabled />
              <p className="dp-hint">Email cannot be changed here. Contact support.</p>
            </div>
            <div className="dp-form-row">
              <label className="dp-label">Plan</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input className="dp-input" value={planLabel} disabled style={{ flex: 1 }} />
                <span className="dp-badge dp-badge-blue">{planLabel}</span>
              </div>
            </div>
            <div className="dp-form-row">
              <label className="dp-label">Account Type</label>
              <input className="dp-input" value={roleLabel} disabled />
            </div>
            {user?.subscription_end_date && (
              <div className="dp-form-row">
                <label className="dp-label">Renews</label>
                <input className="dp-input" value={new Date(user.subscription_end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })} disabled />
              </div>
            )}
            <button type="submit" className="dp-btn dp-btn-primary" disabled={saving} style={{ width: '100%', justifyContent: 'center' }}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Change password */}
        <div className="dp-section">
          <div className="dp-section-header">
            <div>
              <p className="dp-section-title">Change Password</p>
              <p className="dp-section-sub">Set a new secure password</p>
            </div>
          </div>

          <form onSubmit={changePassword}>
            <div className="dp-form-row">
              <label className="dp-label">New Password</label>
              <input
                type="password"
                className="dp-input"
                placeholder="Min. 8 characters"
                value={pwForm.newPw}
                onChange={e => setPwForm(f => ({ ...f, newPw: e.target.value }))}
                required
              />
            </div>
            <div className="dp-form-row">
              <label className="dp-label">Confirm New Password</label>
              <input
                type="password"
                className="dp-input"
                placeholder="Repeat new password"
                value={pwForm.confirm}
                onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                required
              />
            </div>
            <button type="submit" className="dp-btn dp-btn-primary" disabled={savingPw} style={{ width: '100%', justifyContent: 'center' }}>
              {savingPw ? 'Changing…' : 'Change Password'}
            </button>
          </form>

          {/* Info box */}
          <div style={{ marginTop: '1.5rem', padding: '0.875rem 1rem', background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 8 }}>
            <p style={{ fontSize: '0.8rem', color: '#60a5fa', margin: 0, lineHeight: 1.5 }}>
              Use a strong password with at least 8 characters, including uppercase, lowercase, and a number or symbol.
            </p>
          </div>
        </div>

      </div>
    </DashLayout>
  );
}
