import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated, getStoredRole } from '../services/auth';

/**
 * Protected route wrapper component
 * Redirects to login if user is not authenticated
 * Optionally checks if the user's role is allowed
 */
function ProtectedRoute({ children, allowedRoles }) {
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const role = getStoredRole();
    if (!role || !allowedRoles.includes(role)) {
      return (
        <Navigate
          to="/dossiers"
          replace
          state={{
            accessDeniedMessage: 'Access denied for your role on this page.',
            deniedPath: location.pathname
          }}
        />
      );
    }
  }

  return children;
}

export default ProtectedRoute;
