/**
 * Map App — minimal React shell.
 *
 * The D3 map engine (engine.js) runs as a classic <script> and manages its
 * own UI entirely. The React app exists to:
 * 1. Participate in the Vite build system
 * 2. Import global CSS (Tailwind)
 * 3. Provide a future integration point when the engine is incrementally
 *    migrated to React components (Phase 6+)
 *
 * The map page keeps its D3 CDN script loaded synchronously in map.html.
 */
export function App() {
  // Engine manages all rendering. React shell is intentionally empty.
  return null
}
