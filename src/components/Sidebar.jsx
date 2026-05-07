import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ activeItem, productCount = 0, barcodeCount = 0, subscription }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  const maxProducts = subscription?.max_products ?? 1;
  const usagePct    = Math.min(100, (productCount / maxProducts) * 100);

  const isAdmin = user?.user_type === 'admin';

  return (
    <div className="sidebar">
      <div className="user-profile">
        <div className={`avatar${isAdmin ? ' admin-avatar' : ''}`}>
          <i className={`fas fa-${isAdmin ? 'user-shield' : 'user'}`}></i>
        </div>
        <h3>{isAdmin ? 'Administrator' : user?.username}</h3>
        <p className="user-email">{user?.email}</p>
        {isAdmin ? (
          <div className="admin-badge">SYSTEM ADMIN</div>
        ) : (
          <div className={`subscription-badge badge-${user?.subscription_type}`}>
            {user?.subscription_type ? user.subscription_type.charAt(0).toUpperCase() + user.subscription_type.slice(1) : ''} Plan
          </div>
        )}
      </div>

      <nav className="dashboard-nav">
        {isAdmin ? (
          <>
            <Link to="/admin" className={`nav-item${activeItem === 'admin' ? ' active' : ''}`}>
              <i className="fas fa-tachometer-alt"></i> Dashboard
            </Link>
            <button onClick={handleLogout} className="nav-item">
              <i className="fas fa-sign-out-alt"></i> Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/dashboard" className={`nav-item${activeItem === 'dashboard' ? ' active' : ''}`}>
              <i className="fas fa-tachometer-alt"></i> Dashboard
            </Link>
            <Link to="/products" className={`nav-item${activeItem === 'products' ? ' active' : ''}`}>
              <i className="fas fa-box"></i> My Products
            </Link>
            <Link to="/generate-barcode" className={`nav-item${activeItem === 'generate' ? ' active' : ''}`}>
              <i className="fas fa-barcode"></i> Generate Barcode
            </Link>
            <button onClick={handleLogout} className="nav-item">
              <i className="fas fa-sign-out-alt"></i> Logout
            </button>
          </>
        )}
      </nav>

      {isAdmin ? (
        <div className="admin-stats">
          <h4>Quick Stats</h4>
          <div className="stat-item"><span>Total Users</span><span>{productCount}</span></div>
          <div className="stat-item"><span>Total Barcodes</span><span>{barcodeCount}</span></div>
          <div className="stat-item"><span>Active Plans</span><span>3</span></div>
        </div>
      ) : (
        <div className="usage-stats">
          <h4>Usage Stats</h4>
          <div className="stat-item">
            <span>Products</span>
            <span>{productCount} / {maxProducts}</span>
          </div>
          <div className="progress-bar">
            <div className="progress" style={{ width: `${usagePct}%` }}></div>
          </div>
          <div className="stat-item">
            <span>Barcodes Generated</span>
            <span>{barcodeCount}</span>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="admin-warning" style={{ marginTop: '1rem' }}>
          <i className="fas fa-exclamation-triangle"></i>
          <strong>Security Note:</strong> This is the admin dashboard. User accounts cannot access this area.
        </div>
      )}
    </div>
  );
}
