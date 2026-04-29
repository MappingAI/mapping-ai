import { useEffect, useRef, useState } from 'react'

interface NetworkPlotViewProps {
  viewMode: 'network' | 'plot'
}

export function NetworkPlotView({ viewMode }: NetworkPlotViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<{ destroy: () => void } | null>(null)
  const [engineLoaded, setEngineLoaded] = useState(false)

  useEffect(() => {
    if (!containerRef.current || engineRef.current) return

    import('../engine.js').then((mod) => {
      if (containerRef.current) {
        engineRef.current = mod.initMapEngine()
        setEngineLoaded(true)
      }
    })

    return () => {
      if (engineRef.current) {
        engineRef.current.destroy()
        engineRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!engineLoaded) return
    const event = new CustomEvent('map:viewModeChange', { detail: { viewMode } })
    window.dispatchEvent(event)
  }, [viewMode, engineLoaded])

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <button id="sidebar-toggle" title="Show controls" style={{ display: 'none' }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
          <polyline points="5,2 10,7 5,12" />
        </svg>
        Controls
      </button>

      <div className="controls">
        <div className="control-group" style={{ position: 'relative', zIndex: 100 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'nowrap' }}>
            <button
              id="sidebar-collapse"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-3)',
                padding: '2px',
                flexShrink: 0,
                lineHeight: 1,
              }}
              title="Collapse sidebar"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polyline points="9,2 4,7 9,12" />
              </svg>
            </button>
            <div className="search-box">
              <svg
                className="search-icon"
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                className="search-input"
                id="search-input"
                type="text"
                placeholder="Search entities..."
                autoComplete="off"
              />
              <div className="search-results" id="search-results"></div>
            </div>
          </div>
        </div>

        <div className="control-group">
          <h3>View</h3>
          <div className="view-toggles" id="network-sub-tabs">
            <button className="view-btn active" data-view="all">
              All
            </button>
            <button className="view-btn" data-view="orgs">
              Orgs
            </button>
            <button className="view-btn" data-view="people">
              People
            </button>
          </div>
          <div className="view-toggles" id="plot-sub-tabs" style={{ display: 'none' }}>
            <button className="view-btn active" data-entity="all">
              All
            </button>
            <button className="view-btn" data-entity="organizations">
              Orgs
            </button>
            <button className="view-btn" data-entity="people">
              People
            </button>
          </div>
        </div>

        <div className="control-group" id="category-filters">
          <h3 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Category</span>
            <span
              className="filter-reset"
              id="category-reset"
              style={{
                fontSize: '8px',
                textTransform: 'none',
                letterSpacing: 0,
                color: 'var(--accent)',
                cursor: 'pointer',
                fontWeight: 400,
              }}
            >
              select all
            </span>
          </h3>
          <div
            id="cluster-excluded-count"
            style={{ fontSize: '10px', color: 'var(--text-3)', marginBottom: '4px', display: 'none' }}
          ></div>
          <div className="filter-chips" id="category-chips"></div>
        </div>

        <div className="control-group" id="stance-legend">
          <h3 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <select
              id="belief-dim-select"
              style={{
                fontFamily: 'var(--mono)',
                fontSize: '9px',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                background: 'transparent',
                color: 'var(--text-1)',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                padding: 0,
                margin: 0,
              }}
            >
              <option value="regulatory_stance">Regulatory Stance</option>
              <option value="agi_timeline">AGI Timeline</option>
              <option value="ai_risk_level">AI Risk Level</option>
            </select>
            <span
              className="filter-reset"
              id="stance-reset"
              style={{
                fontSize: '8px',
                textTransform: 'none',
                letterSpacing: 0,
                color: 'var(--accent)',
                cursor: 'pointer',
                fontWeight: 400,
              }}
            >
              select all
            </span>
          </h3>
          <div className="stance-legend-items" id="stance-legend-items"></div>
        </div>

        <div className="control-group" id="secondary-category-filter" style={{ display: 'none' }}>
          <h3 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Category
            <span
              className="filter-reset"
              id="secondary-category-reset"
              style={{
                fontSize: '8px',
                textTransform: 'none',
                letterSpacing: 0,
                color: 'var(--accent)',
                cursor: 'pointer',
                fontWeight: 400,
              }}
            >
              select all
            </span>
          </h3>
          <div className="filter-chips" id="secondary-category-chips"></div>
        </div>

        <div className="control-group" id="source-type-filter">
          <h3 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Source
            <span
              className="filter-reset"
              id="source-reset"
              style={{
                fontSize: '8px',
                textTransform: 'none',
                letterSpacing: 0,
                color: 'var(--accent)',
                cursor: 'pointer',
                fontWeight: 400,
              }}
            >
              select all
            </span>
          </h3>
          <div className="source-type-items" id="source-type-items">
            <div className="source-type-item" data-source="self">
              <span className="source-type-icon">●</span>
              <span>Self-added</span>
            </div>
            <div className="source-type-item" data-source="connector">
              <span className="source-type-icon">◐</span>
              <span>Connector</span>
            </div>
            <div className="source-type-item" data-source="external">
              <span className="source-type-icon">○</span>
              <span>External</span>
            </div>
          </div>
        </div>

        <div className="control-group" id="axis-controls" style={{ display: 'none' }}>
          <h3>Dimensions</h3>
          <div className="view-toggles" id="axis-mode-toggles">
            <button className="view-btn" data-mode="1d">
              1D
            </button>
            <button className="view-btn active" data-mode="2d">
              2D
            </button>
          </div>
          <h3 style={{ marginTop: '12px' }}>X Axis</h3>
          <select
            id="axis-x-select"
            style={{
              width: '100%',
              padding: '4px 6px',
              background: 'var(--bg-input, var(--bg-panel))',
              color: 'var(--text-1)',
              border: '1px solid var(--line)',
              borderRadius: '4px',
              fontFamily: 'var(--mono)',
              fontSize: '11px',
            }}
          >
            <option value="regulatory_stance">Regulatory Stance</option>
            <option value="agi_timeline">AGI Timeline</option>
            <option value="ai_risk_level">AI Risk Level</option>
          </select>
          <div id="axis-y-group">
            <h3 style={{ marginTop: '12px' }}>Y Axis</h3>
            <select
              id="axis-y-select"
              style={{
                width: '100%',
                padding: '4px 6px',
                background: 'var(--bg-input, var(--bg-panel))',
                color: 'var(--text-1)',
                border: '1px solid var(--line)',
                borderRadius: '4px',
                fontFamily: 'var(--mono)',
                fontSize: '11px',
              }}
            >
              <option value="agi_timeline">AGI Timeline</option>
              <option value="regulatory_stance">Regulatory Stance</option>
              <option value="ai_risk_level">AI Risk Level</option>
            </select>
          </div>
          <p id="axis-excluded-msg" style={{ fontSize: '11px', opacity: 0.6, marginTop: '10px', lineHeight: 1.4 }}></p>
        </div>

        <div className="control-group">
          <button className="info-btn" id="info-btn">
            <span style={{ fontSize: '12px' }}>&#9432;</span> About this map
          </button>
        </div>
        <div
          id="entity-count"
          style={{
            fontFamily: 'var(--mono)',
            fontSize: '9px',
            color: 'var(--text-3)',
            letterSpacing: '0.04em',
            padding: '0.2rem 0.4rem',
          }}
        ></div>
      </div>

      <div className="detail-panel" id="detail-panel" onClick={(e) => e.stopPropagation()}>
        <div className="detail-header-actions">
          <button className="detail-share" id="detail-share" title="Share link to this entity">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
          </button>
          <button className="detail-close" id="detail-close">
            &times;
          </button>
        </div>
        <div id="mobile-split-view" style={{ display: 'none' }}>
          <div id="mini-graph-container" className="mini-graph-container">
            <svg id="mini-graph-svg"></svg>
          </div>
          <div className="mini-graph-banner">Full interactive map on desktop</div>
          <div id="mobile-split-handle" className="mobile-split-handle">
            <span></span>
          </div>
          <div id="mobile-split-detail" className="mobile-split-detail"></div>
        </div>
        <div id="detail-content"></div>
      </div>
      <div className="share-toast" id="share-toast">
        Link copied!
      </div>

      <div className="tooltip" id="tooltip">
        <div className="tooltip-name" id="tooltip-name"></div>
        <div className="tooltip-sub" id="tooltip-sub"></div>
      </div>

      <div className="map-container" id="map-container"></div>

      <div id="mobile-directory" style={{ display: 'none' }}>
        <div id="mobile-hero-toggle" className="mobile-hero-toggle">
          <span>Filters &amp; Overview</span>
          <span className="chevron">&#x25B8;</span>
        </div>
        <div id="mobile-hero-content" className="mobile-hero-content">
          <div id="mobile-hero"></div>
          <div className="mobile-mode-label">Mobile directory — full interactive map on desktop</div>
        </div>
        <div id="mobile-search-bar" className="mobile-search-bar">
          <div className="mobile-search-box">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input id="mobile-search-input" type="text" placeholder="Search entities..." autoComplete="off" />
            <div id="mobile-autocomplete" className="mobile-autocomplete"></div>
          </div>
          <div id="mobile-type-chips" className="mobile-type-chips">
            <button className="mobile-type-chip active" data-type="all">
              All
            </button>
            <button className="mobile-type-chip" data-type="person">
              People
            </button>
            <button className="mobile-type-chip" data-type="organization">
              Orgs
            </button>
            <button className="mobile-type-chip" data-type="connected" title="Entities with connections">
              ⌁ Connected
            </button>
            <span style={{ flex: 1 }}></span>
            <button id="mobile-explore-btn" className="mobile-explore-btn" title="Open a random well-connected entity">
              <svg
                width="12"
                height="12"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                <circle cx="3" cy="3" r="2" />
                <circle cx="11" cy="3" r="2" />
                <circle cx="7" cy="11" r="2" />
                <line x1="4.5" y1="4" x2="6" y2="9.5" />
                <line x1="9.5" y1="4" x2="8" y2="9.5" />
              </svg>
              Explore
            </button>
          </div>
        </div>
        <div id="mobile-active-filters" className="mobile-active-filters"></div>
        <div id="mobile-card-list" className="mobile-card-list"></div>
        <div id="mobile-no-results" className="mobile-no-results" style={{ display: 'none' }}>
          No matching entities
        </div>
      </div>

      <div className="zoom-controls">
        <button className="zoom-btn" id="zoom-in">
          +
        </button>
        <button className="zoom-btn" id="zoom-out">
          &minus;
        </button>
        <button className="zoom-btn" id="zoom-reset" style={{ fontSize: '11px' }}>
          &#9678;
        </button>
      </div>

      <button id="contribute-btn">+ Add to Map</button>
      <div id="contribute-panel">
        <div id="contribute-header">
          <span>Add to map</span>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button onClick={() => window.open('/contribute', '_blank')}>Open full page ↗</button>
            <button id="contribute-close">Close ✕</button>
          </div>
        </div>
        <iframe src="/contribute.html" style={{ width: '100%', flex: 1, border: 'none' }} title="Contribute"></iframe>
      </div>

      <div className="onboarding-overlay" id="onboarding-overlay" style={{ display: 'none' }}>
        <div className="onboarding-card">
          <h2>Welcome to the AI Policy Map</h2>
          <p>An interactive visualization of the people, organizations, and resources shaping U.S. AI governance.</p>
          <div className="onboarding-tips">
            <div className="onboarding-tip">
              <strong>Views:</strong> Switch between Network, Plot, Library, and Definitions using the tabs above.
            </div>
            <div className="onboarding-tip">
              <strong>Filters:</strong> Use Category chips and Regulatory Stance legend to show/hide groups.
            </div>
            <div className="onboarding-tip">
              <strong>Search:</strong> Type to find any entity. Supports related terms.
            </div>
            <div className="onboarding-tip">
              <strong>Interact:</strong> Click any node to see details. Scroll to zoom. Drag to pan.
            </div>
          </div>
          <button className="onboarding-dismiss" id="onboarding-dismiss">
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
