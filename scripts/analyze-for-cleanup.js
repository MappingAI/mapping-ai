/**
 * Pre-cleanup analysis for edge regeneration
 *
 * Finds:
 * 1. Duplicate/similar org names
 * 2. People mistakenly added as orgs
 * 3. primary_org values that don't match any org
 * 4. other_orgs field patterns
 */
import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function analyze() {
  const client = await pool.connect();

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('PRE-CLEANUP ANALYSIS FOR EDGE REGENERATION');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. DUPLICATE/SIMILAR ORG NAMES
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('1. POTENTIAL DUPLICATE ORGS\n');

  const orgs = await client.query(`
    SELECT id, name, category, website
    FROM entity
    WHERE entity_type = 'organization' AND status = 'approved'
    ORDER BY name
  `);

  // Group by first significant word
  const byFirstWord = new Map();
  for (const org of orgs.rows) {
    const words = org.name.toLowerCase().split(/\s+/).filter(w =>
      !['the', 'a', 'an', 'of', 'for', 'and', 'in', 'on', 'at'].includes(w)
    );
    const key = words[0] || org.name.toLowerCase();
    if (!byFirstWord.has(key)) {
      byFirstWord.set(key, []);
    }
    byFirstWord.get(key).push(org);
  }

  // Find groups with multiple orgs
  let dupCount = 0;
  for (const [key, group] of byFirstWord) {
    if (group.length > 1) {
      dupCount++;
      console.log(`"${key}" cluster:`);
      for (const org of group) {
        console.log(`  [${org.id}] ${org.name}`);
        console.log(`       category: ${org.category || '(none)'}, website: ${org.website || '(none)'}`);
      }
      console.log('');
    }
  }
  console.log(`Found ${dupCount} potential duplicate clusters\n`);

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. PEOPLE MISTAKENLY ADDED AS ORGS
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('─────────────────────────────────────────────────────────────────');
  console.log('2. POTENTIAL PEOPLE-AS-ORGS\n');

  // Look for org names that look like person names (First Last pattern, no org keywords)
  const orgKeywords = ['university', 'institute', 'foundation', 'center', 'centre', 'lab',
    'laboratory', 'research', 'council', 'agency', 'department', 'organization', 'organisation',
    'company', 'inc', 'llc', 'corp', 'ai', 'tech', 'fund', 'capital', 'ventures', 'partners',
    'group', 'association', 'society', 'coalition', 'alliance', 'network', 'project', 'initiative'];

  const suspectPeople = [];
  for (const org of orgs.rows) {
    const nameLower = org.name.toLowerCase();
    const hasOrgKeyword = orgKeywords.some(kw => nameLower.includes(kw));
    const words = org.name.split(/\s+/);
    const looksLikePersonName = words.length === 2 &&
      words.every(w => /^[A-Z][a-z]+$/.test(w)) &&
      !hasOrgKeyword;

    if (looksLikePersonName) {
      suspectPeople.push(org);
    }
  }

  if (suspectPeople.length > 0) {
    console.log('These orgs look like person names:');
    for (const org of suspectPeople) {
      console.log(`  [${org.id}] ${org.name} (category: ${org.category || 'none'})`);
    }
  } else {
    console.log('No obvious people-as-orgs found');
  }
  console.log('');

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. PRIMARY_ORG VALUES THAT DON'T MATCH ANY ORG
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('─────────────────────────────────────────────────────────────────');
  console.log('3. PRIMARY_ORG VALUES WITH NO MATCHING ORG\n');

  const people = await client.query(`
    SELECT id, name, primary_org
    FROM entity
    WHERE entity_type = 'person'
      AND status = 'approved'
      AND primary_org IS NOT NULL
      AND primary_org != ''
    ORDER BY primary_org
  `);

  const orgNamesLower = new Set(orgs.rows.map(o => o.name.toLowerCase().trim()));
  const orgFirstWords = new Set(orgs.rows.map(o => o.name.toLowerCase().split(/\s+/)[0]));

  // Group unmatched primary_orgs
  const unmatchedOrgs = new Map(); // primary_org -> [people]

  for (const person of people.rows) {
    const poLower = person.primary_org.toLowerCase().trim();
    const poFirstWord = poLower.split(/\s+/)[0];

    // Check for match
    const exactMatch = orgNamesLower.has(poLower);
    const firstWordMatch = orgFirstWords.has(poFirstWord);
    const containsMatch = [...orgNamesLower].some(on => on.includes(poLower) || poLower.includes(on));

    if (!exactMatch && !firstWordMatch && !containsMatch) {
      if (!unmatchedOrgs.has(person.primary_org)) {
        unmatchedOrgs.set(person.primary_org, []);
      }
      unmatchedOrgs.get(person.primary_org).push(person);
    }
  }

  // Sort by frequency
  const sorted = [...unmatchedOrgs.entries()].sort((a, b) => b[1].length - a[1].length);

  console.log(`Found ${sorted.length} unique primary_org values with no matching org:\n`);
  for (const [orgName, people] of sorted) {
    console.log(`"${orgName}" (${people.length} people)`);
    for (const p of people.slice(0, 3)) {
      console.log(`    [${p.id}] ${p.name}`);
    }
    if (people.length > 3) {
      console.log(`    ... and ${people.length - 3} more`);
    }
    console.log('');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. OTHER_ORGS FIELD PATTERNS
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('─────────────────────────────────────────────────────────────────');
  console.log('4. OTHER_ORGS FIELD SAMPLE (for pattern analysis)\n');

  const withOtherOrgs = await client.query(`
    SELECT id, name, other_orgs
    FROM entity
    WHERE entity_type = 'person'
      AND status = 'approved'
      AND other_orgs IS NOT NULL
      AND other_orgs != ''
    ORDER BY LENGTH(other_orgs) DESC
    LIMIT 15
  `);

  console.log('Longest other_orgs fields (showing complexity):');
  for (const p of withOtherOrgs.rows) {
    console.log(`\n[${p.id}] ${p.name}`);
    console.log(`    ${p.other_orgs.substring(0, 300)}${p.other_orgs.length > 300 ? '...' : ''}`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. CURRENT EDGE SUMMARY
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n─────────────────────────────────────────────────────────────────');
  console.log('5. CURRENT EDGE TABLE SUMMARY\n');

  const edgeStats = await client.query(`
    SELECT
      edge_type,
      COUNT(*)::int as total,
      COUNT(DISTINCT source_id)::int as unique_sources,
      created_by
    FROM edge
    GROUP BY edge_type, created_by
    ORDER BY total DESC
  `);

  console.log('Edge distribution by type and creator:');
  for (const row of edgeStats.rows) {
    console.log(`  ${row.edge_type} (${row.created_by}): ${row.total} edges from ${row.unique_sources} sources`);
  }

  const totalPeople = await client.query(`
    SELECT COUNT(*)::int as cnt FROM entity WHERE entity_type = 'person' AND status = 'approved'
  `);
  const peopleWithEdges = await client.query(`
    SELECT COUNT(DISTINCT source_id)::int as cnt FROM edge e
    JOIN entity p ON p.id = e.source_id
    WHERE p.entity_type = 'person'
  `);

  console.log(`\nPeople: ${totalPeople.rows[0].cnt} total, ${peopleWithEdges.rows[0].cnt} have edges, ${totalPeople.rows[0].cnt - peopleWithEdges.rows[0].cnt} have no edges`);

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. ORG HIERARCHY / PARENT-CHILD RELATIONSHIPS
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n─────────────────────────────────────────────────────────────────');
  console.log('6. ORG HIERARCHY (parent_org_id relationships)\n');

  const parentOrgs = await client.query(`
    SELECT
      child.id as child_id,
      child.name as child_name,
      child.category as child_category,
      parent.id as parent_id,
      parent.name as parent_name
    FROM entity child
    JOIN entity parent ON parent.id = child.parent_org_id
    WHERE child.entity_type = 'organization'
      AND child.status = 'approved'
    ORDER BY parent.name, child.name
  `);

  if (parentOrgs.rows.length > 0) {
    console.log('Orgs with parent_org_id set:');
    let currentParent = null;
    for (const row of parentOrgs.rows) {
      if (row.parent_name !== currentParent) {
        currentParent = row.parent_name;
        console.log(`\n[${row.parent_id}] ${row.parent_name}`);
      }
      console.log(`    └── [${row.child_id}] ${row.child_name}`);
    }
  } else {
    console.log('No orgs have parent_org_id set');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. ORG-TO-ORG EDGES
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n─────────────────────────────────────────────────────────────────');
  console.log('7. ORG-TO-ORG EDGES\n');

  const orgOrgEdges = await client.query(`
    SELECT
      e.edge_type,
      e.role,
      s.name as source_name,
      t.name as target_name
    FROM edge e
    JOIN entity s ON s.id = e.source_id
    JOIN entity t ON t.id = e.target_id
    WHERE s.entity_type = 'organization'
      AND t.entity_type = 'organization'
    ORDER BY e.edge_type, s.name
  `);

  if (orgOrgEdges.rows.length > 0) {
    console.log(`Found ${orgOrgEdges.rows.length} org-to-org edges:`);
    let currentType = null;
    for (const e of orgOrgEdges.rows) {
      if (e.edge_type !== currentType) {
        currentType = e.edge_type;
        console.log(`\n${e.edge_type}:`);
      }
      console.log(`    ${e.source_name} → ${e.target_name}${e.role ? ` (${e.role})` : ''}`);
    }
  } else {
    console.log('No org-to-org edges found');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. ORGS THAT SHOULD HAVE PARENT RELATIONSHIPS
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n─────────────────────────────────────────────────────────────────');
  console.log('8. ORGS THAT LIKELY NEED PARENT RELATIONSHIPS\n');

  // Look for orgs whose names contain other org names
  const needsParent = [];
  const orgNames = orgs.rows.map(o => ({ id: o.id, name: o.name, nameLower: o.name.toLowerCase() }));

  // Common parent indicators
  const subOrgPatterns = ['lab', 'center', 'centre', 'institute', 'school', 'department', 'program', 'initiative', 'project', 'division'];

  for (const org of orgNames) {
    // Skip if already has parent
    const hasParent = parentOrgs.rows.some(r => r.child_id === org.id);
    if (hasParent) continue;

    // Check if this org's name contains another org's name (potential parent)
    for (const potentialParent of orgNames) {
      if (org.id === potentialParent.id) continue;
      if (potentialParent.name.length < 5) continue; // Skip short names

      // Check if org name starts with or contains parent name
      const parentWords = potentialParent.nameLower.split(/\s+/);
      const firstParentWord = parentWords[0];

      if (org.nameLower.includes(potentialParent.nameLower) ||
          (org.nameLower.startsWith(firstParentWord) && firstParentWord.length > 5)) {

        // Make sure the potential child looks like a sub-org
        const looksLikeSubOrg = subOrgPatterns.some(p => org.nameLower.includes(p)) ||
                                org.name.includes(' at ') ||
                                org.name.includes(' @ ');

        if (looksLikeSubOrg || org.nameLower.length > potentialParent.nameLower.length + 5) {
          needsParent.push({
            child: org,
            potentialParent: potentialParent
          });
          break;
        }
      }
    }
  }

  if (needsParent.length > 0) {
    console.log('Orgs that may need parent_org_id set:');
    for (const { child, potentialParent } of needsParent.slice(0, 30)) {
      console.log(`  [${child.id}] ${child.name}`);
      console.log(`      → potential parent: [${potentialParent.id}] ${potentialParent.name}`);
    }
    if (needsParent.length > 30) {
      console.log(`  ... and ${needsParent.length - 30} more`);
    }
  } else {
    console.log('No obvious parent relationships detected');
  }

  client.release();
  await pool.end();
}

analyze().catch(err => {
  console.error('Analysis failed:', err);
  process.exit(1);
});
