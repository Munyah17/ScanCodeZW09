import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import DevPortalLayout from './DevPortalLayout';

const API = ''; // same-origin; Vite dev proxy forwards /api to the dev API server

export default function DevUsage() {
  const { user }  = useAuth();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [period,  setPeriod]  = useState('30d');
  const [env,     setEnv]     = useState('all');
  const [offset,  setOffset]  = useState(0);

  useEffect(() => { load(0); }, [period, env]);

  async function load(off = 0) {
    setLoading(true);
    try {
      const res = await fetch(
        `${API}/api/dev/usage?period=${period}&env=${env}&limit=50&offset=${off}`,
        { headers: { Authorization: `Bearer ${user.accessToken}` } }
      );
      const d = await res.json();
      if (off === 0) setData(d);
      else setData(prev => ({ ...d, logs: [...(prev?.logs ?? []), ...(d.logs ?? [])] }));
      setOffset(off);
    } catch {}
    setLoading(false);
  }

  const summary = data?.summary ?? {};

  const statCards = [
    { label: 'Total Calls',    value: summary.calls     ?? 0,   color: '#58a6ff' },
    { label: 'Live Calls',     value: summary.live_calls ?? 0,  color: '#3fb950' },
    { label: 'Sandbox Calls',  value: summary.test_calls ?? 0,  color: '#8b949e' },
    { label: 'Total Spend',    value: `$${(summary.cost ?? 0).toFixed(4)}`, color: '#d2a8ff' },
    { label: 'Errors',         value: summary.errors    ?? 0,   color: summary.errors > 0 ? '#f85149' : '#8b949e' },
  ];

  const byOp = summary.by_op ?? {};

  return (
    <DevPortalLayout title="Usage & Logs">
      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {[['7d','7 days'],['30d','30 days'],['90d','90 days']].map(([v,l]) => (
          <button key={v} onClick={() => setPeriod(v)} style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', borderRadius: 4, cursor: 'pointer', border: `1px solid ${period === v ? '#58a6ff' : '#30363d'}`, background: period === v ? 'rgba(88,166,255,0.12)' : '#21262d', color: period === v ? '#58a6ff' : '#8b949e' }}>{l}</button>
        ))}
        <div style={{ borderLeft: '1px solid #30363d', margin: '0 0.25rem' }}/>
        {[['all','All'],['live','Live'],['sandbox','Sandbox']].map(([v,l]) => (
          <button key={v} onClick={() => setEnv(v)} style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', borderRadius: 4, cursor: 'pointer', border: `1px solid ${env === v ? '#58a6ff' : '#30363d'}`, background: env === v ? 'rgba(88,166,255,0.12)' : '#21262d', color: env === v ? '#58a6ff' : '#8b949e' }}>{l}</button>
        ))}
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {statCards.map(s => (
          <div key={s.label} style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: '0.875rem 1rem' }}>
            <div style={{ fontSize: '0.68rem', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>{s.label}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: s.color, fontFamily: 'monospace' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* By operation */}
      {Object.keys(byOp).length > 0 && (
        <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.72rem', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Calls by Operation</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {Object.entries(byOp).sort((a,b) => b[1]-a[1]).map(([op, cnt]) => {
              const pct = summary.calls > 0 ? Math.round(cnt / summary.calls * 100) : 0;
              return (
                <div key={op} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <code style={{ fontSize: '0.75rem', color: '#c9d1d9', width: 200, flexShrink: 0 }}>{op}</code>
                  <div style={{ flex: 1, background: '#21262d', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: '#58a6ff', borderRadius: 4 }}/>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#8b949e', width: 50, textAlign: 'right' }}>{cnt}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Log table */}
      <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #30363d', fontSize: '0.72rem', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Request Log — {data?.total ?? 0} records
        </div>
        {loading && !data ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#484f58', fontSize: '0.85rem' }}>Loading…</div>
        ) : (data?.logs ?? []).length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#484f58', fontSize: '0.85rem' }}>No API calls in this period.</div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ background: '#21262d' }}>
                    {['Timestamp','Endpoint','Operation','Env','Status','Cost (USD)','Duration'].map(h => (
                      <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: '#8b949e', fontWeight: 500, fontSize: '0.7rem', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data?.logs ?? []).map(l => (
                    <tr key={l.id} style={{ borderTop: '1px solid #21262d' }}>
                      <td style={{ padding: '0.4rem 0.75rem', color: '#484f58', whiteSpace: 'nowrap', fontSize: '0.72rem' }}>{new Date(l.created_at).toLocaleString()}</td>
                      <td style={{ padding: '0.4rem 0.75rem', fontFamily: 'monospace', color: '#c9d1d9', fontSize: '0.73rem' }}>{l.endpoint}</td>
                      <td style={{ padding: '0.4rem 0.75rem', fontFamily: 'monospace', color: '#8b949e', fontSize: '0.73rem' }}>{l.operation}</td>
                      <td style={{ padding: '0.4rem 0.75rem' }}>
                        <span style={{ background: l.environment === 'live' ? 'rgba(63,185,80,0.12)' : 'rgba(88,166,255,0.12)', color: l.environment === 'live' ? '#3fb950' : '#58a6ff', borderRadius: 4, padding: '0.1rem 0.35rem', fontSize: '0.68rem' }}>
                          {l.environment}
                        </span>
                      </td>
                      <td style={{ padding: '0.4rem 0.75rem', color: l.status_code >= 400 ? '#f85149' : '#3fb950', fontFamily: 'monospace' }}>{l.status_code}</td>
                      <td style={{ padding: '0.4rem 0.75rem', color: '#8b949e', fontFamily: 'monospace' }}>{l.cost_usd > 0 ? `$${parseFloat(l.cost_usd).toFixed(6)}` : '—'}</td>
                      <td style={{ padding: '0.4rem 0.75rem', color: '#484f58', fontFamily: 'monospace' }}>{l.duration_ms != null ? `${l.duration_ms}ms` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(data?.logs ?? []).length < (data?.total ?? 0) && (
              <div style={{ padding: '0.75rem', textAlign: 'center', borderTop: '1px solid #21262d' }}>
                <button onClick={() => load(offset + 50)} disabled={loading} style={{ background: 'none', border: '1px solid #30363d', color: '#58a6ff', borderRadius: 4, padding: '0.4rem 1rem', cursor: 'pointer', fontSize: '0.8rem' }}>
                  {loading ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </DevPortalLayout>
  );
}
