import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DocumentValidation from './pages/DocumentValidation';
import DocumentsList from './pages/DocumentsList';
import DocumentUpload from './pages/DocumentUpload';
import Navbar from './components/Navbar';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="bg-light" style={{ minHeight: '100vh' }}>
        <Navbar />
        <Routes>
          <Route path="/documents" element={<DocumentsList />} />
          <Route path="/documents/upload" element={<DocumentUpload />} />
          <Route path="/documents/:id/validate" element={<DocumentValidation />} />
          <Route path="/" element={<Navigate to="/documents" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
