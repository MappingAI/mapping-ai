/**
 * Map Page AGI Beliefs Cluster View Component
 * A variant of AgiClusterMap optimized for the map page with:
 * - Initials/images on nodes
 * - Sidebar detail panel (not popup)
 * - Filtering support
 * - Search highlighting
 */
import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import {
  type AgiPoint,
  type AgiData,
  type ColorMode,
  CLUSTER_COLORS,
  CATEGORY_COLORS,
  BELIEF_SCALES,
  getPointColor,
  escapeHtml,
} from '../../components/AgiClusterMap'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const d3: any

interface MapBeliefsClusterViewProps {
  data: AgiData
  colorMode: ColorMode
  hoveredCategory?: string | null
  onSelect: (p: AgiPoint) => void
  searchQuery?: string
  highlightedEntityId?: number | null
  selectedEntityId?: number | null
  hiddenClusters?: Set<string>
  hiddenCategories?: Set<string>
  hiddenBeliefValues?: Set<string>
}

export interface MapBeliefsClusterViewRef {
  zoomIn: () => void
  zoomOut: () => void
  zoomReset: () => void
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('')
}

export const MapBeliefsClusterView = forwardRef<MapBeliefsClusterViewRef, MapBeliefsClusterViewProps>(
  function MapBeliefsClusterView(
    {
      data,
      colorMode,
      hoveredCategory,
      onSelect,
      searchQuery,
      highlightedEntityId,
      selectedEntityId,
      hiddenClusters,
      hiddenCategories,
      hiddenBeliefValues,
    },
    forwardedRef,
  ) {
    const ref = useRef<HTMLDivElement>(null)
    // Store zoom behavior and node data for zoom operations
    const zoomRef = useRef<{
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      zoom: any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      svg: any
      nodes: Array<{ entity_id: number; x: number; y: number }>
      vbX: number
      vbY: number
      vbW: number
      vbH: number
    } | null>(null)

    // Expose zoom controls to parent via ref
    useImperativeHandle(
      forwardedRef,
      () => ({
        zoomIn: () => {
          if (!zoomRef.current) return
          const { svg, zoom } = zoomRef.current
          svg.transition().duration(300).call(zoom.scaleBy, 1.5)
        },
        zoomOut: () => {
          if (!zoomRef.current) return
          const { svg, zoom } = zoomRef.current
          svg.transition().duration(300).call(zoom.scaleBy, 0.67)
        },
        zoomReset: () => {
          if (!zoomRef.current) return
          const { svg, zoom } = zoomRef.current
          svg.transition().duration(300).call(zoom.transform, d3.zoomIdentity)
        },
      }),
      [],
    )

    // Main render effect - excludes selectedEntityId to prevent re-render on selection
    useEffect(() => {
      if (!ref.current || !data.clusters) return
      const container = ref.current
      container.innerHTML = ''

      // Hide any stale tooltip from previous render
      const staleTip = document.getElementById('__beliefs-cluster-tip')
      if (staleTip) staleTip.style.opacity = '0'

      const W = container.clientWidth || 700
      const clusters = data.clusters || []

      // Layout in a virtual coordinate space
      const workW = 900
      const workH = 700
      const workPad = 140

      // Get UMAP coordinates for clusters
      const cxExtent = d3.extent(clusters, (c: { cx?: number }) => c.cx ?? 0) as [number, number]
      const cyExtent = d3.extent(clusters, (c: { cy?: number }) => c.cy ?? 0) as [number, number]

      // Scale UMAP coordinates to working space
      const xScale = d3
        .scaleLinear()
        .domain([cxExtent[0] - 0.5, cxExtent[1] + 0.5])
        .range([workPad, workW - workPad])
      const yScale = d3
        .scaleLinear()
        .domain([cyExtent[0] - 0.5, cyExtent[1] + 0.5])
        .range([workH - workPad, workPad])

      // Compute cluster radius based on node count
      function clusterRadius(count: number) {
        const nodeR = 7 // Slightly larger for initials
        const spacing = nodeR * 2.8
        const rings = Math.ceil((-3 + Math.sqrt(9 + 12 * (count - 1))) / 6) || 1
        return rings * spacing + nodeR
      }

      // Create cluster simulation nodes for force layout
      interface ClusterNode {
        id: string
        label: string
        count: number
        x: number
        y: number
        targetX: number
        targetY: number
        radius: number
      }
      const clusterNodes: ClusterNode[] = clusters.map((c) => ({
        id: c.id,
        label: c.label,
        count: c.count,
        x: xScale(c.cx ?? 0),
        y: yScale(c.cy ?? 0),
        targetX: xScale(c.cx ?? 0),
        targetY: yScale(c.cy ?? 0),
        radius: clusterRadius(c.count),
      }))

      // Pre-run most of simulation synchronously for initial layout
      const simulation = d3
        .forceSimulation(clusterNodes)
        .force('x', d3.forceX((d: ClusterNode) => d.targetX).strength(0.3))
        .force('y', d3.forceY((d: ClusterNode) => d.targetY).strength(0.3))
        .force('collide', d3.forceCollide((d: ClusterNode) => d.radius + 35).strength(0.8))
        .stop()

      for (let i = 0; i < 120; i++) simulation.tick()

      // Pack nodes within each cluster using hexagonal grid
      function hexPack(count: number, cx: number, cy: number) {
        const positions: { x: number; y: number }[] = []
        const nodeR = 7
        const spacing = nodeR * 2.8

        // Center node
        positions.push({ x: cx, y: cy })
        let placed = 1

        // Spiral outward in rings
        let ring = 0
        while (placed < count) {
          ring++
          const nodesInRing = ring * 6
          for (let i = 0; i < nodesInRing && placed < count; i++) {
            const angle = (i / nodesInRing) * 2 * Math.PI - Math.PI / 2
            const r = ring * spacing
            positions.push({
              x: cx + r * Math.cos(angle),
              y: cy + r * Math.sin(angle),
            })
            placed++
          }
        }
        return positions
      }

      // Create entity nodes with positions
      const nodes: Array<AgiPoint & { x: number; y: number }> = []
      clusterNodes.forEach((cluster) => {
        const clusterPoints = data.points.filter((p) => p.cluster_id === cluster.id)
        const positions = hexPack(clusterPoints.length, cluster.x, cluster.y)

        clusterPoints.forEach((p, i) => {
          const pos = positions[i] || { x: cluster.x, y: cluster.y }
          nodes.push({ ...p, x: pos.x, y: pos.y })
        })
      })

      // Compute actual bounds from nodes
      const nodeMinX = d3.min(nodes, (d: { x: number }) => d.x) || 0
      const nodeMaxX = d3.max(nodes, (d: { x: number }) => d.x) || workW
      const nodeMinY = d3.min(nodes, (d: { y: number }) => d.y) || 0
      const nodeMaxY = d3.max(nodes, (d: { y: number }) => d.y) || workH

      // Add generous margins for labels
      const marginLeft = 80
      const marginRight = 160
      const marginTop = 60
      const marginBottom = 60

      const vbX = nodeMinX - marginLeft
      const vbY = nodeMinY - marginTop
      const vbW = nodeMaxX - nodeMinX + marginLeft + marginRight
      const vbH = nodeMaxY - nodeMinY + marginTop + marginBottom
      const H = W * (vbH / vbW)

      const svg = d3
        .select(container)
        .append('svg')
        .attr('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`)
        .attr('width', W)
        .attr('height', H)
        .style('overflow', 'visible')

      // Create main group for zoom transforms
      const mainGroup = svg.append('g').attr('class', 'zoom-group')

      // Track current zoom scale for filter logic
      let currentScale = 1

      // Set up zoom behavior - only allow panning when zoomed in
      const zoom = d3
        .zoom()
        .scaleExtent([1, 5])
        .filter((event: { type: string }) => {
          // Always allow programmatic zoom (from buttons)
          if (event.type === 'start' || event.type === 'zoom' || event.type === 'end') return true
          // Block wheel zoom - users must use +/- buttons
          if (event.type === 'wheel') return false
          // Block panning (mousedown/touchstart) unless zoomed in
          if (event.type === 'mousedown' || event.type === 'touchstart') {
            return currentScale > 1
          }
          return true
        })
        .on('zoom', (event: { transform: { k: number; x: number; y: number } }) => {
          currentScale = event.transform.k
          mainGroup.attr('transform', event.transform)
        })

      svg.call(zoom)

      // Reset zoom when clicking on background
      svg.on('click', function (event: MouseEvent) {
        // Only reset if clicking directly on svg (not on a node)
        if (event.target === svg.node()) {
          svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity)
        }
      })

      // Function to zoom to a specific node (like Network view)
      const zoomToNode = (nodeX: number, nodeY: number) => {
        const k = 3 // zoom scale, same as Network view
        // Center the node in the viewport
        // For SVG with viewBox, we need to translate in viewBox coordinates
        const viewCenterX = vbX + vbW / 2
        const viewCenterY = vbY + vbH / 2
        const t = d3.zoomIdentity.translate(viewCenterX, viewCenterY).scale(k).translate(-nodeX, -nodeY)

        svg.transition().duration(500).call(zoom.transform, t)
      }

      // Tooltip
      const tipId = '__beliefs-cluster-tip'
      let tipEl = document.getElementById(tipId) as HTMLDivElement | null
      if (!tipEl) {
        tipEl = document.createElement('div')
        tipEl.id = tipId
        tipEl.className =
          'fixed bg-white border border-[#bbb] rounded px-3 py-2 font-mono text-[11px] text-[#1a1a1a] pointer-events-none z-[9999] max-w-[320px] leading-[1.4]'
        tipEl.style.cssText = 'box-shadow: 0 2px 8px rgba(0,0,0,0.08); opacity: 0; left: 0; top: 0;'
        document.body.appendChild(tipEl)
      }

      // Label positioning with collision avoidance
      const charWidth = 6
      const labelHeight = 14

      interface PlacedLabel {
        x: number
        y: number
        width: number
        height: number
        anchor: string
      }
      const placedLabels: PlacedLabel[] = []

      // Sort clusters by size (largest first)
      const sortedClusters = [...clusterNodes].sort((a, b) => b.count - a.count)

      // Preferred label directions for specific clusters
      const preferredDirections: Record<string, number> = {
        'general-purpose-agents': 2, // top
      }

      sortedClusters.forEach((cluster) => {
        const clusterEntityNodes = nodes.filter((n) => n.cluster_id === cluster.id)
        if (clusterEntityNodes.length === 0) return

        // When coloring by cluster, hide label if cluster is hidden
        if (colorMode === 'cluster' && hiddenClusters?.has(cluster.id)) return

        const cx = cluster.x
        const cy = cluster.y
        const maxR = cluster.radius

        const labelText = clusters.find((c) => c.id === cluster.id)?.label || ''
        const labelW = labelText.length * charWidth

        const directions = [
          { dx: 1, dy: 0, anchor: 'start' },
          { dx: 0.7, dy: -0.7, anchor: 'start' },
          { dx: 0, dy: -1, anchor: 'middle' },
          { dx: -0.7, dy: -0.7, anchor: 'end' },
          { dx: -1, dy: 0, anchor: 'end' },
          { dx: -0.7, dy: 0.7, anchor: 'end' },
          { dx: 0, dy: 1, anchor: 'middle' },
          { dx: 0.7, dy: 0.7, anchor: 'start' },
        ]

        const labelOffset = maxR + 20
        const otherNodes = nodes.filter((n) => n.cluster_id !== cluster.id)

        const preferredIdx = preferredDirections[cluster.id]
        let bestDir = preferredIdx !== undefined ? directions[preferredIdx]! : directions[0]!
        let bestScore = -Infinity

        for (let dirIdx = 0; dirIdx < directions.length; dirIdx++) {
          const dir = directions[dirIdx]!
          const lx = cx + dir.dx * labelOffset
          const ly = cy + dir.dy * labelOffset

          let boxLeft: number, boxRight: number
          if (dir.anchor === 'start') {
            boxLeft = lx
            boxRight = lx + labelW
          } else if (dir.anchor === 'end') {
            boxLeft = lx - labelW
            boxRight = lx
          } else {
            boxLeft = lx - labelW / 2
            boxRight = lx + labelW / 2
          }
          const boxTop = ly - labelHeight / 2
          const boxBottom = ly + labelHeight / 2

          const inBounds =
            boxLeft >= vbX + 5 && boxRight <= vbX + vbW - 5 && boxTop >= vbY + 5 && boxBottom <= vbY + vbH - 5

          if (!inBounds) continue

          let minDistToNodes = Infinity
          for (const n of otherNodes) {
            const checkPoints = [
              { x: boxLeft, y: boxTop },
              { x: boxRight, y: boxTop },
              { x: boxLeft, y: boxBottom },
              { x: boxRight, y: boxBottom },
              { x: lx, y: ly },
            ]
            for (const cp of checkPoints) {
              const dist = Math.sqrt((n.x - cp.x) ** 2 + (n.y - cp.y) ** 2)
              minDistToNodes = Math.min(minDistToNodes, dist)
            }
          }

          let labelCollision = false
          for (const placed of placedLabels) {
            let placedLeft: number, placedRight: number
            if (placed.anchor === 'start') {
              placedLeft = placed.x
              placedRight = placed.x + placed.width
            } else if (placed.anchor === 'end') {
              placedLeft = placed.x - placed.width
              placedRight = placed.x
            } else {
              placedLeft = placed.x - placed.width / 2
              placedRight = placed.x + placed.width / 2
            }
            const placedTop = placed.y - placed.height / 2
            const placedBottom = placed.y + placed.height / 2

            const pad = 8
            if (
              boxLeft < placedRight + pad &&
              boxRight > placedLeft - pad &&
              boxTop < placedBottom + pad &&
              boxBottom > placedTop - pad
            ) {
              labelCollision = true
              break
            }
          }

          const tooCloseToNodes = minDistToNodes < 20
          const preferredBonus = preferredIdx !== undefined && dirIdx === preferredIdx ? 500 : 0
          const score = labelCollision
            ? -2000 + minDistToNodes + preferredBonus
            : tooCloseToNodes
              ? -1000 + minDistToNodes + preferredBonus
              : minDistToNodes + preferredBonus
          if (score > bestScore) {
            bestScore = score
            bestDir = dir
          }
        }

        const labelX = cx + bestDir.dx * labelOffset
        const labelY = cy + bestDir.dy * labelOffset

        placedLabels.push({
          x: labelX,
          y: labelY,
          width: labelW,
          height: labelHeight,
          anchor: bestDir.anchor,
        })

        mainGroup
          .append('text')
          .attr('x', labelX)
          .attr('y', labelY)
          .attr('text-anchor', bestDir.anchor)
          .attr('dominant-baseline', 'middle')
          .attr('font-family', "'DM Mono', monospace")
          .attr('font-size', 10)
          .attr('fill', CLUSTER_COLORS[cluster.id] || '#888')
          .attr('font-weight', 500)
          .attr('opacity', 0.85)
          .text(labelText)
      })

      // Check if node is visible (not filtered out)
      const isVisible = (d: AgiPoint) => {
        if (hiddenClusters?.has(d.cluster_id || '')) return false
        if (hiddenCategories?.has(d.category)) return false
        // Check belief dimension filtering
        if (hiddenBeliefValues && hiddenBeliefValues.size > 0) {
          // When coloring by a belief dimension, filter by that dimension's score
          if (colorMode === 'stance' && d.stance_score != null) {
            if (hiddenBeliefValues.has(`stance:${d.stance_score}`)) return false
          } else if (colorMode === 'timeline' && d.timeline_score != null) {
            if (hiddenBeliefValues.has(`timeline:${d.timeline_score}`)) return false
          } else if (colorMode === 'risk' && d.risk_score != null) {
            if (hiddenBeliefValues.has(`risk:${d.risk_score}`)) return false
          }
        }
        return true
      }

      // Check if node matches search query
      const matchesSearch = (d: AgiPoint) => {
        if (!searchQuery) return true
        const q = searchQuery.toLowerCase()
        return (
          d.name.toLowerCase().includes(q) ||
          d.definition.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q) ||
          (d.cluster_label && d.cluster_label.toLowerCase().includes(q))
        )
      }

      // Check if node is highlighted
      const isHighlighted = (d: AgiPoint) => {
        return highlightedEntityId != null && d.entity_id === highlightedEntityId
      }

      const nodeR = 7

      // Create clipPath definitions for circular images (one per node with thumbnail)
      const defs = svg.append('defs')
      nodes.forEach((d) => {
        if (d.thumbnail_url) {
          defs
            .append('clipPath')
            .attr('id', `clip-entity-${d.entity_id}`)
            .append('circle')
            .attr('r', nodeR - 0.5)
            .attr('cx', 0)
            .attr('cy', 0)
        }
      })

      // Entity groups (for circles with images or initials)
      // Start from cluster center, animate to final hex-packed position
      const clusterCenterMap = new Map(clusterNodes.map((c) => [c.id, { x: c.x, y: c.y }]))
      const nodeGroups = mainGroup
        .selectAll('g.entity')
        .data(nodes)
        .enter()
        .append('g')
        .attr('class', 'entity')
        .attr('transform', (d: AgiPoint & { x: number; y: number }) => {
          const center = clusterCenterMap.get(d.cluster_id || '')
          return center ? `translate(${center.x},${center.y})` : `translate(${d.x},${d.y})`
        })

      // Set styles on the selection (not the transition)
      nodeGroups
        .style('cursor', 'pointer')
        .style('opacity', (d: AgiPoint) => {
          if (!isVisible(d)) return 0
          if (searchQuery) {
            return matchesSearch(d) ? 1 : 0.15
          }
          if (colorMode === 'category' && hoveredCategory && d.category !== hoveredCategory) {
            return 0.15
          }
          return 0.85
        })
        .style('pointer-events', (d: AgiPoint) => (isVisible(d) ? 'auto' : 'none'))

      // Animate transform separately
      nodeGroups
        .transition()
        .duration(800)
        .delay((_d: unknown, i: number) => i * 2)
        .ease(d3.easeCubicOut)
        .attr('transform', (d: { x: number; y: number }) => `translate(${d.x},${d.y})`)

      // Circle backgrounds (always render for color ring)
      nodeGroups
        .append('circle')
        .attr('r', (d: AgiPoint) => (isHighlighted(d) || (searchQuery && matchesSearch(d)) ? nodeR + 2 : nodeR))
        .attr('fill', (d: AgiPoint) => (d.thumbnail_url ? '#fff' : getPointColor(d, colorMode)))
        .attr('stroke', (d: AgiPoint) => {
          if (isHighlighted(d) || (searchQuery && matchesSearch(d))) return '#1a1a1a'
          return d.thumbnail_url ? getPointColor(d, colorMode) : '#fff'
        })
        .attr('stroke-width', (d: AgiPoint) => {
          if (isHighlighted(d)) return 2.5
          if (searchQuery && matchesSearch(d)) return 2
          return d.thumbnail_url ? 1.5 : 1
        })

      // Add images for nodes with thumbnails
      nodeGroups
        .filter((d: AgiPoint) => !!d.thumbnail_url)
        .append('image')
        .attr('href', (d: AgiPoint) => d.thumbnail_url!)
        .attr('x', -nodeR)
        .attr('y', -nodeR)
        .attr('width', nodeR * 2)
        .attr('height', nodeR * 2)
        .attr('clip-path', (d: AgiPoint) => `url(#clip-entity-${d.entity_id})`)
        .attr('preserveAspectRatio', 'xMidYMid slice')

      // Initials text (only for nodes without thumbnails)
      nodeGroups
        .filter((d: AgiPoint) => !d.thumbnail_url)
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('font-family', "'DM Mono', monospace")
        .attr('font-size', 5)
        .attr('font-weight', 600)
        .attr('fill', '#fff')
        .attr('pointer-events', 'none')
        .text((d: AgiPoint) => getInitials(d.name))

      // Interaction handlers
      nodeGroups
        .on('mouseover', function (evt: MouseEvent, d: AgiPoint) {
          if (!isVisible(d)) return
          if (tipEl) {
            const beliefValue =
              colorMode === 'cluster'
                ? d.cluster_label
                : colorMode === 'category'
                  ? null
                  : d[colorMode as 'stance' | 'timeline' | 'risk']
            const beliefLine = beliefValue
              ? `<div style="color:${getPointColor(d, colorMode)};font-weight:500;font-size:10px;margin-bottom:2px;">${escapeHtml(String(beliefValue))}</div>`
              : ''
            tipEl.innerHTML = `<div style="font-weight:500;margin-bottom:2px;">${escapeHtml(d.name)}</div>
            <div style="color:#666;font-size:10px;margin-bottom:2px;">${escapeHtml(d.category)}</div>
            ${beliefLine}
            <div style="font-size:10px;color:#444;font-style:italic;">${escapeHtml(d.definition.length > 100 ? d.definition.substring(0, 97) + '...' : d.definition)}</div>`
            tipEl.style.left = evt.clientX + 12 + 'px'
            tipEl.style.top = evt.clientY + 12 + 'px'
            tipEl.style.opacity = '1'
          }
        })
        .on('mousemove', function (evt: MouseEvent) {
          if (tipEl) {
            tipEl.style.left = evt.clientX + 12 + 'px'
            tipEl.style.top = evt.clientY + 12 + 'px'
          }
        })
        .on('mouseout', function () {
          if (tipEl) tipEl.style.opacity = '0'
        })
        .on('click', function (_: MouseEvent, d: AgiPoint & { x: number; y: number }) {
          if (!isVisible(d)) return
          if (tipEl) tipEl.style.opacity = '0'
          // Zoom to node with animation, then select
          zoomToNode(d.x, d.y)
          onSelect(d)
        })

      // Store zoom state for the selection effect to use
      zoomRef.current = {
        zoom,
        svg,
        nodes,
        vbX,
        vbY,
        vbW,
        vbH,
      }
    }, [
      data,
      colorMode,
      hoveredCategory,
      onSelect,
      searchQuery,
      highlightedEntityId,
      hiddenClusters,
      hiddenCategories,
      hiddenBeliefValues,
    ])

    // Separate effect for handling selection changes (dimming + zoom)
    // This avoids re-rendering the entire visualization on selection
    useEffect(() => {
      if (!zoomRef.current) return
      const { svg, nodes, zoom, vbX, vbY, vbW, vbH } = zoomRef.current

      // Update opacity for all nodes based on selection
      svg.selectAll('g.entity').style('opacity', (d: AgiPoint) => {
        // Check visibility first
        const isHiddenCluster = hiddenClusters?.has(d.cluster_id || '')
        const isHiddenCategory = hiddenCategories?.has(d.category)
        if (isHiddenCluster || isHiddenCategory) return 0

        // Dim other nodes when one is selected
        if (selectedEntityId != null) {
          return d.entity_id === selectedEntityId ? 1 : 0.15
        }
        return 0.85
      })

      // Zoom to selected node, or reset zoom when deselecting
      if (selectedEntityId != null) {
        const selectedNode = nodes.find((n) => n.entity_id === selectedEntityId)
        if (selectedNode) {
          const k = 3 // zoom scale
          const viewCenterX = vbX + vbW / 2
          const viewCenterY = vbY + vbH / 2
          const t = d3.zoomIdentity
            .translate(viewCenterX, viewCenterY)
            .scale(k)
            .translate(-selectedNode.x, -selectedNode.y)
          svg.transition().duration(500).call(zoom.transform, t)
        }
      } else {
        // Reset zoom when nothing is selected
        svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity)
      }
    }, [selectedEntityId, hiddenClusters, hiddenCategories])

    return <div ref={ref} className="beliefs-cluster-view" />
  },
)

// Re-export types and constants for convenience
export type { AgiPoint, AgiData, ColorMode }
export { CLUSTER_COLORS, CATEGORY_COLORS, BELIEF_SCALES }
