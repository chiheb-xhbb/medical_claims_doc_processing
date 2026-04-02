import { useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';

function MainLayout({ children }) {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  return (
    <div
      className="d-flex flex-column"
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-bg-page)',
      }}
    >
      <Navbar />

      <main
        className="flex-grow-1"
        style={{ paddingTop: isLoginPage ? 0 : 'var(--navbar-height)' }}
      >
        {children}
      </main>
    </div>
  );
}

export default MainLayout;
