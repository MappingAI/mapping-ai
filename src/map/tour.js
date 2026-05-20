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
    onDestroyed: () => markTourSeen('main'),
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
        },
        onHighlightStarted: () => {
          // Find and click Anthropic to demonstrate
          const anthropic = findAnthropicEntity()
          if (anthropic && mapEngine.showDetail) {
            // Small delay to let highlight appear first
            setTimeout(() => {
              mapEngine.showDetail(anthropic, [])
              // Navigate to center on Anthropic
              if (mapEngine.navigateToEntity) {
                mapEngine.navigateToEntity(anthropic.id, 'organization')
              }
            }, 300)
          }
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
        },
      },
      {
        element: '.detail-affiliated',
        popover: {
          title: 'Explore Connections',
          description: 'Click any connection to see relationship details and navigate between entities.',
          side: 'left',
          align: 'start',
        },
        onHighlightStarted: (element) => {
          // If connections section doesn't exist or is empty, skip this step
          if (!element || !element.element || element.element.children.length === 0) {
            tourDriver.moveNext()
          }
        },
      },
      {
        element: '#category-chips',
        popover: {
          title: 'Filter by Category',
          description: 'Click chips to show or hide categories. Use "Select all" to toggle everything at once.',
          side: 'right',
          align: 'start',
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
          description: 'Switch between scatter plot (2D) and bar chart (1D) to see distributions differently.',
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
    onDestroyed: () => markTourSeen('beliefs'),
    steps: [
      {
        element: '.beliefs-container',
        popover: {
          title: 'AGI Definitions',
          description:
            'See how different stakeholders define AGI. Clusters group similar definitions. Click any card to see full details.',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '#beliefs-search',
        popover: {
          title: 'Search Definitions',
          description: 'Find specific people or search for terms like "superintelligence" or "human-level".',
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
 * Reset all tours (for testing)
 */
export function resetTours() {
  localStorage.removeItem(TOUR_STORAGE_KEY)
  // eslint-disable-next-line no-console
  console.info('Tours reset. Refresh the page to see them again.')
}

// Expose reset function for debugging
window.__resetMapTours = resetTours
