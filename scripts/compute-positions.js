/**
 * Pre-compute D3 force simulation positions for the "all" view.
 *
 * Replicates the force simulation from map.html so nodes arrive with
 * settled x,y coordinates. The client can skip the expensive 100+ tick
 * simulation and just render pre-computed positions directly.
 *
 * Positions are normalized to [0,1] coordinate space so the client can
 * scale them to any viewport size at runtime.
 *
 * Usage: imported by export-map-data.js after generateMapData()
 */

import { forceSimulation, forceManyBody, forceCollide, forceLink, forceX, forceY } from 'd3-force';

// Replicate normalizeCategory from map.html
const CATEGORY_MAP = {
  'AI Safety/Alignment': 'AI Safety',
  'AI Safety / Alignment': 'AI Safety',
  'Think Tank / Policy Org': 'Think Tank / Policy',
  'Think Tank/Policy Org': 'Think Tank / Policy',
  'VC/Capital/Philanthropy': 'VC / Funder',
  'VC / Capital / Philanthropy': 'VC / Funder',
  'Labor/Civil Society': 'Ethics / Civil Society',
  'Ethics/Bias/Rights': 'Ethics / Civil Society',
  'Ethics / Bias / Rights': 'Ethics / Civil Society',
  'Media/Journalism': 'Media',
  'Media / Journalism': 'Media',
  'Political Campaign/PAC': 'Political Campaign',
  'Political Campaign / PAC': 'Political Campaign',
  'Government/Agency': 'Government',
  'Government / Agency': 'Government',
  'AI Infrastructure & Compute': 'AI Infrastructure',
  'AI Deployers & Platforms': 'AI Deployers',
  'Labor / Workforce': 'Ethics / Civil Society',
};

function normalizeCategory(raw) {
  if (!raw) return raw;
  return CATEGORY_MAP[raw] || raw;
}

// Replicate CLUSTER_ORDER from map.html
const CLUSTER_ORDER = [
  'Frontier Lab', 'AI Safety', 'AI Infrastructure', 'AI Deployers',
  'Think Tank / Policy', 'Government', 'Academic',
  'VC / Funder', 'Ethics / Civil Society', 'Labor / Workforce',
  'Media', 'Political Campaign',
  'Executive', 'Researcher', 'Policymaker', 'Investor',
  'Organizer', 'Journalist', 'Cultural figure',
  'Resources',
];

const ROLE_TO_SECTOR = {
  'Executive': 'Frontier Lab', 'Researcher': 'Academic', 'Investor': 'VC / Funder',
  'Organizer': 'Ethics / Civil Society', 'Journalist': 'Media', 'Cultural figure': 'Media',
};
const PERSON_ROLES = ['Executive', 'Researcher', 'Investor', 'Organizer', 'Journalist', 'Cultural figure'];

// Custom cluster force (replicate forceCluster from map.html)
function forceCluster(centers, strength) {
  let nodes;
  function force(alpha) {
    nodes.forEach(d => {
      const c = centers[d.clusterKey || d.category];
      if (!c) return;
      d.vx += (c.x - d.x) * alpha * strength;
      d.vy += (c.y - d.y) * alpha * strength;
    });
  }
  force.initialize = (_) => { nodes = _; };
  return force;
}

/**
 * Compute pre-baked positions for the "all" view with category clustering.
 *
 * @param {object} data - The map data object from generateMapData()
 * @returns {Map<number, {x: number, y: number}>} - entityId -> normalized {x, y} in [0,1]
 */
export function computePositions(data) {
  // Use a virtual canvas of 1200x800 (typical desktop aspect ratio)
  const WIDTH = 1200;
  const HEIGHT = 800;
  const controlsWidth = 280;
  const centerX = controlsWidth + (WIDTH - controlsWidth) / 2;
  const centerY = HEIGHT / 2;
  const maxDim = Math.min(WIDTH - controlsWidth, HEIGHT);

  // Build org lookup for mapping people to their org's sector
  const orgById = {};
  data.organizations.forEach(o => { orgById[o.id] = o; });

  const personOrgMap = {};
  (data.person_organizations || []).forEach(po => {
    if (po.is_primary && orgById[po.organization_id]) {
      personOrgMap[po.person_id] = orgById[po.organization_id];
    }
  });

  // Build nodes (replicating getVisibleNodes for "all" view, category dimension)
  const nodes = [];
  const totalCount = data.organizations.length + data.people.length + data.resources.length;
  const scale = Math.max(0.55, Math.min(1.0, 40 / Math.max(totalCount, 1)));

  // Organizations
  data.organizations.forEach(d => {
    if (!d.category) return;
    const sc = d.submission_count || 1;
    const r = Math.round((14 + Math.min(Math.floor(sc / 3), 2)) * scale);
    const normCat = normalizeCategory(d.category);
    nodes.push({
      id: d.id, entityType: 'organization', category: normCat,
      clusterKey: normCat, radius: r, name: d.name,
      primary_org: d.primary_org,
    });
  });

  // People — in "all" view, cluster by org's sector
  data.people.forEach(d => {
    if (!d.category) return;
    const sc = d.submission_count || 1;
    const r = Math.round((8 + Math.min(Math.floor(sc / 3), 2)) * scale);

    let displayCat;
    const primaryOrg = personOrgMap[d.id];
    if (primaryOrg) {
      displayCat = normalizeCategory(primaryOrg.category);
    } else {
      const orgMatch = data.organizations.find(o =>
        d.primary_org && o.name.toLowerCase().includes(d.primary_org.toLowerCase())
      );
      if (orgMatch) {
        displayCat = normalizeCategory(orgMatch.category);
      } else {
        const roleCat = normalizeCategory(d.category);
        displayCat = PERSON_ROLES.includes(roleCat) ? (ROLE_TO_SECTOR[roleCat] || roleCat) : roleCat;
      }
    }

    nodes.push({
      id: d.id, entityType: 'person', category: displayCat,
      clusterKey: displayCat, radius: r, name: d.name,
      primary_org: d.primary_org,
    });
  });

  // Resources — all clustered as "Resources" in "all" view
  data.resources.forEach(d => {
    const sc = d.submission_count || 1;
    const r = Math.round((10 + Math.min(Math.floor(sc / 3), 3)) * scale);
    nodes.push({
      id: d.id, entityType: 'resource', category: 'Resources',
      clusterKey: 'Resources', radius: r, name: d.title,
      isResource: true, _rawCategory: d.category,
    });
  });

  // Compute cluster centers (replicate greedy nearest-neighbor algorithm)
  const rawCats = [...new Set(nodes.map(d => d.clusterKey))];
  const displayCats = rawCats.filter(c => c !== 'Resources');
  const categories = displayCats.sort((a, b) => {
    const ia = CLUSTER_ORDER.indexOf(a);
    const ib = CLUSTER_ORDER.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

  const catCounts = {};
  nodes.forEach(d => { catCounts[d.clusterKey] = (catCounts[d.clusterKey] || 0) + 1; });

  const nodeById = {};
  nodes.forEach(d => { if (d.id) nodeById[`${d.entityType}-${d.id}`] = d; });

  // Count inter-category connections
  const interCatLinks = {};
  function addCatLink(catA, catB) {
    if (!catA || !catB || catA === catB) return;
    const key = [catA, catB].sort().join('||');
    interCatLinks[key] = (interCatLinks[key] || 0) + 1;
  }
  (data.relationships || []).forEach(rel => {
    const src = nodeById[`${rel.source_type}-${rel.source_id}`];
    const tgt = nodeById[`${rel.target_type}-${rel.target_id}`];
    if (src && tgt) addCatLink(src.clusterKey, tgt.clusterKey);
  });

  // Greedy nearest-neighbor placement
  const placed = [];
  const remaining = new Set(categories);
  const startCat = [...categories].sort((a, b) => (catCounts[b] || 0) - (catCounts[a] || 0))[0];
  if (startCat) {
    placed.push(startCat);
    remaining.delete(startCat);
  }

  while (remaining.size > 0) {
    let bestCat = null, bestScore = -1;
    for (const cat of remaining) {
      let score = 0;
      for (const p of placed) {
        const key = [cat, p].sort().join('||');
        score += interCatLinks[key] || 0;
      }
      if (score > bestScore || (score === bestScore && (catCounts[cat] || 0) > (catCounts[bestCat] || 0))) {
        bestScore = score; bestCat = cat;
      }
    }
    placed.push(bestCat);
    remaining.delete(bestCat);
  }

  // Assign cluster centers on orbit
  const clusterCenters = {};
  const orbitRadius = maxDim * Math.min(0.38, Math.max(0.18, categories.length * 0.035));

  placed.forEach((cat, i) => {
    const angle = (i / placed.length) * 2 * Math.PI - Math.PI / 2;
    clusterCenters[cat] = {
      x: centerX + orbitRadius * Math.cos(angle),
      y: centerY + orbitRadius * Math.sin(angle),
    };
  });

  // Resources cluster — place near center
  if (rawCats.includes('Resources')) {
    clusterCenters['Resources'] = { x: centerX, y: centerY };
  }

  // Initialize node positions near cluster centers
  // Use deterministic seeded random for reproducibility
  let seed = 42;
  function seededRandom() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  }

  const entityById = {};
  nodes.forEach(d => { if (d.id) entityById[`${d.entityType}-${d.id}`] = d; });

  nodes.forEach(d => {
    if (d.isResource) {
      // Place resources near related entity
      let resourcePlaced = false;
      for (const rel of (data.relationships || [])) {
        let relatedKey = null;
        if (rel.source_type === 'resource' && rel.source_id === d.id) {
          relatedKey = `${rel.target_type}-${rel.target_id}`;
        } else if (rel.target_type === 'resource' && rel.target_id === d.id) {
          relatedKey = `${rel.source_type}-${rel.source_id}`;
        }
        if (relatedKey && entityById[relatedKey]) {
          const related = entityById[relatedKey];
          const relCenter = clusterCenters[related.category] || { x: centerX, y: centerY };
          d.x = relCenter.x + (seededRandom() - 0.5) * 40;
          d.y = relCenter.y + (seededRandom() - 0.5) * 40;
          resourcePlaced = true;
          break;
        }
      }
      if (!resourcePlaced) {
        const center = clusterCenters[d.clusterKey] || { x: centerX, y: centerY };
        d.x = center.x + (seededRandom() - 0.5) * 60;
        d.y = center.y + (seededRandom() - 0.5) * 60;
      }
    } else {
      const center = clusterCenters[d.clusterKey] || clusterCenters[d.category] || { x: centerX, y: centerY };
      d.x = center.x + (seededRandom() - 0.5) * 60;
      d.y = center.y + (seededRandom() - 0.5) * 60;
    }
  });

  // Build links (inferred from person->org text matching + explicit relationships)
  const allLinks = [];

  // Inferred links from person primary_org matching org names
  const orgByName = {};
  nodes.filter(n => n.entityType === 'organization').forEach(o => {
    orgByName[o.name.toLowerCase()] = o;
  });
  nodes.filter(n => n.entityType === 'person' && n.primary_org).forEach(p => {
    const orgNode = orgByName[p.primary_org.toLowerCase()];
    if (orgNode) {
      allLinks.push({ source: p, target: orgNode });
    }
  });

  // Explicit relationships
  (data.relationships || []).forEach(rel => {
    const src = nodeById[`${rel.source_type}-${rel.source_id}`];
    const tgt = nodeById[`${rel.target_type}-${rel.target_id}`];
    if (src && tgt) {
      allLinks.push({ source: src, target: tgt });
    }
  });

  // Run force simulation
  const sim = forceSimulation(nodes)
    .force('charge', forceManyBody().strength(d => d.entityType === 'organization' ? -4 : -1.5))
    .force('collision', forceCollide().radius(d => d.radius + 1).strength(0.85))
    .force('cluster', forceCluster(clusterCenters, 0.25))
    .force('link', forceLink(allLinks).strength(0.08).distance(d => {
      const sameCat = d.source.clusterKey === d.target.clusterKey;
      return sameCat ? 30 : 80;
    }))
    .force('x', forceX(centerX).strength(0.02))
    .force('y', forceY(centerY).strength(0.02))
    .alpha(0.5)
    .alphaDecay(0.04)
    .velocityDecay(0.6)
    .stop();

  // Run simulation to completion (tick manually)
  const numTicks = Math.ceil(Math.log(0.001) / Math.log(1 - 0.04)); // ~168 ticks
  for (let i = 0; i < numTicks; i++) {
    sim.tick();
  }

  // Normalize positions to [0,1] based on virtual canvas
  const positions = {};
  nodes.forEach(d => {
    positions[`${d.entityType}-${d.id}`] = {
      x: d.x / WIDTH,
      y: d.y / HEIGHT,
    };
  });

  console.log(`  ✓ Pre-computed positions for ${nodes.length} nodes (${numTicks} ticks)`);
  return positions;
}
