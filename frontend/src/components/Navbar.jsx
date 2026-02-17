import { NavLink, useLocation } from 'react-router-dom';

function Navbar() {
  const location = useLocation();

  // Check if a path is active (for highlighting)
  const isActive = (path) => {
    if (path === '/documents') {
      // Match /documents exactly or /documents/:id/validate
      return location.pathname === '/documents' || location.pathname.match(/^\/documents\/\d+\/validate$/);
    }
    return location.pathname === path;
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
      <div className="container">
        <NavLink className="navbar-brand d-flex align-items-center" to="/documents">
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
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
