const fs = require('fs')

// Load backups
const prodEntities = JSON.parse(fs.readFileSync('backups/production-20260415/entities.json'))
const stagingEntities = JSON.parse(
  fs.readFileSync('backups/staging-20260415-with-importance/entities.json'),
)
const prodSubmissions = JSON.parse(fs.readFileSync('backups/production-20260415/submissions.json'))
const stagingSubmissions = JSON.parse(
  fs.readFileSync('backups/staging-20260415-with-importance/submissions.json'),
)
const prodEdges = JSON.parse(fs.readFileSync('backups/production-20260415/edges.json'))
const stagingEdges = JSON.parse(
  fs.readFileSync('backups/staging-20260415-with-importance/edges.json'),
)

console.log('=== SUBMISSIONS COMPARISON ===')
console.log('Production submissions:', prodSubmissions.length)
console.log('Staging submissions:', stagingSubmissions.length)

// Compare by ID
const prodSubIds = new Set(prodSubmissions.map((s) => s.id))
const stagingSubIds = new Set(stagingSubmissions.map((s) => s.id))

const subInProdOnly = prodSubmissions.filter((s) => !stagingSubIds.has(s.id))
const subInStagingOnly = stagingSubmissions.filter((s) => !prodSubIds.has(s.id))

console.log('\nSubmissions in PRODUCTION only:', subInProdOnly.length)
if (subInProdOnly.length > 0) {
  for (const s of subInProdOnly) {
    console.log(
      '  [' +
        s.id +
        '] ' +
        (s.name || s.resource_title || 'unnamed') +
        ' (' +
        s.entity_type +
        ') - status: ' +
        s.status +
        ' - created: ' +
        s.created_at,
    )
  }
}

console.log('\nSubmissions in STAGING only:', subInStagingOnly.length)
if (subInStagingOnly.length > 0 && subInStagingOnly.length <= 10) {
  for (const s of subInStagingOnly.slice(0, 10)) {
    console.log(
      '  [' +
        s.id +
        '] ' +
        (s.name || s.resource_title || 'unnamed') +
        ' (' +
        s.entity_type +
        ') - status: ' +
        s.status,
    )
  }
}

// Check if any production submissions are PENDING (user-submitted, not yet reviewed)
const pendingProd = prodSubmissions.filter((s) => s.status === 'pending')
console.log('\nPENDING submissions in production:', pendingProd.length)
for (const s of pendingProd) {
  console.log(
    '  [' +
      s.id +
      '] ' +
      (s.name || s.resource_title || 'unnamed') +
      ' (' +
      s.entity_type +
      ') - ' +
      s.created_at,
  )
}

console.log('\n=== ENTITY COMPARISON ===')
const prodEntityIds = new Set(prodEntities.map((e) => e.id))
const stagingEntityIds = new Set(stagingEntities.map((e) => e.id))

const entitiesInProdOnly = prodEntities.filter((e) => !stagingEntityIds.has(e.id))
console.log('Entities in PRODUCTION only (would be deleted):', entitiesInProdOnly.length)
for (const e of entitiesInProdOnly) {
  console.log('  [' + e.id + '] ' + e.name + ' (' + e.entity_type + ')')
}

const entitiesInStagingOnly = stagingEntities.filter((e) => !prodEntityIds.has(e.id))
console.log('\nEntities in STAGING only (would be added):', entitiesInStagingOnly.length)

console.log('\n=== EDGE COMPARISON ===')
const prodEdgeKeys = new Set(
  prodEdges.map((e) => e.source_id + '-' + e.target_id + '-' + e.edge_type),
)
const stagingEdgeKeys = new Set(
  stagingEdges.map((e) => e.source_id + '-' + e.target_id + '-' + e.edge_type),
)

const edgesInProdOnly = prodEdges.filter(
  (e) => !stagingEdgeKeys.has(e.source_id + '-' + e.target_id + '-' + e.edge_type),
)
const edgesInStagingOnly = stagingEdges.filter(
  (e) => !prodEdgeKeys.has(e.source_id + '-' + e.target_id + '-' + e.edge_type),
)

console.log('Edges in PRODUCTION only (would be deleted):', edgesInProdOnly.length)
console.log('Edges in STAGING only (would be added):', edgesInStagingOnly.length)

// Show some production-only edges
if (edgesInProdOnly.length > 0) {
  console.log('\nSample production-only edges:')
  for (const e of edgesInProdOnly.slice(0, 5)) {
    const src = prodEntities.find((ent) => ent.id === e.source_id)
    const tgt = prodEntities.find((ent) => ent.id === e.target_id)
    console.log(
      '  ' +
        (src ? src.name : e.source_id) +
        ' → ' +
        (tgt ? tgt.name : e.target_id) +
        ' (' +
        e.edge_type +
        ')',
    )
  }
}

console.log('\n=== RECENT PRODUCTION ACTIVITY ===')
// Check for any recent entity updates in production (after staging was created)
const cutoff = new Date('2026-04-14T00:00:00Z')
const recentProdEntities = prodEntities
  .filter((e) => new Date(e.updated_at) > cutoff)
  .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
console.log('Entities updated in production since Apr 14:', recentProdEntities.length)
for (const e of recentProdEntities.slice(0, 10)) {
  console.log('  [' + e.id + '] ' + e.name + ' - ' + e.updated_at)
}

// Check for recent edges
const recentProdEdges = prodEdges
  .filter((e) => new Date(e.created_at) > cutoff)
  .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
console.log('\nEdges created in production since Apr 14:', recentProdEdges.length)
for (const e of recentProdEdges.slice(0, 5)) {
  const src = prodEntities.find((ent) => ent.id === e.source_id)
  const tgt = prodEntities.find((ent) => ent.id === e.target_id)
  console.log(
    '  ' +
      (src ? src.name : e.source_id) +
      ' → ' +
      (tgt ? tgt.name : e.target_id) +
      ' (' +
      e.edge_type +
      ') - ' +
      e.created_at,
  )
}
