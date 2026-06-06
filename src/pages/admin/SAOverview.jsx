import { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { useAuth } from '../../context/AuthContext';

const PIE_COLORS = ['#6366f1','#22d3ee','#f59e0b','#10b981','#ef4444','#8b5cf6'];
const fmt = (n) => typeof n === 'number' ? `$${n.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-';
const fmtDate = (s) => s ? new Date(s).toLocaleDateString() : '-';

export default function SAOverview() {
  const { user } = useAuth();
  const [stats, setStats]   = useState(null);
  const [trend, setTrend]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr]         = useState(null);

  useEffect(() => {
    const token = user?.token;
    Promise.all([
      fetch('/api/admin/stats',     { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch('/api/admin/analytics', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([s, a]) => {
      if (s.error) throw new Error(s.error);
      setStats(s);
      setTrend(a.monthly_trend ?? []);
    }).catch(e => setErr(e.message)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="sa-loading">Loading overview…</div>;
  if (err)     return <div className="sa-error">{err}</div>;

  const mrr = stats.revenue_by_plan.reduce((sum, p) => sum + p.monthly_revenue, 0);
  const arr = mrr * 12;

  const kpis = [
    { label: 'MRR',            value: fmt(mrr),                  icon: 'fas fa-dollar-sign', color: '#6366f1' },
    { label: 'ARR',            value: fmt(arr),                  icon: 'fas fa-chart-line',  color: '#8b5cf6' },
    { label: 'Total Users',    value: stats.total_users,          icon: 'fas fa-users',       color: '#22d3ee' },
    { label: 'Total Barcodes', value: stats.total_barcodes,       icon: 'fas fa-barcode',     color: '#10b981' },
  ];

  const subDist = Object.entries(stats.subscription_distribution).map(([k, v]) => ({ name: k || 'free', value: v }));

  return (
    <div className="sa-tab-content">
      <div className="sa-kpi-grid">
        {kpis.map(k => (
          <div className="sa-kpi-card" key={k.label}>
            <div className="sa-kpi-icon" style={{ background: k.color + '22', color: k.color }}>
              <i className={k.icon}></i>
            </div>
            <div>
              <div className="sa-kpi-value">{k.value}</div>
              <div className="sa-kpi-label">{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="sa-charts-row">
        <div className="sa-chart-card">
          <h3>User Growth (12 months)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trend}>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="new_users" stroke="#6366f1" strokeWidth={2} dot={false} name="New Users" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="sa-chart-card">
          <h3>Subscription Mix</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={subDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                {subDist.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="sa-section">
        <h3>Recent Payments</h3>
        <div className="sa-table-wrap">
          <table className="sa-table">
            <thead>
              <tr><th>Reference</th><th>Plan</th><th>Amount</th><th>Method</th><th>Status</th><th>Date</th></tr>
            </thead>
            <tbody>
              {stats.recent_payments.map(p => (
                <tr key={p.reference}>
                  <td className="mono">{p.reference}</td>
                  <td>{p.plan}</td>
                  <td>{fmt(parseFloat(p.amount_usd))}</td>
                  <td><span className={`sa-badge sa-badge-${p.method}`}>{p.method}</span></td>
                  <td><span className={`sa-badge sa-badge-${p.status}`}>{p.status}</span></td>
                  <td>{fmtDate(p.paid_at || p.created_at)}</td>
                </tr>
              ))}
              {stats.recent_payments.length === 0 && (
                <tr><td colSpan={6} className="sa-empty">No payments yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
