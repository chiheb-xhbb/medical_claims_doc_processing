import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DocumentValidation from './pages/DocumentValidation';
import DocumentsList from './pages/DocumentsList';
import DossiersList from './pages/DossiersList';
import DossierDetail from './pages/DossierDetail';
import AdminUsers from './pages/AdminUsers';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ProtectedRoute from './components/ProtectedRoute';
import { MainLayout } from './layout';
import { getDefaultLandingPath } from './services/auth';
import { USER_ROLES } from './constants/domainLabels';
import { useAuth } from './context/AuthContext';

function App() {
  const { token, isHydrating } = useAuth();
  const documentWorkspaceRoles = [
    USER_ROLES.AGENT,
    USER_ROLES.CLAIMS_MANAGER,
    USER_ROLES.ADMIN,
  ];

  if (isHydrating) {
    return null;
  }

  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route
            path="/login"
            element={
              token
                ? <Navigate to={getDefaultLandingPath()} replace />
                : <Login />
            }
          />

          <Route
            path="/forgot-password"
            element={
              token
                ? <Navigate to={getDefaultLandingPath()} replace />
                : <ForgotPassword />
            }
          />

          <Route
            path="/reset-password"
            element={
              token
                ? <Navigate to={getDefaultLandingPath()} replace />
                : <ResetPassword />
            }
          />

          <Route
            path="/documents"
            element={
              <ProtectedRoute allowedRoles={documentWorkspaceRoles}>
                <DocumentsList />
              </ProtectedRoute>
            }
          />

          <Route
            path="/documents/upload"
            element={
              <ProtectedRoute allowedRoles={documentWorkspaceRoles}>
                <Navigate to="/documents" replace />
              </ProtectedRoute>
            }
          />

          <Route
            path="/documents/:id/validate"
            element={
              <ProtectedRoute allowedRoles={documentWorkspaceRoles}>
                <DocumentValidation />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dossiers"
            element={
              <ProtectedRoute>
                <DossiersList />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dossiers/create"
            element={
              <ProtectedRoute>
                <Navigate to="/dossiers" replace />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dossiers/:id"
            element={
              <ProtectedRoute>
                <DossierDetail />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN]}>
                <AdminUsers />
              </ProtectedRoute>
            }
          />

          <Route
            path="/"
            element={
              token
                ? <Navigate to={getDefaultLandingPath()} replace />
                : <Navigate to="/login" replace />
            }
          />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}

export default App;
