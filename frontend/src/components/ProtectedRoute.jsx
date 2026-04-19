import { Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getStoredRole, getDefaultLandingPath } from '../services/auth';
import { useAuth } from '../context/useAuth';

function ProtectedRoute({ children, allowedRoles }) {
  const { t } = useTranslation();
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
                  accessDeniedMessage: t('feedback.forbiddenAction'),
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
