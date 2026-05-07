import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, userType }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading"><i className="fas fa-spinner fa-spin"></i> Loading…</div>;

  if (!user) return <Navigate to="/login" replace />;

  if (userType === 'admin' && user.user_type !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  if (userType === 'user' && user.user_type !== 'user') {
    return <Navigate to="/admin" replace />;
  }

  return children;
}
