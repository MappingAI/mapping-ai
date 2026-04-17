/**
 * Enrich AI-election candidates + PACs using Exa API, then insert into DB for review.
 *
 * Usage:
 *   node scripts/enrich-elections.js                  # Step 1: fetch from Exa → enriched-elections.json
 *   node scripts/enrich-elections.js --review         # Step 2: review the JSON (prints summary)
 *   node scripts/enrich-elections.js --insert         # Step 3: insert into DB as pending submissions
 *   node scripts/enrich-elections.js --insert-approved # Step 3 alt: insert directly as approved entities
 *   node scripts/enrich-elections.js --edges          # Step 4: create PAC→candidate edges (run after --insert-approved)
 */
import 'dotenv/config'
import Exa from 'exa-js'
import pg from 'pg'
import { readFile, writeFile } from 'fs/promises'

const { Pool } = pg
const OUTPUT_FILE = 'enriched-elections.json'

// ── Raw data from elections.transformernews.ai ─────────────────────────────

const PACS = [
  {
    name: 'Leading the Future',
    fecId: 'C00916114',
    category: 'Political Campaign/PAC',
    stance: 'pro-innovation',
  },
  {
    name: 'Think Big',
    fecId: 'C00923417',
    category: 'Political Campaign/PAC',
    stance: 'pro-innovation',
    notes:
      'Spent ~$2.42M opposing Alex Bores in NY-HD-12. Also supported Jesse Jackson Jr. (IL-HD-02) and Melissa Bean (IL-HD-08).',
  },
  {
    name: 'American Mission',
    fecId: 'C00916692',
    category: 'Political Campaign/PAC',
    stance: 'pro-innovation',
    notes:
      'Supported candidates in TX and NC races. Backed Chris Gober, Tom Sell, Jessica Steinmann, Laurie Buckhout, Clay Fuller, Jace Yarbrough.',
  },
  {
    name: 'Defending Our Values PAC',
    fecId: 'C00928390',
    category: 'Political Campaign/PAC',
    stance: 'pro-safety',
    notes: 'Supported Alexandra Mealer, Carlos De La Cruz, Pete Ricketts.',
  },
  {
    name: 'Jobs and Democracy PAC',
    fecId: 'C00928374',
    category: 'Political Campaign/PAC',
    stance: 'pro-safety',
    notes:
      'Major supporter of Alex Bores (~$468K) and Valerie Foushee (~$1.6M). Also supported Colin Allred.',
  },
  {
    name: 'Dream NYC',
    fecId: 'C00928069',
    category: 'Political Campaign/PAC',
    stance: 'pro-safety',
    notes: 'Supported Alex Bores ($1,332).',
  },
]

const CANDIDATES = [
  {
    name: 'Alex Bores',
    race: 'NY House District 12',
    location: 'New York, NY',
    totalSpent: '$3.02M',
    aiContext:
      'NY state assemblyman running for Congress, subject of heavy AI PAC spending both for and against. Opposed by Think Big (~$2.42M), supported by Jobs and Democracy PAC and Dream NYC.',
  },
  {
    name: 'Valerie Foushee',
    race: 'NC House District 04',
    location: 'North Carolina',
    totalSpent: '$1.62M',
    aiContext: 'Backed candidate won. Supported by Jobs and Democracy PAC (pro-safety).',
  },
  {
    name: 'Jesse Jackson Jr.',
    race: 'IL House District 02',
    location: 'Illinois',
    totalSpent: '$1.40M',
    aiContext: 'Backed candidate lost. Supported by Think Big (pro-innovation).',
  },
  {
    name: 'Melissa Bean',
    race: 'IL House District 08',
    location: 'Illinois',
    totalSpent: '$1.12M',
    aiContext: 'Backed candidate won. Supported by Think Big (pro-innovation).',
  },
  {
    name: 'Chris Gober',
    race: 'TX House District 10',
    location: 'Texas',
    totalSpent: '$747,550',
    aiContext: 'Backed candidate won. Supported by American Mission (pro-innovation).',
  },
  {
    name: 'Tom Sell',
    race: 'TX House District 19',
    location: 'Texas',
    totalSpent: '$578,986',
    aiContext: 'Runoff. Supported by American Mission (pro-innovation).',
  },
  {
    name: 'Jessica Steinmann',
    race: 'TX House District 08',
    location: 'Texas',
    totalSpent: '$511,025',
    aiContext: 'Backed candidate won. Supported by American Mission (pro-innovation).',
  },
  {
    name: 'Laurie Buckhout',
    race: 'NC House District 01',
    location: 'North Carolina',
    totalSpent: '$509,067',
    aiContext: 'Backed candidate won. Supported by American Mission (pro-innovation).',
  },
  {
    name: 'Clay Fuller',
    race: 'GA House District 14',
    location: 'Georgia',
    totalSpent: '$436,580',
    aiContext: 'Supported by American Mission (pro-innovation).',
  },
  {
    name: 'Colin Allred',
    race: 'TX House District 33',
    location: 'Texas',
    totalSpent: '$149,926',
    aiContext: 'Supported by Jobs and Democracy PAC (pro-safety).',
  },
  {
    name: 'Pete Ricketts',
    race: 'NE Senate',
    location: 'Nebraska',
    totalSpent: '$250,765',
    aiContext: 'Supported by Defending Our Values PAC (pro-safety).',
  },
  {
    name: 'Jace Yarbrough',
    race: 'TX House District 32',
    location: 'Texas',
    totalSpent: '$129,367',
    aiContext: 'Supported by American Mission (pro-innovation).',
  },
  {
    name: 'Alexandra Mealer',
    race: 'TX House District 09',
    location: 'Texas',
    totalSpent: '$223,736',
    aiContext: 'Supported by Defending Our Values PAC (pro-safety).',
  },
  {
    name: 'Carlos De La Cruz',
    race: 'TX House District 35',
    location: 'Texas',
    totalSpent: '$479,731',
    aiContext: 'Supported by Defending Our Values PAC (pro-safety).',
  },
]

// PAC → Candidate relationships (from activity log)
// edge_type: 'funder' for supporting, 'critic' for opposing
const PAC_CANDIDATE_EDGES = [
  // Think Big (pro-innovation)
  {
    pac: 'Think Big',
    candidate: 'Alex Bores',
    action: 'opposing',
    amount: '$2.42M',
    edgeType: 'critic',
    role: 'Opposed by Think Big PAC ($2.42M spent against)',
  },
  {
    pac: 'Think Big',
    candidate: 'Jesse Jackson Jr.',
    action: 'supporting',
    amount: '$1.40M',
    edgeType: 'funder',
    role: 'Supported by Think Big PAC ($1.40M spent for)',
  },
  {
    pac: 'Think Big',
    candidate: 'Melissa Bean',
    action: 'supporting',
    amount: '$1.12M',
    edgeType: 'funder',
    role: 'Supported by Think Big PAC ($1.12M spent for)',
  },
  // American Mission (pro-innovation)
  {
    pac: 'American Mission',
    candidate: 'Chris Gober',
    action: 'supporting',
    amount: '$747K',
    edgeType: 'funder',
    role: 'Supported by American Mission PAC ($747K spent for)',
  },
  {
    pac: 'American Mission',
    candidate: 'Tom Sell',
    action: 'supporting',
    amount: '$579K',
    edgeType: 'funder',
    role: 'Supported by American Mission PAC ($579K spent for)',
  },
  {
    pac: 'American Mission',
    candidate: 'Jessica Steinmann',
    action: 'supporting',
    amount: '$511K',
    edgeType: 'funder',
    role: 'Supported by American Mission PAC ($511K spent for)',
  },
  {
    pac: 'American Mission',
    candidate: 'Laurie Buckhout',
    action: 'supporting',
    amount: '$509K',
    edgeType: 'funder',
    role: 'Supported by American Mission PAC ($509K spent for)',
  },
  {
    pac: 'American Mission',
    candidate: 'Clay Fuller',
    action: 'supporting',
    amount: '$437K',
    edgeType: 'funder',
    role: 'Supported by American Mission PAC ($437K spent for)',
  },
  {
    pac: 'American Mission',
    candidate: 'Jace Yarbrough',
    action: 'supporting',
    amount: '$129K',
    edgeType: 'funder',
    role: 'Supported by American Mission PAC ($129K spent for)',
  },
  // Jobs and Democracy PAC (pro-safety)
  {
    pac: 'Jobs and Democracy PAC',
    candidate: 'Alex Bores',
    action: 'supporting',
    amount: '$468K',
    edgeType: 'funder',
    role: 'Supported by Jobs and Democracy PAC ($468K spent for)',
  },
  {
    pac: 'Jobs and Democracy PAC',
    candidate: 'Valerie Foushee',
    action: 'supporting',
    amount: '$1.61M',
    edgeType: 'funder',
    role: 'Supported by Jobs and Democracy PAC ($1.61M spent for)',
  },
  {
    pac: 'Jobs and Democracy PAC',
    candidate: 'Colin Allred',
    action: 'supporting',
    amount: '$150K',
    edgeType: 'funder',
    role: 'Supported by Jobs and Democracy PAC ($150K spent for)',
  },
  // Defending Our Values PAC (pro-safety)
  {
    pac: 'Defending Our Values PAC',
    candidate: 'Alexandra Mealer',
    action: 'supporting',
    amount: '$224K',
    edgeType: 'funder',
    role: 'Supported by Defending Our Values PAC ($224K spent for)',
  },
  {
    pac: 'Defending Our Values PAC',
    candidate: 'Carlos De La Cruz',
    action: 'supporting',
    amount: '$480K',
    edgeType: 'funder',
    role: 'Supported by Defending Our Values PAC ($480K spent for)',
  },
  {
    pac: 'Defending Our Values PAC',
    candidate: 'Pete Ricketts',
    action: 'supporting',
    amount: '$251K',
    edgeType: 'funder',
    role: 'Supported by Defending Our Values PAC ($251K spent for)',
  },
  // Dream NYC (pro-safety)
  {
    pac: 'Dream NYC',
    candidate: 'Alex Bores',
    action: 'supporting',
    amount: '$1.3K',
    edgeType: 'funder',
    role: 'Supported by Dream NYC PAC ($1.3K spent for)',
  },
]

// Also mentioned in articles
const EXTRA_PEOPLE = [
  {
    name: 'Chris Lehane',
    title: 'VP of Global Affairs',
    primaryOrg: 'OpenAI',
    category: 'Executive',
    aiContext:
      'OpenAI political strategist described as "guerrilla warrior" / "master of disaster". Key figure connecting AI industry to political campaigns.',
  },
]

// ── Exa enrichment ─────────────────────────────────────────────────────────

const STANCE_SCORES = {
  Accelerate: 1,
  'Light-touch': 2,
  Targeted: 3,
  Moderate: 4,
  Restrictive: 5,
  Precautionary: 6,
  Nationalize: 7,
}
const TIMELINE_SCORES = {
  'Already here': 1,
  '2-3 years': 2,
  '5-10 years': 3,
  '10-25 years': 4,
  '25+ years or never': 5,
}
const RISK_SCORES = {
  Overstated: 1,
  Manageable: 2,
  Serious: 3,
  Catastrophic: 4,
  Existential: 5,
}

async function enrichPerson(exa, person) {
  console.log(`  Enriching person: ${person.name}...`)
  const query =
    `${person.name} ${person.race || ''} politician AI policy artificial intelligence 2025 2026`.trim()

  try {
    const result = await exa.search(query, {
      type: 'auto',
      numResults: 5,
      contents: {
        summary: {
          query: `Biographical information about ${person.name}: political party, career background, education, position on AI/technology policy, stance on AI regulation, views on AI risk and safety, key policy positions, website, Twitter/X handle, Bluesky handle, location/city. ${person.aiContext || ''}`,
        },
        highlights: { maxCharacters: 3000 },
      },
    })

    // Collect all summaries and highlights
    const summaries = result.results.map((r) => r.summary).filter(Boolean)
    const highlights = result.results.flatMap((r) => r.highlights || [])
    const urls = result.results.map((r) => ({ url: r.url, title: r.title }))

    // Second search specifically for social media + website
    let socialResult
    try {
      socialResult = await exa.search(
        `${person.name} politician official website twitter bluesky`,
        {
          type: 'auto',
          numResults: 3,
          contents: {
            summary: {
              query: `What is ${person.name}'s official website URL, Twitter/X handle (@username), and Bluesky handle? Return only factual handles.`,
            },
          },
        },
      )
    } catch {
      socialResult = null
    }

    return {
      entityType: 'person',
      name: person.name,
      category: 'Policymaker',
      title: `Candidate, ${person.race}`,
      location: person.location,
      aiContext: person.aiContext,
      totalSpent: person.totalSpent,
      race: person.race,
      summaries,
      highlights: highlights.slice(0, 10),
      sources: urls,
      socialSummaries: socialResult?.results?.map((r) => r.summary).filter(Boolean) || [],
      // These will be filled in manually during review or parsed from summaries
      website: null,
      twitter: null,
      bluesky: null,
      primaryOrg: null,
      regulatoryStance: null,
      regulatoryStanceDetail: null,
      agiTimeline: null,
      aiRiskLevel: null,
      evidenceSource: null,
      threatModels: null,
      notes: null,
    }
  } catch (err) {
    console.warn(`    ⚠ Exa search failed for ${person.name}: ${err.message}`)
    return {
      entityType: 'person',
      name: person.name,
      category: 'Policymaker',
      title: `Candidate, ${person.race}`,
      location: person.location,
      aiContext: person.aiContext,
      totalSpent: person.totalSpent,
      race: person.race,
      summaries: [],
      highlights: [],
      sources: [],
      socialSummaries: [],
      website: null,
      twitter: null,
      bluesky: null,
      primaryOrg: null,
      regulatoryStance: null,
      regulatoryStanceDetail: null,
      agiTimeline: null,
      aiRiskLevel: null,
      evidenceSource: null,
      threatModels: null,
      notes: null,
      error: err.message,
    }
  }
}

async function enrichExtraPerson(exa, person) {
  console.log(`  Enriching person: ${person.name}...`)
  const query = `${person.name} ${person.primaryOrg || ''} AI policy`.trim()

  try {
    const result = await exa.search(query, {
      type: 'auto',
      numResults: 5,
      contents: {
        summary: {
          query: `Biographical information about ${person.name}: role, career background, stance on AI regulation, views on AI safety/risk, Twitter/X handle, Bluesky handle, website. ${person.aiContext || ''}`,
        },
        highlights: { maxCharacters: 3000 },
      },
    })

    const summaries = result.results.map((r) => r.summary).filter(Boolean)
    const highlights = result.results.flatMap((r) => r.highlights || [])
    const urls = result.results.map((r) => ({ url: r.url, title: r.title }))

    return {
      entityType: 'person',
      name: person.name,
      category: person.category || 'Executive',
      title: person.title || null,
      primaryOrg: person.primaryOrg || null,
      location: person.location || null,
      aiContext: person.aiContext,
      summaries,
      highlights: highlights.slice(0, 10),
      sources: urls,
      website: null,
      twitter: null,
      bluesky: null,
      regulatoryStance: null,
      regulatoryStanceDetail: null,
      agiTimeline: null,
      aiRiskLevel: null,
      evidenceSource: null,
      threatModels: null,
      notes: null,
    }
  } catch (err) {
    console.warn(`    ⚠ Exa search failed for ${person.name}: ${err.message}`)
    return {
      entityType: 'person',
      name: person.name,
      category: person.category || 'Executive',
      title: person.title || null,
      primaryOrg: person.primaryOrg || null,
      aiContext: person.aiContext,
      summaries: [],
      highlights: [],
      sources: [],
      website: null,
      twitter: null,
      bluesky: null,
      regulatoryStance: null,
      regulatoryStanceDetail: null,
      agiTimeline: null,
      aiRiskLevel: null,
      evidenceSource: null,
      threatModels: null,
      notes: null,
      error: err.message,
    }
  }
}

async function enrichPAC(exa, pac) {
  console.log(`  Enriching PAC: ${pac.name}...`)
  const query = `"${pac.name}" super PAC AI artificial intelligence 2025 2026 FEC`

  try {
    const result = await exa.search(query, {
      type: 'auto',
      numResults: 5,
      contents: {
        summary: {
          query: `Information about the "${pac.name}" super PAC (FEC ID: ${pac.fecId}): who funds it, what is its mission, which AI companies or individuals are behind it, what is its stance on AI regulation, website URL. ${pac.notes || ''}`,
        },
        highlights: { maxCharacters: 3000 },
      },
    })

    const summaries = result.results.map((r) => r.summary).filter(Boolean)
    const highlights = result.results.flatMap((r) => r.highlights || [])
    const urls = result.results.map((r) => ({ url: r.url, title: r.title }))

    return {
      entityType: 'organization',
      name: pac.name,
      category: pac.category,
      fecId: pac.fecId,
      stance: pac.stance,
      summaries,
      highlights: highlights.slice(0, 10),
      sources: urls,
      website: null,
      twitter: null,
      bluesky: null,
      fundingModel: null,
      regulatoryStance: pac.stance === 'pro-innovation' ? 'Light-touch' : 'Targeted',
      regulatoryStanceDetail: null,
      notes: pac.notes || null,
    }
  } catch (err) {
    console.warn(`    ⚠ Exa search failed for ${pac.name}: ${err.message}`)
    return {
      entityType: 'organization',
      name: pac.name,
      category: pac.category,
      fecId: pac.fecId,
      stance: pac.stance,
      summaries: [],
      highlights: [],
      sources: [],
      website: null,
      twitter: null,
      bluesky: null,
      fundingModel: null,
      regulatoryStance: pac.stance === 'pro-innovation' ? 'Light-touch' : 'Targeted',
      regulatoryStanceDetail: null,
      notes: pac.notes || null,
      error: err.message,
    }
  }
}

// ── Step 1: Fetch + enrich ─────────────────────────────────────────────────

async function fetchAndEnrich() {
  if (!process.env.EXA_API_KEY) {
    console.error('Missing EXA_API_KEY in .env')
    process.exit(1)
  }

  const exa = new Exa(process.env.EXA_API_KEY)
  const results = {
    people: [],
    organizations: [],
    meta: { fetchedAt: new Date().toISOString(), source: 'elections.transformernews.ai' },
  }

  console.log('\n═══ Enriching PACs ═══')
  for (const pac of PACS) {
    const enriched = await enrichPAC(exa, pac)
    results.organizations.push(enriched)
    // Rate limit: ~1 req/sec to be safe
    await sleep(1500)
  }

  console.log('\n═══ Enriching Candidates ═══')
  for (const candidate of CANDIDATES) {
    const enriched = await enrichPerson(exa, candidate)
    results.people.push(enriched)
    await sleep(1500)
  }

  console.log('\n═══ Enriching Additional People ═══')
  for (const person of EXTRA_PEOPLE) {
    const enriched = await enrichExtraPerson(exa, person)
    results.people.push(enriched)
    await sleep(1500)
  }

  await writeFile(OUTPUT_FILE, JSON.stringify(results, null, 2))
  console.log(
    `\n✓ Wrote ${results.people.length} people + ${results.organizations.length} organizations to ${OUTPUT_FILE}`,
  )
  console.log('\nNext steps:')
  console.log('  1. Open enriched-elections.json and review/edit the data')
  console.log(
    '  2. Fill in missing fields (website, twitter, bluesky, beliefs) using the summaries as reference',
  )
  console.log('  3. Run: node scripts/enrich-elections.js --review    (to see a summary)')
  console.log(
    '  4. Run: node scripts/enrich-elections.js --insert    (to add as pending submissions)',
  )
}

// ── Step 2: Review ─────────────────────────────────────────────────────────

async function review() {
  const data = JSON.parse(await readFile(OUTPUT_FILE, 'utf-8'))
  console.log(`\n═══ Enriched Elections Data (fetched ${data.meta.fetchedAt}) ═══\n`)

  console.log(`Organizations (${data.organizations.length}):`)
  for (const org of data.organizations) {
    const status = org.error ? '⚠' : '✓'
    console.log(
      `  ${status} ${org.name} [${org.category}] stance=${org.regulatoryStance || '?'} website=${org.website || '?'} twitter=${org.twitter || '?'}`,
    )
    if (org.summaries?.length) console.log(`    Summary: ${org.summaries[0].slice(0, 150)}...`)
  }

  console.log(`\nPeople (${data.people.length}):`)
  for (const p of data.people) {
    const status = p.error ? '⚠' : '✓'
    console.log(
      `  ${status} ${p.name} [${p.category}] title=${p.title || '?'} loc=${p.location || '?'} stance=${p.regulatoryStance || '?'}`,
    )
    if (p.summaries?.length) console.log(`    Summary: ${p.summaries[0].slice(0, 150)}...`)
  }

  // Count missing fields
  const allEntities = [...data.organizations, ...data.people]
  const missing = { website: 0, twitter: 0, regulatoryStance: 0, notes: 0 }
  for (const e of allEntities) {
    if (!e.website) missing.website++
    if (!e.twitter) missing.twitter++
    if (!e.regulatoryStance) missing.regulatoryStance++
    if (!e.notes) missing.notes++
  }
  console.log(
    `\nMissing fields: website=${missing.website}, twitter=${missing.twitter}, regulatoryStance=${missing.regulatoryStance}, notes=${missing.notes}`,
  )
  console.log(`Total entities: ${allEntities.length}`)
}

// ── Step 3: Insert into DB ─────────────────────────────────────────────────

async function insertIntoDB(asApproved = false) {
  if (!process.env.DATABASE_URL) {
    console.error('Missing DATABASE_URL in .env')
    process.exit(1)
  }

  const data = JSON.parse(await readFile(OUTPUT_FILE, 'utf-8'))
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })
  const client = await pool.connect()

  try {
    const allEntities = [...data.organizations, ...data.people]
    let inserted = 0
    let skipped = 0

    for (const entity of allEntities) {
      // Check for duplicates by name
      const existing = await client.query(
        'SELECT id FROM entity WHERE LOWER(name) = LOWER($1) AND entity_type = $2',
        [entity.name, entity.entityType],
      )
      if (existing.rows.length > 0) {
        console.log(`  SKIP (exists): ${entity.name} (entity #${existing.rows[0].id})`)
        skipped++
        continue
      }

      // Build notes from enrichment data
      const { plain: notesPlain, html: notesHtml } = buildNotes(entity)

      if (asApproved) {
        // Insert directly into entity table
        const result = await client.query(
          `INSERT INTO entity (
            entity_type, name, title, category, primary_org, location,
            website, twitter, bluesky, funding_model,
            belief_regulatory_stance, belief_regulatory_stance_detail,
            belief_evidence_source, belief_agi_timeline, belief_ai_risk,
            belief_threat_models, notes, notes_html, influence_type, status
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,'approved')
          RETURNING id`,
          [
            entity.entityType,
            entity.name,
            entity.title || null,
            entity.category || null,
            entity.primaryOrg || null,
            entity.location || null,
            entity.website || null,
            entity.twitter || null,
            entity.bluesky || null,
            entity.fundingModel || null,
            entity.regulatoryStance || null,
            entity.regulatoryStanceDetail || null,
            entity.evidenceSource || null,
            entity.agiTimeline || null,
            entity.aiRiskLevel || null,
            entity.threatModels || null,
            notesPlain,
            notesHtml,
            entity.influenceType || null,
          ],
        )
        console.log(
          `  ✓ INSERTED entity #${result.rows[0].id}: ${entity.name} [${entity.entityType}]`,
        )
      } else {
        // Insert as pending submission (submission has notes + notes_html)
        const stanceScore = STANCE_SCORES[entity.regulatoryStance] ?? null
        const timelineScore = TIMELINE_SCORES[entity.agiTimeline] ?? null
        const riskScore = RISK_SCORES[entity.aiRiskLevel] ?? null

        const result = await client.query(
          `INSERT INTO submission (
            entity_type, submitter_email, submitter_relationship,
            name, title, category, primary_org, location,
            website, twitter, bluesky, funding_model,
            belief_regulatory_stance, belief_regulatory_stance_score,
            belief_regulatory_stance_detail, belief_evidence_source,
            belief_agi_timeline, belief_agi_timeline_score,
            belief_ai_risk, belief_ai_risk_score,
            belief_threat_models, notes, notes_html, influence_type, status
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,'pending')
          RETURNING id`,
          [
            entity.entityType,
            'enrichment-script@mapping-ai.org',
            'external',
            entity.name,
            entity.title || null,
            entity.category || null,
            entity.primaryOrg || null,
            entity.location || null,
            entity.website || null,
            entity.twitter || null,
            entity.bluesky || null,
            entity.fundingModel || null,
            entity.regulatoryStance || null,
            stanceScore,
            entity.regulatoryStanceDetail || null,
            entity.evidenceSource || null,
            entity.agiTimeline || null,
            timelineScore,
            entity.aiRiskLevel || null,
            riskScore,
            entity.threatModels || null,
            notesPlain,
            notesHtml,
            entity.influenceType || null,
          ],
        )
        console.log(
          `  ✓ SUBMITTED #${result.rows[0].id}: ${entity.name} [${entity.entityType}] (pending)`,
        )
      }
      inserted++
    }

    console.log(`\nDone: ${inserted} inserted, ${skipped} skipped (duplicates)`)
  } finally {
    client.release()
    await pool.end()
  }
}

const TRACKER_URL = 'https://elections.transformernews.ai/'

/**
 * Build clean paragraph notes (plain text + HTML) from enriched entity data.
 * No references to Exa, sources, or enrichment tooling.
 * Links to Transformer election tracker for live spending data.
 */
function buildNotes(entity) {
  const htmlParts = []
  const plainParts = []

  // Main bio/summary from Haiku extraction (already a clean paragraph)
  if (entity.notes) {
    htmlParts.push(`<p>${escapeHtml(entity.notes)}</p>`)
    plainParts.push(entity.notes)
  }

  // For candidates: race context
  if (entity.entityType === 'person' && entity.race) {
    const raceLine = `Running in the ${entity.race} race, which has seen significant AI-related super PAC spending.`
    htmlParts.push(
      `<p>${raceLine} See <a href="${TRACKER_URL}">Transformer AI Election Tracker</a> for live spending data.</p>`,
    )
    plainParts.push(`${raceLine} See ${TRACKER_URL} for live spending data.`)
  }

  // For PACs: identity + tracker link
  if (entity.entityType === 'organization' && entity.fecId) {
    const pacLine = `Registered as a federal super PAC (FEC ID: ${entity.fecId}).`
    const stanceLine =
      entity.stance === 'pro-innovation'
        ? 'Classified as a pro-innovation AI policy PAC.'
        : entity.stance === 'pro-safety'
          ? 'Classified as a pro-safety AI policy PAC.'
          : ''
    const combined = [pacLine, stanceLine].filter(Boolean).join(' ')
    htmlParts.push(
      `<p>${combined} See <a href="${TRACKER_URL}">Transformer AI Election Tracker</a> for live spending data.</p>`,
    )
    plainParts.push(`${combined} See ${TRACKER_URL} for live spending data.`)
  }

  return {
    plain: plainParts.join('\n\n'),
    html: htmlParts.join(''),
  }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ── Step 4: Create PAC → candidate edges ──────────────────────────────────

async function createEdges() {
  if (!process.env.DATABASE_URL) {
    console.error('Missing DATABASE_URL in .env')
    process.exit(1)
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })
  const client = await pool.connect()

  try {
    let created = 0
    let skipped = 0
    let missing = 0

    for (const rel of PAC_CANDIDATE_EDGES) {
      // Look up PAC entity (organization)
      const pacRow = await client.query(
        "SELECT id FROM entity WHERE LOWER(name) = LOWER($1) AND entity_type = 'organization'",
        [rel.pac],
      )
      if (!pacRow.rows.length) {
        console.log(`  ✗ PAC not found: "${rel.pac}" — insert entities first`)
        missing++
        continue
      }

      // Look up candidate entity (person)
      const candidateRow = await client.query(
        "SELECT id FROM entity WHERE LOWER(name) = LOWER($1) AND entity_type = 'person'",
        [rel.candidate],
      )
      if (!candidateRow.rows.length) {
        console.log(`  ✗ Candidate not found: "${rel.candidate}" — insert entities first`)
        missing++
        continue
      }

      const sourceId = pacRow.rows[0].id
      const targetId = candidateRow.rows[0].id

      // Upsert edge (skip if duplicate)
      try {
        await client.query(
          `INSERT INTO edge (source_id, target_id, edge_type, role, evidence, created_by)
           VALUES ($1, $2, $3, $4, $5, 'enrichment-script')
           ON CONFLICT (source_id, target_id, edge_type) DO UPDATE SET
             role = EXCLUDED.role, evidence = EXCLUDED.evidence`,
          [
            sourceId,
            targetId,
            rel.edgeType,
            rel.role,
            `${rel.action} (${rel.amount}) — source: elections.transformernews.ai`,
          ],
        )
        console.log(
          `  ✓ ${rel.pac} —[${rel.edgeType}]→ ${rel.candidate} (${rel.action}, ${rel.amount})`,
        )
        created++
      } catch (err) {
        console.warn(`  ⚠ Edge failed: ${rel.pac} → ${rel.candidate}: ${err.message}`)
        skipped++
      }
    }

    console.log(
      `\nDone: ${created} edges created/updated, ${skipped} failed, ${missing} entities not found`,
    )
  } finally {
    client.release()
    await pool.end()
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ── Main ───────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)

if (args.includes('--review')) {
  review().catch((err) => {
    console.error(err)
    process.exit(1)
  })
} else if (args.includes('--insert-approved')) {
  insertIntoDB(true).catch((err) => {
    console.error(err)
    process.exit(1)
  })
} else if (args.includes('--insert')) {
  insertIntoDB(false).catch((err) => {
    console.error(err)
    process.exit(1)
  })
} else if (args.includes('--edges')) {
  createEdges().catch((err) => {
    console.error(err)
    process.exit(1)
  })
} else {
  fetchAndEnrich().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
