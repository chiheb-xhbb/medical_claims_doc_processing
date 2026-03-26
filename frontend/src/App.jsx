import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DocumentValidation from './pages/DocumentValidation';
import DocumentsList from './pages/DocumentsList';
import DocumentUpload from './pages/DocumentUpload';
import DossiersList from './pages/DossiersList';
import DossierCreate from './pages/DossierCreate';
import DossierDetail from './pages/DossierDetail';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { MainLayout } from './layout';
import { setAuthToken } from './utils/setAuthToken';

// Note: All styles are imported in main.jsx to ensure correct load order

function App() {
  // Initialize auth token on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      setAuthToken(token);
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
                ? <Navigate to="/documents" replace />
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
              <ProtectedRoute>
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
              <ProtectedRoute>
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
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}

export default App;
