import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { PageLoader } from './Feedback';

/**
 * Client-side route guard for UX only. Real enforcement happens in
 * API Gateway (JWT) and in Lambda (group checks).
 */
export default function ProtectedRoute({ role }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader label="Checking your session..." />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (role === 'admin' && !user.isAdmin) return <Navigate to="/student/dashboard" replace />;
  if (role === 'student' && user.isAdmin) return <Navigate to="/admin/dashboard" replace />;
  return <Outlet />;
}

export function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.isAdmin ? '/admin/dashboard' : '/student/dashboard'} replace />;
}
