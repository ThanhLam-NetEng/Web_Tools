import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AmbientBackground } from './components/AmbientBackground.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AmbientBackground />
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
