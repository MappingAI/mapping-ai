import 'dotenv/config'
import fs from 'fs'

async function exportForReview() {
  const mapData = JSON.parse(fs.readFileSync('/tmp/map-data.json', 'utf8'))
  const detail = await fetch('https://mapping-ai.org/data/map-detail.json').then(r => r.json())
  const edgeData = await fetch('https://mapping-ai.org/data/edge-evidence.json').then(r => r.json())

  // Ensure output directory exists
  fs.mkdirSync('docs/data-review', { recursive: true })

  // Build entity lookup
  const entities = {}
  ;[...mapData.people, ...mapData.organizations, ...mapData.resources].forEach(e => {
    entities[e.id] = { name: e.name, type: e.entity_type, category: e.category }
  })

  // Organizations export
  const orgs = mapData.organizations.map(o => ({
    id: o.id,
    name: o.name,
    category: o.category,
    other_categories: o.other_categories,
    title: o.title,
    website: o.website,
    location: o.location,
    funding_model: o.funding_model,
    regulatory_stance: o.regulatory_stance,
    agi_timeline: o.agi_timeline,
    ai_risk_level: o.ai_risk_level,
    influence_type: o.influence_type,
    source_type: o.source_type,
    notes: detail[o.id]?.notes || null,
  }))
  fs.writeFileSync('docs/data-review/orgs-review.json', JSON.stringify(orgs, null, 2))
  console.log('✓ orgs-review.json:', orgs.length, 'organizations')

  // People export
  const people = mapData.people.map(p => ({
    id: p.id,
    name: p.name,
    category: p.category,
    other_categories: p.other_categories,
    title: p.title,
    primary_org: p.primary_org,
    other_orgs: p.other_orgs,
    location: p.location,
    regulatory_stance: p.regulatory_stance,
    agi_timeline: p.agi_timeline,
    ai_risk_level: p.ai_risk_level,
    influence_type: p.influence_type,
    source_type: p.source_type,
    website: p.website,
    notes: detail[p.id]?.notes || null,
  }))
  fs.writeFileSync('docs/data-review/people-review.json', JSON.stringify(people, null, 2))
  console.log('✓ people-review.json:', people.length, 'people')

  // Resources export
  const resources = mapData.resources.map(r => ({
    id: r.id,
    name: r.name,
    resource_type: r.resource_type,
    category: r.category,
    title: r.title,
    primary_org: r.primary_org,
    website: r.website,
    topic_tags: r.topic_tags,
    format_tags: r.format_tags,
    advocated_stance: r.advocated_stance,
    advocated_timeline: r.advocated_timeline,
    advocated_risk: r.advocated_risk,
    source_type: r.source_type,
    notes: detail[r.id]?.notes || null,
  }))
  fs.writeFileSync('docs/data-review/resources-review.json', JSON.stringify(resources, null, 2))
  console.log('✓ resources-review.json:', resources.length, 'resources')

  // Edges export - join relationships with evidence
  const relationships = mapData.relationships || []
  const edges = relationships.map(rel => {
    const evidenceRecord = edgeData.edges[String(rel.id)] || { evidence: [] }
    const evidence = evidenceRecord.evidence || []

    // Get source entity name
    let sourceName = 'Unknown'
    if (rel.source_type === 'person') {
      sourceName = mapData.people.find(p => p.id === rel.source_id)?.name || 'Unknown'
    } else if (rel.source_type === 'organization') {
      sourceName = mapData.organizations.find(o => o.id === rel.source_id)?.name || 'Unknown'
    }

    // Get target entity name
    let targetName = 'Unknown'
    if (rel.target_type === 'person') {
      targetName = mapData.people.find(p => p.id === rel.target_id)?.name || 'Unknown'
    } else if (rel.target_type === 'organization') {
      targetName = mapData.organizations.find(o => o.id === rel.target_id)?.name || 'Unknown'
    }

    return {
      edge_id: rel.id,
      source_type: rel.source_type,
      source_id: rel.source_id,
      source_name: sourceName,
      target_type: rel.target_type,
      target_id: rel.target_id,
      target_name: targetName,
      relationship_type: rel.relationship_type,
      role: rel.role,
      evidence_count: evidence.length,
      evidence: evidence.slice(0, 3).map(e => ({
        citation: e.citation,
        source_url: e.source_url,
        role_title: e.role_title,
        start_date: e.start_date,
        end_date: e.end_date,
        confidence: e.confidence,
      })),
    }
  }).filter(e => e.source_name !== 'Unknown' && e.target_name !== 'Unknown')

  fs.writeFileSync('docs/data-review/edges-review.json', JSON.stringify(edges, null, 2))
  console.log('✓ edges-review.json:', edges.length, 'edges with evidence')

  console.log('\nExports saved to docs/data-review/')
}

exportForReview().catch(console.error)
