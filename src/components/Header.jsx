import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const { user, logout } = useAuth();
  const location         = useLocation();
  const navigate         = useNavigate();
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const isActive = (path) => location.pathname === path ? 'active' : '';

  const handleLogout = () => { logout(); navigate('/login'); };

  const initials = user?.username ? user.username.charAt(0).toUpperCase() : '?';

  return (
    <header className="main-header">
      <div className="header-container">
        <Link to={user ? '/dashboard' : '/'} className="logo">
          <img src="/assets/brand/logo.png" alt="ScanCodeBQR" className="logo-img" />
        </Link>

        <nav className={`main-nav${mobileOpen ? ' open' : ''}`}>
          <Link to={user ? '/dashboard' : '/'} className={isActive(user ? '/dashboard' : '/')} onClick={() => setMobileOpen(false)}>Home</Link>

          {user ? (
            <>
              {user.isStaff && (
                <Link to="/admin" className={isActive('/admin')} onClick={() => setMobileOpen(false)}>
                  <i className="fas fa-shield-alt"></i> {user.isSuperAdmin ? 'Super Admin' : 'Admin'}
                </Link>
              )}
              <Link to="/dashboard" className={isActive('/dashboard')} onClick={() => setMobileOpen(false)}>
                <i className="fas fa-tachometer-alt"></i> Dashboard
              </Link>
              <Link to="/generate-barcode" className={isActive('/generate-barcode')} onClick={() => setMobileOpen(false)}>
                <i className="fas fa-barcode"></i> Generate
              </Link>

              {/* Avatar dropdown */}
              <div className={`user-dropdown${dropdownOpen ? ' open' : ''}`}>
                <button
                  className="user-menu avatar-menu"
                  onClick={() => setDropdownOpen(d => !d)}
                  aria-expanded={dropdownOpen}
                >
                  <span className="avatar-circle">{initials}</span>
                  <span className="avatar-name">{user.username}</span>
                  {user.isStaff && <span className="admin-badge-nav">{user.isSuperAdmin ? 'SUPER ADMIN' : user.user_type === 'admin' ? 'ADMIN' : 'STAFF'}</span>}
                  <i className={`fas fa-chevron-${dropdownOpen ? 'up' : 'down'}`}></i>
                </button>
                <div className="dropdown-content">
                  <div className="dropdown-header">
                    <strong>{user.username}</strong>
                    <small>{user.email}</small>
                  </div>
                  <div className="dropdown-divider"></div>
                  <Link to="/profile"     onClick={() => { setMobileOpen(false); setDropdownOpen(false); }}><i className="fas fa-user-circle"></i> My Profile</Link>
                  <Link to="/my-barcodes" onClick={() => { setMobileOpen(false); setDropdownOpen(false); }}><i className="fas fa-th"></i> My Barcodes</Link>
                  <Link to="/settings"    onClick={() => { setMobileOpen(false); setDropdownOpen(false); }}><i className="fas fa-cog"></i> Settings</Link>
                  <Link to="/pricing"     onClick={() => { setMobileOpen(false); setDropdownOpen(false); }}><i className="fas fa-crown"></i> Upgrade Plan</Link>
                  <div className="dropdown-divider"></div>
                  <button className="dropdown-logout" onClick={handleLogout}>
                    <i className="fas fa-sign-out-alt"></i> Logout
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <Link to="/features" className={isActive('/features')}>Features</Link>
              <Link to="/pricing"  className={isActive('/pricing')}>Pricing</Link>
              <Link to="/login"    className={isActive('/login')}>Login</Link>
              <Link to="/register" className={`btn btn-primary btn-sm ${isActive('/register')}`} style={{ color: 'white' }}>Sign Up</Link>
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
