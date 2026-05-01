// import { StrictMode } from 'react'  // Temporarily disabled to debug white-flash issue
import { createRoot } from 'react-dom/client'
import { App } from './App'
import '../styles/global.css'

const root = document.getElementById('about-root')
if (root) {
  createRoot(root).render(
    // Temporarily render without StrictMode to test if it's causing the white flash
    <App />,
  )
}
