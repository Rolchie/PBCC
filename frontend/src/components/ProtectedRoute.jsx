import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import DashboardSkeleton from './DashboardSkeleton';

function ProtectedRoute({
  children,
  allowedRoles,
  allowPasswordChange = false,
}) {
  const {
    isAuthenticated,
    loading,
    role,
    mustChangePassword,
  } = useAuth();

  const location = useLocation();

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  // Users with an initial password must finish
  // changing it before opening any dashboard.
  if (mustChangePassword && !allowPasswordChange) {
    return (
      <Navigate
        to="/change-initial-password"
        replace
      />
    );
  }

  // Once the password is changed, the special
  // password-change page is no longer needed.
  if (allowPasswordChange && !mustChangePassword) {
    return <Navigate to="/" replace />;
  }

  if (
    allowedRoles &&
    !allowedRoles.includes(role)
  ) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;