#!/usr/bin/env node
/**
 * Revoke a contributor API key.
 *
 * Usage:
 *   node scripts/revoke-contributor-key.js <key_id>
 *   node scripts/revoke-contributor-key.js --list
 *
 * Revocation is instant — the key will be rejected on next use.
 * Revoked keys can be unrevoked by setting revoked_at = NULL in DB.
 */

import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

async function main() {
  const args = process.argv.slice(2);

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    if (args.length === 0 || args[0] === '--list') {
      // List all keys
      const result = await pool.query(
        `SELECT id, name, email, daily_limit, created_at, revoked_at,
                (SELECT COUNT(*) FROM submission WHERE contributor_key_id = contributor_keys.id) AS submission_count
         FROM contributor_keys
         ORDER BY created_at DESC`
      );

      if (result.rows.length === 0) {
        console.log('No contributor keys found.');
        return;
      }

      console.log('\nContributor Keys:');
      console.log('─'.repeat(100));
      console.log('ID'.padEnd(6) + 'Name'.padEnd(25) + 'Email'.padEnd(30) + 'Limit'.padEnd(8) + 'Subs'.padEnd(8) + 'Status'.padEnd(12) + 'Created');
      console.log('─'.repeat(100));

      for (const row of result.rows) {
        const status = row.revoked_at ? '🔴 REVOKED' : '🟢 Active';
        console.log(
          String(row.id).padEnd(6) +
          (row.name || '-').substring(0, 23).padEnd(25) +
          (row.email || '-').substring(0, 28).padEnd(30) +
          String(row.daily_limit).padEnd(8) +
          String(row.submission_count).padEnd(8) +
          status.padEnd(12) +
          row.created_at.toISOString().slice(0, 10)
        );
      }
      console.log('─'.repeat(100));
      console.log('\nTo revoke: node scripts/revoke-contributor-key.js <id>');
      return;
    }

    // Revoke a key
    const keyId = parseInt(args[0], 10);
    if (isNaN(keyId)) {
      console.error('Invalid key ID. Usage: node scripts/revoke-contributor-key.js <key_id>');
      process.exit(1);
    }

    // Check if key exists
    const checkResult = await pool.query(
      'SELECT id, name, revoked_at FROM contributor_keys WHERE id = $1',
      [keyId]
    );

    if (checkResult.rows.length === 0) {
      console.error(`Key ID ${keyId} not found.`);
      process.exit(1);
    }

    const key = checkResult.rows[0];

    if (key.revoked_at) {
      console.log(`Key ID ${keyId} (${key.name}) is already revoked.`);
      return;
    }

    // Revoke
    await pool.query(
      'UPDATE contributor_keys SET revoked_at = NOW() WHERE id = $1',
      [keyId]
    );

    console.log(`\n✓ Key ID ${keyId} (${key.name}) has been revoked.`);
    console.log('  The key will be rejected on next use.');

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
