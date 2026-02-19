import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DocumentValidation from './pages/DocumentValidation';
import DocumentsList from './pages/DocumentsList';
import DocumentUpload from './pages/DocumentUpload';
import Login from './pages/Login';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import { setAuthToken } from './utils/setAuthToken';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './App.css';

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
      <div className="bg-light" style={{ minHeight: '100vh' }}>
        <Navbar />
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
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
