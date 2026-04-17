import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import '../styles/global.css'

createRoot(document.getElementById('insights-root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
