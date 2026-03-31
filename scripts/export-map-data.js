import pg from 'pg';
import 'dotenv/config';
import fs from 'fs';
import { generateMapData } from '../api/export-map.js';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function exportMapData() {
  const client = await pool.connect();
  try {
    console.log('Exporting map data...\n');
    const data = await generateMapData(client);

    const counts = {
      people:        data.people.length,
      organizations: data.organizations.length,
      resources:     data.resources.length,
      edges:         data.edges.length,
    };
    for (const [k, v] of Object.entries(counts)) console.log(`  ✓ ${v} ${k}`);

    // Mark as test data if no approved entities yet
    if (counts.people + counts.organizations + counts.resources === 0) {
      data._meta.note = 'No approved entities — run migrate.js and seed data first';
    }

    fs.writeFileSync('map-data.json', JSON.stringify(data, null, 2));
    console.log('\n✓ map-data.json written');
  } finally {
    client.release();
    await pool.end();
  }
}

exportMapData().catch(err => { console.error(err); process.exit(1); });
