import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

// Wrap any route element that requires a logged-in user:
//   <Route path="/dashboard" element={
//     <ProtectedRoute><Dashboard /></ProtectedRoute>
//   } />
//
// Optionally restrict to specific roles:
//   <ProtectedRoute allowedRoles={['Faculty', 'Administrator']}>
//
// Guest/Public routes (e.g. the future Inquiry Assistant) should NOT
// be wrapped in this component at all — they stay open to everyone.
function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, loading, role } = useAuth();
  const location = useLocation();

  if (loading) {
    // Session bootstrap (AuthContext) is still checking for an
    // existing valid token. Avoid redirecting prematurely.
    return <p>Loading...</p>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;