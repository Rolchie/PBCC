
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import DashboardSkeleton from './DashboardSkeleton';

// Protects routes that require an authenticated PBCC user.
// Optionally restricts access to specific roles.
//
// Guest/Public routes should remain accessible without
// authentication and should not use ProtectedRoute.

function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, loading, role } = useAuth();
  const location = useLocation();

  // Show the PBCC skeleton while checking the user's session.
  if (loading) {
    return <DashboardSkeleton />;
  }

  // Redirect users who are not logged in.
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  // Prevent users from accessing another role's dashboard.
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  // Display the authorized dashboard.
  return children;
}

export default ProtectedRoute;
