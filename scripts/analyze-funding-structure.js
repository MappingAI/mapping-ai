#!/usr/bin/env node
/**
 * Analyze funding structure for policy organizations
 * Answers four research questions to determine which insights are compelling
 */
import fs from 'fs'

const fundingData = JSON.parse(fs.readFileSync('funding-data.json', 'utf-8'))
const edges = fundingData.edges

// Filter to policy-relevant recipients
const policyCategories = ['Think Tank/Policy Org', 'AI Safety/Alignment', 'Ethics/Bias/Rights']
const policyEdges = edges.filter((e) => policyCategories.includes(e.recipient_category))

console.log('='.repeat(70))
console.log('ANALYSIS: FUNDING STRUCTURE FOR POLICY ORGANIZATIONS')
console.log('='.repeat(70))
console.log(`Total policy-relevant funding edges: ${policyEdges.length}`)
console.log(`Unique policy orgs: ${new Set(policyEdges.map((e) => e.recipient)).size}`)
console.log(`Unique funders of policy orgs: ${new Set(policyEdges.map((e) => e.funder)).size}`)
console.log()

// ═══════════════════════════════════════════════════════════════════════════
// A. "Are policy voices captured?" - Funder overlap
// ═══════════════════════════════════════════════════════════════════════════
console.log('─'.repeat(70))
console.log('A. ARE POLICY VOICES CAPTURED? (Same funders backing multiple orgs)')
console.log('─'.repeat(70))

const funderToOrgs = new Map()
policyEdges.forEach((e) => {
  if (!funderToOrgs.has(e.funder)) funderToOrgs.set(e.funder, new Set())
  funderToOrgs.get(e.funder).add(e.recipient)
})

const multiOrgFunders = Array.from(funderToOrgs.entries())
  .filter(([_, orgs]) => orgs.size >= 2)
  .map(([funder, orgs]) => ({ funder, orgs: Array.from(orgs), count: orgs.size }))
  .sort((a, b) => b.count - a.count)

console.log(`\nFunders backing 2+ policy orgs:`)
multiOrgFunders.slice(0, 12).forEach((f) => {
  console.log(`  ${f.funder}: ${f.count} orgs`)
})

const totalPolicyOrgs = new Set(policyEdges.map((e) => e.recipient)).size
const orgsBackedByTopFunder = multiOrgFunders[0]?.count || 0
console.log(
  `\n→ INSIGHT: Top funder backs ${orgsBackedByTopFunder}/${totalPolicyOrgs} policy orgs (${Math.round((orgsBackedByTopFunder / totalPolicyOrgs) * 100)}%)`,
)
console.log(`→ ${multiOrgFunders.filter((f) => f.count >= 3).length} funders back 3+ policy orgs`)

// ═══════════════════════════════════════════════════════════════════════════
// B. "How fragile is policy funding?" - Concentration risk
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n' + '─'.repeat(70))
console.log('B. HOW FRAGILE IS POLICY FUNDING? (If top funders withdraw)')
console.log('─'.repeat(70))

// For each org, count total grants and who provides them
const orgFunders = new Map()
policyEdges.forEach((e) => {
  if (!orgFunders.has(e.recipient)) orgFunders.set(e.recipient, [])
  orgFunders.get(e.recipient).push(e.funder)
})

// Find orgs where one funder provides >50% of grants
const fragileOrgs = []
const diverseOrgs = []

Array.from(orgFunders.entries()).forEach(([org, funders]) => {
  const funderCounts = {}
  funders.forEach((f) => {
    funderCounts[f] = (funderCounts[f] || 0) + 1
  })
  const topFunder = Object.entries(funderCounts).sort((a, b) => b[1] - a[1])[0]
  const topFunderShare = topFunder[1] / funders.length

  if (topFunderShare > 0.5 && funders.length >= 2) {
    fragileOrgs.push({ org, topFunder: topFunder[0], share: topFunderShare, total: funders.length })
  } else if (funders.length >= 3 && topFunderShare < 0.4) {
    diverseOrgs.push({ org, topFunder: topFunder[0], share: topFunderShare, total: funders.length })
  }
})

console.log(`\nFragile orgs (single funder >50% of grants):`)
fragileOrgs
  .sort((a, b) => b.share - a.share)
  .slice(0, 8)
  .forEach((o) => {
    console.log(`  ${o.org}: ${o.topFunder} provides ${Math.round(o.share * 100)}% (${o.total} total grants)`)
  })

console.log(`\nDiverse orgs (no funder >40%, 3+ funders):`)
diverseOrgs
  .sort((a, b) => a.share - b.share)
  .slice(0, 8)
  .forEach((o) => {
    console.log(`  ${o.org}: top funder is ${Math.round(o.share * 100)}% (${o.total} total grants)`)
  })

// Scenario: What if Open Philanthropy withdraws?
const openPhilOrgs = funderToOrgs.get('Coefficient Giving (formerly Open Philanthropy)') || new Set()
const orgsOnlyOpenPhil = Array.from(openPhilOrgs).filter((org) => {
  const funders = orgFunders.get(org) || []
  const uniqueFunders = new Set(funders)
  return uniqueFunders.size === 1
})

console.log(`\n→ INSIGHT: ${fragileOrgs.length} orgs have >50% funding concentration`)
console.log(
  `→ If Open Phil withdraws: ${openPhilOrgs.size} orgs affected, ${orgsOnlyOpenPhil.length} with no other funders`,
)

// ═══════════════════════════════════════════════════════════════════════════
// C. "Who are the kingmakers?" - Top funders
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n' + '─'.repeat(70))
console.log('C. WHO ARE THE KINGMAKERS? (Funders with most policy reach)')
console.log('─'.repeat(70))

const funderStats = Array.from(funderToOrgs.entries())
  .map(([funder, orgs]) => {
    const funderEdges = policyEdges.filter((e) => e.funder === funder)
    const categories = new Set(funderEdges.map((e) => e.recipient_category))
    return {
      funder,
      orgs: orgs.size,
      grants: funderEdges.length,
      categories: categories.size,
      funderCategory: funderEdges[0]?.funder_category,
    }
  })
  .sort((a, b) => b.orgs - a.orgs)

console.log(`\nTop funders by policy org reach:`)
console.log(`${'Funder'.padEnd(45)} Orgs  Grants  Categories`)
funderStats.slice(0, 15).forEach((f) => {
  console.log(
    `  ${f.funder.slice(0, 43).padEnd(43)} ${String(f.orgs).padStart(3)}   ${String(f.grants).padStart(4)}   ${f.categories}/3`,
  )
})

// Concentration: what % of policy funding comes from top 5 funders?
const top5Grants = funderStats.slice(0, 5).reduce((sum, f) => sum + f.grants, 0)
const totalGrants = policyEdges.length
console.log(
  `\n→ INSIGHT: Top 5 funders provide ${top5Grants}/${totalGrants} grants (${Math.round((top5Grants / totalGrants) * 100)}%)`,
)

// ═══════════════════════════════════════════════════════════════════════════
// D. "Is there funder-stance alignment?" - Funder category diversity per org
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n' + '─'.repeat(70))
console.log('D. IS THERE FUNDER-STANCE ALIGNMENT? (Funder category diversity)')
console.log('─'.repeat(70))

const orgFunderCategories = new Map()
policyEdges.forEach((e) => {
  if (!orgFunderCategories.has(e.recipient)) orgFunderCategories.set(e.recipient, new Set())
  orgFunderCategories.get(e.recipient).add(e.funder_category)
})

// Orgs funded by single category type vs diverse
const singleCategoryOrgs = []
const multiCategoryOrgs = []

Array.from(orgFunderCategories.entries()).forEach(([org, categories]) => {
  const funders = orgFunders.get(org) || []
  if (funders.length >= 2) {
    if (categories.size === 1) {
      singleCategoryOrgs.push({ org, category: Array.from(categories)[0], funders: funders.length })
    } else if (categories.size >= 3) {
      multiCategoryOrgs.push({ org, categories: Array.from(categories), funders: funders.length })
    }
  }
})

console.log(`\nOrgs funded by single funder category (2+ funders, all same type):`)
singleCategoryOrgs
  .sort((a, b) => b.funders - a.funders)
  .slice(0, 8)
  .forEach((o) => {
    console.log(`  ${o.org}: all ${o.funders} funders are ${o.category}`)
  })

console.log(`\nOrgs with diverse funder types (3+ different categories):`)
multiCategoryOrgs
  .sort((a, b) => b.categories.length - a.categories.length)
  .slice(0, 8)
  .forEach((o) => {
    console.log(`  ${o.org}: ${o.categories.length} funder types (${o.funders} funders)`)
    console.log(`    → ${o.categories.join(', ')}`)
  })

console.log(`\n→ INSIGHT: ${singleCategoryOrgs.length} orgs funded entirely by one funder category`)
console.log(`→ ${multiCategoryOrgs.length} orgs have genuinely diverse funding (3+ funder categories)`)

// ═══════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n' + '='.repeat(70))
console.log('SUMMARY: WHICH INSIGHTS ARE COMPELLING?')
console.log('='.repeat(70))
console.log(`
A. Capture: Top funder backs ${orgsBackedByTopFunder}/${totalPolicyOrgs} orgs - MODERATE (shows concentration)
B. Fragility: ${fragileOrgs.length} orgs >50% concentrated, ${orgsOnlyOpenPhil.length} would lose all funding - COMPELLING
C. Kingmakers: Top 5 funders = ${Math.round((top5Grants / totalGrants) * 100)}% of grants - COMPELLING (clear power law)
D. Alignment: ${singleCategoryOrgs.length} orgs single-category funded - MODERATE (but small N)
`)
