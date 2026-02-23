import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Load Bootstrap before custom styles
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
// CSS variables must load before styles that use them
import './styles/design-tokens.css'
import './styles/common.css'
import './index.css'
import './App.css'

import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
