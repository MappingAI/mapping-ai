/**
 * Comprehensive review of map-data.json for data quality issues
 */
import fs from 'fs';

const data = JSON.parse(fs.readFileSync('map-data.json', 'utf-8'));

console.log('MAP DATA QUALITY REVIEW');
console.log('=======================\n');

const issues = [];

// 1. Check for null/empty names
console.log('1. NULL OR EMPTY NAMES');
console.log('----------------------');
let nullNames = 0;
for (const type of ['people', 'organizations', 'resources']) {
  for (const item of data[type]) {
    if (!item.name || item.name.trim() === '') {
      nullNames++;
      issues.push({ type, id: item.id, issue: 'NULL or empty name', item });
    }
  }
}
console.log(`   ${nullNames === 0 ? '✓' : '✗'} Found ${nullNames} entities with null/empty names\n`);

// 2. Check for duplicate names within each type
console.log('2. DUPLICATE NAMES');
console.log('------------------');
for (const type of ['people', 'organizations', 'resources']) {
  const names = new Map();
  for (const item of data[type]) {
    const key = (item.name || '').toLowerCase().trim();
    if (!names.has(key)) names.set(key, []);
    names.get(key).push(item);
  }
  const dupes = [...names.entries()].filter(([k, v]) => v.length > 1 && k !== '');
  if (dupes.length > 0) {
    console.log(`   ${type}: ${dupes.length} duplicate names`);
    for (const [name, items] of dupes.slice(0, 5)) {
      console.log(`     "${name}": IDs ${items.map(i => i.id).join(', ')}`);
      issues.push({ type, issue: 'Duplicate name', name, ids: items.map(i => i.id) });
    }
    if (dupes.length > 5) console.log(`     ... and ${dupes.length - 5} more`);
  } else {
    console.log(`   ✓ ${type}: no duplicates`);
  }
}
console.log('');

// 3. Check edges reference valid entities
console.log('3. EDGE VALIDITY');
console.log('----------------');
const allIds = new Set([
  ...data.people.map(p => p.id),
  ...data.organizations.map(o => o.id),
  ...data.resources.map(r => r.id),
]);
let orphanedEdges = 0;
for (const edge of data.edges) {
  if (!allIds.has(edge.source_id)) {
    orphanedEdges++;
    issues.push({ issue: 'Orphaned edge - missing source', edge });
  }
  if (!allIds.has(edge.target_id)) {
    orphanedEdges++;
    issues.push({ issue: 'Orphaned edge - missing target', edge });
  }
}
console.log(`   ${orphanedEdges === 0 ? '✓' : '✗'} Found ${orphanedEdges} orphaned edges\n`);

// 4. Check for required fields
console.log('4. REQUIRED FIELDS');
console.log('------------------');
const requiredFields = {
  people: ['id', 'name', 'entity_type', 'category'],
  organizations: ['id', 'name', 'entity_type', 'category'],
  resources: ['id', 'name', 'entity_type'],
};
let missingFields = 0;
for (const [type, fields] of Object.entries(requiredFields)) {
  for (const item of data[type]) {
    for (const field of fields) {
      if (item[field] === null || item[field] === undefined) {
        missingFields++;
        if (missingFields <= 10) {
          console.log(`   ✗ ${type} [${item.id}] ${item.name || '(no name)'}: missing ${field}`);
        }
        issues.push({ type, id: item.id, name: item.name, issue: `Missing ${field}` });
      }
    }
  }
}
if (missingFields > 10) console.log(`   ... and ${missingFields - 10} more`);
if (missingFields === 0) console.log('   ✓ All required fields present');
console.log('');

// 5. Check for unusual categories
console.log('5. CATEGORY DISTRIBUTION');
console.log('------------------------');
for (const type of ['people', 'organizations']) {
  const cats = new Map();
  for (const item of data[type]) {
    const cat = item.category || '(null)';
    cats.set(cat, (cats.get(cat) || 0) + 1);
  }
  console.log(`   ${type}:`);
  const sorted = [...cats.entries()].sort((a, b) => b[1] - a[1]);
  for (const [cat, count] of sorted) {
    const flag = cat === '(null)' ? ' ⚠️' : '';
    console.log(`     ${count.toString().padStart(3)} ${cat}${flag}`);
  }
}
console.log('');

// 6. Check parent_org_id references
console.log('6. PARENT_ORG_ID REFERENCES');
console.log('---------------------------');
const orgIds = new Set(data.organizations.map(o => o.id));
let brokenParents = 0;
for (const org of data.organizations) {
  if (org.parent_org_id && !orgIds.has(org.parent_org_id)) {
    brokenParents++;
    issues.push({ type: 'organizations', id: org.id, name: org.name, issue: `Broken parent_org_id: ${org.parent_org_id}` });
    console.log(`   ✗ [${org.id}] ${org.name} → parent ${org.parent_org_id} doesn't exist`);
  }
}
if (brokenParents === 0) console.log('   ✓ All parent_org_id references valid');
console.log('');

// 7. Check for very long fields (potential data issues)
console.log('7. UNUSUALLY LONG FIELDS');
console.log('------------------------');
let longFields = 0;
for (const type of ['people', 'organizations', 'resources']) {
  for (const item of data[type]) {
    for (const [field, value] of Object.entries(item)) {
      if (typeof value === 'string' && value.length > 2000) {
        longFields++;
        console.log(`   ⚠️ ${type} [${item.id}] ${item.name}: ${field} is ${value.length} chars`);
      }
    }
  }
}
if (longFields === 0) console.log('   ✓ No unusually long fields');
console.log('');

// 8. Check edge types distribution
console.log('8. EDGE TYPE DISTRIBUTION');
console.log('-------------------------');
const edgeTypes = new Map();
for (const edge of data.edges) {
  const t = edge.edge_type || '(null)';
  edgeTypes.set(t, (edgeTypes.get(t) || 0) + 1);
}
for (const [type, count] of [...edgeTypes.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`   ${count.toString().padStart(4)} ${type}`);
}
console.log('');

// 9. Summary
console.log('=======================');
console.log('SUMMARY');
console.log('=======================');
console.log(`Total entities: ${data.people.length + data.organizations.length + data.resources.length}`);
console.log(`Total edges: ${data.edges.length}`);
console.log(`Issues found: ${issues.length}`);

if (issues.length > 0) {
  console.log('\nTop issues:');
  const byType = new Map();
  for (const i of issues) {
    const key = i.issue;
    byType.set(key, (byType.get(key) || 0) + 1);
  }
  for (const [type, count] of [...byType.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    console.log(`  ${count} × ${type}`);
  }
}
