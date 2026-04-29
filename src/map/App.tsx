import { useEffect, useState, useCallback } from 'react'
import { ResourcesView, type Resource } from './components/ResourcesView'
import { DefinitionsView } from './components/DefinitionsView'

type ReactView = 'resources' | 'definitions' | null

export function App() {
  const [reactView, setReactView] = useState<ReactView>(null)
  const [resources, setResources] = useState<Resource[]>([])

  useEffect(() => {
    let engineCleanup: { destroy: () => void } | null = null
    let cancelled = false

    Promise.all([import('./engine.js'), import('./password-gate.js')])
      .then(([{ initMapEngine }, { initPasswordGate }]) => {
        if (cancelled) return
        engineCleanup = initMapEngine()
        initPasswordGate()
      })
      .catch((err) => console.error('Failed to load map engine:', err))

    return () => {
      cancelled = true
      if (engineCleanup) engineCleanup.destroy()
    }
  }, [])

  useEffect(() => {
    Promise.all([
      fetch('/map-data.json').then((r) => (r.ok ? r.json() : null)),
      fetch('/map-detail.json')
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]).then(([mapData, detail]) => {
      if (!mapData?.resources) return
      if (detail) {
        for (const entity of mapData.resources) {
          const d = detail[String(entity.id)]
          if (d) Object.assign(entity, d)
        }
      }
      setResources(mapData.resources)
    })
  }, [])

  useEffect(() => {
    function handleEngineModeClick(e: Event) {
      const btn = (e.target as HTMLElement).closest('.mode-btn[data-mode]')
      if (btn) {
        setReactView(null)
        setTimeout(() => window.dispatchEvent(new Event('resize')), 100)
      }
    }
    document.addEventListener('click', handleEngineModeClick)
    return () => document.removeEventListener('click', handleEngineModeClick)
  }, [])

  const activateReactView = useCallback((view: 'resources' | 'definitions') => {
    document.querySelectorAll('.mode-btn').forEach((btn) => btn.classList.remove('active'))
    setReactView(view)
  }, [])

  return (
    <>
      <nav className="site-nav">
        <a className="nav-brand" href="/">
          Mapping AI
        </a>
        <button className="nav-hamburger" aria-label="Menu">
          <span></span>
          <span></span>
          <span></span>
        </button>
        <div className="nav-links">
          <a href="/">Background</a>
          <a href="/contribute">Contribute</a>
          <a href="/map">Map</a>
          <a href="/about">About</a>
        </div>
        <button className="theme-toggle" id="theme-toggle" title="Toggle dark/light mode">
          &#9790;
        </button>
      </nav>

      <div className="mobile-banner" id="mobile-banner">
        <span>Best viewed on desktop for the full interactive experience</span>
        <button
          onClick={(e) => {
            const el = e.currentTarget.parentElement
            if (el) el.remove()
            localStorage.setItem('mobileBannerDismissed', '1')
          }}
        >
          &#10005;
        </button>
      </div>

      <div className="onboarding-overlay" id="onboarding-overlay" style={{ display: 'none' }}>
        <div className="onboarding-card">
          <h2>Welcome to the AI Policy Map</h2>
          <p>An interactive visualization of the people, organizations, and resources shaping U.S. AI governance.</p>
          <div className="onboarding-tips">
            <div className="onboarding-tip">
              <strong>Views:</strong> Switch between Orgs, People, Resources, All (combined), and Plot (scatter chart)
              using the tabs on the left.
            </div>
            <div className="onboarding-tip">
              <strong>Filters:</strong> Use Category chips and Regulatory Stance legend to show/hide groups. Click
              &quot;select all&quot; to toggle.
            </div>
            <div className="onboarding-tip">
              <strong>Search:</strong> Type to find any entity. Supports related terms (e.g., &quot;safety&quot; finds
              alignment orgs too).
            </div>
            <div className="onboarding-tip">
              <strong>Interact:</strong> Click any node to see details. Scroll to zoom. Drag to pan.
            </div>
            <div className="onboarding-tip">
              <strong>Source:</strong> Data is crowdsourced and admin-reviewed. Belief scores (stance, timeline, risk)
              are weighted averages from submissions.
            </div>
          </div>
          <button
            className="onboarding-dismiss"
            onClick={() => {
              const el = document.getElementById('onboarding-overlay')
              if (el) el.style.display = 'none'
              localStorage.setItem('mapOnboardingSeen', '1')
            }}
          >
            Got it
          </button>
        </div>
      </div>

      <button id="sidebar-toggle" title="Show controls">
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
          <div className="view-mode-toggles" style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
            <button className="mode-btn active" data-mode="network">
              Network
            </button>
            <button className="mode-btn" data-mode="plot">
              Plot
            </button>
            <button
              className={`mode-btn${reactView === 'resources' ? ' active' : ''}`}
              onClick={() => activateReactView('resources')}
            >
              Library
            </button>
            <button
              className={`mode-btn${reactView === 'definitions' ? ' active' : ''}`}
              onClick={() => activateReactView('definitions')}
            >
              Beliefs
            </button>
          </div>
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
            <button className="view-btn" data-view="resources">
              Resources
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
          <div id="search-mode-controls" style={{ display: 'none', marginTop: '0.5rem' }}>
            <h3>Query</h3>
            <textarea
              id="search-mode-input"
              className="search-mode-textarea"
              placeholder="Which academics have testified before Congress on AI?"
              rows={2}
            ></textarea>
            <div className="search-action-row">
              <div className="search-toggle-row">
                <button className="search-toggle-btn" data-method="keyword">
                  Keyword
                </button>
                <button className="search-toggle-btn active" data-method="ai">
                  LLM
                </button>
              </div>
              <button id="search-run-btn" className="search-run-btn">
                Search
              </button>
            </div>
            <div id="search-mode-status" className="search-mode-status"></div>
            <div id="search-summary" className="search-summary" style={{ display: 'none' }}></div>
            <div id="search-controls" className="search-controls" style={{ display: 'none' }}>
              <label className="search-toggle-label">
                <input type="checkbox" id="show-connections-toggle" defaultChecked /> Show connections
              </label>
              <button id="search-clear-btn" className="search-clear-btn">
                Back to full map
              </button>
            </div>
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
              <span className="source-type-icon">&#9679;</span>
              <span>Self-added</span>
            </div>
            <div className="source-type-item" data-source="connector">
              <span className="source-type-icon">&#9680;</span>
              <span>Connector</span>
            </div>
            <div className="source-type-item" data-source="external">
              <span className="source-type-icon">&#9675;</span>
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
          <button
            className="info-btn"
            onClick={() => {
              const el = document.getElementById('onboarding-overlay')
              if (el) el.style.display = 'flex'
            }}
          >
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

      {reactView && (
        <>
          <style>{`
            .map-container { display: none !important; }
            .zoom-controls { display: none !important; }
            #contribute-btn { display: none !important; }
            #contribute-panel { display: none !important; }
            #category-filters { display: none !important; }
            #stance-legend { display: none !important; }
            #source-type-filter { display: none !important; }
            #axis-controls { display: none !important; }
            #secondary-category-filter { display: none !important; }
            #network-sub-tabs { display: none !important; }
            #plot-sub-tabs { display: none !important; }
            #search-mode-controls { display: none !important; }
            #entity-count { display: none !important; }
            .control-group:has(.info-btn) { display: none !important; }
            .controls .control-group:first-child .search-box { display: none !important; }
          `}</style>
          <div
            id="react-view-container"
            style={{
              position: 'fixed',
              top: '48px',
              left: 0,
              right: 0,
              bottom: 0,
              overflow: 'auto',
              background: 'var(--bg-page)',
              zIndex: 10,
              paddingTop: '8px',
            }}
          >
            {reactView === 'resources' && <ResourcesView resources={resources} />}
            {reactView === 'definitions' && <DefinitionsView />}
          </div>
        </>
      )}

      <div id="mobile-directory" style={{ display: 'none' }}>
        <div id="mobile-hero-toggle" className="mobile-hero-toggle">
          <span>Filters &amp; Overview</span>
          <span className="chevron">&#x25B8;</span>
        </div>
        <div id="mobile-hero-content" className="mobile-hero-content">
          <div id="mobile-hero"></div>
          <div className="mobile-mode-label">Mobile directory—full interactive map on desktop</div>
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
              &#x2341; Connected
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
            <button onClick={() => window.open('/contribute', '_blank')}>Open full page &#8599;</button>
            <button id="contribute-close">Close &#10005;</button>
          </div>
        </div>
        <iframe src="/contribute.html" style={{ width: '100%', flex: 1, border: 'none' }} title="Contribute"></iframe>
      </div>

      {/* PASSWORD GATE START */}
      <div
        id="disclaimer-overlay"
        style={{
          display: 'flex',
          position: 'fixed',
          inset: 0,
          zIndex: 10000,
          background: 'rgba(0, 0, 0, 0.5)',
          alignItems: 'center',
          justifyContent: 'center',
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
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
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
            This tool is in a pre-launch beta. We are actively improving data issues and enrichment, as well as adding
            new features and improving the UX.
          </p>
          <p style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--text-2)', margin: '0 0 1.25rem' }}>
            Please email us at{' '}
            <a href="mailto:info@mapping-ai.org" style={{ color: 'var(--accent)' }}>
              info@mapping-ai.org
            </a>{' '}
            if you&apos;d like to contribute or provide any feedback.
          </p>
          <button
            id="disclaimer-dismiss"
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

      <div
        id="lock-overlay"
        style={{
          display: 'none',
          position: 'fixed',
          top: '48px',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 500,
          cursor: 'pointer',
        }}
      ></div>

      <div
        id="password-overlay"
        style={{
          display: 'none',
          position: 'fixed',
          inset: 0,
          zIndex: 10000,
          background: 'rgba(0, 0, 0, 0.5)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            background: 'var(--bg-panel)',
            borderRadius: '8px',
            padding: '1.5rem 2rem',
            maxWidth: '380px',
            width: '90%',
            fontFamily: 'var(--serif)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
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
            Enter Password
          </h2>
          <p style={{ fontSize: '14px', lineHeight: 1.5, color: 'var(--text-2)', margin: '0 0 1rem' }}>
            This tool is in a pre-launch beta. Enter the password to access the full interactive experience.
          </p>
          <input
            id="gate-password"
            type="password"
            placeholder="Password"
            style={{
              width: '100%',
              padding: '0.6rem 0.75rem',
              fontFamily: 'var(--mono)',
              fontSize: '13px',
              background: 'var(--input-bg)',
              color: 'var(--text-1)',
              border: '1px solid var(--line)',
              borderRadius: '4px',
              marginBottom: '0.5rem',
              boxSizing: 'border-box',
            }}
          />
          <div
            id="gate-error"
            style={{
              color: '#dc2626',
              fontSize: '12px',
              fontFamily: 'var(--mono)',
              marginBottom: '0.5rem',
              display: 'none',
            }}
          >
            Incorrect password
          </div>
          <button
            id="gate-submit"
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
              width: '100%',
            }}
          >
            Submit
          </button>
        </div>
      </div>
      {/* PASSWORD GATE END */}
    </>
  )
}
