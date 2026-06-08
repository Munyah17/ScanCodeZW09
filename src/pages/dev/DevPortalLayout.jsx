import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV = [
  { to: '/dev',        label: 'Overview',     icon: 'M3 4h13M3 8h9m-9 4h6' },
  { to: '/dev/keys',   label: 'API Keys',     icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z' },
  { to: '/dev/wallet', label: 'Wallet',        icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
  { to: '/dev/usage',  label: 'Usage & Logs',  icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { to: '/dev/docs',   label: 'Docs',          icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
];

export default function DevPortalLayout({ children, title }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => { await logout(); navigate('/login'); };

  return (
    <div className="dev-portal-shell" style={{ display: 'flex', minHeight: '100dvh', background: '#0d1117', color: '#c9d1d9', fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace" }}>

      {/* Sidebar — collapses to top nav bar on mobile */}
      <aside className="dev-portal-sidebar" style={{ width: 220, background: '#161b22', borderRight: '1px solid #30363d', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>

        {/* Logo */}
        <div className="dev-portal-brand" style={{ padding: '1.25rem 1rem', borderBottom: '1px solid #30363d' }}>
          <Link to="/dev" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="2" y="2" width="4" height="16" rx="1" fill="#58a6ff"/>
                <rect x="8" y="2" width="2" height="16" rx="1" fill="#58a6ff" opacity=".6"/>
                <rect x="12" y="2" width="3.5" height="16" rx="1" fill="#58a6ff" opacity=".4"/>
                <rect x="17" y="2" width="1.5" height="16" rx="1" fill="#58a6ff" opacity=".25"/>
              </svg>
              <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#f0f6fc' }}>ScanCodeZW</span>
            </div>
            <div className="dev-portal-brand-sub" style={{ fontSize: '0.68rem', color: '#58a6ff', marginTop: '0.2rem', letterSpacing: '0.05em' }}>DEVELOPER PORTAL</div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="dev-portal-nav" style={{ flex: 1, padding: '0.75rem 0', display: 'flex', flexDirection: 'column' }}>
          {NAV.map(({ to, label, icon }) => {
            const active = to === '/dev'
              ? location.pathname === '/dev'
              : location.pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                data-active={String(active)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.6rem',
                  padding: '0.55rem 1rem', fontSize: '0.8rem', textDecoration: 'none',
                  color: active ? '#f0f6fc' : '#8b949e',
                  background: active ? 'rgba(88,166,255,0.1)' : 'transparent',
                  borderLeft: `2px solid ${active ? '#58a6ff' : 'transparent'}`,
                  transition: 'all 0.15s',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={icon}/>
                </svg>
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom — back to main app + user */}
        <div className="dev-portal-footer" style={{ borderTop: '1px solid #30363d', padding: '0.75rem' }}>
          <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#8b949e', textDecoration: 'none', padding: '0.4rem', borderRadius: 4 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
            Main Platform
          </Link>
          <button
            onClick={handleLogout}
            style={{ marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#8b949e', background: 'none', border: 'none', cursor: 'pointer', padding: '0.4rem', width: '100%', borderRadius: 4 }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            Sign Out
          </button>
          <div style={{ marginTop: '0.5rem', padding: '0.4rem', fontSize: '0.7rem', color: '#484f58', borderTop: '1px solid #21262d' }}>
            {user?.email}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', minWidth: 0 }}>
        {title && (
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #30363d', background: '#161b22' }}>
            <h1 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#f0f6fc' }}>{title}</h1>
          </div>
        )}
        <div style={{ flex: 1, padding: '1.5rem', maxWidth: 1100 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
