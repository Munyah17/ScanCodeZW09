import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Features from './pages/Features';
import Pricing from './pages/Pricing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AdminPage from './pages/AdminPage';
import GenerateBarcode from './pages/GenerateBarcode';
import Products from './pages/Products';
import PaymentReturn from './pages/PaymentReturn';
import PaymentCancel from './pages/PaymentCancel';
import CheckoutPage  from './pages/CheckoutPage';
import MyBarcodesPage from './pages/MyBarcodesPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import ApiKeysPage from './pages/ApiKeysPage';
import TeamPage    from './pages/TeamPage';
import DevDashboard from './pages/dev/DevDashboard';
import DevKeys      from './pages/dev/DevKeys';
import DevWallet    from './pages/dev/DevWallet';
import DevUsage     from './pages/dev/DevUsage';
import DevDocs      from './pages/dev/DevDocs';
import { useEffect } from 'react';

// Page transition wrapper component
function PageTransition({ children }) {
  const location = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  
  return <div className="page-transition-wrapper">{children}</div>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PageTransition><Landing /></PageTransition>} />
          <Route path="/features" element={<PageTransition><Features /></PageTransition>} />
          <Route path="/pricing" element={<PageTransition><Pricing /></PageTransition>} />
          <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
          <Route path="/register" element={<PageTransition><Register /></PageTransition>} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute userType="user">
                <PageTransition><Dashboard /></PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/generate-barcode"
            element={
              <ProtectedRoute userType="user">
                <PageTransition><GenerateBarcode /></PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/products"
            element={
              <ProtectedRoute userType="user">
                <PageTransition><Products /></PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-barcodes"
            element={
              <ProtectedRoute userType="user">
                <PageTransition><MyBarcodesPage /></PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute userType="user">
                <PageTransition><ProfilePage /></PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute userType="user">
                <PageTransition><SettingsPage /></PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/api-keys"
            element={
              <ProtectedRoute userType="user">
                <PageTransition><ApiKeysPage /></PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/team"
            element={
              <ProtectedRoute userType="user">
                <PageTransition><TeamPage /></PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute userType="admin">
                <PageTransition><AdminPage /></PageTransition>
              </ProtectedRoute>
            }
          />
          <Route path="/checkout"       element={<PageTransition><CheckoutPage  /></PageTransition>} />
          <Route path="/payment/return" element={<PageTransition><PaymentReturn /></PageTransition>} />
          <Route path="/payment/cancel" element={<PageTransition><PaymentCancel /></PageTransition>} />

          {/* ── Developer Portal (/dev/*) ────────────────────────────────── */}
          <Route path="/dev" element={<ProtectedRoute userType="user"><DevDashboard /></ProtectedRoute>} />
          <Route path="/dev/keys"   element={<ProtectedRoute userType="user"><DevKeys /></ProtectedRoute>} />
          <Route path="/dev/wallet" element={<ProtectedRoute userType="user"><DevWallet /></ProtectedRoute>} />
          <Route path="/dev/usage"  element={<ProtectedRoute userType="user"><DevUsage /></ProtectedRoute>} />
          <Route path="/dev/docs"   element={<ProtectedRoute userType="user"><DevDocs /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
