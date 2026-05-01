import pg from 'pg';
import 'dotenv/config';
import fs from 'fs';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();

  // Get all v2-auto entities with their edges
  const entities = await client.query(`
    SELECT
      e.id, e.name, e.entity_type, e.category,
      array_agg(DISTINCT edge.evidence) FILTER (WHERE edge.evidence IS NOT NULL) as evidences,
      array_agg(DISTINCT src.name) FILTER (WHERE src.id IS NOT NULL) as sources
    FROM entity e
    LEFT JOIN edge ON edge.target_id = e.id
    LEFT JOIN entity src ON edge.source_id = src.id
    WHERE e.enrichment_version = 'v2-auto'
    GROUP BY e.id, e.name, e.entity_type, e.category
  `);

  // Refined categorization
  const definitelyGood = [];
  const probablyGood = [];
  const needsReview = [];
  const probablyBad = [];

  for (const e of entities.rows) {
    const allEvidence = (e.evidences || []).join(' ').toLowerCase();
    const name = e.name.toLowerCase();
    const sources = (e.sources || []).join(' ').toLowerCase();

    // AI-related keywords
    const aiKeywords = /(artificial intelligence|machine learning|deep learning|neural network|nlp|natural language|computer vision|robotics|autonomous|llm|language model|ai safety|ai alignment|ai policy|ai governance|ai ethics)/;
    const hasAIEvidence = aiKeywords.test(allEvidence);
    const hasAIName = aiKeywords.test(name) || /\bai\b/.test(name);

    // Known AI researchers/institutions patterns
    const knownAI = /(deepmind|openai|anthropic|meta ai|google brain|stanford hai|berkeley ai|mit csail|miri|chai|alignment|safety institute)/i;
    const fromKnownAI = knownAI.test(sources);

    // Red flags - probably not AI-relevant
    const redFlags = /(attorney general|county|sheriff|real estate|hospital|medical center|\bbank\b|airline|hotel|restaurant|church|\bsports\b)/i;
    const hasRedFlag = redFlags.test(name) && !hasAIName && !hasAIEvidence;

    // Categorize
    if (hasAIName || (hasAIEvidence && fromKnownAI)) {
      definitelyGood.push(e);
    } else if (hasAIEvidence || fromKnownAI) {
      probablyGood.push(e);
    } else if (hasRedFlag) {
      probablyBad.push(e);
    } else {
      needsReview.push(e);
    }
  }

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('REFINED TRIAGE');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`DEFINITELY GOOD (auto-approve): ${definitelyGood.length}`);
  console.log(`PROBABLY GOOD (quick scan): ${probablyGood.length}`);
  console.log(`NEEDS REVIEW (manual check): ${needsReview.length}`);
  console.log(`PROBABLY BAD (likely delete): ${probablyBad.length}`);

  console.log('\n【PROBABLY BAD - Recommend deletion】');
  for (const e of probablyBad) {
    console.log(`  [${e.id}] ${e.name} (${e.category})`);
  }

  console.log('\n【NEEDS REVIEW - Sample】');
  for (const e of needsReview.slice(0, 20)) {
    console.log(`  [${e.id}] ${e.name} (${e.category})`);
  }
  console.log(`  ... total: ${needsReview.length}`);

  // Export for manual review
  let output = '# Entities Requiring Manual Review\n\n';
  output += `Generated: ${new Date().toISOString()}\n\n`;
  output += `- DEFINITELY GOOD: ${definitelyGood.length} (auto-approve)\n`;
  output += `- PROBABLY GOOD: ${probablyGood.length} (quick scan)\n`;
  output += `- NEEDS REVIEW: ${needsReview.length} (manual check)\n`;
  output += `- PROBABLY BAD: ${probablyBad.length} (likely delete)\n\n`;

  output += '## PROBABLY BAD - Recommend Deletion (' + probablyBad.length + ')\n\n';
  for (const e of probablyBad) {
    output += `- [ ] **[${e.id}] ${e.name}** (${e.category})\n`;
    output += `  - Sources: ${(e.sources || []).join(', ')}\n\n`;
  }

  output += '## NEEDS REVIEW (' + needsReview.length + ')\n\n';
  for (const e of needsReview) {
    const evidence = (e.evidences || []).join(' ').substring(0, 200);
    output += `- [ ] **[${e.id}] ${e.name}** (${e.category})\n`;
    output += `  - Sources: ${(e.sources || []).join(', ')}\n`;
    output += `  - Evidence: "${evidence}..."\n\n`;
  }

  fs.writeFileSync('data/manual-review-required.md', output);
  console.log('\nExported to data/manual-review-required.md');

  client.release();
  await pool.end();
}

main().catch(console.error);
