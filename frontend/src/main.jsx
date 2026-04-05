import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Load Bootstrap before custom styles
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
// CSS variables must load before styles that use them
import './styles/design-tokens.css'
import './styles/common.css'
import './styles/workspace-modals.css'
import './index.css'
import './App.css'

import App from './App.jsx'
import { Toaster, ToastBar } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
      <Toaster position="top-right" containerClassName="app-toaster">
        {(toastInstance) => (
          <ToastBar
            toast={toastInstance}
            style={{
              ...toastInstance.style,
              animation: toastInstance.visible
                ? 'toast-slide-in-right 220ms ease-out'
                : 'toast-slide-out-right 180ms ease-in forwards'
            }}
          />
        )}
      </Toaster>
    </AuthProvider>
  </StrictMode>,
)
