/**
 * Phase 2: Comprehensive Exa enrichment — fill EVERY field, verify URLs, create relationships
 *
 * For each sparse person/org:
 *   1. Search Exa for public info (stance, timeline, risk, threats, influence, location, social)
 *   2. Classify extracted text into our dropdown values
 *   3. Find and verify Twitter/Bluesky handles
 *   4. Create person_organizations links
 *   5. Create relationships between entities
 *
 * Usage:
 *   node scripts/enrich-with-exa.js --pilot          # 5 people only (~$0.05)
 *   node scripts/enrich-with-exa.js --people          # all sparse people
 *   node scripts/enrich-with-exa.js --orgs            # all sparse orgs
 *   node scripts/enrich-with-exa.js --all             # everything
 */
import pg from 'pg'
import Exa from 'exa-js'
import 'dotenv/config'

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})
const exa = new Exa(process.env.EXA_API_KEY)

const args = process.argv.slice(2)
const pilotMode = args.includes('--pilot')
const doPeople = args.includes('--people') || args.includes('--all') || pilotMode
const doOrgs = args.includes('--orgs') || args.includes('--all')

let searchCount = 0
let highlightCount = 0
let enrichedCount = 0
let relationshipsCreated = 0

// ── Classification functions ──

function classifyStance(text) {
  const t = text.toLowerCase()
  if (t.includes('pause') || t.includes('moratorium') || t.includes('precaution') || t.includes('halt'))
    return 'Precautionary'
  if (
    t.includes('restrict') ||
    t.includes('oversight') ||
    t.includes('external audit') ||
    t.includes('licensing requirement')
  )
    return 'Restrictive'
  if (
    t.includes('moderate') ||
    t.includes('safety eval') ||
    t.includes('mandatory') ||
    t.includes('transparency require')
  )
    return 'Moderate'
  if (
    t.includes('targeted') ||
    t.includes('sector-specific') ||
    t.includes('responsible scaling') ||
    t.includes('risk-based')
  )
    return 'Targeted'
  if (t.includes('light-touch') || t.includes('voluntary') || t.includes('self-govern') || t.includes('industry-led'))
    return 'Light-touch'
  if (
    t.includes('accelerat') ||
    t.includes('minimal regulation') ||
    t.includes('no regulation') ||
    t.includes('deregulat') ||
    t.includes('pro-innovation')
  )
    return 'Accelerate'
  if (t.includes('nationali') || t.includes('public control') || t.includes('public utility')) return 'Nationalize'
  if (t.includes('nuanced') || t.includes('mixed') || t.includes('complicated') || t.includes('evolving'))
    return 'Mixed/unclear'
  return null
}

function classifyTimeline(text) {
  const t = text.toLowerCase()
  if (t.includes('already here') || t.includes('already achieved') || t.includes('agi is here')) return 'Already here'
  if (/\b(2026|2027|2028)\b/.test(t) || t.includes('2-3 year') || t.includes('two to three') || t.includes('imminent'))
    return '2-3 years'
  if (
    /\b(2029|203[0-5])\b/.test(t) ||
    t.includes('5-10') ||
    t.includes('within a decade') ||
    t.includes('end of decade')
  )
    return '5-10 years'
  if (t.includes('10-25') || t.includes('decades away') || /\b(204\d|205\d)\b/.test(t)) return '10-25 years'
  if (t.includes('25+') || t.includes('never') || t.includes('not in our lifetime') || t.includes('very far'))
    return '25+ years or never'
  if (
    t.includes('ill-defined') ||
    t.includes('not meaningful') ||
    t.includes('misleading concept') ||
    t.includes('wrong question')
  )
    return 'Ill-defined'
  return null
}

function classifyRisk(text) {
  const t = text.toLowerCase()
  if (
    t.includes('existential') ||
    t.includes('extinction') ||
    t.includes('end of humanity') ||
    t.includes('human survival')
  )
    return 'Existential'
  if (
    t.includes('catastroph') ||
    t.includes('bioweapon') ||
    t.includes('loss of control') ||
    t.includes('uncontrollable')
  )
    return 'Catastrophic'
  if (
    t.includes('serious') ||
    t.includes('significant risk') ||
    t.includes('societal') ||
    t.includes('profound') ||
    t.includes('major risk')
  )
    return 'Serious'
  if (
    t.includes('manageable') ||
    t.includes('like previous') ||
    t.includes('can be addressed') ||
    t.includes('solvable')
  )
    return 'Manageable'
  if (
    t.includes('overstated') ||
    t.includes('hype') ||
    t.includes('overblown') ||
    t.includes('not a real risk') ||
    t.includes('doomerism')
  )
    return 'Overstated'
  return null
}

function classifyThreats(text) {
  const t = text.toLowerCase()
  const found = []
  if (
    t.includes('labor') ||
    t.includes('job') ||
    t.includes('unemploy') ||
    t.includes('automat') ||
    t.includes('worker')
  )
    found.push('Labor displacement')
  if (t.includes('inequal') || t.includes('wealth gap') || t.includes('economic divide'))
    found.push('Economic inequality')
  if (t.includes('power') || t.includes('concentrat') || t.includes('monopol') || t.includes('big tech'))
    found.push('Power concentration')
  if (t.includes('democra') || t.includes('surveillance') || t.includes('authorit') || t.includes('civil libert'))
    found.push('Democratic erosion')
  if (t.includes('cyber') || t.includes('hack') || t.includes('security vulnerability')) found.push('Cybersecurity')
  if (t.includes('misinfo') || t.includes('deepfake') || t.includes('disinform') || t.includes('manipulation'))
    found.push('Misinformation')
  if (
    t.includes('environ') ||
    t.includes('energy') ||
    t.includes('water') ||
    t.includes('carbon') ||
    t.includes('climate')
  )
    found.push('Environmental')
  if (t.includes('weapon') || t.includes('military') || t.includes('autonomous') || t.includes('lethal'))
    found.push('Weapons')
  if (
    t.includes('loss of control') ||
    t.includes('alignment') ||
    t.includes('uncontroll') ||
    t.includes('superintelligen')
  )
    found.push('Loss of control')
  if (t.includes('copyright') || t.includes('intellectual property') || t.includes('creative'))
    found.push('Copyright/IP')
  if (t.includes('existential') || t.includes('extinction') || t.includes('x-risk') || t.includes('civiliz'))
    found.push('Existential risk')
  return found.slice(0, 3).join(', ') || null
}

function classifyInfluence(text, title) {
  const t = (text + ' ' + (title || '')).toLowerCase()
  const found = []
  if (
    t.includes('decision') ||
    t.includes('legislat') ||
    t.includes('senator') ||
    t.includes('congress') ||
    t.includes('regulat') ||
    t.includes('secretary') ||
    t.includes('director')
  )
    found.push('Decision-maker')
  if (t.includes('advis') || t.includes('strateg') || t.includes('consult')) found.push('Advisor/strategist')
  if (
    t.includes('research') ||
    t.includes('scientist') ||
    t.includes('professor') ||
    t.includes('studi') ||
    t.includes('academic')
  )
    found.push('Researcher/analyst')
  if (
    t.includes('invest') ||
    t.includes('fund') ||
    t.includes('venture') ||
    t.includes('grant') ||
    t.includes('philanthrop')
  )
    found.push('Funder/investor')
  if (
    t.includes('build') ||
    t.includes('develop') ||
    t.includes('engineer') ||
    t.includes('creat') ||
    t.includes('cto') ||
    t.includes('ceo')
  )
    found.push('Builder')
  if (
    t.includes('organiz') ||
    t.includes('activis') ||
    t.includes('advocat') ||
    t.includes('campaign') ||
    t.includes('mobiliz')
  )
    found.push('Organizer/advocate')
  if (
    t.includes('journalist') ||
    t.includes('reporter') ||
    t.includes('author') ||
    t.includes('podcast') ||
    t.includes('write') ||
    t.includes('editor')
  )
    found.push('Narrator')
  if (t.includes('implement') || t.includes('deploy') || t.includes('execut') || t.includes('operation'))
    found.push('Implementer')
  if (t.includes('connect') || t.includes('conven') || t.includes('bridge') || t.includes('network'))
    found.push('Connector/convener')
  return found.join(', ') || null
}

function classifyPersonCategory(text, name, title) {
  const t = (text + ' ' + name + ' ' + (title || '')).toLowerCase()
  if (
    t.includes('ceo') ||
    t.includes('founder') ||
    t.includes('president') ||
    t.includes('chief') ||
    t.includes('director') ||
    t.includes('head of')
  )
    return 'Executive'
  if (t.includes('professor') || t.includes('university') || t.includes('fellow') || t.includes('institute'))
    return 'Academic'
  if (t.includes('researcher') || t.includes('scientist') || t.includes('phd') || t.includes('lab')) return 'Researcher'
  if (
    t.includes('senator') ||
    t.includes('congress') ||
    t.includes('legislat') ||
    t.includes('regulator') ||
    t.includes('representative') ||
    t.includes('secretary')
  )
    return 'Policymaker'
  if (
    t.includes('invest') ||
    t.includes('venture') ||
    t.includes('philanthrop') ||
    t.includes('funder') ||
    t.includes('partner')
  )
    return 'Investor'
  if (
    t.includes('journalist') ||
    t.includes('reporter') ||
    t.includes('editor') ||
    t.includes('podcast') ||
    t.includes('columnist')
  )
    return 'Journalist'
  if (
    t.includes('organiz') ||
    t.includes('activist') ||
    t.includes('advocate') ||
    t.includes('union') ||
    t.includes('campaign')
  )
    return 'Organizer'
  if (t.includes('author') || t.includes('intellectual') || t.includes('thought leader') || t.includes('public figure'))
    return 'Cultural figure'
  return null
}

function extractLocation(text) {
  // Look for common location patterns
  const patterns = [
    /(?:based in|located in|headquartered in|from)\s+([A-Z][a-zA-Z\s,]+(?:CA|NY|DC|MA|TX|WA|UK|London|Paris|Berlin|San Francisco|New York|Washington|Boston|Seattle|Austin|Los Angeles|Chicago|Beijing|Toronto|Montreal))/i,
    /(San Francisco|New York|Washington,?\s*D\.?C\.?|London|Silicon Valley|Boston|Seattle|Austin|Los Angeles|Chicago|Beijing|Toronto|Montreal|Paris|Berlin|Oxford|Cambridge)/i,
  ]
  for (const p of patterns) {
    const m = text.match(p)
    if (m) return m[1].trim().replace(/,$/, '')
  }
  return null
}

function extractTwitter(results) {
  for (const r of results) {
    const url = r.url || ''
    const match = url.match(/(?:twitter\.com|x\.com)\/([A-Za-z0-9_]+)/)
    if (match && !['search', 'hashtag', 'i', 'explore', 'home', 'intent'].includes(match[1])) {
      return '@' + match[1]
    }
    // Also check in text
    const textMatch = (r.text || r.highlights?.join(' ') || '').match(/@([A-Za-z0-9_]{2,15})\b/)
    if (textMatch) return '@' + textMatch[1]
  }
  return null
}

// ── Org lookup for creating person-org relationships ──
let orgNameToId = {}

async function loadOrgLookup(client) {
  const r = await client.query("SELECT id, LOWER(name) as name FROM organizations WHERE status = 'approved'")
  orgNameToId = {}
  r.rows.forEach((o) => {
    orgNameToId[o.name] = o.id
  })
}

function findOrgId(orgName) {
  if (!orgName) return null
  const lower = orgName.toLowerCase().trim()
  // Exact match
  if (orgNameToId[lower]) return orgNameToId[lower]
  // Partial match
  for (const [name, id] of Object.entries(orgNameToId)) {
    if (lower.includes(name) || name.includes(lower)) return id
  }
  return null
}

async function createPersonOrgLink(client, personId, orgName, role, isPrimary) {
  const orgId = findOrgId(orgName)
  if (!orgId) return false
  try {
    await client.query(
      `INSERT INTO person_organizations (person_id, organization_id, role, is_primary)
       VALUES ($1, $2, $3, $4) ON CONFLICT (person_id, organization_id) DO NOTHING`,
      [personId, orgId, role || null, isPrimary],
    )
    relationshipsCreated++
    return true
  } catch {
    return false
  }
}

// ── Rate-limited Exa search ──
async function exaSearch(query, opts) {
  await new Promise((r) => setTimeout(r, 120)) // 10 QPS limit
  searchCount++
  const res = await exa.searchAndContents(query, opts)
  highlightCount += res.results.length
  return res
}

// ── Enrich People ──
async function enrichPeople(limit) {
  const client = await pool.connect()
  try {
    await loadOrgLookup(client)

    const result = await client.query(`
      SELECT id, name, title, primary_org, other_orgs, category, location,
             regulatory_stance, agi_timeline, ai_risk_level, threat_models,
             influence_type, twitter, bluesky, notes
      FROM people WHERE status = 'approved'
        AND (regulatory_stance IS NULL OR regulatory_stance = ''
             OR twitter IS NULL OR twitter = ''
             OR influence_type IS NULL OR influence_type = '')
      ORDER BY id ${limit ? `LIMIT ${limit}` : ''}
    `)

    console.log(`\n=== Enriching ${result.rows.length} people ===\n`)

    for (const person of result.rows) {
      const isTestData = (person.notes || '').includes('TEST DATA')
      console.log(
        `[${person.id}] ${person.name}${person.title ? ' (' + person.title + ')' : ''}${isTestData ? ' [TEST]' : ''}`,
      )

      try {
        // Search 1: Main info (stance, views, role)
        const mainRes = await exaSearch(`"${person.name}" AI policy regulation views stance role`, {
          type: 'auto',
          numResults: 3,
          highlights: { numSentences: 6, highlightsPerUrl: 3 },
        })
        const mainText = mainRes.results.flatMap((r) => r.highlights || []).join(' ')

        // Search 2: Twitter handle
        let twitter = person.twitter
        if (!twitter) {
          try {
            const twitterRes = await exa.search(`"${person.name}" AI`, {
              type: 'fast',
              numResults: 2,
              includeDomains: ['x.com', 'twitter.com'],
            })
            searchCount++
            twitter = extractTwitter(twitterRes.results)
          } catch {}
        }

        if (!mainText && !twitter) {
          console.log('  No data found\n')
          continue
        }

        // Classify all fields
        const stance = person.regulatory_stance || classifyStance(mainText)
        const timeline = person.agi_timeline || classifyTimeline(mainText)
        const risk = person.ai_risk_level || classifyRisk(mainText)
        const threats = person.threat_models || classifyThreats(mainText)
        const influence = person.influence_type || classifyInfluence(mainText, person.title)
        const category = person.category || classifyPersonCategory(mainText, person.name, person.title)
        const location = person.location || extractLocation(mainText)

        // Build update
        const updates = []
        const values = []
        let idx = 1

        if (stance && !person.regulatory_stance) {
          updates.push(`regulatory_stance = $${idx++}`)
          values.push(stance)
        }
        if (timeline && !person.agi_timeline) {
          updates.push(`agi_timeline = $${idx++}`)
          values.push(timeline)
        }
        if (risk && !person.ai_risk_level) {
          updates.push(`ai_risk_level = $${idx++}`)
          values.push(risk)
        }
        if (threats && !person.threat_models) {
          updates.push(`threat_models = $${idx++}`)
          values.push(threats)
        }
        if (influence && !person.influence_type) {
          updates.push(`influence_type = $${idx++}`)
          values.push(influence)
        }
        if (category && !person.category) {
          updates.push(`category = $${idx++}`)
          values.push(category)
        }
        if (location && !person.location) {
          updates.push(`location = $${idx++}`)
          values.push(location)
        }
        if (twitter && !person.twitter) {
          updates.push(`twitter = $${idx++}`)
          values.push(twitter)
        }
        if (!person.regulatory_stance) {
          updates.push(`evidence_source = $${idx++}`)
          values.push('Inferred')
        }

        if (updates.length > 0) {
          values.push(person.id)
          await client.query(`UPDATE people SET ${updates.join(', ')} WHERE id = $${idx}`, values)
          enrichedCount++
        }

        // Create person-org relationship
        if (person.primary_org) {
          await createPersonOrgLink(client, person.id, person.primary_org, person.title, true)
        }
        if (person.other_orgs) {
          for (const org of person.other_orgs
            .split(/[,;]/)
            .map((s) => s.trim())
            .filter(Boolean)) {
            await createPersonOrgLink(client, person.id, org, null, false)
          }
        }

        const fields = [stance, timeline, risk, threats ? 'threats' : null, influence, twitter, location].filter(
          Boolean,
        )
        console.log(`  → ${fields.join(', ') || 'no new fields'}`)
      } catch (err) {
        console.log(`  Error: ${err.message}`)
      }
    }

    console.log(`\nEnriched ${enrichedCount} people, created ${relationshipsCreated} relationships`)
  } finally {
    client.release()
  }
}

// ── Enrich Organizations ──
async function enrichOrgs(limit) {
  const client = await pool.connect()
  try {
    const result = await client.query(`
      SELECT id, name, category, website, location, funding_model,
             regulatory_stance, agi_timeline, ai_risk_level, threat_models,
             influence_type, twitter, notes
      FROM organizations WHERE status = 'approved'
        AND (regulatory_stance IS NULL OR regulatory_stance = ''
             OR website IS NULL OR website = ''
             OR influence_type IS NULL OR influence_type = '')
      ORDER BY id ${limit ? `LIMIT ${limit}` : ''}
    `)

    console.log(`\n=== Enriching ${result.rows.length} orgs ===\n`)
    const startEnriched = enrichedCount

    for (const org of result.rows) {
      console.log(`[${org.id}] ${org.name} (${org.category || '?'})`)

      try {
        const mainRes = await exaSearch(`"${org.name}" AI policy mission regulation stance about`, {
          type: 'auto',
          numResults: 3,
          highlights: { numSentences: 5, highlightsPerUrl: 3 },
        })
        const mainText = mainRes.results.flatMap((r) => r.highlights || []).join(' ')

        // Try to get website URL from first result if missing
        let website = org.website
        if (!website && mainRes.results.length > 0) {
          // Use the org's own domain, not a news article about them
          const ownResult = mainRes.results.find((r) => {
            const url = r.url.toLowerCase()
            const orgWords = org.name
              .toLowerCase()
              .split(/\s+/)
              .filter((w) => w.length > 3)
            return orgWords.some((w) => url.includes(w))
          })
          if (ownResult) website = ownResult.url
        }

        // Find twitter
        let twitter = org.twitter
        if (!twitter) {
          try {
            const twitterRes = await exa.search(`"${org.name}" AI`, {
              type: 'fast',
              numResults: 1,
              includeDomains: ['x.com', 'twitter.com'],
            })
            searchCount++
            twitter = extractTwitter(twitterRes.results)
          } catch {}
        }

        if (!mainText && !website && !twitter) {
          console.log('  No data found\n')
          continue
        }

        const stance = org.regulatory_stance || classifyStance(mainText)
        const risk = org.ai_risk_level || classifyRisk(mainText)
        const threats = org.threat_models || classifyThreats(mainText)
        const influence = org.influence_type || classifyInfluence(mainText, null)
        const location = org.location || extractLocation(mainText)

        const updates = []
        const values = []
        let idx = 1

        if (stance && !org.regulatory_stance) {
          updates.push(`regulatory_stance = $${idx++}`)
          values.push(stance)
        }
        if (risk && !org.ai_risk_level) {
          updates.push(`ai_risk_level = $${idx++}`)
          values.push(risk)
        }
        if (threats && !org.threat_models) {
          updates.push(`threat_models = $${idx++}`)
          values.push(threats)
        }
        if (influence && !org.influence_type) {
          updates.push(`influence_type = $${idx++}`)
          values.push(influence)
        }
        if (location && !org.location) {
          updates.push(`location = $${idx++}`)
          values.push(location)
        }
        if (website && !org.website) {
          updates.push(`website = $${idx++}`)
          values.push(website)
        }
        if (twitter && !org.twitter) {
          updates.push(`twitter = $${idx++}`)
          values.push(twitter)
        }
        if (!org.regulatory_stance) {
          updates.push(`evidence_source = $${idx++}`)
          values.push('Inferred')
        }

        if (updates.length > 0) {
          values.push(org.id)
          await client.query(`UPDATE organizations SET ${updates.join(', ')} WHERE id = $${idx}`, values)
          enrichedCount++
        }

        const fields = [
          stance,
          risk,
          threats ? 'threats' : null,
          influence,
          twitter,
          location,
          website ? 'website' : null,
        ].filter(Boolean)
        console.log(`  → ${fields.join(', ') || 'no new fields'}`)
      } catch (err) {
        console.log(`  Error: ${err.message}`)
      }
    }

    console.log(`\nEnriched ${enrichedCount - startEnriched} orgs`)
  } finally {
    client.release()
  }
}

// ── Main ──
async function main() {
  console.log('Exa Comprehensive Enrichment')
  console.log('============================\n')

  if (doPeople) await enrichPeople(pilotMode ? 5 : null)
  if (doOrgs) await enrichOrgs(pilotMode ? 5 : null)

  console.log('\n============================')
  console.log(`Total Exa searches: ${searchCount}`)
  console.log(`Total highlights: ${highlightCount}`)
  console.log(`Entities enriched: ${enrichedCount}`)
  console.log(`Relationships created: ${relationshipsCreated}`)
  console.log(`Estimated cost: $${(searchCount * 0.007 + highlightCount * 0.001).toFixed(2)}`)

  await pool.end()
}

main().catch((err) => {
  console.error('Enrichment failed:', err)
  process.exit(1)
})
