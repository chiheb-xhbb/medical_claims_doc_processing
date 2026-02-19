import { Navigate } from 'react-router-dom';
import { isAuthenticated } from '../services/auth';

/**
 * Protected route wrapper component
 * Redirects to login if user is not authenticated
 */
function ProtectedRoute({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
