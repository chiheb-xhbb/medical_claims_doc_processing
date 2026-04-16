import { useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';

const AUTH_LAYOUT_ROUTES = new Set(['/login', '/forgot-password', '/reset-password']);

function MainLayout({ children }) {
  const location = useLocation();
  const isAuthPage = AUTH_LAYOUT_ROUTES.has(location.pathname);

  return (
    <div
      className="d-flex flex-column"
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-bg-page)',
      }}
    >
      {!isAuthPage && <Navbar />}

      <main
        className="flex-grow-1"
        style={{ paddingTop: isAuthPage ? 0 : 'var(--navbar-height)' }}
      >
        {children}
      </main>
    </div>
  );
}

export default MainLayout;
