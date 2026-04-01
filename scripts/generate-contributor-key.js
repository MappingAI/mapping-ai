#!/usr/bin/env node
/**
 * Generate a new contributor API key for AI-agent-driven submissions.
 *
 * Usage:
 *   node scripts/generate-contributor-key.js "Jane Doe" "jane@example.com"
 *
 * The script:
 *   1. Generates a random key: mak_ + 32 hex chars
 *   2. Hashes it with SHA256
 *   3. Stores the hash in contributor_keys table
 *   4. Prints the plaintext key (ONLY TIME IT'S VISIBLE - copy it now!)
 */

import crypto from 'crypto';
import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

async function generateKey() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: node scripts/generate-contributor-key.js "Name" ["email@example.com"]');
    process.exit(1);
  }

  const name = args[0];
  const email = args[1] || null;

  // Generate random key: mak_ + 32 hex chars (16 bytes = 128 bits)
  const randomBytes = crypto.randomBytes(16);
  const key = 'mak_' + randomBytes.toString('hex');

  // Hash for storage (never store plaintext)
  const keyHash = crypto.createHash('sha256').update(key).digest('hex');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const result = await pool.query(
      `INSERT INTO contributor_keys (key_hash, name, email)
       VALUES ($1, $2, $3)
       RETURNING id, created_at`,
      [keyHash, name, email]
    );

    const row = result.rows[0];

    console.log('\n┌─────────────────────────────────────────────────────────────┐');
    console.log('│  NEW CONTRIBUTOR KEY GENERATED                              │');
    console.log('├─────────────────────────────────────────────────────────────┤');
    console.log(`│  Name:       ${name.padEnd(46)}│`);
    if (email) {
      console.log(`│  Email:      ${email.padEnd(46)}│`);
    }
    console.log(`│  Key ID:     ${String(row.id).padEnd(46)}│`);
    console.log(`│  Created:    ${row.created_at.toISOString().padEnd(46)}│`);
    console.log('├─────────────────────────────────────────────────────────────┤');
    console.log('│  ⚠️  SAVE THIS KEY NOW — IT CANNOT BE RECOVERED!            │');
    console.log('├─────────────────────────────────────────────────────────────┤');
    console.log(`│  ${key}  │`);
    console.log('└─────────────────────────────────────────────────────────────┘');
    console.log('\nAdd this key to the contributor\'s CONTRIBUTOR.md file.');

  } catch (err) {
    console.error('Error generating key:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

generateKey();
