/**
 * Fill specific missing fields via targeted Exa searches.
 * Focuses on factual fields: primary_org, location, twitter, website, author.
 *
 * Usage:
 *   node scripts/fill-gaps.js --people-orgs    # fill primary_org for people
 *   node scripts/fill-gaps.js --people-location # fill locations
 *   node scripts/fill-gaps.js --people-twitter  # fill twitter handles
 *   node scripts/fill-gaps.js --org-websites    # fill missing org websites
 *   node scripts/fill-gaps.js --org-funding     # fill org funding models
 *   node scripts/fill-gaps.js --resource-urls   # verify/fill resource URLs
 *   node scripts/fill-gaps.js --resource-authors # fill resource authors
 *   node scripts/fill-gaps.js --build-links     # create person-org relationships
 *   node scripts/fill-gaps.js --all             # everything
 *   node scripts/fill-gaps.js --pilot           # test with 3 entries
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
const pilot = args.includes('--pilot')
const all = args.includes('--all')

let searches = 0
let updates = 0

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function exaSearch(query, opts = {}) {
  await sleep(120)
  searches++
  return exa.searchAndContents(query, {
    type: 'auto',
    numResults: 3,
    highlights: { numSentences: 3, highlightsPerUrl: 2 },
    ...opts,
  })
}

// ── Fill primary_org + create person-org links ──
async function fillPeopleOrgs() {
  const client = await pool.connect()
  try {
    // Load org lookup
    const orgs = await client.query("SELECT id, name FROM organizations WHERE status='approved'")
    const orgList = orgs.rows.map((o) => ({ id: o.id, name: o.name, lower: o.name.toLowerCase() }))

    function findOrgId(text) {
      if (!text) return null
      const t = text.toLowerCase().trim()
      for (const org of orgList) {
        if (t.includes(org.lower) || org.lower.includes(t)) return org
        // Word overlap
        const tWords = t.split(/\s+/).filter((w) => w.length > 3)
        const oWords = org.lower.split(/\s+/).filter((w) => w.length > 3)
        const overlap = tWords.filter((w) => oWords.some((ow) => ow.includes(w) || w.includes(ow)))
        if (overlap.length >= 1 && tWords.length <= 2) return org
      }
      return null
    }

    const people = await client.query(`
      SELECT id, name, title, primary_org FROM people
      WHERE status='approved' AND (primary_org IS NULL OR primary_org = '')
      ORDER BY name ${pilot ? 'LIMIT 3' : ''}
    `)
    console.log(`\n── Filling primary_org for ${people.rows.length} people ──\n`)

    for (const p of people.rows) {
      try {
        const res = await exaSearch(`"${p.name}" works at organization affiliation`, {
          numResults: 2,
        })
        const text = res.results.flatMap((r) => r.highlights || []).join(' ')

        // Extract org name from patterns
        const patterns = [
          /(?:works? at|affiliated with|CEO of|president of|director (?:at|of)|fellow at|professor at|researcher at)\s+(?:the\s+)?([A-Z][A-Za-z\s&\-']+?)(?:\.|,|\s+where|\s+and|\s+as|\s+in|\s+since)/i,
          /(?:at|of|for)\s+(?:the\s+)?([A-Z][A-Za-z\s&\-']+?(?:Institute|University|Lab|Foundation|Center|Centre|AI|Research|Fund|Capital))/i,
        ]

        let orgName = null
        for (const pat of patterns) {
          const m = text.match(pat)
          if (m) {
            orgName = m[1].trim()
            break
          }
        }

        // Also try the title field
        if (!orgName && p.title) {
          const titleMatch = p.title.match(/(?:,\s*| at | of )(.+)$/)
          if (titleMatch) orgName = titleMatch[1].trim()
        }

        if (orgName) {
          await client.query('UPDATE people SET primary_org = $1 WHERE id = $2', [orgName, p.id])
          updates++
          console.log(`  ${p.name} → ${orgName}`)

          // Create person-org link if org exists in our DB
          const org = findOrgId(orgName)
          if (org) {
            try {
              await client.query(
                'INSERT INTO person_organizations (person_id, organization_id, role, is_primary) VALUES ($1, $2, $3, true) ON CONFLICT DO NOTHING',
                [p.id, org.id, p.title || null],
              )
              console.log(`    ↳ linked to org: ${org.name}`)
            } catch {}
          }
        } else {
          console.log(`  ${p.name} → no org found`)
        }
      } catch (err) {
        console.log(`  ${p.name} → error: ${err.message}`)
      }
    }
  } finally {
    client.release()
  }
}

// ── Fill locations ──
async function fillLocations() {
  const client = await pool.connect()
  try {
    const people = await client.query(`
      SELECT id, name, primary_org FROM people
      WHERE status='approved' AND (location IS NULL OR location = '')
      ORDER BY name ${pilot ? 'LIMIT 3' : ''}
    `)
    console.log(`\n── Filling location for ${people.rows.length} people ──\n`)

    for (const p of people.rows) {
      try {
        const res = await exaSearch(`"${p.name}" based located city`, {
          type: 'fast',
          numResults: 2,
        })
        const text = res.results.flatMap((r) => r.highlights || []).join(' ')

        const locPatterns = [
          /(San Francisco|New York|Washington,?\s*D\.?C\.?|London|Boston|Seattle|Austin|Los Angeles|Chicago|Menlo Park|Palo Alto|Mountain View|Berkeley|Stanford|Cambridge|Oxford|Toronto|Montreal|Paris|Berlin|Beijing|Shanghai|Tokyo)/i,
          /(?:based in|located in|lives in|from)\s+([A-Z][a-zA-Z\s]+,\s*[A-Z]{2})/i,
        ]

        let location = null
        for (const pat of locPatterns) {
          const m = text.match(pat)
          if (m) {
            location = m[1] || m[0]
            break
          }
        }

        if (location) {
          // Normalize common locations
          if (/washington/i.test(location)) location = 'Washington, DC'
          if (/san francisco/i.test(location) || /sf/i.test(location))
            location = 'San Francisco, CA'
          if (/new york/i.test(location)) location = 'New York, NY'

          await client.query('UPDATE people SET location = $1 WHERE id = $2', [location, p.id])
          updates++
          console.log(`  ${p.name} → ${location}`)
        } else {
          console.log(`  ${p.name} → no location found`)
        }
      } catch (err) {
        console.log(`  ${p.name} → error: ${err.message}`)
      }
    }

    // Same for orgs
    const orgsNoLoc = await client.query(`
      SELECT id, name, website FROM organizations
      WHERE status='approved' AND (location IS NULL OR location = '')
      ORDER BY name ${pilot ? 'LIMIT 3' : ''}
    `)
    console.log(`\n── Filling location for ${orgsNoLoc.rows.length} orgs ──\n`)

    for (const o of orgsNoLoc.rows) {
      try {
        const res = await exaSearch(`"${o.name}" headquarters located city`, {
          type: 'fast',
          numResults: 2,
        })
        const text = res.results.flatMap((r) => r.highlights || []).join(' ')
        const locPatterns = [
          /(San Francisco|New York|Washington,?\s*D\.?C\.?|London|Boston|Seattle|Austin|Los Angeles|Menlo Park|Palo Alto|Mountain View|Berkeley|Stanford|Cambridge|Oxford|Toronto|Montreal|Paris|Berlin|Beijing)/i,
          /(?:based in|headquartered in|located in)\s+([A-Z][a-zA-Z\s]+,\s*[A-Z]{2})/i,
        ]
        let location = null
        for (const pat of locPatterns) {
          const m = text.match(pat)
          if (m) {
            location = m[1] || m[0]
            break
          }
        }
        if (location) {
          if (/washington/i.test(location)) location = 'Washington, DC'
          if (/san francisco/i.test(location)) location = 'San Francisco, CA'
          await client.query('UPDATE organizations SET location = $1 WHERE id = $2', [
            location,
            o.id,
          ])
          updates++
          console.log(`  ${o.name} → ${location}`)
        }
      } catch {}
    }
  } finally {
    client.release()
  }
}

// ── Fill twitter handles ──
async function fillTwitter() {
  const client = await pool.connect()
  try {
    const people = await client.query(`
      SELECT id, name FROM people
      WHERE status='approved' AND (twitter IS NULL OR twitter = '')
      ORDER BY name ${pilot ? 'LIMIT 3' : ''}
    `)
    console.log(`\n── Finding twitter for ${people.rows.length} people ──\n`)

    for (const p of people.rows) {
      try {
        const res = await exa.search(`"${p.name}" AI policy`, {
          type: 'fast',
          numResults: 2,
          includeDomains: ['x.com', 'twitter.com'],
        })
        searches++

        for (const r of res.results) {
          const m = r.url.match(/(?:twitter\.com|x\.com)\/([A-Za-z0-9_]+)/)
          if (
            m &&
            !['search', 'hashtag', 'i', 'explore', 'home', 'intent', 'status'].includes(m[1])
          ) {
            await client.query('UPDATE people SET twitter = $1 WHERE id = $2', ['@' + m[1], p.id])
            updates++
            console.log(`  ${p.name} → @${m[1]}`)
            break
          }
        }
        await sleep(100)
      } catch {}
    }
  } finally {
    client.release()
  }
}

// ── Fill resource URLs and authors ──
async function fillResourceGaps() {
  const client = await pool.connect()
  try {
    // Missing URLs
    const noUrl = await client.query(`
      SELECT id, title, author FROM resources
      WHERE status='approved' AND (url IS NULL OR url = '')
      ORDER BY title ${pilot ? 'LIMIT 3' : ''}
    `)
    console.log(`\n── Finding URLs for ${noUrl.rows.length} resources ──\n`)

    for (const r of noUrl.rows) {
      try {
        const res = await exaSearch(`"${r.title}" ${r.author || ''}`, { numResults: 1 })
        if (res.results[0]?.url) {
          await client.query('UPDATE resources SET url = $1 WHERE id = $2', [
            res.results[0].url,
            r.id,
          ])
          updates++
          console.log(`  ${r.title.substring(0, 50)} → ${res.results[0].url.substring(0, 60)}`)
        }
      } catch {}
    }

    // Missing authors
    const noAuthor = await client.query(`
      SELECT id, title, url FROM resources
      WHERE status='approved' AND (author IS NULL OR author = '')
      ORDER BY title ${pilot ? 'LIMIT 3' : ''}
    `)
    console.log(`\n── Finding authors for ${noAuthor.rows.length} resources ──\n`)

    for (const r of noAuthor.rows) {
      try {
        const res = await exaSearch(`"${r.title}" author by written`, {
          type: 'fast',
          numResults: 2,
        })
        const text = res.results.flatMap((x) => x.highlights || []).join(' ')
        const m = text.match(
          /\bby\s+([A-Z][a-z]+ [A-Z][a-z]+(?:\s+(?:and|&)\s+[A-Z][a-z]+ [A-Z][a-z]+)?)/,
        )
        if (m) {
          await client.query('UPDATE resources SET author = $1 WHERE id = $2', [m[1], r.id])
          updates++
          console.log(`  ${r.title.substring(0, 50)} → by ${m[1]}`)
        }
      } catch {}
    }
  } finally {
    client.release()
  }
}

// ── Build person-org links from primary_org field ──
async function buildLinks() {
  const client = await pool.connect()
  try {
    const orgs = await client.query("SELECT id, name FROM organizations WHERE status='approved'")
    const orgList = orgs.rows

    const people = await client.query(
      "SELECT id, name, title, primary_org, other_orgs FROM people WHERE status='approved' AND primary_org IS NOT NULL AND primary_org != ''",
    )
    console.log(`\n── Building person-org links for ${people.rows.length} people ──\n`)

    let linked = 0
    for (const p of people.rows) {
      for (const orgText of [p.primary_org, ...(p.other_orgs || '').split(/[,;]/)].filter(
        Boolean,
      )) {
        const t = orgText.toLowerCase().trim()
        const org = orgList.find((o) => {
          const ol = o.name.toLowerCase()
          return (
            t.includes(ol) ||
            ol.includes(t) ||
            t
              .split(/\s+/)
              .filter((w) => w.length > 3)
              .some((w) => ol.includes(w))
          )
        })
        if (org) {
          try {
            const isPrimary = orgText === p.primary_org
            await client.query(
              'INSERT INTO person_organizations (person_id, organization_id, role, is_primary) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
              [p.id, org.id, isPrimary ? p.title : null, isPrimary],
            )
            linked++
          } catch {}
        }
      }
    }
    console.log(`Created ${linked} person-org links`)

    const total = await client.query('SELECT count(*) FROM person_organizations')
    console.log(`Total person-org links: ${total.rows[0].count}`)
  } finally {
    client.release()
  }
}

async function main() {
  console.log('Gap Filler — Targeted Exa Enrichment\n')

  if (args.includes('--people-orgs') || all) await fillPeopleOrgs()
  if (args.includes('--people-location') || all) await fillLocations()
  if (args.includes('--people-twitter') || all) await fillTwitter()
  if (args.includes('--resource-urls') || all) await fillResourceGaps()
  if (args.includes('--build-links') || all) await buildLinks()

  console.log(`\n══ SUMMARY ══`)
  console.log(`Searches: ${searches}`)
  console.log(`Updates: ${updates}`)
  console.log(`Est. cost: $${(searches * 0.008).toFixed(2)}`)

  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
