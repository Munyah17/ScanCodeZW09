import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const SUPER_ADMIN_EMAIL = 'munyamuzvidziwa19@gmail.com';

// ── Inline SVG icons ──────────────────────────────────────────────────────────
const Ic = {
  home: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.4"/>
      <rect x="8.5" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.4"/>
      <rect x="1" y="8.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.4"/>
      <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  ),
  products: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M7.5 1L13 4.5v6L7.5 14 2 10.5v-6L7.5 1Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M7.5 1v13M2 4.5l5.5 3.5L13 4.5" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  ),
  customers: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M2 13c0-3.038 2.462-5.5 5.5-5.5S13 9.962 13 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  analytics: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M1 13L5 8l3 3 3-5 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  sales: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1" y="9" width="3" height="5" rx="0.5" fill="currentColor" opacity=".5"/>
      <rect x="6" y="5" width="3" height="9" rx="0.5" fill="currentColor" opacity=".7"/>
      <rect x="11" y="1" width="3" height="13" rx="0.5" fill="currentColor"/>
    </svg>
  ),
  finance: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M7.5 4v1.5m0 4V11m-2-3.5h2.5a1 1 0 0 1 0 2H7a1 1 0 0 1 0-2h2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  settings: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M7.5 1v1.5M7.5 12.5V14M1 7.5h1.5M12.5 7.5H14M2.9 2.9l1.1 1.1M11 11l1.1 1.1M2.9 12.1L4 11M11 4l1.1-1.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  generate: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1" y="2" width="2" height="11" rx="0.5" fill="currentColor"/>
      <rect x="4.5" y="2" width="1" height="11" rx="0.5" fill="currentColor"/>
      <rect x="7" y="2" width="2" height="11" rx="0.5" fill="currentColor"/>
      <rect x="10.5" y="2" width="1" height="11" rx="0.5" fill="currentColor"/>
      <rect x="12.5" y="2" width="1.5" height="11" rx="0.5" fill="currentColor"/>
    </svg>
  ),
  barcodes: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M1 4V2a1 1 0 0 1 1-1h2M14 4V2a1 1 0 0 0-1-1h-2M1 11v2a1 1 0 0 0 1 1h2M14 11v2a1 1 0 0 1-1 1h-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M4 5v5M6.5 5v5M9 5v5M11.5 5v5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  team: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="5.5" cy="5" r="2" stroke="currentColor" strokeWidth="1.4"/>
      <circle cx="10" cy="5" r="2" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M1 13c0-2.485 2.015-4.5 4.5-4.5S10 10.515 10 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M10 10c1.5 0 4 0.5 4 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  key: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="5.5" cy="5.5" r="3" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M7.8 7.8L12 12M10 10l1.5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  support: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M2 3h11a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H5.5l-3.5 3V4a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  ),
  feedback: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 2h10a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H5l-3 2V3a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    </svg>
  ),
  docs: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M3 1h6l3 3v9H3V1Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
      <path d="M9 1v3h3M5 6h4M5 9h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  bolt: () => (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M7.5 1L2 7.5h4.5L5 12l6-7H6.5L7.5 1Z" fill="currentColor"/>
    </svg>
  ),
  panel: () => (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <rect x="1" y="1" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M5 1v11" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  ),
  search: () => (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M9 9l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  chevron: () => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  sliders: () => (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M1 3h11M1 7h11M1 11h11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <circle cx="4" cy="3" r="1.5" fill="#0c0c0c" stroke="currentColor" strokeWidth="1.2"/>
      <circle cx="9" cy="7" r="1.5" fill="#0c0c0c" stroke="currentColor" strokeWidth="1.2"/>
      <circle cx="5" cy="11" r="1.5" fill="#0c0c0c" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  ),
};

// ── Plan → sub-user limits ────────────────────────────────────────────────────
export const PLAN_LIMITS = {
  free:       { products: 1,   variations: 1,   subUsers: 0,  apiAccess: false, label: 'Free Trial', price: '$0' },
  starter:    { products: 3,   variations: 3,   subUsers: 0,  apiAccess: false, label: 'Starter',    price: '$4.79' },
  business:   { products: 20,  variations: 15,  subUsers: 2,  apiAccess: false, label: 'Business',   price: '$11.99' },
  pro:        { products: 100, variations: 50,  subUsers: 10, apiAccess: true,  label: 'Pro',         price: '$24.99' },
  lifetime:   { products: -1,  variations: -1,  subUsers: -1, apiAccess: true,  label: 'Lifetime',   price: '$129.99' },
  enterprise: { products: -1,  variations: -1,  subUsers: -1, apiAccess: true,  label: 'Enterprise', price: 'Custom' },
};

// ── Role-based navigation ─────────────────────────────────────────────────────
function buildNav(user) {
  const plan = user?.subscription_type ?? 'starter';

  // ── Super Admin ────────────────────────────────────────────────────────────
  if (user?.isSuperAdmin) {
    return [
      { to: '/dashboard',            key: 'home',      Icon: Ic.home,      label: 'Overview'   },
      { to: '/admin',                key: 'customers', Icon: Ic.customers, label: 'Users'      },
      { to: '/admin?tab=staff',      key: 'staff',     Icon: Ic.team,      label: 'Staff'      },
      { to: '/admin?tab=analytics',  key: 'analytics', Icon: Ic.analytics, label: 'Analytics'  },
      { to: '/admin?tab=revenue',    key: 'sales',     Icon: Ic.sales,     label: 'Revenue'    },
      { to: '/admin?tab=support',    key: 'support',   Icon: Ic.support,   label: 'Support'    },
      { to: '/admin?tab=api-keys',   key: 'api',       Icon: Ic.key,       label: 'API Keys'   },
      { to: '/admin?tab=plans',      key: 'settings',  Icon: Ic.settings,  label: 'Platform'   },
    ];
  }

  // ── Admin ──────────────────────────────────────────────────────────────────
  if (user?.isAdmin) {
    return [
      { to: '/dashboard',          key: 'home',      Icon: Ic.home,      label: 'Overview'   },
      { to: '/admin',              key: 'customers', Icon: Ic.customers, label: 'Customers'  },
      { to: '/admin?tab=support',  key: 'support',   Icon: Ic.support,   label: 'Support'    },
      { to: '/admin?tab=analytics',key: 'analytics', Icon: Ic.analytics, label: 'Analytics'  },
      { to: '/admin?tab=revenue',  key: 'sales',     Icon: Ic.sales,     label: 'Sales'      },
      { to: '/settings',           key: 'settings',  Icon: Ic.settings,  label: 'Settings'   },
    ];
  }

  // ── Technical Support ──────────────────────────────────────────────────────
  if (user?.isTechnicalSupport) {
    return [
      { to: '/dashboard',          key: 'home',      Icon: Ic.home,      label: 'Overview'    },
      { to: '/admin?tab=support',  key: 'support',   Icon: Ic.support,   label: 'Tickets'     },
      { to: '/admin',              key: 'customers', Icon: Ic.customers, label: 'Users'       },
      { to: '/settings',           key: 'settings',  Icon: Ic.settings,  label: 'Settings'    },
    ];
  }

  // ── Clerk ──────────────────────────────────────────────────────────────────
  if (user?.isClerk) {
    return [
      { to: '/dashboard',          key: 'home',      Icon: Ic.home,      label: 'Overview'    },
      { to: '/admin',              key: 'customers', Icon: Ic.customers, label: 'Customers'   },
      { to: '/admin?tab=support',  key: 'support',   Icon: Ic.support,   label: 'Support'     },
      { to: '/settings',           key: 'settings',  Icon: Ic.settings,  label: 'Settings'    },
    ];
  }

  // ── Assistant ──────────────────────────────────────────────────────────────
  if (user?.isAssistant) {
    return [
      { to: '/dashboard',          key: 'home',      Icon: Ic.home,      label: 'Overview'    },
      { to: '/admin?tab=analytics',key: 'analytics', Icon: Ic.analytics, label: 'Analytics'   },
      { to: '/admin?tab=support',  key: 'support',   Icon: Ic.support,   label: 'Support'     },
      { to: '/settings',           key: 'settings',  Icon: Ic.settings,  label: 'Settings'    },
    ];
  }

  // ── Finance ────────────────────────────────────────────────────────────────
  if (user?.isFinance) {
    return [
      { to: '/dashboard',          key: 'home',      Icon: Ic.home,      label: 'Overview'    },
      { to: '/admin?tab=revenue',  key: 'sales',     Icon: Ic.sales,     label: 'Revenue'     },
      { to: '/admin?tab=finance',  key: 'finance',   Icon: Ic.finance,   label: 'Finance'     },
      { to: '/settings',           key: 'settings',  Icon: Ic.settings,  label: 'Settings'    },
    ];
  }

  // Client/User
  const nav = [
    { to: '/dashboard',        key: 'home',     Icon: Ic.home,     label: 'Home'        },
    { to: '/generate-barcode', key: 'generate', Icon: Ic.generate, label: 'Generate'    },
    { to: '/my-barcodes',      key: 'barcodes', Icon: Ic.barcodes, label: 'My Barcodes' },
    { to: '/products',         key: 'products', Icon: Ic.products, label: 'Products'    },
  ];

  if (PLAN_LIMITS[plan]?.subUsers > 0 || plan === 'lifetime' || plan === 'enterprise') {
    nav.push({ to: '/team', key: 'team', Icon: Ic.team, label: 'My Team' });
  }

  if (PLAN_LIMITS[plan]?.apiAccess) {
    nav.push({ to: '/api-keys', key: 'api', Icon: Ic.key, label: 'API Keys' });
    nav.push({ to: '/dev',      key: 'dev', Icon: Ic.key, label: 'Dev Portal' });
  }

  nav.push({ to: '/settings', key: 'settings', Icon: Ic.settings, label: 'Settings' });

  return nav;
}

// ── Hamburger icon ────────────────────────────────────────────────────────────
function HamburgerIcon({ open }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      {open ? (
        <>
          <line x1="4" y1="4" x2="16" y2="16"/>
          <line x1="16" y1="4" x2="4" y2="16"/>
        </>
      ) : (
        <>
          <line x1="3" y1="5"  x2="17" y2="5"/>
          <line x1="3" y1="10" x2="17" y2="10"/>
          <line x1="3" y1="15" x2="17" y2="15"/>
        </>
      )}
    </svg>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function DashSidebar({ active, isOpen, onClose }) {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const nav              = buildNav(user);

  const initials  = (user?.username ?? '?').charAt(0).toUpperCase();
  const roleLabelMap = {
    super_admin:       'Super Admin',
    admin:             'Admin',
    technical_support: 'Technical Support',
    clerk:             'Clerk',
    assistant:         'Assistant',
    finance:           'Finance',
    user:              'Client',
  };
  const roleLabel = roleLabelMap[user?.user_type] ?? 'Client';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  return (
    <aside className={`dp-sidebar${isOpen ? ' dp-sidebar-open' : ''}`}>
      {/* Logo row */}
      <div className="dp-logo-row">
        <div className="dp-logo-mark">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <rect x="2" y="2" width="5" height="18" rx="1.5" fill="#3b82f6"/>
            <rect x="9" y="2" width="2.5" height="18" rx="1.2" fill="#3b82f6" opacity=".7"/>
            <rect x="13.5" y="2" width="4" height="18" rx="1.5" fill="#3b82f6" opacity=".5"/>
            <rect x="19.5" y="2" width="2" height="18" rx="1" fill="#3b82f6" opacity=".35"/>
          </svg>
        </div>
        <div className="dp-logo-icons">
          <span className="dp-logo-icon"><Ic.bolt /></span>
          <span className="dp-logo-icon"><Ic.panel /></span>
        </div>
      </div>

      {/* Search */}
      <div className="dp-search">
        <span className="dp-search-icon"><Ic.search /></span>
        <span className="dp-search-text">Search…</span>
        <kbd className="dp-search-kbd">⌘K</kbd>
      </div>

      {/* Main nav */}
      <nav className="dp-nav">
        {nav.map(({ to, key, Icon, label }) => (
          <Link
            key={key}
            to={to}
            onClick={handleNavClick}
            className={`dp-nav-item${active === key ? ' dp-nav-active' : ''}`}
          >
            <span className="dp-nav-icon"><Icon /></span>
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      <div className="dp-sidebar-spacer" />

      {/* Bottom links */}
      <div className="dp-sidebar-footer">
        <a
          href="https://wa.me/263773909307"
          target="_blank"
          rel="noopener noreferrer"
          className="dp-footer-link"
          onClick={handleNavClick}
        >
          <Ic.feedback /><span>Feedback</span>
        </a>
        <a
          href="https://wa.me/263773909307"
          target="_blank"
          rel="noopener noreferrer"
          className="dp-footer-link"
          onClick={handleNavClick}
        >
          <Ic.docs /><span>Support</span>
        </a>
        <Link to="/features" className="dp-footer-link" onClick={handleNavClick}>
          <Ic.docs /><span>Documentation</span>
        </Link>
      </div>

      {/* User block */}
      <button className="dp-user" onClick={handleLogout} title="Click to log out">
        <div className="dp-user-avatar">{initials}</div>
        <div className="dp-user-info">
          <span className="dp-user-name">{user?.username ?? '—'}</span>
          <span className="dp-user-role">{roleLabel}</span>
        </div>
        <span className="dp-user-chevron"><Ic.chevron /></span>
      </button>
    </aside>
  );
}

// ── Top bar ───────────────────────────────────────────────────────────────────
function DashTopBar({ title, actions, onMenuToggle, menuOpen }) {
  return (
    <div className="dp-topbar">
      {/* Hamburger — visible only on mobile via CSS */}
      <button
        className="dp-mobile-hamburger"
        onClick={onMenuToggle}
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
      >
        <HamburgerIcon open={menuOpen} />
      </button>

      <h1 className="dp-title">{title}</h1>

      {actions && <div className="dp-topbar-actions">{actions}</div>}
    </div>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────
export default function DashLayout({ active, title, actions, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);
  const toggleSidebar = () => setSidebarOpen(o => !o);

  return (
    <div className="dp-root">
      {/* Mobile overlay — tap to close sidebar */}
      <div
        className={`dp-sidebar-overlay${sidebarOpen ? ' active' : ''}`}
        onClick={closeSidebar}
      />

      <DashSidebar active={active} isOpen={sidebarOpen} onClose={closeSidebar} />

      <div className="dp-main">
        <DashTopBar
          title={title}
          actions={actions}
          onMenuToggle={toggleSidebar}
          menuOpen={sidebarOpen}
        />
        <div className="dp-content dp-content-page">
          {children}
        </div>
      </div>
    </div>
  );
}

export { Ic };
