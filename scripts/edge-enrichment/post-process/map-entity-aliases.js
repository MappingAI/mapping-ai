#!/usr/bin/env node
/**
 * Map entity aliases to canonical names from Claude.ai entity review
 *
 * These are entities that are variants/abbreviations of existing entities.
 * Updates edge_discovery records to use canonical entity names.
 *
 * Usage:
 *   node scripts/edge-enrichment/post-process/map-entity-aliases.js --dry-run
 *   node scripts/edge-enrichment/post-process/map-entity-aliases.js --apply
 */
import 'dotenv/config'
import pg from 'pg'

const neon = new pg.Pool({
  connectionString: process.env.PILOT_DB,
  ssl: { rejectUnauthorized: false }
})

// Entity alias mappings: { alias: canonicalName }
const ENTITY_MAPPINGS = [
  // Organization abbreviations/variants
  { alias: 'Coefficient Giving', mapTo: 'Open Philanthropy' },
  { alias: 'Coeffecient Giving', mapTo: 'Open Philanthropy' },
  { alias: 'Intel', mapTo: 'Intel Corporation' },
  { alias: 'Intel Corp.', mapTo: 'Intel Corporation' },
  { alias: 'SoftBank Group', mapTo: 'SoftBank' },
  { alias: 'SoftBank Group Corp', mapTo: 'SoftBank' },
  { alias: 'SoftBank Group Corp.', mapTo: 'SoftBank' },
  { alias: 'SoftBank Vision Fund 2', mapTo: 'SoftBank' },
  { alias: 'Softbank Vision Fund', mapTo: 'SoftBank' },
  { alias: 'Lightspeed', mapTo: 'Lightspeed Venture Partners' },
  { alias: 'Defense Advanced Research Projects Agency', mapTo: 'DARPA' },
  { alias: 'DARPA Information Systems Office', mapTo: 'DARPA' },
  { alias: 'Advanced Research Projects Agency', mapTo: 'DARPA' },
  { alias: 'ARIA', mapTo: 'Advanced Research and Invention Agency (ARIA)' },
  { alias: 'UK\'s Advanced Research and Invention Agency (ARIA)', mapTo: 'Advanced Research and Invention Agency (ARIA)' },
  { alias: 'Advanced Research+Invention Agency', mapTo: 'Advanced Research and Invention Agency (ARIA)' },
  { alias: 'SFF', mapTo: 'Survival and Flourishing Fund' },
  { alias: 'AISTOF', mapTo: 'AI Safety Tactical Opportunities Fund' },
  { alias: 'The AI Safety Tactical Opportunities Fund', mapTo: 'AI Safety Tactical Opportunities Fund' },
  { alias: 'Long Term Future Fund', mapTo: 'Long-Term Future Fund' },
  { alias: 'Longterm Future Fund', mapTo: 'Long-Term Future Fund' },
  { alias: 'Sloan Foundation', mapTo: 'Alfred P. Sloan Foundation' },
  { alias: 'NEA', mapTo: 'New Enterprise Associates' },
  { alias: 'EAIF', mapTo: 'EA Infrastructure Fund' },
  { alias: 'Effective Altruism Infrastructure Fund', mapTo: 'EA Infrastructure Fund' },
  { alias: 'Center for Effective Altruism', mapTo: 'Centre for Effective Altruism' },
  { alias: 'CEA', mapTo: 'Centre for Effective Altruism' },
  { alias: 'Microsoft Corporation', mapTo: 'Microsoft' },
  { alias: 'Baidu', mapTo: 'Baidu' }, // Verify exists
  { alias: 'Google (Alphabet)', mapTo: 'Alphabet Inc.' },
  { alias: 'Google Capital', mapTo: 'Alphabet Inc.' },
  { alias: 'Google X', mapTo: 'Alphabet Inc.' },
  { alias: 'Greylock Partners', mapTo: 'Greylock' },
  { alias: 'JP Morgan', mapTo: 'JPMorgan Chase' },
  { alias: 'Knight Foundation', mapTo: 'John S. and James L. Knight Foundation' },
  { alias: 'McGovern Foundation', mapTo: 'Patrick J. McGovern Foundation' },
  { alias: 'The Patrick J McGovern Foundation', mapTo: 'Patrick J. McGovern Foundation' },
  { alias: 'Packard Foundation', mapTo: 'The David and Lucile Packard Foundation' },
  { alias: 'Eric Schmidt Foundation', mapTo: 'Schmidt Futures' },
  { alias: 'Schmidt Foundation', mapTo: 'Schmidt Sciences' },
  { alias: 'Leverhulme Foundation', mapTo: 'Leverhulme Trust' },
  { alias: 'German Research Foundation (DFG)', mapTo: 'Deutsche Forschungsgemeinschaft' },
  { alias: 'Canadian Institute for Advanced Research', mapTo: 'CIFAR' },
  { alias: 'Government of Quebec', mapTo: 'Quebec government' },
  { alias: 'Québec government', mapTo: 'Quebec government' },
  { alias: 'Capital One Ventures', mapTo: 'Capital One' },
  { alias: 'Qualcomm Ventures', mapTo: 'Qualcomm' },
  { alias: 'Accenture Ventures', mapTo: 'Accenture' },
  { alias: 'Fidelity Management & Research Company', mapTo: 'Fidelity' },
  { alias: 'Fidelity Management and Research Company LLC', mapTo: 'Fidelity' },
  { alias: 'NSF - National Science Foundation', mapTo: 'National Science Foundation' },
  { alias: 'National Science Foundation (NSF)', mapTo: 'National Science Foundation' },
  { alias: 'Natural Sciences and Engineering Research Council', mapTo: 'Natural Sciences and Engineering Research Council of Canada' },
  { alias: 'Canadian Foundation for Innovation', mapTo: 'Canada Foundation for Innovation' },
  { alias: 'EU Commission', mapTo: 'European Commission' },
  { alias: 'The Ford Foundation', mapTo: 'Ford Foundation' },
  { alias: 'Bessemer', mapTo: 'Bessemer Venture Partners' },
  { alias: 'Sequoia', mapTo: 'Sequoia Capital' },
  { alias: 'Blackbird', mapTo: 'Blackbird Ventures' },
  { alias: 'Conviction', mapTo: 'Conviction Partners' },
  { alias: 'CrimsoNox', mapTo: 'CrimsoNox Capital' },
  { alias: 'Decibel Partners', mapTo: 'Decibel VC' },
  { alias: 'Goldman Sachs\' GS Growth', mapTo: 'Goldman Sachs' },
  { alias: 'NFDG', mapTo: 'NFDG Ventures' },
  { alias: 'Tyler Cowen', mapTo: 'Emergent Ventures' },
  { alias: 'Tyler Cowen\'s Emergent Ventures', mapTo: 'Emergent Ventures' },
  { alias: 'INET (Institute for New Economic Thinking)', mapTo: 'Institute for New Economic Thinking' },
  { alias: 'Institute for New Economic Thinking', mapTo: 'INET' },
  { alias: 'UKRI', mapTo: 'UK Research and Innovation' },
  { alias: 'Simons Foundation International', mapTo: 'Simons Foundation' },
  { alias: 'Max Planck Society of Germany', mapTo: 'Max Planck Society' },
  { alias: 'Tencent Holdings Ltd.', mapTo: 'Tencent' },
  { alias: 'Alberta government', mapTo: 'Alberta' },
  { alias: 'National Bank', mapTo: 'National Bank of Canada' },
  { alias: 'USVP', mapTo: 'US Venture Partners' },
  { alias: 'Meta Platforms', mapTo: 'Meta' },
  { alias: 'Amazon.com, Inc.', mapTo: 'Amazon' },
  { alias: 'Cisco Systems Inc.', mapTo: 'Cisco' },
  { alias: 'NIH NIGMS', mapTo: 'NIH' },
  { alias: 'U.S. government', mapTo: 'Department of Commerce' },
  { alias: 'Biden administration', mapTo: 'Department of Commerce' },
  { alias: 'Republic of Korea Ministry of Science and ICT', mapTo: 'Ministry of Science and ICT' },
  { alias: 'FTX Foundation', mapTo: 'FTX Future Fund' },
  { alias: 'Thiel Foundation', mapTo: 'Peter Thiel Foundation' },

  // Target entity mappings
  { alias: 'Distributed AI Research Institute (DAIR)', mapTo: 'DAIR' },
  { alias: 'DAIR (Distributed AI Research Institute)', mapTo: 'DAIR' },
  { alias: 'Anduril', mapTo: 'Anduril Industries' },
  { alias: 'Center for Security and Emerging Technology', mapTo: 'Center for Security and Emerging Technology (CSET)' },
  { alias: 'Allen Institute for Artificial Intelligence', mapTo: 'Allen Institute for AI' },
  { alias: 'AI Security Institute\'s Alignment Project', mapTo: 'The Alignment Project' },
  { alias: 'Stanford Institute for Human-Centered Artificial Intelligence', mapTo: 'Stanford HAI' },
  { alias: 'UCL', mapTo: 'University College London' },
  { alias: 'University of Southern California', mapTo: 'USC' },
  { alias: 'Regents of the University of California at Berkeley', mapTo: 'UC Berkeley' },
  { alias: 'DeepMind Technologies Ltd', mapTo: 'Google DeepMind' },
  { alias: 'Hangzhou DeepSeek Artificial Intelligence', mapTo: 'DeepSeek' },
  { alias: 'Center for AI Safety, Inc.', mapTo: 'Center for AI Safety (CAIS)' },
  { alias: 'Symbolica', mapTo: 'Symbolica AI' },
  { alias: 'Alignment Research Center', mapTo: 'ARC (Alignment Research Center)' },
  { alias: 'Redwood Research Group, Inc.', mapTo: 'Redwood Research' },
  { alias: 'PauseAI US', mapTo: 'PauseAI' },
  { alias: 'PIBBSS Fellowship', mapTo: 'PIBBSS' },
  { alias: 'Micron', mapTo: 'Micron Technology' },
  { alias: 'TSMC Arizona Corporation', mapTo: 'TSMC' },
  { alias: 'High-Flyer Quant', mapTo: 'High-Flyer Capital Management' },
  { alias: 'Hinton Chair in Artificial Intelligence', mapTo: 'University of Toronto' },
  { alias: 'University of Cambridge Cavendish Laboratory', mapTo: 'University of Cambridge' },
  { alias: 'Aalto University Department of Computer Science', mapTo: 'Aalto University' },
  { alias: 'University of Michigan Computer Science and Engineering Division', mapTo: 'University of Michigan' },

  // Person variant mappings
  { alias: 'Lori Huang', mapTo: 'Jensen Huang' },
  { alias: 'Laura Arnold', mapTo: 'John Arnold' },
  { alias: 'Anna Brockman', mapTo: 'Greg Brockman' },
  { alias: 'Valerie Sugar', mapTo: 'Ronald D. Sugar' },
  { alias: 'Florian Tramer, ETH Zurich', mapTo: 'Florian Tramer' },
  { alias: 'Wenbo Guo, UC Santa Barbara', mapTo: 'Wenbo Guo' },
  { alias: 'Nicholas Tomlin, UC Berkeley', mapTo: 'Nicholas Tomlin' },
  { alias: 'Ashwinee Panda, University of Maryland College Park', mapTo: 'Ashwinee Panda' },
  { alias: 'Jakob Foerster and Christian Schroeder de Witt', mapTo: 'Jakob Foerster' },

  // Lab/group mappings
  { alias: 'AI Alignment Research at Hadfield-Menell\'s Lab at MIT', mapTo: 'MIT CSAIL' },
  { alias: 'Hadfield-Menell Lab at MIT', mapTo: 'MIT CSAIL' },
  { alias: 'MIT AI Alignment', mapTo: 'MIT CSAIL' },
  { alias: 'Capital One AI Research Neighborhood', mapTo: 'Capital One' },
  { alias: 'Noah\'s Ark Lab', mapTo: 'Huawei' },
  { alias: 'Amazon Web Services', mapTo: 'Amazon' },

  // Final entity review mappings (Step 1.4)
  { alias: 'Federal Ministry of Research, Technology and Space', mapTo: 'Federal Ministry of Education and Research' },
  { alias: 'Quebec\'s Mees', mapTo: 'Quebec government' },
  { alias: 'Quebec\'s Ministère de l\'Enseignement supérieur', mapTo: 'Quebec government' },
  { alias: 'Center for Security and Emerging Technology', mapTo: 'Center for Security and Emerging Technology (CSET)' },
  { alias: 'LISA', mapTo: 'LISA (Learning Intelligent Systems Architecture)' },
  { alias: 'Bloomberg Philanthropies', mapTo: 'Michael Bloomberg' },
  { alias: 'The Rockefeller Foundation', mapTo: 'Rockefeller Foundation' },
]

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const apply = process.argv.includes('--apply')

  if (!dryRun && !apply) {
    console.log('Usage:')
    console.log('  --dry-run  Show what would be mapped')
    console.log('  --apply    Actually perform the mappings')
    process.exit(1)
  }

  console.log(`=== MAP ENTITY ALIASES TO CANONICAL NAMES ===`)
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'APPLYING CHANGES'}`)
  console.log(`Checking ${ENTITY_MAPPINGS.length} entity mappings\n`)

  let totalFound = 0
  let totalMapped = 0
  let totalDuplicates = 0

  for (const { alias, mapTo } of ENTITY_MAPPINGS) {
    // Find edges where this alias is source OR target
    const edges = await neon.query(`
      SELECT discovery_id, source_entity_name, target_entity_name, edge_type, source_id
      FROM edge_discovery
      WHERE status = 'pending_entities'
        AND (LOWER(source_entity_name) = LOWER($1) OR LOWER(target_entity_name) = LOWER($1))
    `, [alias])

    if (edges.rows.length === 0) continue

    totalFound += edges.rows.length
    console.log(`\n${alias} → ${mapTo} (${edges.rows.length} edges):`)

    for (const edge of edges.rows) {
      const isSource = edge.source_entity_name.toLowerCase() === alias.toLowerCase()
      const oldName = isSource ? edge.source_entity_name : edge.target_entity_name
      const newSourceName = isSource ? mapTo : edge.source_entity_name
      const newTargetName = isSource ? edge.target_entity_name : mapTo

      // Check if mapping would create a duplicate
      const existingEdge = await neon.query(`
        SELECT discovery_id FROM edge_discovery
        WHERE LOWER(source_entity_name) = LOWER($1)
          AND LOWER(target_entity_name) = LOWER($2)
          AND edge_type = $3
          AND discovery_id != $4
      `, [newSourceName, newTargetName, edge.edge_type, edge.discovery_id])

      if (existingEdge.rows.length > 0) {
        console.log(`  ⊕ ${edge.source_entity_name} → ${edge.target_entity_name}`)
        console.log(`    DUPLICATE: would merge with existing edge, deleting instead`)
        if (!dryRun) {
          await neon.query(`DELETE FROM edge_discovery WHERE discovery_id = $1`, [edge.discovery_id])
          totalDuplicates++
        }
        continue
      }

      console.log(`  ↦ ${edge.source_entity_name} → ${edge.target_entity_name}`)
      console.log(`    Mapping ${isSource ? 'source' : 'target'}: "${oldName}" → "${mapTo}"`)

      if (!dryRun) {
        if (isSource) {
          await neon.query(`
            UPDATE edge_discovery
            SET source_entity_name = $2,
                updated_at = NOW()
            WHERE discovery_id = $1
          `, [edge.discovery_id, mapTo])
        } else {
          await neon.query(`
            UPDATE edge_discovery
            SET target_entity_name = $2,
                updated_at = NOW()
            WHERE discovery_id = $1
          `, [edge.discovery_id, mapTo])
        }
        totalMapped++
      }
    }
  }

  console.log(`\n=== SUMMARY ===`)
  console.log(`Entity mappings checked: ${ENTITY_MAPPINGS.length}`)
  console.log(`Edges found: ${totalFound}`)
  if (!dryRun) {
    console.log(`Edges mapped: ${totalMapped}`)
    console.log(`Duplicates deleted: ${totalDuplicates}`)
  }

  if (dryRun) {
    console.log(`\nRun with --apply to execute these mappings.`)
  }

  await neon.end()
}

main().catch(console.error)
