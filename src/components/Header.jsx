import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const { user, logout } = useAuth();
  const location         = useLocation();
  const navigate         = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path) => location.pathname === path ? 'active' : '';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="main-header">
      <div className="header-container">
        <Link to="/" className="logo">
          <i className="fas fa-barcode"></i>
          <span>ScanCodeZW</span>
        </Link>

        <nav className={`main-nav${mobileOpen ? ' open' : ''}`}>
          <Link to="/" className={isActive('/')} onClick={() => setMobileOpen(false)}>Home</Link>

          {user ? (
            <>
              {user.user_type === 'admin' ? (
                <>
                  <Link to="/admin" className={isActive('/admin')} onClick={() => setMobileOpen(false)}>
                    <i className="fas fa-tachometer-alt"></i> Admin Dashboard
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/dashboard" className={isActive('/dashboard')} onClick={() => setMobileOpen(false)}>
                    <i className="fas fa-tachometer-alt"></i> Dashboard
                  </Link>
                  <Link to="/products" className={isActive('/products')} onClick={() => setMobileOpen(false)}>
                    <i className="fas fa-box"></i> Products
                  </Link>
                  <Link to="/generate-barcode" className={isActive('/generate-barcode')} onClick={() => setMobileOpen(false)}>
                    <i className="fas fa-barcode"></i> Generate
                  </Link>
                </>
              )}

              <div className="user-dropdown">
                <button className="user-menu">
                  <i className="fas fa-user-circle"></i>
                  {user.user_type === 'admin' ? (
                    <><span className="admin-badge-nav">ADMIN</span> {user.username}</>
                  ) : (
                    user.username
                  )}
                  <i className="fas fa-chevron-down"></i>
                </button>
                <div className="dropdown-content">
                  {user.user_type === 'admin' ? (
                    <>
                      <Link to="/admin"><i className="fas fa-tachometer-alt"></i> Admin Dashboard</Link>
                      <div className="dropdown-divider"></div>
                      <button onClick={handleLogout} style={{ display: 'block', padding: '0.75rem 1rem', color: 'var(--dark-color)', background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', fontSize: '1rem' }}>
                        <i className="fas fa-sign-out-alt"></i> Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <Link to="/dashboard"><i className="fas fa-tachometer-alt"></i> Dashboard</Link>
                      <div className="dropdown-divider"></div>
                      <button onClick={handleLogout} style={{ display: 'block', padding: '0.75rem 1rem', color: 'var(--dark-color)', background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', fontSize: '1rem' }}>
                        <i className="fas fa-sign-out-alt"></i> Logout
                      </button>
                    </>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <Link to="/features" className={isActive('/features')}>Features</Link>
              <Link to="/pricing" className={isActive('/pricing')}>Pricing</Link>
              <Link to="/login" className={isActive('/login')}>Login</Link>
              <Link to="/register" className={`btn btn-primary btn-sm ${isActive('/register')}`}>Sign Up</Link>
            </>
          )}
        </nav>

        <button className="mobile-menu-btn" onClick={() => setMobileOpen(!mobileOpen)}>
          <i className={`fas fa-${mobileOpen ? 'times' : 'bars'}`}></i>
        </button>
      </div>
    </header>
  );
}
