import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DashLayout from '../components/DashLayout';

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Only Super Admin can access this page
  if (!user?.isSuperAdmin) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Access Denied</div>;
  }

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${user.accessToken}` },
      });
      const data = await res.json().catch(() => ({}));
      setStats(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashLayout active="home" title="Super Admin">
      {loading ? (
        <div className="dp-loading"><div className="dp-spinner" /></div>
      ) : (
        <div>
          <div className="dp-alert dp-alert-info" style={{ marginBottom: '2rem' }}>
            <strong>Super Admin Access:</strong> You have unlimited control over all system features, user management, staff roles, platform settings, and business analytics.
          </div>

          {/* Quick Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div className="dp-card" style={{ padding: '1.5rem' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#3b82f6' }}>
                {stats?.total_users ?? '—'}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>Total Users</div>
            </div>

            <div className="dp-card" style={{ padding: '1.5rem' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#10b981' }}>
                ${stats?.total_revenue?.toFixed(2) ?? '—'}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>Total Revenue</div>
            </div>

            <div className="dp-card" style={{ padding: '1.5rem' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f59e0b' }}>
                {stats?.active_subscriptions ?? '—'}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>Active Subscriptions</div>
            </div>
          </div>

          {/* Control Sections */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {/* User Management */}
            <div className="dp-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>👥 User Management</h3>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
                Manage all users, subscriptions, and customer accounts. View, edit, or delete any user account.
              </p>
              <button
                className="dp-btn dp-btn-primary dp-btn-sm"
                onClick={() => navigate('/admin?tab=users')}
              >
                Manage Users →
              </button>
            </div>

            {/* Staff Management */}
            <div className="dp-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>🔐 Staff & Roles</h3>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
                Create staff accounts, assign roles (Admin, Support, Finance, etc), and manage team access.
              </p>
              <button
                className="dp-btn dp-btn-primary dp-btn-sm"
                onClick={() => navigate('/admin?tab=staff')}
              >
                Manage Staff →
              </button>
            </div>

            {/* Business Analytics */}
            <div className="dp-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>📊 Analytics</h3>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
                View detailed analytics on revenue, user growth, subscription trends, and platform usage.
              </p>
              <button
                className="dp-btn dp-btn-primary dp-btn-sm"
                onClick={() => navigate('/admin?tab=analytics')}
              >
                View Analytics →
              </button>
            </div>

            {/* Platform Settings */}
            <div className="dp-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>⚙️ Platform Settings</h3>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
                Configure pricing plans, features, subscription tiers, and platform-wide settings.
              </p>
              <button
                className="dp-btn dp-btn-primary dp-btn-sm"
                onClick={() => navigate('/admin?tab=plans')}
              >
                Platform Config →
              </button>
            </div>

            {/* Revenue & Payments */}
            <div className="dp-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>💰 Revenue</h3>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
                Track all payments, subscriptions, MRR, churn rate, and business metrics.
              </p>
              <button
                className="dp-btn dp-btn-primary dp-btn-sm"
                onClick={() => navigate('/admin?tab=revenue')}
              >
                View Revenue →
              </button>
            </div>

            {/* Support Tickets */}
            <div className="dp-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>🎟️ Support</h3>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
                Manage customer support tickets, escalations, and team communication.
              </p>
              <button
                className="dp-btn dp-btn-primary dp-btn-sm"
                onClick={() => navigate('/admin?tab=support')}
              >
                Support Tickets →
              </button>
            </div>
          </div>

          {/* Permissions Summary */}
          <div className="dp-card" style={{ marginTop: '2rem', padding: '1.5rem', background: '#0f172a', border: '1px solid #1e3a8a' }}>
            <h3 style={{ color: '#93c5fd', marginBottom: '1rem' }}>Your Permissions</h3>
            <ul style={{ fontSize: '0.875rem', color: '#d1d5db', lineHeight: '1.8' }}>
              <li>✓ Full access to all user accounts</li>
              <li>✓ Create and manage staff members</li>
              <li>✓ Configure platform settings and pricing</li>
              <li>✓ View complete business analytics</li>
              <li>✓ Access all payment and revenue data</li>
              <li>✓ Delete user accounts and manage escalations</li>
              <li>✓ System-wide configuration and control</li>
            </ul>
          </div>
        </div>
      )}
    </DashLayout>
  );
}
