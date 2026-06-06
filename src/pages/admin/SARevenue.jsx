import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useAuth } from '../../context/AuthContext';

const fmt    = (n) => `$${parseFloat(n ?? 0).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (s) => s ? new Date(s).toLocaleDateString() : '-';

export default function SARevenue() {
  const { user }    = useAuth();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr]         = useState(null);
  const [search, setSearch]   = useState('');

  useEffect(() => {
    fetch('/api/admin/revenue', { headers: { Authorization: `Bearer ${user?.token}` } })
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setData(d); })
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="sa-loading">Loading revenue…</div>;
  if (err)     return <div className="sa-error">{err}</div>;

  const txns = (data.transactions ?? []).filter(t =>
    !search ||
    t.reference?.toLowerCase().includes(search.toLowerCase()) ||
    t.plan?.toLowerCase().includes(search.toLowerCase()) ||
    t.profiles?.username?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="sa-tab-content">
      <div className="sa-kpi-grid">
        <div className="sa-kpi-card">
          <div className="sa-kpi-icon" style={{ background: '#6366f122', color: '#6366f1' }}><i className="fas fa-dollar-sign"></i></div>
          <div><div className="sa-kpi-value">{fmt(data.total)}</div><div className="sa-kpi-label">All-time Revenue</div></div>
        </div>
        <div className="sa-kpi-card">
          <div className="sa-kpi-icon" style={{ background: '#10b98122', color: '#10b981' }}><i className="fab fa-stripe-s"></i></div>
          <div><div className="sa-kpi-value">{fmt(data.stripe_total)}</div><div className="sa-kpi-label">Stripe</div></div>
        </div>
        <div className="sa-kpi-card">
          <div className="sa-kpi-icon" style={{ background: '#f59e0b22', color: '#f59e0b' }}><i className="fas fa-mobile-alt"></i></div>
          <div><div className="sa-kpi-value">{fmt(data.paynow_total)}</div><div className="sa-kpi-label">Paynow</div></div>
        </div>
        <div className="sa-kpi-card">
          <div className="sa-kpi-icon" style={{ background: '#8b5cf622', color: '#8b5cf6' }}><i className="fas fa-receipt"></i></div>
          <div><div className="sa-kpi-value">{data.transactions?.filter(t => t.status === 'paid').length ?? 0}</div><div className="sa-kpi-label">Paid Transactions</div></div>
        </div>
      </div>

      <div className="sa-charts-row">
        <div className="sa-chart-card" style={{ flex: 2 }}>
          <h3>Monthly Revenue (12 months)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.monthly_trend}>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
              <Tooltip formatter={(v) => fmt(v)} />
              <Legend />
              <Bar dataKey="stripe" name="Stripe" fill="#6366f1" radius={[3,3,0,0]} />
              <Bar dataKey="paynow" name="Paynow" fill="#22d3ee" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="sa-chart-card">
          <h3>By Plan</h3>
          <div className="sa-by-plan">
            {data.by_plan.map(p => (
              <div className="sa-plan-row" key={p.plan}>
                <span>{p.plan}</span>
                <span>{p.count} tx</span>
                <span className="sa-plan-total">{fmt(p.total)}</span>
              </div>
            ))}
            {data.by_plan.length === 0 && <p className="sa-empty">No data</p>}
          </div>
        </div>
      </div>

      <div className="sa-section">
        <div className="sa-toolbar">
          <h3 style={{ margin: 0 }}>Transaction Ledger</h3>
          <input className="sa-search" placeholder="Search reference, plan, user…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="sa-table-wrap">
          <table className="sa-table">
            <thead>
              <tr><th>Reference</th><th>User</th><th>Plan</th><th>Amount</th><th>Method</th><th>Status</th><th>Date</th></tr>
            </thead>
            <tbody>
              {txns.map(t => (
                <tr key={t.id}>
                  <td className="mono">{t.reference}</td>
                  <td>{t.profiles?.username ?? '-'}</td>
                  <td>{t.plan}</td>
                  <td>{fmt(t.amount_usd)}</td>
                  <td><span className={`sa-badge sa-badge-${t.method}`}>{t.method}</span></td>
                  <td><span className={`sa-badge sa-badge-${t.status}`}>{t.status}</span></td>
                  <td>{fmtDate(t.paid_at || t.created_at)}</td>
                </tr>
              ))}
              {txns.length === 0 && <tr><td colSpan={7} className="sa-empty">No transactions</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
