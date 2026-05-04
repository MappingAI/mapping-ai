import pg from "pg";
import "dotenv/config";

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function check() {
  const client = await pool.connect();
  try {
    // Check how these entities were created
    const e344 = await client.query("SELECT id, name, created_at, enrichment_version FROM entity WHERE id = 344");
    const e540 = await client.query("SELECT id, name, created_at, enrichment_version FROM entity WHERE id = 540");

    console.log("Entity 344 (Public AI Network):");
    console.log("  created_at:", e344.rows[0].created_at);
    console.log("  enrichment_version:", e344.rows[0].enrichment_version);

    console.log("\nEntity 540 (Public AI):");
    console.log("  created_at:", e540.rows[0].created_at);
    console.log("  enrichment_version:", e540.rows[0].enrichment_version);

    // Check for any other "Public AI" entities
    const others = await client.query(`SELECT id, name, website FROM entity WHERE LOWER(name) LIKE '%public ai%'`);
    console.log("\nAll entities with 'Public AI' in name:");
    for (const e of others.rows) {
      console.log("  ", e.id, "-", e.name, "-", e.website);
    }

  } finally {
    client.release();
    await pool.end();
  }
}

check().catch(console.error);
