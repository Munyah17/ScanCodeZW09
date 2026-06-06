import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function SAPlatform() {
  const { user } = useAuth();

  return (
    <div className="sa-tab-content">
      <PlansEditor token={user?.token} />
      <CredentialsManager token={user?.token} />
    </div>
  );
}

function PlansEditor({ token }) {
  const [plans, setPlans]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving]   = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/plans', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setPlans(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    const res = await fetch('/api/admin/plans', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(editing),
    }).then(r => r.json());
    setSaving(false);
    if (res.error) { alert(res.error); return; }
    setEditing(null);
    load();
  };

  return (
    <div className="sa-section">
      <h3>Plan Pricing</h3>
      {loading ? <div className="sa-loading">Loading plans…</div> : (
        <div className="sa-table-wrap">
          <table className="sa-table">
            <thead>
              <tr><th>Name</th><th>Price (USD/mo)</th><th>Max Products</th><th>Max Variations</th><th>Active</th><th></th></tr>
            </thead>
            <tbody>
              {plans.map(p => (
                <tr key={p.id}>
                  <td><strong>{p.name}</strong></td>
                  <td>
                    {editing?.id === p.id
                      ? <input className="sa-input-inline" type="number" step="0.01" value={editing.price_usd ?? ''} onChange={e => setEditing({ ...editing, price_usd: e.target.value })} />
                      : `$${p.price_usd ?? '-'}`}
                  </td>
                  <td>
                    {editing?.id === p.id
                      ? <input className="sa-input-inline" type="number" value={editing.max_products ?? ''} onChange={e => setEditing({ ...editing, max_products: parseInt(e.target.value) })} />
                      : (p.max_products ?? '∞')}
                  </td>
                  <td>
                    {editing?.id === p.id
                      ? <input className="sa-input-inline" type="number" value={editing.max_variations_per_product ?? ''} onChange={e => setEditing({ ...editing, max_variations_per_product: parseInt(e.target.value) })} />
                      : (p.max_variations_per_product ?? '∞')}
                  </td>
                  <td>
                    {editing?.id === p.id
                      ? <input type="checkbox" checked={editing.active ?? true} onChange={e => setEditing({ ...editing, active: e.target.checked })} />
                      : <span className={`sa-badge sa-badge-${p.active ? 'paid' : 'closed'}`}>{p.active ? 'Active' : 'Inactive'}</span>}
                  </td>
                  <td>
                    {editing?.id === p.id
                      ? <>
                          <button className="sa-btn sa-btn-sm sa-btn-primary" onClick={save} disabled={saving}>{saving ? '…' : 'Save'}</button>
                          <button className="sa-btn sa-btn-sm" onClick={() => setEditing(null)}>Cancel</button>
                        </>
                      : <button className="sa-btn sa-btn-sm" onClick={() => setEditing({ ...p })}>Edit</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CredentialsManager({ token }) {
  const [creds, setCreds]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]       = useState({ name: '', provider: '', credential_type: 'api_key', value: '', purpose: '' });
  const [saving, setSaving]   = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/external-credentials', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setCreds(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const addCred = async () => {
    if (!form.name || !form.provider || !form.value) { alert('Name, provider and value required'); return; }
    setSaving(true);
    const res = await fetch('/api/admin/external-credentials', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    }).then(r => r.json());
    setSaving(false);
    if (res.error) { alert(res.error); return; }
    setShowAdd(false);
    setForm({ name: '', provider: '', credential_type: 'api_key', value: '', purpose: '' });
    load();
  };

  const toggleActive = async (id, active) => {
    await fetch('/api/admin/external-credentials', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active: !active }),
    });
    load();
  };

  const deleteCred = async (id) => {
    if (!confirm('Delete this credential?')) return;
    await fetch('/api/admin/external-credentials', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    load();
  };

  return (
    <div className="sa-section">
      <div className="sa-toolbar">
        <h3 style={{ margin: 0 }}>External Credentials</h3>
        <button className="sa-btn sa-btn-primary" onClick={() => setShowAdd(true)}>
          <i className="fas fa-plus"></i> Add Credential
        </button>
      </div>

      {showAdd && (
        <div className="sa-modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="sa-modal" onClick={e => e.stopPropagation()}>
            <h3>Add External Credential</h3>
            <label>Name</label>
            <input className="sa-input" placeholder="e.g. Paynow Production" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <label>Provider</label>
            <input className="sa-input" placeholder="e.g. paynow, stripe" value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })} />
            <label>Type</label>
            <select className="sa-input" value={form.credential_type} onChange={e => setForm({ ...form, credential_type: e.target.value })}>
              <option value="api_key">API Key</option>
              <option value="webhook_secret">Webhook Secret</option>
              <option value="oauth_token">OAuth Token</option>
            </select>
            <label>Value (encrypted at rest)</label>
            <input className="sa-input" type="password" placeholder="secret value" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} />
            <label>Purpose (optional)</label>
            <input className="sa-input" placeholder="description" value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })} />
            <div className="sa-modal-actions">
              <button className="sa-btn sa-btn-primary" onClick={addCred} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              <button className="sa-btn" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {loading ? <div className="sa-loading">Loading…</div> : (
        <div className="sa-table-wrap">
          <table className="sa-table">
            <thead>
              <tr><th>Name</th><th>Provider</th><th>Type</th><th>Purpose</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {creds.map(c => (
                <tr key={c.id}>
                  <td><strong>{c.name}</strong></td>
                  <td>{c.provider}</td>
                  <td>{c.credential_type}</td>
                  <td style={{ color: '#9ca3af' }}>{c.purpose || '-'}</td>
                  <td>
                    <span
                      className={`sa-badge sa-badge-${c.active ? 'paid' : 'closed'}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => toggleActive(c.id, c.active)}
                    >
                      {c.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button className="sa-btn sa-btn-sm sa-btn-danger" onClick={() => deleteCred(c.id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {creds.length === 0 && <tr><td colSpan={6} className="sa-empty">No credentials stored</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
