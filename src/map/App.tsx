import { useState, useEffect, useCallback, useRef } from 'react'
import { Navigation } from '../components/Navigation'
import { NetworkPlotView } from './components/NetworkPlotView'
import { ResourcesView } from './components/ResourcesView'
import { DefinitionsView } from './components/DefinitionsView'

export type ViewMode = 'network' | 'plot' | 'resources' | 'definitions'

interface MapData {
  people: Record<string, unknown>[]
  organizations: Record<string, unknown>[]
  resources: Record<string, unknown>[]
  relationships?: Record<string, unknown>[]
  edges?: Record<string, unknown>[]
  _meta?: { generated_at: string }
}

function DisclaimerOverlay({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onDismiss()
      }}
    >
      <div
        style={{
          background: 'var(--bg-panel)',
          borderRadius: '8px',
          padding: '1.5rem 2rem',
          maxWidth: '480px',
          width: '90%',
          fontFamily: 'var(--serif)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--mono)',
            fontSize: '13px',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            margin: '0 0 0.75rem',
          }}
        >
          Pre-Launch Beta
        </h2>
        <p style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--text-2)', margin: '0 0 1rem' }}>
          This tool is in a pre-launch beta. We are actively improving data issues and enrichment, as well as adding new
          features and improving the UX.
        </p>
        <p style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--text-2)', margin: '0 0 1.25rem' }}>
          Please email us at{' '}
          <a href="mailto:info@mapping-ai.org" style={{ color: 'var(--accent)' }}>
            info@mapping-ai.org
          </a>{' '}
          if you'd like to contribute or provide any feedback.
        </p>
        <button
          onClick={onDismiss}
          style={{
            fontFamily: 'var(--mono)',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            padding: '0.6rem 1.5rem',
            background: 'var(--text-1)',
            color: 'var(--bg-page)',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Continue
        </button>
      </div>
    </div>
  )
}

export function App() {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const hash = window.location.hash.replace('#', '')
    if (hash === 'library') return 'resources'
    if (hash === 'definitions' || hash === 'beliefs') return 'definitions'
    const saved = localStorage.getItem('mapMode')
    if (saved === 'network' || saved === 'plot' || saved === 'resources' || saved === 'definitions') return saved
    return 'network'
  })
  const [data, setData] = useState<MapData | null>(null)
  const [showDisclaimer, setShowDisclaimer] = useState(true)
  const dataRef = useRef<MapData | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/map-data.json').then((r) => r.json()),
      fetch('/map-detail.json')
        .then((r) => r.json())
        .catch(() => ({})),
    ])
      .then(([mapData, detail]) => {
        const all = [...(mapData.people || []), ...(mapData.organizations || []), ...(mapData.resources || [])]
        for (const entity of all) {
          const d = detail[String(entity.id)]
          if (d) Object.assign(entity, d)
        }
        dataRef.current = mapData
        setData(mapData)
      })
      .catch((err) => console.error('Failed to load map data:', err))
  }, [])

  const handleViewChange = useCallback((mode: ViewMode) => {
    setViewMode(mode)
    localStorage.setItem('mapMode', mode)
    if (mode === 'network' || mode === 'plot') {
      setTimeout(() => window.dispatchEvent(new Event('resize')), 50)
    }
  }, [])

  const handleDismissDisclaimer = useCallback(() => {
    setShowDisclaimer(false)
  }, [])

  const isEngineView = viewMode === 'network' || viewMode === 'plot'

  const viewSwitcher = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 16px',
        borderBottom: '1px solid var(--line)',
        fontFamily: 'var(--mono)',
        fontSize: '10px',
        letterSpacing: '0.04em',
        textTransform: 'uppercase' as const,
        background: 'var(--bg-panel)',
      }}
    >
      {(['network', 'plot', 'resources', 'definitions'] as ViewMode[]).map((m) => (
        <button
          key={m}
          onClick={() => handleViewChange(m)}
          style={{
            padding: '4px 10px',
            border: 'none',
            borderRadius: '3px',
            fontFamily: 'inherit',
            fontSize: 'inherit',
            letterSpacing: 'inherit',
            textTransform: 'inherit' as const,
            cursor: 'pointer',
            background: viewMode === m ? 'var(--text-1)' : 'transparent',
            color: viewMode === m ? 'var(--bg-page)' : 'var(--text-3)',
            transition: 'background 0.15s, color 0.15s',
          }}
        >
          {{ network: 'Network', plot: 'Plot', resources: 'Library', definitions: 'Beliefs' }[m]}
        </button>
      ))}
    </div>
  )

  return (
    <>
      <Navigation />

      {showDisclaimer && <DisclaimerOverlay onDismiss={handleDismissDisclaimer} />}

      <div
        style={{
          position: 'fixed',
          top: '48px',
          left: 0,
          right: 0,
          bottom: 0,
          background: 'var(--bg-page)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <NetworkPlotView viewMode={viewMode} onViewChange={handleViewChange} />

          {viewMode === 'resources' && data && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
                display: 'flex',
                flexDirection: 'column',
                background: 'var(--bg-panel)',
                zIndex: 80,
              }}
            >
              {viewSwitcher}
              <div style={{ flex: 1, overflow: 'auto' }}>
                <ResourcesView resources={data.resources as never[]} />
              </div>
            </div>
          )}

          {viewMode === 'definitions' && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
                display: 'flex',
                flexDirection: 'column',
                background: 'var(--bg-panel)',
                zIndex: 80,
              }}
            >
              {viewSwitcher}
              <div style={{ flex: 1, overflow: 'auto' }}>
                <DefinitionsView />
              </div>
            </div>
          )}

          {!isEngineView && (
            <style>{`
              .map-container,
              .zoom-controls,
              #contribute-btn,
              #contribute-panel,
              .controls,
              #sidebar-toggle,
              .tooltip,
              .share-toast,
              .onboarding-overlay,
              #mobile-directory,
              .mobile-banner { display: none !important; }
            `}</style>
          )}
        </div>
      </div>
    </>
  )
}
