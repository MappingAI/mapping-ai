import pg from "pg";
import "dotenv/config";

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function audit() {
  const client = await pool.connect();
  try {
    console.log("=== AUDIT OF CHANGES MADE THIS SESSION ===\n");

    // 1. Check for orphaned edges pointing to deleted entities (767, 1848)
    console.log("1. Checking for orphaned edges referencing deleted entities (767, 1848)...");
    const orphanedEdges = await client.query(`
      SELECT id, source_id, target_id
      FROM edge
      WHERE source_id IN (767, 1848) OR target_id IN (767, 1848)
    `);
    if (orphanedEdges.rows.length > 0) {
      console.log("   WARNING: Found orphaned edges:", orphanedEdges.rows);
    } else {
      console.log("   OK: No orphaned edges found for deleted entities");
    }

    // 2. Verify updated entities still exist and have valid data
    console.log("\n2. Verifying updated entities...");
    const updatedEntities = await client.query(`
      SELECT id, name, category, status, entity_type
      FROM entity
      WHERE id IN (65, 934, 1333, 2112)
    `);
    for (const e of updatedEntities.rows) {
      console.log(`   ID ${e.id}: ${e.name} | category=${e.category} | status=${e.status} | type=${e.entity_type}`);
    }

    // 3. Check that deleted entities are actually gone
    console.log("\n3. Confirming deleted entities are gone...");
    const deletedCheck = await client.query(`
      SELECT id, name FROM entity WHERE id IN (767, 1848)
    `);
    if (deletedCheck.rows.length > 0) {
      console.log("   WARNING: These should be deleted:", deletedCheck.rows);
    } else {
      console.log("   OK: Entities 767, 1848 confirmed deleted");
    }

    // 4. Check total entity counts by status
    console.log("\n4. Entity counts by status...");
    const statusCounts = await client.query(`
      SELECT status, COUNT(*) as count FROM entity GROUP BY status ORDER BY status
    `);
    for (const s of statusCounts.rows) {
      console.log(`   ${s.status}: ${s.count}`);
    }

    // 5. Check if any edges reference the entities we modified
    console.log("\n5. Edges referencing modified entities...");
    const edgeRefs = await client.query(`
      SELECT e.id as edge_id, e.source_id, e.target_id,
             s.name as source_name, t.name as target_name
      FROM edge e
      LEFT JOIN entity s ON e.source_id = s.id
      LEFT JOIN entity t ON e.target_id = t.id
      WHERE e.source_id IN (65, 934, 1333, 2112)
         OR e.target_id IN (65, 934, 1333, 2112)
      LIMIT 10
    `);
    console.log(`   Found ${edgeRefs.rows.length} edges referencing modified entities`);
    let brokenCount = 0;
    for (const e of edgeRefs.rows) {
      if (!e.source_name || !e.target_name) {
        console.log(`   BROKEN: Edge ${e.edge_id}: ${e.source_id} (${e.source_name || "MISSING"}) -> ${e.target_id} (${e.target_name || "MISSING"})`);
        brokenCount++;
      }
    }
    if (brokenCount === 0) {
      console.log("   OK: All edge references are valid");
    }

    // 6. Check for any globally orphaned edges
    console.log("\n6. Checking for ANY orphaned edges in entire database...");
    const allOrphaned = await client.query(`
      SELECT e.id, e.source_id, e.target_id
      FROM edge e
      LEFT JOIN entity s ON e.source_id = s.id
      LEFT JOIN entity t ON e.target_id = t.id
      WHERE s.id IS NULL OR t.id IS NULL
      LIMIT 20
    `);
    if (allOrphaned.rows.length > 0) {
      console.log(`   WARNING: Found ${allOrphaned.rows.length} orphaned edges:`);
      for (const e of allOrphaned.rows) {
        console.log(`     Edge ${e.id}: ${e.source_id} -> ${e.target_id}`);
      }
    } else {
      console.log("   OK: No orphaned edges in database");
    }

    console.log("\n=== AUDIT COMPLETE ===");

  } finally {
    client.release();
    await pool.end();
  }
}

audit().catch(console.error);
