import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DocumentValidation from './pages/DocumentValidation';
import DocumentsList from './pages/DocumentsList';
import DocumentUpload from './pages/DocumentUpload';
import DossiersList from './pages/DossiersList';
import DossierCreate from './pages/DossierCreate';
import DossierDetail from './pages/DossierDetail';
import AdminUsers from './pages/AdminUsers';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { MainLayout } from './layout';
import { setAuthToken } from './utils/setAuthToken';
import { getCurrentUser, getDefaultLandingPath } from './services/auth';

function App() {
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      setAuthToken(token);
      getCurrentUser().catch(() => {
        // handled by interceptor if token is invalid
      });
    }
  }, []);

  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route
            path="/login"
            element={
              localStorage.getItem('auth_token')
                ? <Navigate to={getDefaultLandingPath()} replace />
                : <Login />
            }
          />

          <Route
            path="/documents"
            element={
              <ProtectedRoute>
                <DocumentsList />
              </ProtectedRoute>
            }
          />

          <Route
            path="/documents/upload"
            element={
              <ProtectedRoute allowedRoles={['AGENT', 'GESTIONNAIRE', 'ADMIN']}>
                <DocumentUpload />
              </ProtectedRoute>
            }
          />

          <Route
            path="/documents/:id/validate"
            element={
              <ProtectedRoute>
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
              <ProtectedRoute allowedRoles={['AGENT', 'GESTIONNAIRE', 'ADMIN']}>
                <DossierCreate />
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
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminUsers />
              </ProtectedRoute>
            }
          />

          <Route
            path="/"
            element={
              localStorage.getItem('auth_token')
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