import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import SAOverview  from './admin/SAOverview';
import SAUsers     from './admin/SAUsers';
import SAStaff     from './admin/SAStaff';
import SARevenue   from './admin/SARevenue';
import SAAnalytics from './admin/SAAnalytics';
import SASupport   from './admin/SASupport';
import SAApiKeys   from './admin/SAApiKeys';
import SAPlatform  from './admin/SAPlatform';

const TABS = [
  { id: 'overview',  label: 'Overview',  icon: 'fas fa-tachometer-alt' },
  { id: 'users',     label: 'Users',     icon: 'fas fa-users' },
  { id: 'staff',     label: 'Staff',     icon: 'fas fa-user-shield' },
  { id: 'revenue',   label: 'Revenue',   icon: 'fas fa-dollar-sign' },
  { id: 'analytics', label: 'Analytics', icon: 'fas fa-chart-bar' },
  { id: 'support',   label: 'Support',   icon: 'fas fa-headset' },
  { id: 'api-keys',  label: 'API Keys',  icon: 'fas fa-key' },
  { id: 'platform',  label: 'Platform',  icon: 'fas fa-cogs' },
];

export default function SuperAdminDashboard() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const [tab, setTab]    = useState('overview');

  const handleLogout = () => { logout(); navigate('/login'); };

  const renderTab = () => {
    switch (tab) {
      case 'overview':  return <SAOverview />;
      case 'users':     return <SAUsers />;
      case 'staff':     return <SAStaff />;
      case 'revenue':   return <SARevenue />;
      case 'analytics': return <SAAnalytics />;
      case 'support':   return <SASupport />;
      case 'api-keys':  return <SAApiKeys />;
      case 'platform':  return <SAPlatform />;
      default:          return <SAOverview />;
    }
  };

  return (
    <div className="sa-shell">
      {/* Sidebar */}
      <aside className="sa-sidebar">
        <div className="sa-sidebar-brand">
          <img src="/assets/brand/logo.png" alt="ScanCodeZW" className="sa-logo" />
          <div className="sa-sidebar-title">
            <span>Super Admin</span>
            <small>{user?.username}</small>
          </div>
        </div>

        <nav className="sa-nav">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`sa-nav-item${tab === t.id ? ' active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <i className={t.icon}></i>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>

        <div className="sa-sidebar-footer">
          <button className="sa-nav-item" onClick={() => navigate('/dashboard')}>
            <i className="fas fa-arrow-left"></i>
            <span>Back to App</span>
          </button>
          <button className="sa-nav-item sa-nav-logout" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="sa-main">
        <header className="sa-topbar">
          <div>
            <h2 className="sa-page-title">{TABS.find(t => t.id === tab)?.label}</h2>
            <p className="sa-page-sub">ScanCodeZW Master Dashboard</p>
          </div>
          <div className="sa-topbar-user">
            <span className="sa-super-badge">SUPER ADMIN</span>
            <span className="avatar-circle">{user?.username?.charAt(0).toUpperCase()}</span>
          </div>
        </header>

        <div className="sa-content">
          {renderTab()}
        </div>
      </main>
    </div>
  );
}
