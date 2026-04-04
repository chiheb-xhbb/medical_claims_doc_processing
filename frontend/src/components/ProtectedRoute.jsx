import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated, getStoredRole, getDefaultLandingPath } from '../services/auth';

function ProtectedRoute({ children, allowedRoles }) {
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const role = getStoredRole();
    if (!role || !allowedRoles.includes(role)) {
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
