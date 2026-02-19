import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { logout } from '../services/auth';

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication status periodically
  useEffect(() => {
    const hasToken = !!localStorage.getItem('auth_token');
    setIsAuthenticated(hasToken);
  }, [location]);


  // Check if a path is active (for highlighting)
  const isActive = (path) => {
    if (path === '/documents') {
      // Match /documents exactly or /documents/:id/validate
      return location.pathname === '/documents' || location.pathname.match(/^\/documents\/\d+\/validate$/);
    }
    return location.pathname === path;
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      // Logout will clear token even if API call fails
    }
    navigate('/login', { replace: true });
  };

  // Don't show navbar on login page
  if (location.pathname === '/login') {
    return null;
  }

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
      <div className="container">
        <NavLink className="navbar-brand d-flex align-items-center" to={isAuthenticated ? '/documents' : '/login'}>
          <i className="bi bi-file-medical me-2"></i>
          MedDocs
        </NavLink>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto">
            {isAuthenticated ? (
              <>
                <li className="nav-item">
                  <NavLink
                    className={`nav-link ${isActive('/documents') ? 'active' : ''}`}
                    to="/documents"
                  >
                    <i className="bi bi-files me-1"></i>
                    Documents
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink
                    className={`nav-link ${location.pathname === '/documents/upload' ? 'active' : ''}`}
                    to="/documents/upload"
                  >
                    <i className="bi bi-cloud-upload me-1"></i>
                    Upload
                  </NavLink>
                </li>
                <li className="nav-item">
                  <button
                  className="nav-link btn btn-link text-white"
                  onClick={handleLogout}
                  >
                  <i className="bi bi-box-arrow-right me-1"></i>
                    Logout
                  </button>
                </li>
              </>
            ) : (
              <li className="nav-item">
                <NavLink
                  className={`nav-link ${location.pathname === '/login' ? 'active' : ''}`}
                  to="/login"
                >
                  <i className="bi bi-box-arrow-in-right me-1"></i>
                  Login
                </NavLink>
              </li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
