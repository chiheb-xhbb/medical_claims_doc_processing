import { Navigate, useLocation } from 'react-router-dom';
import { getStoredRole, getDefaultLandingPath } from '../services/auth';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ children, allowedRoles }) {
  const location = useLocation();
  const { token, isHydrating } = useAuth();

  if (isHydrating) {
    return null;
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const role = getStoredRole();
    const normalizedAllowedRoles = allowedRoles.map((allowedRole) => String(allowedRole).toUpperCase());

    if (!role || !normalizedAllowedRoles.includes(role)) {
      const redirectPath = role ? getDefaultLandingPath(role) : '/login';

      return (
        <Navigate
          to={redirectPath}
          replace
          state={
            redirectPath !== '/login'
              ? {
                  accessDeniedMessage: 'Access denied for your role on this page.',
                  deniedPath: location.pathname
                }
              : null
          }
        />
      );
    }
  }

  return children;
}

export default ProtectedRoute;
