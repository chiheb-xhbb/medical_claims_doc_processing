import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AUTH_CHANGED_EVENT, getDefaultLandingPath, getStoredRole, getStoredUser, isAuthenticated, logout } from '../services/auth';

const ROLE_LABELS = {
  AGENT: 'Agent',
  GESTIONNAIRE: 'Gestionnaire',
  ADMIN: 'Admin',
};

const ROLE_BADGE_CLASS = {
  AGENT: 'nb-role-badge--agent',
  GESTIONNAIRE: 'nb-role-badge--gestionnaire',
  ADMIN: 'nb-role-badge--admin',
};

const getDossiersNavLabel = (role) => {
  if (role === 'AGENT') return 'My Dossiers';
  if (role === 'GESTIONNAIRE') return 'Dossiers';
  if (role === 'ADMIN') return 'All Dossiers';
  return 'Dossiers';
};

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [authSnapshot, setAuthSnapshot] = useState(() => ({
    authenticated: isAuthenticated(),
    role: getStoredRole(),
    user: getStoredUser(),
  }));
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const syncAuth = () => {
      setAuthSnapshot({
        authenticated: isAuthenticated(),
        role: getStoredRole(),
        user: getStoredUser(),
      });
    };

    window.addEventListener(AUTH_CHANGED_EVENT, syncAuth);
    window.addEventListener('storage', syncAuth);

    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, syncAuth);
      window.removeEventListener('storage', syncAuth);
    };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  // Close dropdown on route change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset menu when pathname changes
    setDropdownOpen(false);
  }, [location.pathname]);

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
    setDropdownOpen(false);
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

  const userDisplayName = authSnapshot.user?.name || authSnapshot.user?.email || 'User';
  const userInitial = userDisplayName.charAt(0).toUpperCase();
  const roleBadgeClass = ROLE_BADGE_CLASS[authSnapshot.role] || '';
  const roleLabel = ROLE_LABELS[authSnapshot.role] || authSnapshot.role || '';

  return (
    <nav className={`nb-navbar navbar navbar-expand-lg${scrolled ? ' nb-navbar--scrolled' : ''}`} aria-label="Main navigation">
      <div className="container nb-navbar__inner">
        {/* Brand */}
        <NavLink
          className="navbar-brand nb-brand"
          to={authSnapshot.authenticated ? getDefaultLandingPath(authSnapshot.role) : '/login'}
          aria-label="MedDocs home"
        >
          <span className="nb-brand__icon" aria-hidden="true">
            <i className="bi bi-file-medical"></i>
          </span>
          <span className="nb-brand__text">MedDocs</span>
        </NavLink>

        {/* Mobile toggler */}
        <button
          className="navbar-toggler nb-toggler"
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
          {authSnapshot.authenticated ? (
            <>
              {/* Primary nav links */}
              <ul className="navbar-nav nb-nav-links mx-auto">
                <li className="nav-item">
                  <NavLink
                    className={() => `nb-nav-link nav-link${isActive('/documents') ? ' active' : ''}`}
                    to="/documents"
                    end
                  >
                    <i className="bi bi-files" aria-hidden="true"></i>
                    Documents
                  </NavLink>
                </li>

                {['AGENT', 'GESTIONNAIRE', 'ADMIN'].includes(authSnapshot.role) && (
                  <li className="nav-item">
                    <NavLink
                      className={() => `nb-nav-link nav-link${location.pathname === '/documents/upload' ? ' active' : ''}`}
                      to="/documents/upload"
                    >
                      <i className="bi bi-cloud-upload" aria-hidden="true"></i>
                      Upload
                    </NavLink>
                  </li>
                )}

                <li className="nav-item">
                  <NavLink
                    className={() => `nb-nav-link nav-link${isActive('/dossiers') ? ' active' : ''}`}
                    to="/dossiers"
                  >
                    <i className="bi bi-briefcase" aria-hidden="true"></i>
                    {dossiersNavLabel}
                  </NavLink>
                </li>

                {authSnapshot.role === 'ADMIN' && (
                  <li className="nav-item">
                    <NavLink
                      className={() => `nb-nav-link nav-link${isActive('/admin/users') ? ' active' : ''}`}
                      to="/admin/users"
                    >
                      <i className="bi bi-people" aria-hidden="true"></i>
                      Users
                    </NavLink>
                  </li>
                )}
              </ul>

              {/* Divider + User area */}
              <div className="nb-user-area" ref={dropdownRef}>
                <div className="nb-user-divider" role="separator" aria-hidden="true"></div>

                <button
                  className="nb-user-trigger"
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  aria-haspopup="true"
                  aria-expanded={dropdownOpen}
                  aria-label="User menu"
                  id="nb-user-menu-btn"
                >
                  <span className="nb-user-avatar" aria-hidden="true">{userInitial}</span>
                  <span className="nb-user-info">
                    <span className="nb-user-name">{userDisplayName}</span>
                    {roleLabel && (
                      <span className={`nb-role-badge ${roleBadgeClass}`}>{roleLabel}</span>
                    )}
                  </span>
                  <i className={`bi bi-chevron-down nb-chevron ${dropdownOpen ? 'nb-chevron--open' : ''}`} aria-hidden="true"></i>
                </button>

                {dropdownOpen && (
                  <div className="nb-dropdown" role="menu" aria-labelledby="nb-user-menu-btn">
                    <div className="nb-dropdown__header">
                      <span className="nb-dropdown__name">{userDisplayName}</span>
                      {roleLabel && (
                        <span className={`nb-role-badge ${roleBadgeClass}`}>{roleLabel}</span>
                      )}
                    </div>
                    <div className="nb-dropdown__divider" role="separator"></div>
                    <button
                      className="nb-dropdown__item nb-dropdown__item--danger"
                      onClick={handleLogout}
                      role="menuitem"
                    >
                      <i className="bi bi-box-arrow-right" aria-hidden="true"></i>
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <ul className="navbar-nav ms-auto">
              <li className="nav-item">
                <NavLink
                  className={`nb-nav-link nav-link ${location.pathname === '/login' ? 'active' : ''}`}
                  to="/login"
                >
                  <i className="bi bi-box-arrow-in-right" aria-hidden="true"></i>
                  Login
                </NavLink>
              </li>
            </ul>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
