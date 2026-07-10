import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import DevPortalLayout from './DevPortalLayout';

const API = ''; // same-origin; Vite dev proxy forwards /api to the dev API server

const SCOPE_INFO = {
  'barcode:generate': 'Generate EAN-13 / UPC-A barcodes',
  'barcode:list':     'List your generated barcodes',
  'qr:generate':      'Generate QR codes',
  'products:read':    'Read your product catalogue',
};
const ALL_SCOPES = Object.keys(SCOPE_INFO);

function KeyRow({ k, onRevoke }) {
  const isLive = k.environment === 'live';
  return (
    <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
          <span style={{ fontWeight: 600, color: '#f0f6fc', fontSize: '0.875rem' }}>{k.name}</span>
          <span style={{ background: isLive ? 'rgba(63,185,80,0.12)' : 'rgba(88,166,255,0.12)', color: isLive ? '#3fb950' : '#58a6ff', borderRadius: 4, padding: '0.1rem 0.4rem', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 700 }}>
            {k.environment}
          </span>
          {!k.active && <span style={{ background: 'rgba(248,81,73,0.12)', color: '#f85149', borderRadius: 4, padding: '0.1rem 0.4rem', fontSize: '0.68rem' }}>REVOKED</span>}
        </div>
        <code style={{ fontSize: '0.78rem', color: '#8b949e', fontFamily: 'monospace' }}>{k.key_prefix}••••••••••••••••••••••••••</code>
        <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
          {(k.scopes ?? []).map(s => (
            <span key={s} style={{ background: '#21262d', border: '1px solid #30363d', borderRadius: 4, padding: '0.1rem 0.4rem', fontSize: '0.68rem', color: '#8b949e', fontFamily: 'monospace' }}>{s}</span>
          ))}
        </div>
        <div style={{ marginTop: '0.4rem', fontSize: '0.72rem', color: '#484f58' }}>
          Created {new Date(k.created_at).toLocaleDateString()} ·{' '}
          {k.last_used_at ? `Last used ${new Date(k.last_used_at).toLocaleString()}` : 'Never used'}
        </div>
      </div>
      {k.active && (
        <button onClick={() => onRevoke(k.id)} style={{ background: 'none', border: '1px solid #f85149', color: '#f85149', borderRadius: 4, padding: '0.3rem 0.6rem', fontSize: '0.75rem', cursor: 'pointer', flexShrink: 0 }}>
          Revoke
        </button>
      )}
    </div>
  );
}

export default function DevKeys() {
  const { user } = useAuth();
  const [keys,    setKeys]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [show,    setShow]    = useState(false);
  const [newKey,  setNewKey]  = useState(null);
  const [copied,  setCopied]  = useState(false);
  const [form,    setForm]    = useState({ name: '', environment: 'sandbox', scopes: [...ALL_SCOPES] });
  const [creating, setCreating] = useState(false);
  const [err,     setErr]     = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const res  = await fetch(`${API}/api/dev/keys`, { headers: { Authorization: `Bearer ${user.accessToken}` } });
    const data = await res.json();
    setKeys(data.keys ?? []);
    setLoading(false);
  }

  async function create(e) {
    e.preventDefault();
    if (!form.name.trim()) { setErr('Key name is required.'); return; }
    if (form.scopes.length === 0) { setErr('Select at least one scope.'); return; }
    setCreating(true); setErr('');
    try {
      const res  = await fetch(`${API}/api/dev/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.accessToken}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'Failed to create key.'); return; }
      setNewKey(data.key);
      load();
    } catch (e) { setErr(e.message); }
    setCreating(false);
  }

  async function revoke(keyId) {
    if (!confirm('Revoke this key? Any integrations using it will stop working immediately.')) return;
    await fetch(`${API}/api/dev/keys`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.accessToken}` },
      body: JSON.stringify({ keyId }),
    });
    load();
  }

  const toggleScope = s => setForm(f => ({ ...f, scopes: f.scopes.includes(s) ? f.scopes.filter(x => x !== s) : [...f.scopes, s] }));

  const copy = async () => { await navigator.clipboard.writeText(newKey); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <DevPortalLayout title="API Keys">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button onClick={() => { setShow(true); setNewKey(null); setErr(''); }} style={{ background: '#238636', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
          + New Key
        </button>
      </div>

      {loading ? (
        <div style={{ color: '#484f58', fontSize: '0.85rem' }}>Loading…</div>
      ) : keys.length === 0 ? (
        <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: '3rem', textAlign: 'center', color: '#8b949e', fontSize: '0.875rem' }}>
          No API keys yet. Create one to start integrating.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {keys.map(k => <KeyRow key={k.id} k={k} onRevoke={revoke} />)}
        </div>
      )}

      {/* Create / reveal modal */}
      {show && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(1,4,9,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) { setShow(false); setNewKey(null); } }}>
          <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 10, padding: '1.5rem', width: '100%', maxWidth: 480 }}>
            <h3 style={{ margin: '0 0 1rem', color: '#f0f6fc', fontSize: '0.95rem' }}>
              {newKey ? 'Key Created' : 'Create API Key'}
            </h3>

            {newKey ? (
              <>
                <div style={{ background: '#0d1117', border: '1px solid #f0883e', borderRadius: 6, padding: '0.75rem 1rem', marginBottom: '0.75rem', fontSize: '0.78rem', color: '#f0883e' }}>
                  Copy this key now. It will <strong>not</strong> be shown again after you close this window.
                </div>
                <div style={{ background: '#21262d', borderRadius: 6, padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.78rem', color: '#c9d1d9', wordBreak: 'break-all', marginBottom: '0.75rem' }}>
                  {newKey}
                </div>
                <button onClick={copy} style={{ width: '100%', background: '#238636', color: '#fff', border: 'none', borderRadius: 6, padding: '0.6rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', marginBottom: '0.5rem' }}>
                  {copied ? '✓ Copied!' : 'Copy Key'}
                </button>
                <button onClick={() => { setShow(false); setNewKey(null); }} style={{ width: '100%', background: 'none', border: '1px solid #30363d', color: '#8b949e', borderRadius: 6, padding: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                  Done
                </button>
              </>
            ) : (
              <form onSubmit={create}>
                {err && <div style={{ background: 'rgba(248,81,73,0.1)', border: '1px solid #f85149', borderRadius: 4, padding: '0.6rem 0.75rem', fontSize: '0.8rem', color: '#f85149', marginBottom: '0.75rem' }}>{err}</div>}

                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#8b949e', marginBottom: '0.35rem' }}>Key Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. POS System, Shopify, Inventory App"
                    style={{ width: '100%', background: '#0d1117', border: '1px solid #30363d', borderRadius: 4, padding: '0.5rem 0.6rem', color: '#c9d1d9', fontSize: '0.8rem', boxSizing: 'border-box' }} />
                </div>

                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#8b949e', marginBottom: '0.35rem' }}>Environment</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {[['sandbox', 'Sandbox (free testing)'], ['live', 'Live (real barcodes)']].map(([env, label]) => (
                      <button key={env} type="button" onClick={() => setForm(f => ({ ...f, environment: env }))}
                        style={{ flex: 1, padding: '0.45rem', fontSize: '0.78rem', borderRadius: 4, cursor: 'pointer', border: `1px solid ${form.environment === env ? '#58a6ff' : '#30363d'}`, background: form.environment === env ? 'rgba(88,166,255,0.12)' : '#21262d', color: form.environment === env ? '#58a6ff' : '#8b949e' }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#8b949e', marginBottom: '0.35rem' }}>Scopes (permissions)</label>
                  {ALL_SCOPES.map(s => (
                    <label key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0', cursor: 'pointer' }}>
                      <input type="checkbox" checked={form.scopes.includes(s)} onChange={() => toggleScope(s)} />
                      <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#c9d1d9' }}>{s}</span>
                      <span style={{ fontSize: '0.72rem', color: '#484f58' }}>{SCOPE_INFO[s]}</span>
                    </label>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="submit" disabled={creating} style={{ flex: 1, background: '#238636', color: '#fff', border: 'none', borderRadius: 6, padding: '0.6rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                    {creating ? 'Creating…' : 'Create Key'}
                  </button>
                  <button type="button" onClick={() => { setShow(false); setErr(''); }} style={{ background: 'none', border: '1px solid #30363d', color: '#8b949e', borderRadius: 6, padding: '0.5rem 0.75rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </DevPortalLayout>
  );
}
