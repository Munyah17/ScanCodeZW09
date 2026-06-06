import { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useAuth } from '../../context/AuthContext';

const COLORS = ['#6366f1','#22d3ee','#f59e0b','#10b981','#ef4444','#8b5cf6','#ec4899'];

export default function SAAnalytics() {
  const { user }      = useAuth();
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr]         = useState(null);

  useEffect(() => {
    fetch('/api/admin/analytics', { headers: { Authorization: `Bearer ${user?.token}` } })
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setData(d); })
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="sa-loading">Loading analytics…</div>;
  if (err)     return <div className="sa-error">{err}</div>;

  return (
    <div className="sa-tab-content">
      <div className="sa-kpi-grid">
        <div className="sa-kpi-card">
          <div className="sa-kpi-icon" style={{ background: '#6366f122', color: '#6366f1' }}><i className="fas fa-users"></i></div>
          <div><div className="sa-kpi-value">{data.total_users}</div><div className="sa-kpi-label">Total Accounts</div></div>
        </div>
        <div className="sa-kpi-card">
          <div className="sa-kpi-icon" style={{ background: '#10b98122', color: '#10b981' }}><i className="fas fa-barcode"></i></div>
          <div><div className="sa-kpi-value">{data.total_barcodes}</div><div className="sa-kpi-label">Barcodes Generated</div></div>
        </div>
      </div>

      <div className="sa-charts-row">
        <div className="sa-chart-card" style={{ flex: 2 }}>
          <h3>User &amp; Barcode Growth</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.monthly_trend}>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="new_users"    stroke="#6366f1" strokeWidth={2} dot={false} name="New Users" />
              <Line type="monotone" dataKey="new_barcodes" stroke="#10b981" strokeWidth={2} dot={false} name="New Barcodes" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="sa-chart-card">
          <h3>Subscription Split</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data.subscription_dist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                {(data.subscription_dist ?? []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="sa-charts-row">
        <div className="sa-chart-card" style={{ flex: 2 }}>
          <h3>Barcodes per Month</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.monthly_trend}>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="new_barcodes" name="Barcodes" fill="#10b981" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="sa-chart-card">
          <h3>Account Roles</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={data.role_dist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                {(data.role_dist ?? []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
