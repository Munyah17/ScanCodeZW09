import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, userType }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading"><i className="fas fa-spinner fa-spin"></i> Loading…</div>;

  if (!user) return <Navigate to="/login" replace />;

  const staffRoles = ['super_admin', 'admin', 'technical_support', 'clerk', 'assistant', 'finance'];

  if (userType === 'admin' && !staffRoles.includes(user.user_type)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (userType === 'super_admin' && user.user_type !== 'super_admin') {
    return <Navigate to="/dashboard" replace />;
  }

  if (userType === 'admin' && !staffRoles.includes(user.user_type)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
