import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { logout } from '../services/auth';

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();

  // Read authentication directly from localStorage.
  // The component re-renders on route changes, so this is enough here.
  const isAuthenticated = !!localStorage.getItem('auth_token');

  // Check if a path is active (for highlighting)
  const isActive = (path) => {
    if (path === '/documents') {
      return (
        location.pathname === '/documents' ||
        /^\/documents\/\d+\/validate$/.test(location.pathname)
      );
    }

    if (path === '/dossiers') {
      return (
        location.pathname === '/dossiers' ||
        location.pathname === '/dossiers/create' ||
        /^\/dossiers\/\d+$/.test(location.pathname)
      );
    }

    return location.pathname === path;
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Logout still clears local state/token handling even if the API call fails.
    }

    navigate('/login', { replace: true });
  };

  // Hide navbar on login page
  if (location.pathname === '/login') {
    return null;
  }

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
      <div className="container">
        <NavLink
          className="navbar-brand d-flex align-items-center"
          to={isAuthenticated ? '/documents' : '/login'}
        >
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
                    end
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
                  <NavLink
                    className={`nav-link ${isActive('/dossiers') ? 'active' : ''}`}
                    to="/dossiers"
                  >
                    <i className="bi bi-briefcase me-1"></i>
                    Dossiers
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