import { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import DashLayout from '../components/DashLayout';

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
}
function fmtMoney(n) {
  return n == null ? '—' : `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function getStartDate(filter) {
  const d = new Date();
  if (filter === '12m')   { d.setFullYear(d.getFullYear() - 1); return d; }
  if (filter === '3m')    { d.setMonth(d.getMonth() - 3);       return d; }
  if (filter === '30d')   { d.setDate(d.getDate() - 30);        return d; }
  if (filter === 'today') { d.setHours(0, 0, 0, 0);             return d; }
  const past = new Date(); past.setFullYear(past.getFullYear() - 3); return past;
}
function bucketByWeek(records, dateKey, valueKey) {
  if (!records?.length) return [];
  const sorted = [...records].sort((a, b) => new Date(a[dateKey]) - new Date(b[dateKey]));
  const first  = new Date(sorted[0][dateKey]);
  first.setDate(first.getDate() - first.getDay());
  const last    = new Date();
  const buckets = {};
  for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 7)) {
    buckets[fmtDate(d)] = 0;
  }
  for (const r of sorted) {
    const d = new Date(r[dateKey]);
    d.setDate(d.getDate() - d.getDay());
    const key = fmtDate(d);
    if (key in buckets) buckets[key] += valueKey ? Number(r[valueKey]) : 1;
  }
  return Object.entries(buckets).map(([date, value]) => ({ date, value }));
}

const PLAN_PRICES = { starter: 5.90, business: 16.90, pro: 29.90, lifetime: 129.99, enterprise: 0 };

function periodLabel(filter, data) {
  if (!data?.length) return '';
  const first = data[0]?.date ?? '';
  const last  = data[data.length - 1]?.date ?? '';
  if (filter === 'Today') return 'Today';
  return `${first} – ${last}`;
}

// ── Custom tooltip ─────────────────────────────────────────────────────────────
function DarkTooltip({ active, payload, label, isCount }) {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value ?? 0;
  return (
    <div style={{ background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <p style={{ color: '#6b7280', margin: '0 0 2px' }}>{label}</p>
      <p style={{ color: '#f0f0f0', fontWeight: 600, margin: 0 }}>
        {isCount ? val : `$${Number(val).toFixed(2)}`}
      </p>
    </div>
  );
}

// ── Area chart ─────────────────────────────────────────────────────────────────
function MetricChart({ data, isCount, height = 130, gradId }) {
  if (!data?.length) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1f2937', fontSize: 12 }}>
        No data for this period
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#1d4ed8" stopOpacity={0.5} />
            <stop offset="80%"  stopColor="#1d3a8a" stopOpacity={0.15} />
            <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0}   />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,0.03)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: '#374151', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <Tooltip content={<DarkTooltip isCount={isCount} />} cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }} />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#3b82f6"
          strokeWidth={1.5}
          fill={`url(#${gradId})`}
          dot={false}
          activeDot={{ r: 3, fill: '#3b82f6', stroke: '#0c0c0c', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Filter + Customize bar ────────────────────────────────────────────────────
const FILTERS = ['All Time', '12m', '3m', '30d', 'Today'];

function TopBar({ filter, onChange }) {
  return (
    <div className="dp-filters">
      {FILTERS.map(f => (
        <button
          key={f}
          className={`dp-filter-btn${filter === f ? ' dp-filter-active' : ''}`}
          onClick={() => onChange(f)}
        >
          {f}
        </button>
      ))}
      <div className="dp-filter-divider" />
      <button className="dp-customize-btn" onClick={() => window.location.href = '/settings'}>
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <path d="M1 3h11M1 7h11M1 11h11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          <circle cx="4" cy="3" r="1.5" fill="#0c0c0c" stroke="currentColor" strokeWidth="1.2"/>
          <circle cx="9" cy="7" r="1.5" fill="#0c0c0c" stroke="currentColor" strokeWidth="1.2"/>
          <circle cx="5" cy="11" r="1.5" fill="#0c0c0c" stroke="currentColor" strokeWidth="1.2"/>
        </svg>
        Customize
      </button>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user }  = useAuth();
  const [filter,  setFilter]  = useState('All Time');
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  // Auto-redirect Super Admin and Admin to their dashboard
  if (user?.isSuperAdmin || (user?.isAdmin && user?.user_type !== 'user')) {
    return <Navigate to="/admin" replace />;
  }

  const isAdmin = user?.isAdmin;

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);

    const filterParam = filter === 'All Time' ? 'all' : filter.toLowerCase().replace(' ', '');
    const headers     = { Authorization: `Bearer ${user.accessToken}` };
    const start       = getStartDate(filterParam);

    if (isAdmin) {
      const [revData, usersData] = await Promise.all([
        fetch('/api/admin/revenue', { headers }).then(r => r.json()).catch(() => ({})),
        fetch('/api/admin/users',   { headers }).then(r => r.json()).catch(() => []),
      ]);

      const allTx   = (revData.transactions ?? []);
      const payments = allTx.filter(t => t.status === 'paid' && new Date(t.created_at) >= start);
      const profiles  = Array.isArray(usersData) ? usersData : [];

      const totalRevenue = payments.reduce((s, p) => s + Number(p.amount_usd ?? 0), 0);
      const activeSubs   = profiles.filter(p =>
        p.subscription_type && p.subscription_type !== 'starter' &&
        (!p.subscription_end_date || new Date(p.subscription_end_date) > new Date())
      );
      const mrr = activeSubs.reduce((s, p) => s + (PLAN_PRICES[p.subscription_type] ?? 0), 0);

      const revenueChart = bucketByWeek(payments, 'created_at', 'amount_usd');
      const mrrChart     = revenueChart.map(r => ({ ...r, value: r.value > 0 ? r.value * 0.48 : 0 }));
      const subsChart    = bucketByWeek(activeSubs, 'created_at');

      setMetrics({
        primary:   { label: 'Revenue',                   value: fmtMoney(totalRevenue),   chart: revenueChart, isCount: false },
        secondary: { label: 'Monthly Recurring Revenue', value: fmtMoney(mrr),            chart: mrrChart,     isCount: false },
        tertiary:  { label: 'Active Subscriptions',      value: String(activeSubs.length), chart: subsChart,    isCount: true  },
      });
    } else {
      const data = await fetch(`/api/dashboard/stats?filter=${filterParam}`, { headers })
        .then(r => r.json()).catch(() => ({}));

      const products = data.products ?? [];
      const barcodes = data.barcodes ?? [];
      const planLabel = (user.subscription_type ?? 'starter');
      const planName  = planLabel.charAt(0).toUpperCase() + planLabel.slice(1);

      setMetrics({
        primary:   { label: 'Barcodes Generated',  value: String(barcodes.length),  chart: bucketByWeek(barcodes, 'created_at'),  isCount: true },
        secondary: { label: 'Products in Catalog', value: String(products.length),  chart: bucketByWeek(products, 'created_at'),  isCount: true },
        tertiary:  { label: 'Current Plan',         value: planName,                 chart: bucketByWeek(barcodes, 'created_at'),  isCount: true },
      });
    }

    setLoading(false);
  }, [user, filter, isAdmin]);

  useEffect(() => { load(); }, [load]);

  const pri = metrics?.primary;
  const sec = metrics?.secondary;
  const ter = metrics?.tertiary;

  return (
    <DashLayout
      active="home"
      title="Overview"
      actions={<TopBar filter={filter} onChange={setFilter} />}
    >
      {loading ? (
        <div className="dp-loading"><div className="dp-spinner" /></div>
      ) : (
        <>
          {/* Primary metric — full width */}
          <div className="dp-overview-card dp-overview-card-full">
            <p className="dp-card-label">{pri?.label}</p>
            <p className="dp-card-value">{pri?.value}</p>
            <p className="dp-card-period">
              <span className="dp-period-dot" />
              {periodLabel(filter, pri?.chart)}
            </p>
            <MetricChart data={pri?.chart} isCount={pri?.isCount} height={170} gradId="grad1" />
          </div>

          {/* Secondary + tertiary — 2 col */}
          <div className="dp-overview-2col">
            <div className="dp-overview-card">
              <p className="dp-card-label">{sec?.label}</p>
              <p className="dp-card-value">{sec?.value}</p>
              <p className="dp-card-period"><span className="dp-period-dot" />{periodLabel(filter, sec?.chart)}</p>
              <MetricChart data={sec?.chart} isCount={sec?.isCount} height={130} gradId="grad2" />
            </div>
            <div className="dp-overview-card">
              <p className="dp-card-label">{ter?.label}</p>
              <p className="dp-card-value">{ter?.value}</p>
              <p className="dp-card-period"><span className="dp-period-dot" />{periodLabel(filter, ter?.chart)}</p>
              <MetricChart data={ter?.chart} isCount={ter?.isCount} height={130} gradId="grad3" />
            </div>
          </div>
        </>
      )}
    </DashLayout>
  );
}
