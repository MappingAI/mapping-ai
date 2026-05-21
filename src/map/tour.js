/**
 * Map onboarding tour using Driver.js
 *
 * Tours:
 * - Main tour: Search, click entity (Anthropic), edges, filters, view tabs
 * - Plot tour: Axis controls, 1D toggle (triggered on first Plot click)
 * - Beliefs tour: AGI definitions (triggered on first Beliefs click)
 */

import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

const TOUR_STORAGE_KEY = 'mapping-ai-tours-v1'

function getSeenTours() {
  try {
    return JSON.parse(localStorage.getItem(TOUR_STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

function markTourSeen(tourName) {
  const seen = getSeenTours()
  seen[tourName] = Date.now()
  localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(seen))
}

function shouldShowTour(tourName) {
  return !getSeenTours()[tourName]
}

function isMobile() {
  return window.innerWidth < 768
}

/**
 * Find Anthropic entity in the map data
 */
function findAnthropicEntity() {
  const mapEngine = window.__mapEngine
  if (!mapEngine || !mapEngine.allData) return null

  const orgs = mapEngine.allData.organizations || []
  return orgs.find((o) => o.name === 'Anthropic')
}

/**
 * Main tour - shown on first visit (desktop only)
 */
export function startMainTour() {
  if (isMobile()) return
  if (!shouldShowTour('main')) return

  // Wait for map to be ready
  const mapEngine = window.__mapEngine
  if (!mapEngine) {
    setTimeout(startMainTour, 500)
    return
  }

  const tourDriver = driver({
    showProgress: true,
    progressText: '{{current}} of {{total}}',
    nextBtnText: 'Next',
    prevBtnText: 'Back',
    doneBtnText: 'Done',
    allowClose: true,
    overlayColor: 'rgba(0, 0, 0, 0.6)',
    popoverClass: 'map-tour-popover',
    disableActiveInteraction: true, // Prevent clicking highlighted elements
    onDestroyed: () => {
      markTourSeen('main')
      // Reset selection and recenter map when tour closes
      const engine = window.__mapEngine
      if (engine?.resetSelection) {
        engine.resetSelection()
      }
    },
    steps: [
      {
        element: '#search-input',
        popover: {
          title: 'Find Anyone',
          description: 'Search by name, organization, or topic. Try "OpenAI", "regulation", or "safety".',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#map-container',
        popover: {
          title: 'Click Any Entity',
          description: 'Each dot represents a person, organization, or resource. Click to see details.',
          side: 'top',
          align: 'center',
          onNextClick: (element, step, { driver }) => {
            // Open Anthropic's detail panel before moving to step 3
            const engine = window.__mapEngine
            const anthropic = findAnthropicEntity()
            if (anthropic && engine && engine.showDetail) {
              const anthropicWithType = { ...anthropic, entityType: 'organization' }
              engine.showDetail(anthropicWithType, [])
              if (engine.navigateToEntity) {
                engine.navigateToEntity(anthropic.id, 'organization')
              }
            }
            // Wait for panel to open, then advance
            setTimeout(() => {
              driver.moveNext()
            }, 500)
          },
        },
      },
      {
        element: '#detail-panel',
        popover: {
          title: 'Entity Details',
          description:
            'See their role, affiliations, and AI policy positions. Connected entities are highlighted on the map.',
          side: 'left',
          align: 'start',
          onNextClick: (element, step, { driver }) => {
            // Get Anthropic's ID and find a connected person
            const engine = window.__mapEngine
            const anthropic = engine?.allData?.organizations?.find((o) => o.name === 'Anthropic')
            if (anthropic && engine.showEdgeWithoutNav) {
              // Find a person connected to Anthropic (from the relationships)
              const relationships = engine.allData.relationships || []
              const connectedRel = relationships.find(
                (r) => r.source_id === anthropic.id || r.target_id === anthropic.id
              )
              if (connectedRel) {
                const connectedId = connectedRel.source_id === anthropic.id
                  ? connectedRel.target_id
                  : connectedRel.source_id
                // Show the edge without navigation
                engine.showEdgeWithoutNav(anthropic.id, connectedId)
              }
            }
            setTimeout(() => {
              driver.moveNext()
            }, 500)
          },
          onPrevClick: (element, step, { driver }) => {
            // Going back to step 2 - deselect and recenter
            const engine = window.__mapEngine
            if (engine?.resetSelection) {
              engine.resetSelection()
            }
            setTimeout(() => {
              driver.movePrevious()
            }, 300)
          },
        },
      },
      {
        element: '#detail-panel',
        popover: {
          title: 'Explore Connections',
          description: 'Click any connection to see relationship details and navigate between entities.',
          side: 'left',
          align: 'start',
          onNextClick: (element, step, { driver }) => {
            // Reset selection and close panel before showing filters
            const engine = window.__mapEngine
            if (engine?.resetSelection) {
              engine.resetSelection()
            }
            setTimeout(() => {
              driver.moveNext()
            }, 300)
          },
          onPrevClick: (element, step, { driver }) => {
            // Going back to step 3 - clear edge and re-show Anthropic detail
            const engine = window.__mapEngine
            if (engine?.clearEdgeSelection) {
              engine.clearEdgeSelection()
            }
            const anthropic = engine?.allData?.organizations?.find((o) => o.name === 'Anthropic')
            if (anthropic && engine.showDetail) {
              const anthropicWithType = { ...anthropic, entityType: 'organization' }
              engine.showDetail(anthropicWithType, [])
            }
            setTimeout(() => {
              driver.movePrevious()
            }, 300)
          },
        },
      },
      {
        element: '#category-filters',
        popover: {
          title: 'Filter by Category',
          description: 'Click chips to show or hide categories. Use "Select all" to toggle everything at once.',
          side: 'right',
          align: 'start',
          onPrevClick: (element, step, { driver }) => {
            // Going back to step 4 - re-show edge
            const engine = window.__mapEngine
            const anthropic = engine?.allData?.organizations?.find((o) => o.name === 'Anthropic')
            if (anthropic && engine.showEdgeWithoutNav) {
              const relationships = engine.allData.relationships || []
              const connectedRel = relationships.find(
                (r) => r.source_id === anthropic.id || r.target_id === anthropic.id
              )
              if (connectedRel) {
                const connectedId = connectedRel.source_id === anthropic.id
                  ? connectedRel.target_id
                  : connectedRel.source_id
                // First show Anthropic, then show the edge
                const anthropicWithType = { ...anthropic, entityType: 'organization' }
                engine.showDetail(anthropicWithType, [])
                if (engine.navigateToEntity) {
                  engine.navigateToEntity(anthropic.id, 'organization')
                }
                setTimeout(() => {
                  engine.showEdgeWithoutNav(anthropic.id, connectedId)
                }, 300)
              }
            }
            setTimeout(() => {
              driver.movePrevious()
            }, 500)
          },
        },
        onHighlightStarted: () => {
          // Close detail panel to show filters better
          const panel = document.getElementById('detail-panel')
          if (panel) panel.classList.remove('open')
        },
      },
      {
        element: '.view-mode-toggles',
        popover: {
          title: 'Switch Views',
          description:
            'Network shows connections. Plot shows positions on belief dimensions. Beliefs explores AGI definitions.',
          side: 'bottom',
          align: 'center',
        },
      },
    ],
  })

  // Small delay to let the map fully render
  setTimeout(() => {
    tourDriver.drive()
  }, 800)
}

/**
 * Plot tour - shown when user first clicks Plot view
 */
export function startPlotTour() {
  if (isMobile()) return
  if (!shouldShowTour('plot')) return

  const tourDriver = driver({
    showProgress: true,
    progressText: '{{current}} of {{total}}',
    nextBtnText: 'Next',
    prevBtnText: 'Back',
    doneBtnText: 'Got it',
    allowClose: true,
    overlayColor: 'rgba(0, 0, 0, 0.6)',
    popoverClass: 'map-tour-popover',
    onDestroyed: () => markTourSeen('plot'),
    steps: [
      {
        element: '#axis-controls',
        popover: {
          title: 'Plot Dimensions',
          description:
            'Choose which belief dimensions to compare. X and Y axes can show regulatory stance, AGI timeline, or AI risk level.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#axis-mode-toggles',
        popover: {
          title: '2D or 1D View',
          description: 'Compare two beliefs (2D) or focus on one (1D).',
          side: 'bottom',
          align: 'start',
        },
      },
    ],
  })

  setTimeout(() => {
    tourDriver.drive()
  }, 400)
}

/**
 * Beliefs tour - shown when user first clicks Beliefs view
 */
export function startBeliefsTour() {
  if (isMobile()) return
  if (!shouldShowTour('beliefs')) return

  const tourDriver = driver({
    showProgress: true,
    progressText: '{{current}} of {{total}}',
    nextBtnText: 'Next',
    prevBtnText: 'Back',
    doneBtnText: 'Got it',
    allowClose: true,
    overlayColor: 'rgba(0, 0, 0, 0.6)',
    popoverClass: 'map-tour-popover',
    disableActiveInteraction: true,
    onDestroyed: () => {
      markTourSeen('beliefs')
      // Clear selection when tour closes
      const engine = window.__beliefsEngine
      if (engine?.clearSelection) {
        engine.clearSelection()
      }
    },
    steps: [
      {
        element: '.beliefs-container',
        popover: {
          title: 'AGI Definitions',
          description: 'Each dot is someone\'s definition of AGI. Clusters group similar views. Click any to read it.',
          side: 'top',
          align: 'center',
          onNextClick: (element, step, { driver }) => {
            // Select a notable person to show their definition
            const engine = window.__beliefsEngine
            if (engine?.selectByName) {
              // Try a few notable names
              engine.selectByName('Sam Altman') ||
                engine.selectByName('Dario Amodei') ||
                engine.selectByName('Demis Hassabis')
            }
            setTimeout(() => {
              driver.moveNext()
            }, 400)
          },
        },
      },
      {
        element: '.beliefs-detail-sidebar',
        popover: {
          title: 'Their Definition',
          description: 'See exactly how they define AGI, with the original source linked.',
          side: 'left',
          align: 'start',
          onPrevClick: (element, step, { driver }) => {
            // Clear selection when going back
            const engine = window.__beliefsEngine
            if (engine?.clearSelection) {
              engine.clearSelection()
            }
            setTimeout(() => {
              driver.movePrevious()
            }, 300)
          },
        },
      },
    ],
  })

  setTimeout(() => {
    tourDriver.drive()
  }, 400)
}

/**
 * Reset all tours (for testing)
 */
export function resetTours() {
  localStorage.removeItem(TOUR_STORAGE_KEY)
  // eslint-disable-next-line no-console
  console.info('Tours reset. Refresh the page to see them again.')
}

// Expose reset function for debugging
window.__resetMapTours = resetTours
