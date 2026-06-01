import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import DashLayout from '../components/DashLayout';

const SCOPES = ['read:barcodes', 'write:barcodes', 'read:products', 'write:products', 'read:subscription'];
const API_BASE = import.meta.env.DEV ? 'http://localhost:3042' : '';

// ── Generate key modal ────────────────────────────────────────────────────────
function GenerateKeyModal({ token, onClose, onCreated }) {
  const [name,   setName]   = useState('');
  const [scopes, setScopes] = useState(['read:barcodes']);
  const [newKey, setNewKey] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  const [copied, setCopied] = useState(false);

  const toggleScope = s => setScopes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Please enter a key name.'); return; }
    setSaving(true); setError('');
    try {
      const res  = await fetch(`${API_BASE}/api/keys/generate`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ name: name.trim(), scopes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate key');
      setNewKey(data.key);
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal open" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', color: '#e5e7eb', maxWidth: 480 }}>
        <div className="modal-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <h2 style={{ color: '#f0f0f0', fontSize: '1rem' }}>{newKey ? 'API Key Generated' : 'Generate API Key'}</h2>
          <button className="close-modal" onClick={onClose} style={{ color: '#9ca3af' }}>&times;</button>
        </div>

        <div className="modal-body" style={{ padding: '1.5rem' }}>
          {newKey ? (
            <>
              <div className="dp-alert dp-alert-warn" style={{ marginBottom: '1rem' }}>
                Copy this key now — it will NOT be shown again after you close this window.
              </div>
              <div className="dp-key-box">{newKey}</div>
              <button className="dp-btn dp-btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '0.75rem' }} onClick={handleCopy}>
                {copied ? '✓ Copied!' : 'Copy to Clipboard'}
              </button>
              <button className="dp-btn dp-btn-ghost" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }} onClick={onClose}>Done</button>
            </>
          ) : (
            <form onSubmit={handleGenerate}>
              {error && <div className="dp-alert dp-alert-error">{error}</div>}
              <div className="dp-form-row">
                <label className="dp-label">Key Name *</label>
                <input
                  className="dp-input"
                  placeholder="e.g. My POS System, Shopify Integration"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>
              <div className="dp-form-row">
                <label className="dp-label">Permissions (scopes)</label>
                <div className="dp-scope-grid">
                  {SCOPES.map(s => (
                    <label key={s} className="dp-scope-tag">
                      <input type="checkbox" checked={scopes.includes(s)} onChange={() => toggleScope(s)} />
                      <code style={{ fontSize: '0.78rem' }}>{s}</code>
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="submit" className="dp-btn dp-btn-primary" disabled={saving} style={{ flex: 1, justifyContent: 'center' }}>
                  {saving ? 'Generating…' : 'Generate Key'}
                </button>
                <button type="button" className="dp-btn dp-btn-ghost" onClick={onClose}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ApiKeysPage() {
  const { user }  = useAuth();
  const [apiKeys,    setApiKeys]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [msg,        setMsg]        = useState('');

  useEffect(() => { loadKeys(); }, []);

  const loadKeys = async () => {
    if (!supabase) { setLoading(false); return; }
    const { data } = await supabase.from('api_keys').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setApiKeys(data ?? []);
    setLoading(false);
  };

  const revokeKey = async (id) => {
    if (!supabase) return;
    await supabase.from('api_keys').update({ active: false }).eq('id', id);
    setApiKeys(prev => prev.map(k => k.id === id ? { ...k, active: false } : k));
    setMsg('Key revoked.');
  };

  const actions = (
    <button className="dp-btn dp-btn-primary" onClick={() => setShowCreate(true)}>+ New Key</button>
  );

  return (
    <DashLayout active="api" title="API Keys" actions={actions}>
      {msg && <div className="dp-alert dp-alert-success" onClick={() => setMsg('')} style={{ cursor: 'pointer' }}>{msg} ✕</div>}

      <div className="dp-section">
        <div className="dp-section-header">
          <div>
            <p className="dp-section-title">Your API Keys</p>
            <p className="dp-section-sub">Connect external systems to your barcode catalogue</p>
          </div>
        </div>

        <div className="dp-alert dp-alert-warn" style={{ marginBottom: '1rem' }}>
          API keys grant access to your barcode data. Never share them publicly or commit them to code.
        </div>

        {loading ? (
          <div className="dp-loading"><div className="dp-spinner" /></div>
        ) : apiKeys.length === 0 ? (
          <div className="dp-empty">
            <div className="dp-empty-icon">🔑</div>
            <p>No API keys yet.</p>
            <button className="dp-btn dp-btn-primary" onClick={() => setShowCreate(true)} style={{ marginTop: '0.75rem' }}>
              Generate First Key
            </button>
          </div>
        ) : (
          <div className="dp-table-wrap">
            <table className="dp-table">
              <thead>
                <tr><th>Name</th><th>Prefix</th><th>Scopes</th><th>Last Used</th><th>Created</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {apiKeys.map(k => (
                  <tr key={k.id}>
                    <td style={{ color: '#f0f0f0', fontWeight: 500 }}>{k.name}</td>
                    <td><code>{k.key_prefix}…</code></td>
                    <td style={{ fontSize: '0.78rem', color: '#6b7280' }}>{(k.scopes ?? []).join(', ') || '—'}</td>
                    <td>{k.last_used_at ? new Date(k.last_used_at).toLocaleDateString('en-GB') : <span style={{ color: '#4b5563' }}>Never</span>}</td>
                    <td>{new Date(k.created_at).toLocaleDateString('en-GB')}</td>
                    <td>
                      <span className={`dp-badge ${k.active ? 'dp-badge-green' : 'dp-badge-red'}`}>
                        {k.active ? 'Active' : 'Revoked'}
                      </span>
                    </td>
                    <td>
                      {k.active && (
                        <button className="dp-btn dp-btn-danger dp-btn-sm" onClick={() => revokeKey(k.id)}>
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* API docs */}
      <div className="dp-section">
        <div className="dp-section-header">
          <p className="dp-section-title">API Usage</p>
        </div>
        <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.75rem' }}>
          Include your API key in the <code style={{ color: '#60a5fa', background: 'rgba(59,130,246,0.1)', padding: '0.1rem 0.35rem', borderRadius: 4 }}>X-API-Key</code> header:
        </p>
        <div className="dp-key-box" style={{ whiteSpace: 'pre', overflowX: 'auto', color: '#9ca3af', fontSize: '0.8rem' }}>
{`GET /api/v1/barcodes/list?limit=20&offset=0
X-API-Key: scz_YOUR_API_KEY_HERE`}
        </div>
        <p style={{ fontSize: '0.85rem', color: '#9ca3af', margin: '1rem 0 0.5rem' }}>Available endpoints:</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem', color: '#6b7280' }}>
          <div><code style={{ color: '#60a5fa' }}>GET /api/v1/products/list</code> — list your products</div>
          <div><code style={{ color: '#60a5fa' }}>GET /api/v1/barcodes/list</code> — list all generated barcodes</div>
        </div>
      </div>

      {showCreate && (
        <GenerateKeyModal
          token={user.accessToken}
          onClose={() => setShowCreate(false)}
          onCreated={loadKeys}
        />
      )}
    </DashLayout>
  );
}
