/**
 * Enrichment Pipeline v2: Source-Grounded with Confidence Scoring
 *
 * ANTI-HALLUCINATION DESIGN:
 * - Every claim must be a direct quote or close paraphrase from sources
 * - Explicit "INSUFFICIENT_DATA" responses when sources are thin
 * - Confidence scores for both notes and edges
 * - Only creates edges with confidence >= 3
 * - Strict citation requirements enforced
 *
 * Usage:
 *   node scripts/enrich-v2.js --pilot              # 5 entities
 *   node scripts/enrich-v2.js --id=70              # Single entity
 *   node scripts/enrich-v2.js --people             # All people
 *   node scripts/enrich-v2.js --orgs               # All orgs
 *   node scripts/enrich-v2.js --all                # Everything
 *   node scripts/enrich-v2.js --no-notes           # Only entities missing notes
 *   node scripts/enrich-v2.js --force              # Re-run even if already v2
 *   node scripts/enrich-v2.js --no-create          # Don't create new entities
 *   node scripts/enrich-v2.js --edge-threshold=4   # Min confidence for edges (default 3)
 */
import pg from 'pg';
import Exa from 'exa-js';
import Anthropic from '@anthropic-ai/sdk';
import 'dotenv/config';

import {
  findEntityMatch,
  getCanonicalOrgName,
  getParentOrgName,
  normalizeOrgName,
} from './lib/org-matching.js';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const exa = new Exa(process.env.EXA_API_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Parse CLI args
const args = process.argv.slice(2);
const pilotMode = args.includes('--pilot');
const singleIdArg = args.find(a => a.startsWith('--id='));
const singleId = singleIdArg ? parseInt(singleIdArg.split('=')[1], 10) : null;
const forceRerun = args.includes('--force');
const doPeople = args.includes('--people') || args.includes('--all');
const doOrgs = args.includes('--orgs') || args.includes('--all');
const noCreate = args.includes('--no-create');
const onlyNoNotes = args.includes('--no-notes');
const edgeThresholdArg = args.find(a => a.startsWith('--edge-threshold='));
const EDGE_CONFIDENCE_THRESHOLD = edgeThresholdArg ? parseInt(edgeThresholdArg.split('=')[1], 10) : 3;

const pilotBoth = pilotMode && !args.includes('--people') && !args.includes('--orgs');

// Tracking
let exaSearches = 0;
let llmCalls = 0;
let inputTokens = 0;
let outputTokens = 0;
let enriched = 0;
let skipped = 0;
let insufficientData = 0;
let edgesCreated = 0;
let edgesSkippedLowConfidence = 0;
let entitiesCreated = 0;
let entitiesSkippedNotAI = 0;

// Valid enums
const VALID_EDGE_TYPES = [
  'employed_by', 'founded', 'advises', 'board_member', 'invested_in',
  'co_founded_with', 'collaborator', 'mentor_of', 'mentored_by',
  'former_colleague', 'critic_of', 'supporter_of',
  'subsidiary_of', 'funded_by', 'partner_of', 'spun_out_from', 'affiliated'
];

const VALID_PERSON_CATEGORIES = [
  'Executive', 'Researcher', 'Policymaker', 'Investor', 'Organizer',
  'Journalist', 'Academic', 'Cultural figure'
];

const VALID_ORG_CATEGORIES = [
  'Frontier Lab', 'AI Safety/Alignment', 'Think Tank/Policy Org', 'Government/Agency',
  'Academic', 'VC/Capital/Philanthropy', 'Labor/Civil Society', 'Ethics/Bias/Rights',
  'Media/Journalism', 'Political Campaign/PAC', 'Infrastructure & Compute', 'Deployers & Platforms'
];

// Edge type constraints by source type
const PERSON_TO_ORG_EDGES = ['employed_by', 'founded', 'advises', 'board_member', 'invested_in', 'affiliated'];
const PERSON_TO_PERSON_EDGES = ['co_founded_with', 'collaborator', 'mentor_of', 'mentored_by', 'former_colleague', 'critic_of', 'supporter_of'];
const ORG_TO_ORG_EDGES = ['subsidiary_of', 'funded_by', 'partner_of', 'spun_out_from', 'affiliated'];

function isValidEdgeType(sourceType, targetType, edgeType) {
  if (sourceType === 'person' && targetType === 'organization') {
    return PERSON_TO_ORG_EDGES.includes(edgeType);
  }
  if (sourceType === 'person' && targetType === 'person') {
    return PERSON_TO_PERSON_EDGES.includes(edgeType);
  }
  if (sourceType === 'organization' && targetType === 'organization') {
    return ORG_TO_ORG_EDGES.includes(edgeType);
  }
  // Org → Person edges are unusual; skip them (should be reversed)
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════
// API HELPERS
// ═══════════════════════════════════════════════════════════════════════════

async function exaSearch(query, opts) {
  await new Promise(r => setTimeout(r, 200));
  exaSearches++;
  try {
    return await exa.searchAndContents(query, opts);
  } catch (err) {
    console.log(`    Exa error: ${err.message}`);
    return { results: [] };
  }
}

async function askClaude(prompt, maxTokens = 2000) {
  await new Promise(r => setTimeout(r, 100));
  llmCalls++;
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });
  inputTokens += msg.usage.input_tokens;
  outputTokens += msg.usage.output_tokens;
  return msg.content[0].text;
}

// ═══════════════════════════════════════════════════════════════════════════
// ANTI-HALLUCINATION PROMPTS
// ═══════════════════════════════════════════════════════════════════════════

function buildEnrichmentPrompt(entity, webContent, sourceUrls) {
  const type = entity.entity_type === 'person' ? 'PERSON' : 'ORGANIZATION';

  return `You are extracting factual information from search results. You must ONLY report what is EXPLICITLY stated in the sources below.

## ENTITY
Type: ${type}
Name: ${entity.name}
Category: ${entity.category || 'unknown'}

## SEARCH RESULTS
${webContent}

## SOURCE INDEX
${sourceUrls.map((url, i) => `[${i + 1}] ${url}`).join('\n')}

═══════════════════════════════════════════════════════════════════════════════
## STRICT RULES - VIOLATION = FAILURE

1. ONLY include information that appears in the sources above
2. If a fact is not in the sources, DO NOT include it - even if you "know" it
3. DO NOT infer, extrapolate, or combine facts to create new claims
4. DO NOT use phrases like "is known for", "is famous for", "is considered" unless quoted
5. If sources are insufficient, return "INSUFFICIENT_DATA" for that field
6. Write clean prose WITHOUT citation numbers - no [1], [2], etc.

## FORBIDDEN (will cause hallucination):
- Specific years/dates not explicitly in sources
- Dollar amounts not explicitly in sources
- Award names not explicitly in sources
- Job titles not explicitly in sources
- Relationships not explicitly in sources
- Anything you "know" but don't see in the text above
═══════════════════════════════════════════════════════════════════════════════

Return this exact JSON structure:

{
  "status": "SUCCESS" | "INSUFFICIENT_DATA",

  "notes": "<2-4 sentences of clean prose. NO citation numbers like [1] or [2]. Use ONLY facts from sources above. If insufficient data, set to null>",

  "notes_confidence": <1-5 | null if insufficient>,

  "confidence_reasoning": "<Explain: How many sources? How recent? Any conflicts?>",

  "extracted_edges": [
    {
      "target_name": "<Exact name as written in source>",
      "target_type": "person" | "organization",
      "edge_type": "<employed_by|founded|advises|board_member|invested_in|co_founded_with|collaborator|mentor_of|mentored_by|former_colleague|critic_of|supporter_of|subsidiary_of|funded_by|partner_of|spun_out_from|affiliated>",
      "role": "<Exact role/title from source, or null>",
      "source_quote": "<Copy the EXACT text from the source that supports this relationship>",
      "source_number": <Which source [N] contains this>,
      "confidence": <1-5>
    }
  ]
}

## CONFIDENCE SCALE (be conservative):
5 = Fact stated explicitly in 2+ independent sources, recent (2024-2025)
4 = Fact stated explicitly in 1 source, appears reliable
3 = Fact stated but source is older or less reliable
2 = Fact partially supported, some inference required
1 = Weak support, significant uncertainty

## EDGE RULES:
- Only include edges where you can provide an EXACT source_quote
- If you cannot copy text proving the relationship, DO NOT include the edge
- source_quote must be copy-pasted from the search results, not paraphrased

## EDGE TYPE CONSTRAINTS (MUST FOLLOW):
For ${entity.entity_type === 'person' ? 'PERSON' : 'ORGANIZATION'} → target edges:

${entity.entity_type === 'person' ? `PERSON → ORGANIZATION: employed_by, founded, advises, board_member, invested_in, affiliated
PERSON → PERSON: co_founded_with, collaborator, mentor_of, mentored_by, former_colleague, critic_of, supporter_of

FORBIDDEN for person source: subsidiary_of, funded_by, partner_of, spun_out_from` : `ORGANIZATION → ORGANIZATION: subsidiary_of, funded_by, partner_of, spun_out_from, affiliated
ORGANIZATION → PERSON: Only if person works there (reverse the direction instead)

FORBIDDEN for org source: employed_by, founded, advises, board_member, invested_in, mentor_of, mentored_by`}

Return ONLY valid JSON. No other text.`;
}

function buildEntityEvaluationPrompt(targetName, targetType, sourceQuote, sourceUrl) {
  return `You are deciding whether to add an entity to a database mapping the US AI POLICY ECOSYSTEM.

## CANDIDATE
Name: ${targetName}
Type: ${targetType}

## EVIDENCE (from search results)
Quote: "${sourceQuote}"
Source: ${sourceUrl}

═══════════════════════════════════════════════════════════════════════════════
## TASK
Based ONLY on the quote above, determine:
1. Does this entity exist? (Does the quote confirm they are real?)
2. Do they actively SHAPE the AI ecosystem? (Not just use AI products)
3. What category fits based on the quote?

## THE KEY DISTINCTION
SHAPES AI ECOSYSTEM = researches AI, builds AI, funds AI, regulates AI, advocates about AI, reports on AI, organizes around AI issues
USES AI = company/person that uses AI tools as a customer (e.g., retailers using AI recommendations, hospitals using AI diagnostics)

We want entities who SHAPE the ecosystem, not those who merely USE AI.

## STRICT RULES
- Base your decision ONLY on the quote provided
- DO NOT use any knowledge about this entity beyond the quote
- If the quote only shows they USE AI (not shape it), answer NO
- If uncertain, err toward NO - we can add later with better evidence
═══════════════════════════════════════════════════════════════════════════════

Return this JSON:

{
  "entity_exists": true | false,
  "shapes_ai_ecosystem": true | false,
  "reasoning": "<Quote specific words showing they SHAPE AI, or explain why they only USE it>",
  "category": "<Category from: ${targetType === 'person' ? VALID_PERSON_CATEGORIES.join('|') : VALID_ORG_CATEGORIES.join('|')}>",
  "confidence": <1-5>,
  "should_create": true | false
}

## should_create = true ONLY IF:
- entity_exists = true AND
- shapes_ai_ecosystem = true AND
- confidence >= 4

Return ONLY valid JSON.`;
}

// ═══════════════════════════════════════════════════════════════════════════
// SEARCH
// ═══════════════════════════════════════════════════════════════════════════

function getSearchQueries(entity) {
  const name = `"${entity.name}"`;
  const queries = [];

  if (entity.entity_type === 'person') {
    queries.push({ q: `${name} AI artificial intelligence`, n: 5 });
    queries.push({ q: `${name} biography career background`, n: 4 });
    queries.push({ q: `${name} 2024 2025`, n: 3 });
  } else if (entity.entity_type === 'organization') {
    queries.push({ q: `${name} AI artificial intelligence`, n: 5 });
    queries.push({ q: `${name} about founded mission`, n: 4 });
    queries.push({ q: `${name} 2024 2025`, n: 3 });
  } else {
    queries.push({ q: `${name}`, n: 5 });
  }

  return queries;
}

// ═══════════════════════════════════════════════════════════════════════════
// ENRICHMENT
// ═══════════════════════════════════════════════════════════════════════════

async function enrichEntity(client, entity, allEntities) {
  console.log(`\n[${entity.id}] ${entity.name} (${entity.entity_type})`);
  console.log(`  Category: ${entity.category || 'unknown'}`);

  const queries = getSearchQueries(entity);

  // Run searches
  const allResults = [];
  for (const { q, n } of queries) {
    const res = await exaSearch(q, {
      type: 'auto',
      numResults: n,
      highlights: { numSentences: 6, highlightsPerUrl: 3 }
    });
    allResults.push(...res.results);
  }

  // Deduplicate
  const seenUrls = new Set();
  const uniqueResults = allResults.filter(r => {
    if (seenUrls.has(r.url)) return false;
    seenUrls.add(r.url);
    return true;
  });

  const highlights = uniqueResults.flatMap(r => r.highlights || []);

  if (highlights.length < 2) {
    console.log(`  ⚠ Only ${highlights.length} highlights - skipping`);
    skipped++;
    return null;
  }

  // Format sources with explicit numbering
  const sourceUrls = uniqueResults.map(r => r.url).slice(0, 12);
  const webContent = uniqueResults.slice(0, 12).map((r, i) => {
    const hl = (r.highlights || []).slice(0, 3).join('\n');
    return `=== SOURCE [${i + 1}] ===\nURL: ${r.url}\nTitle: ${r.title || 'N/A'}\n\n${hl}`;
  }).join('\n\n');

  console.log(`  Found ${highlights.length} highlights from ${uniqueResults.length} sources`);

  // Call Claude
  const prompt = buildEnrichmentPrompt(entity, webContent, sourceUrls);
  let response;
  try {
    response = await askClaude(prompt);
  } catch (err) {
    console.log(`  LLM error: ${err.message}`);
    skipped++;
    return null;
  }

  // Parse response
  let data;
  try {
    const match = response.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON found');
    data = JSON.parse(match[0]);
  } catch (err) {
    console.log(`  Parse error: ${err.message}`);
    skipped++;
    return null;
  }

  // Handle insufficient data
  if (data.status === 'INSUFFICIENT_DATA' || !data.notes) {
    console.log(`  ⚠ INSUFFICIENT_DATA - sources too thin`);
    insufficientData++;

    // Still mark as processed so we don't retry endlessly
    await client.query(`
      UPDATE entity SET enrichment_version = 'v2-insufficient', updated_at = NOW()
      WHERE id = $1
    `, [entity.id]);
    return null;
  }

  const confidence = Math.max(1, Math.min(5, parseInt(data.notes_confidence) || 3));

  // Update entity
  await client.query(`
    UPDATE entity SET
      notes = $1,
      notes_confidence = $2,
      notes_sources = $3,
      enrichment_version = 'v2',
      updated_at = NOW()
    WHERE id = $4
  `, [
    data.notes.substring(0, 3000),
    confidence,
    JSON.stringify(sourceUrls),
    entity.id
  ]);

  enriched++;
  console.log(`  ✓ Enriched (confidence: ${confidence}/5)`);
  console.log(`    Notes: ${data.notes.substring(0, 100)}...`);

  // Process edges
  const validEdges = (data.extracted_edges || []).filter(e =>
    e.target_name &&
    e.edge_type &&
    VALID_EDGE_TYPES.includes(e.edge_type) &&
    e.source_quote &&
    e.confidence >= EDGE_CONFIDENCE_THRESHOLD
  );

  const lowConfEdges = (data.extracted_edges || []).filter(e =>
    e.confidence && e.confidence < EDGE_CONFIDENCE_THRESHOLD
  );

  if (lowConfEdges.length > 0) {
    console.log(`    Edges skipped (confidence < ${EDGE_CONFIDENCE_THRESHOLD}): ${lowConfEdges.length}`);
    edgesSkippedLowConfidence += lowConfEdges.length;
  }

  return {
    entityId: entity.id,
    entityName: entity.name,
    notes: data.notes,
    confidence,
    sources: sourceUrls,
    edges: validEdges,
    webContent // Pass through for entity evaluation
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// EDGE PROCESSING
// ═══════════════════════════════════════════════════════════════════════════

async function processEdges(client, result, allEntities) {
  if (!result?.edges?.length) return 0;

  const sourceId = result.entityId;
  let created = 0;

  for (const edge of result.edges) {
    const confidence = Math.max(1, Math.min(5, parseInt(edge.confidence) || 3));

    // Try to match target
    const matchResult = findEntityMatch(edge.target_name, allEntities);
    let targetEntity = matchResult?.entity;

    if (matchResult) {
      console.log(`    ✓ Matched "${edge.target_name}" → [${targetEntity.id}] ${targetEntity.name}`);
    } else if (!noCreate && edge.source_quote) {
      // Evaluate for creation
      targetEntity = await evaluateAndCreateEntity(
        client, edge.target_name, edge.target_type,
        edge.source_quote, result.sources[edge.source_number - 1] || '',
        allEntities
      );
      if (!targetEntity) continue;
    } else {
      console.log(`    ⚠ No match: "${edge.target_name}"`);
      continue;
    }

    if (targetEntity.id === sourceId) continue;

    // Check existing
    const existing = await client.query(
      'SELECT id FROM edge WHERE source_id = $1 AND target_id = $2 AND edge_type = $3',
      [sourceId, targetEntity.id, edge.edge_type]
    );
    if (existing.rows.length > 0) {
      console.log(`    Edge exists: → ${targetEntity.name} (${edge.edge_type})`);
      continue;
    }

    // Insert with confidence
    try {
      await client.query(`
        INSERT INTO edge (source_id, target_id, edge_type, role, evidence, confidence, is_primary, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'enrich-v2')
      `, [
        sourceId, targetEntity.id, edge.edge_type,
        edge.role || null,
        edge.source_quote || null,
        confidence,
        edge.edge_type === 'employed_by'
      ]);
      created++;
      edgesCreated++;
      console.log(`    ✓ Edge [${confidence}/5]: → ${targetEntity.name} (${edge.edge_type})`);
    } catch (err) {
      console.log(`    Edge error: ${err.message}`);
    }
  }

  return created;
}

async function evaluateAndCreateEntity(client, name, type, sourceQuote, sourceUrl, allEntities) {
  console.log(`    🔍 Evaluating: "${name}"`);

  const prompt = buildEntityEvaluationPrompt(name, type, sourceQuote, sourceUrl);

  let response;
  try {
    response = await askClaude(prompt, 500);
  } catch (err) {
    console.log(`      Error: ${err.message}`);
    return null;
  }

  let eval_;
  try {
    eval_ = JSON.parse(response.match(/\{[\s\S]*\}/)[0]);
  } catch (err) {
    console.log(`      Parse error`);
    return null;
  }

  console.log(`      Shapes AI ecosystem: ${eval_.shapes_ai_ecosystem} (${eval_.confidence}/5)`);

  if (!eval_.should_create) {
    entitiesSkippedNotAI++;
    console.log(`      → SKIP: ${eval_.reasoning?.substring(0, 80)}...`);
    return null;
  }

  // Validate category
  const validCats = type === 'person' ? VALID_PERSON_CATEGORIES : VALID_ORG_CATEGORIES;
  if (!validCats.includes(eval_.category)) {
    console.log(`      → SKIP: Invalid category "${eval_.category}"`);
    return null;
  }

  // Check for parent org
  let parentOrgId = null;
  if (type === 'organization') {
    const parentName = getParentOrgName(name);
    if (parentName) {
      const parentMatch = findEntityMatch(parentName, allEntities);
      if (parentMatch) {
        parentOrgId = parentMatch.entity.id;
        console.log(`      → Parent: [${parentOrgId}] ${parentMatch.entity.name}`);
      }
    }
  }

  // Create
  try {
    const result = await client.query(`
      INSERT INTO entity (entity_type, name, category, parent_org_id, status, enrichment_version, created_at)
      VALUES ($1, $2, $3, $4, 'approved', 'v2-auto', NOW())
      RETURNING id
    `, [type, name, eval_.category, parentOrgId]);

    const newId = result.rows[0].id;
    entitiesCreated++;
    console.log(`      ✓ Created [${newId}] ${name} (${eval_.category})`);

    allEntities.push({ id: newId, name, entity_type: type });

    if (parentOrgId) {
      await client.query(`
        INSERT INTO edge (source_id, target_id, edge_type, confidence, created_by)
        VALUES ($1, $2, 'subsidiary_of', 5, 'enrich-v2')
        ON CONFLICT DO NOTHING
      `, [newId, parentOrgId]);
    }

    return { id: newId, name, entity_type: type };
  } catch (err) {
    console.log(`      Create error: ${err.message}`);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  ENRICHMENT v2 - Anti-Hallucination Mode');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Edge confidence threshold: ${EDGE_CONFIDENCE_THRESHOLD}`);
  console.log(`Create new entities: ${!noCreate}`);
  console.log('');

  const client = await pool.connect();

  try {
    const allEntitiesRes = await client.query(
      'SELECT id, name, entity_type FROM entity WHERE status = $1',
      ['approved']
    );
    const allEntities = allEntitiesRes.rows;
    console.log(`Entities in DB: ${allEntities.length}`);

    // Build query
    let conditions = ["status = 'approved'"];

    if (singleId) {
      conditions.push(`id = ${singleId}`);
    } else {
      let types = [];
      if (doPeople || pilotBoth) types.push("'person'");
      if (doOrgs || pilotBoth) types.push("'organization'");
      if (types.length > 0) {
        conditions.push(`entity_type IN (${types.join(',')})`);
      }

      if (onlyNoNotes) {
        conditions.push("(notes IS NULL OR notes = '')");
      } else if (!forceRerun) {
        conditions.push("(enrichment_version IS NULL OR enrichment_version NOT LIKE 'v2%')");
      }
    }

    let query = `SELECT id, name, entity_type, category, notes FROM entity WHERE ${conditions.join(' AND ')} ORDER BY id`;
    if (pilotMode && !singleId) query += ' LIMIT 5';

    const result = await client.query(query);
    console.log(`To process: ${result.rows.length}\n`);

    if (result.rows.length === 0) {
      console.log('Nothing to process!');
      return;
    }

    for (let i = 0; i < result.rows.length; i++) {
      console.log(`\n[${i + 1}/${result.rows.length}] ─────────────────────────────────`);

      const enrichResult = await enrichEntity(client, result.rows[i], allEntities);
      if (enrichResult) {
        await processEdges(client, enrichResult, allEntities);
      }
    }

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Processed: ${result.rows.length}`);
    console.log(`Enriched: ${enriched}`);
    console.log(`Insufficient data: ${insufficientData}`);
    console.log(`Skipped: ${skipped}`);
    console.log('');
    console.log(`Edges created: ${edgesCreated}`);
    console.log(`Edges skipped (low confidence): ${edgesSkippedLowConfidence}`);
    console.log(`Entities created: ${entitiesCreated}`);
    console.log(`Entities skipped (not AI): ${entitiesSkippedNotAI}`);
    console.log('');
    console.log(`Exa searches: ${exaSearches}`);
    console.log(`LLM calls: ${llmCalls}`);
    console.log(`Tokens: ${inputTokens.toLocaleString()} in / ${outputTokens.toLocaleString()} out`);

    const cost = exaSearches * 0.01 + (inputTokens * 3 + outputTokens * 15) / 1e6;
    console.log(`Estimated cost: $${cost.toFixed(2)}`);

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
