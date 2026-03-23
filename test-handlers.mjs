/**
 * Local test for Lambda handlers using mock API Gateway events.
 * Tests all validation paths that run before the DB is touched.
 * Run with: node test-handlers.mjs
 */

// Mock pg so DB calls throw a recognizable error instead of hanging
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

process.env.DATABASE_URL = 'mock://localhost/test';

// Patch pg before importing handlers
import { register } from 'module';

// We'll test by directly importing and calling handlers,
// catching DB errors as expected failures.

import { handler as submitHandler } from './api/submit.js';
import { handler as submissionsHandler } from './api/submissions.js';

let passed = 0;
let failed = 0;

function makeEvent({ method = 'POST', body = null, query = {} } = {}) {
  return {
    requestContext: { http: { method } },
    body: body ? JSON.stringify(body) : null,
    queryStringParameters: query,
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

console.log('\nsubmit handler');

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

await test('resource missing title returns 400', async () => {
  const res = await submitHandler(makeEvent({
    body: { type: 'resource', data: {}, _hp: '' }
  }));
  assert(res.statusCode === 400, `expected 400, got ${res.statusCode}`);
});

await test('field over length limit returns 400', async () => {
  const res = await submitHandler(makeEvent({
    body: { type: 'person', data: { name: 'x'.repeat(201) }, _hp: '' }
  }));
  assert(res.statusCode === 400, `expected 400, got ${res.statusCode}`);
});

await test('valid person submission reaches DB (returns 500 without real DB)', async () => {
  const res = await submitHandler(makeEvent({
    body: { type: 'person', data: { name: 'Jane Doe', category: 'Academic' }, _hp: '' }
  }));
  // 500 means validation passed and we hit the (mock) DB — expected without a real connection
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

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
