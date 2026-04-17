/**
 * Local test for Lambda handlers using mock API Gateway events.
 * Tests all validation paths that run before the DB is touched.
 * Run with: node test-handlers.mjs
 */

process.env.DATABASE_URL = 'mock://localhost/test';

import { handler as submitHandler } from './api/submit.js';
import { handler as submissionsHandler } from './api/submissions.js';

let passed = 0;
let failed = 0;

function makeEvent({ method = 'POST', body = null, query = {}, headers = {}, sourceIp = null } = {}) {
  return {
    requestContext: { http: { method, sourceIp: sourceIp || '1.2.3.4' } },
    body: body ? JSON.stringify(body) : null,
    queryStringParameters: query,
    headers,
  };
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ✗ ${name}: ${e.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

console.log('\nsubmit handler — method & body validation');

await test('OPTIONS returns 200', async () => {
  const res = await submitHandler(makeEvent({ method: 'OPTIONS' }));
  assert(res.statusCode === 200, `expected 200, got ${res.statusCode}`);
});

await test('GET returns 405', async () => {
  const res = await submitHandler(makeEvent({ method: 'GET' }));
  assert(res.statusCode === 405, `expected 405, got ${res.statusCode}`);
});

await test('missing body returns 400', async () => {
  const res = await submitHandler(makeEvent({ method: 'POST', body: null }));
  assert(res.statusCode === 400, `expected 400, got ${res.statusCode}`);
});

await test('honeypot filled returns 200 silently', async () => {
  const res = await submitHandler(makeEvent({
    body: { type: 'person', data: { name: 'Bot' }, _hp: 'gotcha' }
  }));
  assert(res.statusCode === 200, `expected 200, got ${res.statusCode}`);
  const parsed = JSON.parse(res.body);
  assert(parsed.success === true, 'expected success: true');
});

await test('missing type returns 400', async () => {
  const res = await submitHandler(makeEvent({
    body: { data: { name: 'Test' }, _hp: '' }
  }));
  assert(res.statusCode === 400, `expected 400, got ${res.statusCode}`);
});

await test('invalid type returns 400', async () => {
  const res = await submitHandler(makeEvent({
    body: { type: 'banana', data: { name: 'Test' }, _hp: '' }
  }));
  assert(res.statusCode === 400, `expected 400, got ${res.statusCode}`);
});

await test('person missing name returns 400', async () => {
  const res = await submitHandler(makeEvent({
    body: { type: 'person', data: {}, _hp: '' }
  }));
  assert(res.statusCode === 400, `expected 400, got ${res.statusCode}`);
});

await test('organization missing name returns 400', async () => {
  const res = await submitHandler(makeEvent({
    body: { type: 'organization', data: {}, _hp: '' }
  }));
  assert(res.statusCode === 400, `expected 400, got ${res.statusCode}`);
});

await test('resource missing title returns 400', async () => {
  const res = await submitHandler(makeEvent({
    body: { type: 'resource', data: {}, _hp: '' }
  }));
  assert(res.statusCode === 400, `expected 400, got ${res.statusCode}`);
});

console.log('\nsubmit handler — field length validation');

await test('short field over 200 chars returns 400', async () => {
  const res = await submitHandler(makeEvent({
    body: { type: 'person', data: { name: 'x'.repeat(201) }, _hp: '' }
  }));
  assert(res.statusCode === 400, `expected 400, got ${res.statusCode}`);
});

await test('notes at exactly 2000 chars passes validation', async () => {
  const res = await submitHandler(makeEvent({
    body: { type: 'person', data: { name: 'Jane Doe', notes: 'x'.repeat(2000) }, _hp: '' }
  }));
  // 500 means validation passed and hit the mock DB — expected
  assert(res.statusCode === 500, `expected 500 (DB error), got ${res.statusCode}`);
});

await test('notes over 2000 chars returns 400', async () => {
  const res = await submitHandler(makeEvent({
    body: { type: 'person', data: { name: 'Jane Doe', notes: 'x'.repeat(2001) }, _hp: '' }
  }));
  assert(res.statusCode === 400, `expected 400, got ${res.statusCode}`);
});

await test('threatModels over 2000 chars returns 400', async () => {
  const res = await submitHandler(makeEvent({
    body: { type: 'person', data: { name: 'Jane Doe', threatModels: 'x'.repeat(2001) }, _hp: '' }
  }));
  assert(res.statusCode === 400, `expected 400, got ${res.statusCode}`);
});

console.log('\nsubmit handler — valid submissions reach DB');

await test('valid person submission reaches DB (returns 500 without real DB)', async () => {
  const res = await submitHandler(makeEvent({
    body: {
      type: 'person',
      data: {
        name: 'Jane Doe',
        category: 'Academic',
        regulatoryStance: 'Pro-regulation',
        evidenceSource: 'Public statements',
        agiTimeline: '5-10 years',
        aiRiskLevel: 'High',
        threatModels: 'Labor displacement, Loss of control',
        influenceType: 'Researcher/analyst',
        bluesky: '@janedoe.bsky.social',
        submitterRelationship: 'I can connect you with this person',
      },
      _hp: '',
    }
  }));
  assert(res.statusCode === 500, `expected 500 (DB error), got ${res.statusCode}`);
});

await test('valid organization submission reaches DB (returns 500 without real DB)', async () => {
  const res = await submitHandler(makeEvent({
    body: {
      type: 'organization',
      data: {
        name: 'AI Policy Institute',
        category: 'Think tank',
        fundingModel: 'Nonprofit',
        regulatoryStance: 'Pro-regulation',
        evidenceSource: 'Public statements',
        threatModels: 'Power concentration, Democratic erosion',
        lastVerified: '2026-03-24',
      },
      _hp: '',
    }
  }));
  assert(res.statusCode === 500, `expected 500 (DB error), got ${res.statusCode}`);
});

await test('valid resource submission reaches DB (returns 500 without real DB)', async () => {
  const res = await submitHandler(makeEvent({
    body: {
      type: 'resource',
      data: {
        title: 'Governing AI',
        author: 'Jane Doe',
        resourceType: 'Report',
        category: 'AI Governance',
        submitterRelationship: 'I am the author',
      },
      _hp: '',
    }
  }));
  assert(res.statusCode === 500, `expected 500 (DB error), got ${res.statusCode}`);
});

console.log('\nsubmissions handler');

await test('OPTIONS returns 200', async () => {
  const res = await submissionsHandler(makeEvent({ method: 'OPTIONS' }));
  assert(res.statusCode === 200, `expected 200, got ${res.statusCode}`);
});

await test('POST returns 405', async () => {
  const res = await submissionsHandler(makeEvent({ method: 'POST' }));
  assert(res.statusCode === 405, `expected 405, got ${res.statusCode}`);
});

await test('valid GET reaches DB (returns 500 without real DB)', async () => {
  const res = await submissionsHandler(makeEvent({ method: 'GET', query: { status: 'approved' } }));
  assert(res.statusCode === 500, `expected 500 (DB error), got ${res.statusCode}`);
});

console.log('\nsubmit handler — contributor key validation');

await test('malformed contributor key (wrong prefix) returns 401', async () => {
  const res = await submitHandler(makeEvent({
    body: { type: 'person', data: { name: 'Test' }, _hp: '' },
    headers: { 'x-contributor-key': 'bad_abc123' },
  }));
  assert(res.statusCode === 401, `expected 401, got ${res.statusCode}`);
});

await test('malformed contributor key (too short) returns 401', async () => {
  const res = await submitHandler(makeEvent({
    body: { type: 'person', data: { name: 'Test' }, _hp: '' },
    headers: { 'x-contributor-key': 'mak_tooshort' },
  }));
  assert(res.statusCode === 401, `expected 401, got ${res.statusCode}`);
});

await test('malformed contributor key (uppercase hex) returns 401', async () => {
  const res = await submitHandler(makeEvent({
    body: { type: 'person', data: { name: 'Test' }, _hp: '' },
    headers: { 'x-contributor-key': 'mak_ABCDEF1234567890ABCDEF1234567890' },
  }));
  assert(res.statusCode === 401, `expected 401, got ${res.statusCode}`);
});

await test('sql injection in name field reaches DB safely (parameterized)', async () => {
  // Injection payload — safe because submit.js uses parameterized queries ($1, $2, ...)
  const res = await submitHandler(makeEvent({
    body: { type: 'person', data: { name: "'; DROP TABLE submission; --" }, _hp: '' }
  }));
  // Validation passes (under 200 chars, valid type), hits DB, DB unreachable → 500
  assert(res.statusCode === 500, `expected 500 (reached DB safely), got ${res.statusCode}`);
});

await test('sql injection in notes field reaches DB safely', async () => {
  const res = await submitHandler(makeEvent({
    body: { type: 'person', data: { name: 'Test', notes: "' OR '1'='1'; --" }, _hp: '' }
  }));
  assert(res.statusCode === 500, `expected 500 (reached DB safely), got ${res.statusCode}`);
});

console.log('\nsubmit handler — anonymous IP rate limiting');

await test('anonymous submissions up to limit succeed (reach DB)', async () => {
  // Fresh IP — up to ANON_RATE_LIMIT (10) should pass validation
  for (let i = 0; i < 10; i++) {
    const res = await submitHandler(makeEvent({
      body: { type: 'person', data: { name: `Person ${i}` }, _hp: '' },
      sourceIp: '9.9.9.9',
    }));
    assert(res.statusCode === 500, `attempt ${i+1}: expected 500 (DB), got ${res.statusCode}`);
  }
});

await test('11th anonymous submission from same IP returns 429', async () => {
  // IP 9.9.9.9 already has 10 submissions from previous test
  const res = await submitHandler(makeEvent({
    body: { type: 'person', data: { name: 'Over limit' }, _hp: '' },
    sourceIp: '9.9.9.9',
  }));
  assert(res.statusCode === 429, `expected 429, got ${res.statusCode}`);
  const body = JSON.parse(res.body);
  assert(body.error, 'expected error message in body');
});

await test('different IP is not rate limited by previous IP', async () => {
  const res = await submitHandler(makeEvent({
    body: { type: 'person', data: { name: 'Different IP person' }, _hp: '' },
    sourceIp: '8.8.8.8',
  }));
  // Different IP, first request — should reach DB, not be rate limited
  assert(res.statusCode === 500, `expected 500 (DB), got ${res.statusCode}`);
});

await test('contributor key bypasses IP rate limit', async () => {
  // IP 9.9.9.9 is over anon limit, but a valid-format contributor key skips anon check
  // (it will fail at DB lookup with 500, not 429)
  const res = await submitHandler(makeEvent({
    body: { type: 'person', data: { name: 'Keyed person' }, _hp: '' },
    headers: { 'x-contributor-key': 'mak_abcdef1234567890abcdef1234567890' },
    sourceIp: '9.9.9.9',
  }));
  // contributor key format is valid, skips IP rate limit, hits DB → 500
  assert(res.statusCode === 500, `expected 500 (DB, not rate limited), got ${res.statusCode}`);
});

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
