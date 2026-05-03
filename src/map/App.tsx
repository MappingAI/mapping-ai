import { useEffect, useState, useCallback, useRef } from 'react'
import { DefinitionsView, Legend } from './components/DefinitionsView'
import type { DefinitionsDataPayload } from './components/DefinitionsView'

type ReactView = 'definitions' | null

export function App() {
  const [reactView, setReactView] = useState<ReactView>(null)
  const [engineMode, setEngineMode] = useState<'network' | 'plot'>(() => {
    const saved = localStorage.getItem('mapMode')
    return saved === 'network' ? 'network' : 'plot'
  })
  const [beliefsSubView, setBeliefsSubView] = useState<string>('map')
  const [beliefsColorMode, setBeliefsColorMode] = useState<string>('cluster')
  const [bannerDismissed, setBannerDismissed] = useState(() => localStorage.getItem('mobileBannerDismissed') === '1')
  const [defData, setDefData] = useState<DefinitionsDataPayload | null>(null)
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)

  const handleDefDataLoaded = useCallback((payload: DefinitionsDataPayload) => {
    setDefData(payload)
  }, [])

  const engineRef = useRef<{ destroy: () => void } | null>(null)
  useEffect(() => {
    if (engineRef.current) return
    let cancelled = false

    import('./engine.js')
      .then(({ initMapEngine }) => {
        if (cancelled) return
        engineRef.current = initMapEngine()
      })
      .catch((err) => console.error('Failed to load map engine:', err))

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    function handleEngineModeClick(e: Event) {
      const btn = (e.target as HTMLElement).closest('.mode-btn[data-mode]') as HTMLElement | null
      if (btn?.dataset.mode) {
        setEngineMode(btn.dataset.mode as 'network' | 'plot')
        setReactView(null)
      }
    }
    document.addEventListener('click', handleEngineModeClick)
    return () => document.removeEventListener('click', handleEngineModeClick)
  }, [])

  useEffect(() => {
    document.body.classList.toggle('react-view-active', reactView !== null)
  }, [reactView])

  const activateReactView = useCallback((view: 'definitions') => {
    document.querySelectorAll('.mode-btn').forEach((btn) => btn.classList.remove('active'))
    setReactView(view)
  }, [])

  return (
    <>
      <style>{`#source-type-filter { display: none !important; }`}</style>
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
          <a href="/insights">Insights</a>
          <a href="/about">About</a>
        </div>
        <button className="theme-toggle" id="theme-toggle" title="Toggle dark/light mode">
          &#9790;
        </button>
      </nav>

      {!bannerDismissed && (
        <div className="mobile-banner" id="mobile-banner">
          <span>Best viewed on desktop for the full interactive experience</span>
          <button
            onClick={() => {
              localStorage.setItem('mobileBannerDismissed', '1')
              setBannerDismissed(true)
            }}
          >
            &#10005;
          </button>
        </div>
      )}

      <div className="onboarding-overlay" id="onboarding-overlay" style={{ display: 'none' }}>
        <div className="onboarding-card">
          <h2>Welcome to the AI Policy Map</h2>
          <p>An interactive visualization of the people, organizations, and resources shaping U.S. AI governance.</p>
          <div className="onboarding-tips">
            <div className="onboarding-tip">
              <strong>Network:</strong> Force-directed graph of stakeholders. Sub-tabs filter by All, Orgs, or People.
              Click any node to see details and connections. Scroll to zoom, drag to pan.
            </div>
            <div className="onboarding-tip">
              <strong>Plot:</strong> Scatter chart positioning entities along belief dimensions (regulatory stance, AGI
              timeline, AI risk level). Switch axes and entity types with the controls below.
            </div>
            <div className="onboarding-tip">
              <strong>Beliefs:</strong> Explore how stakeholders define AGI. Sub-views include a cluster map, list,
              scatter projection, stacked timeline, and per-cluster trend sparklines. Color by cluster, category, or
              belief dimension.
            </div>
            <div className="onboarding-tip">
              <strong>Filters &amp; Search:</strong> Use category chips and the stance legend to show or hide groups.
              Search supports related terms (e.g., &quot;safety&quot; finds alignment orgs too).
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
            <button
              className={`mode-btn${!reactView && engineMode === 'network' ? ' active' : ''}`}
              data-mode="network"
            >
              <svg
                width="14"
                height="14"
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
              Network
            </button>
            <button className={`mode-btn${!reactView && engineMode === 'plot' ? ' active' : ''}`} data-mode="plot">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="3" cy="10" r="1.5" fill="currentColor" />
                <circle cx="6" cy="5" r="1.5" fill="currentColor" />
                <circle cx="10" cy="8" r="1.5" fill="currentColor" />
                <circle cx="11" cy="3" r="1.5" fill="currentColor" />
              </svg>
              Plot
            </button>
            <button
              className={`mode-btn${reactView === 'definitions' ? ' active' : ''}`}
              onClick={() => activateReactView('definitions')}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                <circle cx="4" cy="4" r="2" />
                <circle cx="10" cy="4" r="2" />
                <circle cx="4" cy="10" r="2" />
                <circle cx="10" cy="10" r="2" />
              </svg>
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
        <div className="control-group" id="beliefs-sub-tabs" style={{ display: 'none' }}>
          <h3>Sub-view</h3>
          <div className="filter-chips">
            {(
              [
                { key: 'map', label: 'Map' },
                { key: 'list', label: 'List' },
                { key: 'scatter', label: 'Scatter' },
                { key: 'timeline', label: 'Timeline' },
                { key: 'trends', label: 'Trends' },
              ] as const
            ).map((v) => (
              <button
                key={v.key}
                className={'view-btn' + (beliefsSubView === v.key ? ' active' : '')}
                onClick={() => setBeliefsSubView(v.key)}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
        <div
          className="control-group"
          id="beliefs-color-tabs"
          style={{
            display:
              reactView === 'definitions' && (beliefsSubView === 'map' || beliefsSubView === 'scatter')
                ? undefined
                : 'none',
          }}
        >
          <h3>Color by</h3>
          <div className="filter-chips">
            {(
              [
                { value: 'cluster', label: 'Cluster' },
                { value: 'category', label: 'Category' },
                { value: 'stance', label: 'Stance' },
                { value: 'timeline', label: 'Timeline' },
                { value: 'risk', label: 'Risk' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                className={'view-btn' + (beliefsColorMode === opt.value ? ' active' : '')}
                onClick={() => setBeliefsColorMode(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        {reactView === 'definitions' && (beliefsSubView === 'map' || beliefsSubView === 'scatter') && (
          <div className="control-group" id="beliefs-legend">
            <h3>Legend</h3>
            <Legend
              data={defData?.data ?? null}
              colorMode={beliefsColorMode as 'cluster' | 'category' | 'stance' | 'timeline' | 'risk'}
              setHoveredCategory={setHoveredCategory}
              categories={defData?.categories ?? []}
            />
          </div>
        )}
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
          <details style={{ marginTop: '6px' }}>
            <summary
              style={{
                fontFamily: 'var(--mono)',
                fontSize: '9px',
                color: 'var(--text-3)',
                cursor: 'pointer',
                letterSpacing: '0.04em',
                listStyle: 'none',
              }}
            >
              ↗ Adjacent tools &amp; resources
            </summary>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '4px',
                marginTop: '6px',
              }}
            >
              {[
                { name: 'AI Policy Network', url: 'https://theaipn.org/', desc: 'Policy community network and events' },
                {
                  name: 'AI Regulation Map',
                  url: 'https://airegulationmap.org/',
                  desc: 'Global AI regulation tracker',
                },
                {
                  name: 'AI Stakeholder Map',
                  url: 'https://gaberoni24.github.io/AI_Stakeholder_Map/',
                  desc: 'Interactive AI stakeholder landscape visualization',
                },
                {
                  name: 'Policy Tracker Tracker',
                  url: 'https://ai-policy-tracker-tracker.vercel.app/',
                  desc: 'Index of AI policy tracking tools',
                },
                {
                  name: 'Powered by Who',
                  url: 'https://poweredbywho.com/map',
                  desc: 'Who powers AI systems and decisions',
                },
                { name: 'Policy Hub', url: 'https://policyhub.us/', desc: 'U.S. AI policy research hub' },
                {
                  name: 'Data Center Watch',
                  url: 'https://www.datacenterwatch.org/',
                  desc: 'Tracking data center expansion and impacts',
                },
                {
                  name: 'AI Campaign Finance',
                  url: 'https://elections.transformernews.ai/',
                  desc: 'AI industry political contributions tracker',
                },
                {
                  name: 'Data Center Impact',
                  url: 'https://datacenterimpactdashboard.com/',
                  desc: 'Environmental and community impact dashboard',
                },
                {
                  name: 'Long-term Wiki',
                  url: 'https://www.longtermwiki.com/',
                  desc: 'Long-term AI safety reference',
                },
                {
                  name: 'Democracy Build',
                  url: 'https://democracybuild.org/',
                  desc: 'Democratic governance of AI',
                },
              ].map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={link.desc}
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: '9px',
                    color: 'var(--text-3)',
                    textDecoration: 'none',
                    padding: '2px 6px',
                    border: '1px solid var(--line)',
                    borderRadius: '3px',
                    lineHeight: '1.4',
                    letterSpacing: '0.02em',
                  }}
                >
                  ↗ {link.name}
                </a>
              ))}
            </div>
          </details>
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
          <div
            id="react-view-container"
            ref={(el) => {
              if (el) {
                const sidebar = document.querySelector('.controls')
                const sidebarRight = sidebar ? sidebar.getBoundingClientRect().right + 8 : 350
                el.style.left = sidebarRight + 'px'
              }
            }}
            style={{
              position: 'fixed',
              top: '48px',
              right: 0,
              bottom: 0,
              overflow: 'auto',
              background: 'var(--bg-page)',
              zIndex: 10,
            }}
          >
            {reactView === 'definitions' && (
              <DefinitionsView
                subView={beliefsSubView}
                colorMode={beliefsColorMode}
                onDataLoaded={handleDefDataLoaded}
                hoveredCategory={hoveredCategory}
              />
            )}
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
    </>
  )
}
