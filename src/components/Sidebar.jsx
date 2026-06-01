import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ activeItem, productCount = 0, barcodeCount = 0, subscription }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  const maxProducts = subscription?.max_products ?? null;
  const usagePct    = maxProducts ? Math.min(100, (productCount / maxProducts) * 100) : 0;
  const isAdmin     = user?.user_type === 'admin';

  const navItem = (to, item, icon, label) => (
    <Link to={to} className={`nav-item${activeItem === item ? ' active' : ''}`}>
      <i className={icon}></i> {label}
    </Link>
  );

  return (
    <div className="sidebar">
      <div className="user-profile">
        <div className={`avatar${isAdmin ? ' admin-avatar' : ''}`}>
          {user?.username ? user.username.charAt(0).toUpperCase() : <i className="fas fa-user"></i>}
        </div>
        <h3>{user?.username}</h3>
        <p className="user-email">{user?.email}</p>
        {isAdmin ? (
          <div className="admin-badge">SYSTEM ADMIN</div>
        ) : (
          <div className={`subscription-badge badge-${user?.subscription_type ?? 'free'}`}>
            {(user?.subscription_type ?? 'free').charAt(0).toUpperCase() + (user?.subscription_type ?? 'free').slice(1)} Plan
          </div>
        )}
      </div>

      <nav className="dashboard-nav">
        {isAdmin && navItem('/admin',     'admin',     'fas fa-shield-alt',  'Admin Panel')}
        {navItem('/dashboard',      'dashboard', 'fas fa-tachometer-alt', 'Dashboard')}
        {navItem('/products',       'products',  'fas fa-box',            'My Products')}
        {navItem('/generate-barcode','generate', 'fas fa-barcode',        'Generate Barcode')}
        {navItem('/my-barcodes',    'barcodes',  'fas fa-th',             'My Barcodes')}
        {navItem('/api-keys',       'api-keys',  'fas fa-key',            'API Keys')}
        <div className="nav-divider"></div>
        {navItem('/profile',        'profile',   'fas fa-user-circle',    'My Profile')}
        {navItem('/settings',       'settings',  'fas fa-cog',            'Settings')}
        <button onClick={handleLogout} className="nav-item nav-item-logout">
          <i className="fas fa-sign-out-alt"></i> Logout
        </button>
      </nav>

      {!isAdmin && (
        <div className="usage-stats">
          <h4>Plan Usage</h4>
          <div className="stat-item">
            <span>Products</span>
            <span>{productCount}{maxProducts ? ` / ${maxProducts}` : ' / ∞'}</span>
          </div>
          {maxProducts && (
            <div className="progress-bar">
              <div className="progress" style={{ width: `${usagePct}%`, backgroundColor: usagePct > 80 ? '#ef4444' : '#4f46e5' }}></div>
            </div>
          )}
          <div className="stat-item">
            <span>Barcodes Generated</span>
            <span>{barcodeCount}</span>
          </div>
          {usagePct > 80 && (
            <Link to="/pricing" className="btn btn-primary btn-sm btn-block" style={{ marginTop: '0.75rem', fontSize: '0.8rem' }}>
              <i className="fas fa-arrow-up"></i> Upgrade Plan
            </Link>
          )}
        </div>
      )}

      {isAdmin && (
        <div className="usage-stats">
          <h4>Quick Stats</h4>
          <div className="stat-item"><span>Total Users</span><span>{productCount}</span></div>
          <div className="stat-item"><span>Total Barcodes</span><span>{barcodeCount}</span></div>
        </div>
      )}
    </div>
  );
}
