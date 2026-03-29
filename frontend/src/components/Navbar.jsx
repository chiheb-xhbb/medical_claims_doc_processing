import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AUTH_CHANGED_EVENT, getDefaultLandingPath, getStoredRole, isAuthenticated, logout } from '../services/auth';

const getDossiersNavLabel = (role) => {
  if (role === 'AGENT') {
    return 'My Dossiers';
  }

  if (role === 'GESTIONNAIRE') {
    return 'Dossiers to Review';
  }

  if (role === 'ADMIN') {
    return 'All Dossiers';
  }

  return 'Dossiers';
};

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [authSnapshot, setAuthSnapshot] = useState(() => ({
    authenticated: isAuthenticated(),
    role: getStoredRole()
  }));

  useEffect(() => {
    const syncAuth = () => {
      setAuthSnapshot({
        authenticated: isAuthenticated(),
        role: getStoredRole()
      });
    };

    window.addEventListener(AUTH_CHANGED_EVENT, syncAuth);
    window.addEventListener('storage', syncAuth);

    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, syncAuth);
      window.removeEventListener('storage', syncAuth);
    };
  }, []);

  const dossiersNavLabel = useMemo(() => getDossiersNavLabel(authSnapshot.role), [authSnapshot.role]);

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

    if (path === '/admin/users') {
      return location.pathname === '/admin/users';
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
          to={authSnapshot.authenticated ? getDefaultLandingPath(authSnapshot.role) : '/login'}
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
            {authSnapshot.authenticated ? (
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

                {authSnapshot.role !== 'GESTIONNAIRE' && (
                  <li className="nav-item">
                    <NavLink
                      className={`nav-link ${location.pathname === '/documents/upload' ? 'active' : ''}`}
                      to="/documents/upload"
                    >
                      <i className="bi bi-cloud-upload me-1"></i>
                      Upload Documents
                    </NavLink>
                  </li>
                )}

                <li className="nav-item">
                  <NavLink
                    className={`nav-link ${isActive('/dossiers') ? 'active' : ''}`}
                    to="/dossiers"
                  >
                    <i className="bi bi-briefcase me-1"></i>
                    {dossiersNavLabel}
                  </NavLink>
                </li>

                {authSnapshot.role === 'ADMIN' && (
                  <li className="nav-item">
                    <NavLink
                      className={`nav-link ${isActive('/admin/users') ? 'active' : ''}`}
                      to="/admin/users"
                    >
                      <i className="bi bi-people me-1"></i>
                      User Management
                    </NavLink>
                  </li>
                )}

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
