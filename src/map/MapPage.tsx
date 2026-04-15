/**
 * MapPage — React shell for the D3 stakeholder map.
 *
 * The D3 engine (src/map/engine.js, 4,384 lines) is loaded as a classic
 * script in map.html and manages its own DOM. React provides:
 * - The mount context (Vite build, global CSS)
 * - Theme toggle via data-theme attribute
 * - TanStack Query for future data needs
 *
 * The engine's internal UI (controls sidebar, filters, search, detail panel,
 * zoom, plot view) all remain as imperative D3/DOM code. A full React
 * refactor of the map engine is Phase 6+ work.
 */
export function MapPage() {
  // The map engine manages itself — this component is intentionally minimal.
  // It exists to participate in the Vite build and React component tree.
  return null
}
