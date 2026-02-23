/**
 * Main layout wrapper with navbar
 * @param {React.ReactNode} children - Page content
 */
import Navbar from '../components/Navbar';

function MainLayout({ children }) {
  return (
    <div 
      className="d-flex flex-column"
      style={{ 
        minHeight: '100vh',
        backgroundColor: 'var(--color-bg-page)'
      }}
    >
      {/* Navigation */}
      <Navbar />
      
      {/* Main Content Area */}
      <main className="flex-grow-1">
        {children}
      </main>
    </div>
  );
}

export default MainLayout;
