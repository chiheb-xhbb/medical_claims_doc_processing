import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DocumentValidation from './pages/DocumentValidation';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="bg-light">
        <Routes>
          <Route path="/documents/:id/validate" element={<DocumentValidation />} />
          <Route path="/" element={<Navigate to="/documents/5/validate" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
