// D3 is loaded as a global via CDN script tag in map.html.
// eslint does not process .d.ts files, so this is the correct
// place to declare globals that lack published type packages.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const d3: any

interface Window {
  __mapEngine?: {
    showDetail?: (entity: unknown, edges: unknown[]) => void
    allData?: unknown
  }
}
