import { createRoot } from 'react-dom/client'
import { App } from './App'
import '../styles/global.css'

// StrictMode disabled - causes double-mount which resets component state
// and triggers visual glitches with D3 charts
createRoot(document.getElementById('insights-root')!).render(<App />)
