import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DevPortalLayout from './DevPortalLayout';

const API = import.meta.env.DEV ? 'http://localhost:3042' : '';

function StatCard({ label, value, sub, color = '#58a6ff' }) {
  return (
    <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: '1rem 1.25rem' }}>
      <div style={{ fontSize: '0.72rem', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>{label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontSize: '0.72rem', color: '#484f58', marginTop: '0.25rem' }}>{sub}</div>}
    </div>
  );
}

export default function DevDashboard() {
  const { user } = useAuth();
  const [account, setAccount] = useState(null);
  const [usage,   setUsage]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [enabling, setEnabling] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [accRes, useRes] = await Promise.all([
        fetch(`${API}/api/dev/account`, { headers: { Authorization: `Bearer ${user.accessToken}` } }),
        fetch(`${API}/api/dev/usage?period=30d`, { headers: { Authorization: `Bearer ${user.accessToken}` } }),
      ]);
      if (accRes.ok) setAccount(await accRes.json());
      if (useRes.ok) setUsage(await useRes.json());
    } catch {}
    setLoading(false);
  }

  async function enableDev() {
    setEnabling(true);
    await fetch(`${API}/api/dev/account`, {
      method: 'POST', headers: { Authorization: `Bearer ${user.accessToken}` },
    });
    await load();
    setEnabling(false);
  }

  const wallet  = account?.developer?.wallet;
  const keys    = account?.developer?.active_keys ?? 0;
  const summary = usage?.summary ?? {};

  return (
    <DevPortalLayout title="Developer Overview">
      {loading ? (
        <div style={{ color: '#8b949e', fontSize: '0.85rem' }}>Loading…</div>
      ) : !wallet ? (
        /* ── First-time: enable dev mode ── */
        <div style={{ maxWidth: 540, margin: '4rem auto', textAlign: 'center' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#58a6ff" strokeWidth="1.5" style={{ marginBottom: '1rem' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
          </svg>
          <h2 style={{ color: '#f0f6fc', marginBottom: '0.5rem' }}>Activate Developer Access</h2>
          <p style={{ color: '#8b949e', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            Get API keys, a prepaid wallet, and usage analytics to integrate ScanCodeZW barcode generation into your own systems.
          </p>
          <button
            onClick={enableDev}
            disabled={enabling}
            style={{ background: '#238636', color: '#fff', border: 'none', borderRadius: 6, padding: '0.65rem 1.5rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
          >
            {enabling ? 'Activating…' : 'Activate Developer Account'}
          </button>
        </div>
      ) : (
        /* ── Dashboard ── */
        <>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <StatCard label="Wallet Balance"  value={`$${parseFloat(wallet.balance ?? 0).toFixed(4)}`}  color={wallet.balance < 1 ? '#f85149' : '#3fb950'} sub={wallet.currency} />
            <StatCard label="Active Keys"     value={keys}            sub="sandbox + live" />
            <StatCard label="API Calls (30d)" value={summary.calls ?? 0}   sub={`${summary.live_calls ?? 0} live · ${summary.test_calls ?? 0} sandbox`} />
            <StatCard label="Spend (30d)"     value={`$${(summary.cost ?? 0).toFixed(4)}`} color="#d2a8ff" sub="USD" />
          </div>

          {/* Quick actions */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {[
              { to: '/dev/keys',   title: 'Create API Key',   desc: 'Start with a sandbox key for free testing, then go live.', color: '#58a6ff' },
              { to: '/dev/wallet', title: 'Top Up Wallet',    desc: 'Add funds to your prepaid wallet. $5 minimum, no subscription.',  color: '#3fb950' },
              { to: '/dev/docs',   title: 'Read the Docs',    desc: 'Endpoints, auth, request/response schemas and code examples.',     color: '#d2a8ff' },
            ].map(a => (
              <Link key={a.to} to={a.to} style={{ textDecoration: 'none', background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: '1.1rem', display: 'block', transition: 'border-color 0.15s' }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: a.color, marginBottom: '0.35rem' }}>{a.title}</div>
                <div style={{ fontSize: '0.78rem', color: '#8b949e', lineHeight: 1.5 }}>{a.desc}</div>
              </Link>
            ))}
          </div>

          {/* Recent log */}
          {(usage?.logs ?? []).length > 0 && (
            <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #30363d', fontSize: '0.78rem', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', justifyContent: 'space-between' }}>
                <span>Recent Calls</span>
                <Link to="/dev/usage" style={{ color: '#58a6ff', textDecoration: 'none' }}>View all →</Link>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead>
                    <tr style={{ background: '#21262d' }}>
                      {['Endpoint', 'Env', 'Status', 'Cost', 'Time'].map(h => (
                        <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: '#8b949e', fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(usage.logs ?? []).slice(0, 8).map(l => (
                      <tr key={l.id} style={{ borderTop: '1px solid #21262d' }}>
                        <td style={{ padding: '0.45rem 0.75rem', color: '#c9d1d9', fontFamily: 'monospace' }}>{l.endpoint}</td>
                        <td style={{ padding: '0.45rem 0.75rem' }}>
                          <span style={{ background: l.environment === 'live' ? 'rgba(63,185,80,0.15)' : 'rgba(88,166,255,0.12)', color: l.environment === 'live' ? '#3fb950' : '#58a6ff', borderRadius: 4, padding: '0.1rem 0.35rem', fontSize: '0.7rem' }}>
                            {l.environment}
                          </span>
                        </td>
                        <td style={{ padding: '0.45rem 0.75rem', color: l.status_code >= 400 ? '#f85149' : '#3fb950' }}>{l.status_code}</td>
                        <td style={{ padding: '0.45rem 0.75rem', color: '#8b949e' }}>{l.cost_usd > 0 ? `$${parseFloat(l.cost_usd).toFixed(4)}` : 'Free'}</td>
                        <td style={{ padding: '0.45rem 0.75rem', color: '#484f58' }}>{new Date(l.created_at).toLocaleTimeString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </DevPortalLayout>
  );
}
