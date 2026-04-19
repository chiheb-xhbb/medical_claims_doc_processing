import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AUTH_CHANGED_EVENT,
  getDefaultLandingPath,
  getStoredRole,
  getStoredUser,
  isAuthenticated,
  logout,
} from '../services/auth';
import { USER_ROLES, getRoleLabel } from '../constants/domainLabels';
import ChangePasswordModal from './ChangePasswordModal';
import LanguageSwitcher from './LanguageSwitcher';
import companyLogo from '../assets/logo.svg';
import NotificationBellButton from './NotificationBellButton';

const ROLE_BADGE_CLASS = {
  [USER_ROLES.AGENT]: 'nb-role-badge--agent',
  [USER_ROLES.CLAIMS_MANAGER]: 'nb-role-badge--claims-manager',
  [USER_ROLES.SUPERVISOR]: 'nb-role-badge--supervisor',
  [USER_ROLES.ADMIN]: 'nb-role-badge--admin',
};

function Navbar() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [authSnapshot, setAuthSnapshot] = useState(() => ({
    authenticated: isAuthenticated(),
    role: getStoredRole(),
    user: getStoredUser(),
  }));
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownPath, setDropdownPath] = useState(() => location.pathname);
  const [scrolled, setScrolled] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const dropdownRef = useRef(null);

  const isDropdownOpen = dropdownOpen && dropdownPath === location.pathname;

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

  // Close the profile dropdown when clicking outside.
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  const caseFilesNavLabel = useMemo(() => {
    if (authSnapshot.role === USER_ROLES.AGENT) return t('nav.myCaseFiles');
    if (authSnapshot.role === USER_ROLES.ADMIN) return t('nav.allCaseFiles');
    return t('nav.caseFiles');
  }, [authSnapshot.role, t]);

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
      // Local auth cleanup still happens even if the API call fails.
    }

    navigate('/login', { replace: true });
  };

  // Keep auth pages visually clean by hiding the navbar there.
  if (
    location.pathname === '/login' ||
    location.pathname === '/forgot-password' ||
    location.pathname === '/reset-password'
  ) {
    return null;
  }

  const userDisplayName = authSnapshot.user?.name || authSnapshot.user?.email || t('nav.userFallback');
  const userInitial = userDisplayName.charAt(0).toUpperCase();
  const roleBadgeClass = ROLE_BADGE_CLASS[authSnapshot.role] || '';
  const roleLabel = getRoleLabel(authSnapshot.role);

  return (
    <>
      <nav
        className={`nb-navbar navbar navbar-expand-lg${scrolled ? ' nb-navbar--scrolled' : ''}`}
        aria-label={t('accessibility.mainNavigation')}
      >
        <div className="container nb-navbar__inner">
          <NavLink
            className="navbar-brand nb-brand"
            to={authSnapshot.authenticated ? getDefaultLandingPath(authSnapshot.role) : '/login'}
            aria-label={t('nav.homeAria')}
          >
            <img
              src={companyLogo}
              alt="CARTE Assurances"
              className="nb-brand__logo"
            />
            <span className="nb-brand__wordmark">CARTE</span>
          </NavLink>

          <button
            className="navbar-toggler nb-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
            aria-controls="navbarNav"
            aria-expanded="false"
            aria-label={t('accessibility.toggleNavigation')}
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <div className="collapse navbar-collapse" id="navbarNav">
            {authSnapshot.authenticated ? (
              <>
                <ul className="navbar-nav nb-nav-links mx-auto">
                  <li className="nav-item">
                    <NavLink
                      className={() => `nb-nav-link nav-link${isActive('/documents') ? ' active' : ''}`}
                      to="/documents"
                      end
                    >
                      <i className="bi bi-files" aria-hidden="true"></i>
                      {t('nav.documents')}
                    </NavLink>
                  </li>

                  <li className="nav-item">
                    <NavLink
                      className={() => `nb-nav-link nav-link${isActive('/dossiers') ? ' active' : ''}`}
                      to="/dossiers"
                    >
                      <i className="bi bi-briefcase" aria-hidden="true"></i>
                      {caseFilesNavLabel}
                    </NavLink>
                  </li>

                  {authSnapshot.role === USER_ROLES.ADMIN && (
                    <li className="nav-item">
                      <NavLink
                        className={() => `nb-nav-link nav-link${isActive('/admin/users') ? ' active' : ''}`}
                        to="/admin/users"
                      >
                        <i className="bi bi-people" aria-hidden="true"></i>
                        {t('nav.users')}
                      </NavLink>
                    </li>
                  )}
                </ul>

                {/* Bell stays near the user controls, before the profile dropdown. */}
                <div className="nb-user-area" ref={dropdownRef}>
                  <div className="nb-user-divider" role="separator" aria-hidden="true"></div>

                  <LanguageSwitcher />
                  <NotificationBellButton />

                  <button
                    className="nb-user-trigger"
                    onClick={() => {
                      if (isDropdownOpen) {
                        setDropdownOpen(false);
                        return;
                      }

                      setDropdownPath(location.pathname);
                      setDropdownOpen(true);
                    }}
                    aria-haspopup="true"
                    aria-expanded={isDropdownOpen}
                    aria-label={t('accessibility.userMenu')}
                    id="nb-user-menu-btn"
                  >
                    <span className="nb-user-avatar" aria-hidden="true">{userInitial}</span>
                    <span className="nb-user-info">
                      <span className="nb-user-name">{userDisplayName}</span>
                      {roleLabel && (
                        <span className={`nb-role-badge ${roleBadgeClass}`}>{roleLabel}</span>
                      )}
                    </span>
                    <i
                      className={`bi bi-chevron-down nb-chevron ${isDropdownOpen ? 'nb-chevron--open' : ''}`}
                      aria-hidden="true"
                    ></i>
                  </button>

                  {isDropdownOpen && (
                    <div className="nb-dropdown" role="menu" aria-labelledby="nb-user-menu-btn">
                      <div className="nb-dropdown__header">
                        <span className="nb-dropdown__name">{userDisplayName}</span>
                        {roleLabel && (
                          <span className={`nb-role-badge ${roleBadgeClass}`}>{roleLabel}</span>
                        )}
                      </div>

                      <div className="nb-dropdown__divider" role="separator"></div>

                      <button
                        className="nb-dropdown__item"
                        onClick={() => {
                          setDropdownOpen(false);
                          setChangePasswordOpen(true);
                        }}
                        role="menuitem"
                      >
                        <i className="bi bi-shield-lock" aria-hidden="true"></i>
                        {t('userMenu.changePassword')}
                      </button>

                      <div className="nb-dropdown__divider" role="separator"></div>

                      <button
                        className="nb-dropdown__item nb-dropdown__item--danger"
                        onClick={handleLogout}
                        role="menuitem"
                      >
                        <i className="bi bi-box-arrow-right" aria-hidden="true"></i>
                        {t('userMenu.signOut')}
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
                    {t('nav.login')}
                  </NavLink>
                </li>
              </ul>
            )}
          </div>
        </div>
      </nav>

      {changePasswordOpen && (
        <ChangePasswordModal
          isOpen={changePasswordOpen}
          onClose={() => setChangePasswordOpen(false)}
        />
      )}
    </>
  );
}

export default Navbar;