/**
 * Database Tools for Verification Pipeline
 *
 * Provides read/write functions for verification agents.
 * Uses STAGING_DATABASE_URL - never writes to production.
 */

import pg from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../../.env') })

// CRITICAL: Always use staging database for verification writes
const DATABASE_URL = process.env.STAGING_DATABASE_URL

if (!DATABASE_URL) {
  console.error('ERROR: STAGING_DATABASE_URL not set. Verification pipeline requires staging database.')
  process.exit(1)
}

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

// ── Read Operations ──

/**
 * Get a full entity record with edges, claims, and sources
 *
 * @param {number|string} entityId - Entity ID
 * @returns {Promise<object>} Full entity record
 */
export async function getFullEntityRecord(entityId) {
  const client = await pool.connect()

  try {
    // Get entity
    const entityResult = await client.query('SELECT * FROM entity WHERE id = $1', [entityId])

    if (entityResult.rows.length === 0) {
      return { found: false, entity_id: entityId }
    }

    const entity = entityResult.rows[0]

    // Get edges (both directions)
    const edgesResult = await client.query(
      `
      SELECT e.*,
             s.name as source_name, s.entity_type as source_type,
             t.name as target_name, t.entity_type as target_type
      FROM edge e
      JOIN entity s ON e.source_id = s.id
      JOIN entity t ON e.target_id = t.id
      WHERE e.source_id = $1 OR e.target_id = $1
    `,
      [entityId],
    )

    // Get claims (if claims table exists on this branch)
    let claims = []
    try {
      const claimsResult = await client.query('SELECT * FROM claim WHERE entity_id = $1', [entityId])
      claims = claimsResult.rows
    } catch {
      // Claims table may not exist on all branches
    }

    // Get sources
    let sources = []
    try {
      const sourcesResult = await client.query('SELECT * FROM source WHERE entity_id = $1', [entityId])
      sources = sourcesResult.rows
    } catch {
      // Source table may not exist on all branches
    }

    return {
      found: true,
      entity,
      edges: edgesResult.rows,
      claims,
      sources,
    }
  } finally {
    client.release()
  }
}

/**
 * Get entities needing verification (prioritized queue)
 *
 * @param {object} options - Filter options
 * @returns {Promise<object[]>} Array of entities
 */
export async function getVerificationQueue(options = {}) {
  const { limit = 10, entityType = null, prioritizeExplicitlyStated = true, prioritizeCrowdsourced = true } = options

  let query = `
    SELECT e.*,
           (SELECT COUNT(*) FROM submission s WHERE s.entity_id = e.id AND s.submitter_relationship = 'external') as crowdsourced_count
    FROM entity e
    WHERE e.status = 'approved'
  `

  const params = []
  let paramIndex = 1

  if (entityType) {
    query += ` AND e.entity_type = $${paramIndex}`
    params.push(entityType)
    paramIndex++
  }

  // Prioritization order
  query += ` ORDER BY `
  const orderClauses = []

  if (prioritizeExplicitlyStated) {
    orderClauses.push(`CASE WHEN e.belief_evidence_source = 'Explicitly stated' THEN 0 ELSE 1 END`)
  }

  if (prioritizeCrowdsourced) {
    orderClauses.push(
      `CASE WHEN EXISTS (SELECT 1 FROM submission s WHERE s.entity_id = e.id AND s.submitter_relationship = 'external') THEN 0 ELSE 1 END`,
    )
  }

  orderClauses.push(`e.updated_at DESC`)
  query += orderClauses.join(', ')

  query += ` LIMIT $${paramIndex}`
  params.push(limit)

  const client = await pool.connect()
  try {
    const result = await client.query(query, params)
    return result.rows
  } finally {
    client.release()
  }
}

// ── Write Operations ──

/**
 * Update field_verification JSONB column
 *
 * @param {number|string} entityId - Entity ID
 * @param {object} fieldVerification - Per-field verification status
 * @returns {Promise<boolean>} Success
 */
export async function updateFieldVerification(entityId, fieldVerification) {
  const client = await pool.connect()

  try {
    // Merge with existing field_verification (don't overwrite)
    await client.query(
      `
      UPDATE entity
      SET field_verification = COALESCE(field_verification, '{}'::jsonb) || $2::jsonb,
          updated_at = NOW()
      WHERE id = $1
    `,
      [entityId, JSON.stringify(fieldVerification)],
    )

    return true
  } finally {
    client.release()
  }
}

/**
 * Update entity field values (for corrections)
 *
 * @param {number|string} entityId - Entity ID
 * @param {object} updates - Field updates { field: value }
 * @returns {Promise<boolean>} Success
 */
export async function updateEntityFields(entityId, updates) {
  if (Object.keys(updates).length === 0) return true

  const client = await pool.connect()

  try {
    const setClauses = []
    const values = []
    let paramIndex = 1

    for (const [field, value] of Object.entries(updates)) {
      setClauses.push(`${field} = $${paramIndex}`)
      values.push(value)
      paramIndex++
    }

    values.push(entityId)

    await client.query(
      `UPDATE entity SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex}`,
      values,
    )

    return true
  } finally {
    client.release()
  }
}

/**
 * Update claim confidence
 *
 * @param {number|string} claimId - Claim ID
 * @param {string} confidence - 'high', 'medium', or 'low'
 * @returns {Promise<boolean>} Success
 */
export async function updateClaimConfidence(claimId, confidence) {
  const client = await pool.connect()

  try {
    await client.query('UPDATE claim SET confidence = $2 WHERE id = $1', [claimId, confidence])
    return true
  } catch {
    // Claim table may not exist
    return false
  } finally {
    client.release()
  }
}

/**
 * Update edge evidence confidence
 *
 * @param {number|string} edgeEvidenceId - Edge evidence ID
 * @param {string} confidence - 'high', 'medium', or 'low'
 * @returns {Promise<boolean>} Success
 */
export async function updateEdgeEvidenceConfidence(edgeEvidenceId, confidence) {
  const client = await pool.connect()

  try {
    await client.query('UPDATE edge_evidence SET confidence = $2 WHERE id = $1', [edgeEvidenceId, confidence])
    return true
  } catch {
    return false
  } finally {
    client.release()
  }
}

/**
 * Update source last_verified_at timestamp
 *
 * @param {number|string} sourceId - Source ID
 * @param {Date} verifiedAt - Verification timestamp
 * @returns {Promise<boolean>} Success
 */
export async function updateSourceVerifiedAt(sourceId, verifiedAt = new Date()) {
  const client = await pool.connect()

  try {
    await client.query('UPDATE source SET last_verified_at = $2 WHERE id = $1', [sourceId, verifiedAt])
    return true
  } catch {
    return false
  } finally {
    client.release()
  }
}

/**
 * Batch update sources by URL
 *
 * @param {string[]} urls - URLs that were verified
 * @param {Date} verifiedAt - Verification timestamp
 * @returns {Promise<number>} Number of sources updated
 */
export async function batchUpdateSourcesVerifiedAt(urls, verifiedAt = new Date()) {
  if (urls.length === 0) return 0

  const client = await pool.connect()

  try {
    const result = await client.query('UPDATE source SET last_verified_at = $2 WHERE url = ANY($1)', [urls, verifiedAt])
    return result.rowCount
  } catch {
    return 0
  } finally {
    client.release()
  }
}

// ── Audit Logging ──

/**
 * Log a verification action for audit trail
 *
 * @param {object} auditEntry - Audit log entry
 * @returns {Promise<boolean>} Success
 */
export async function logVerificationAudit(auditEntry) {
  const client = await pool.connect()

  try {
    // Check if verification_audit table exists, create if not
    await client.query(`
      CREATE TABLE IF NOT EXISTS verification_audit (
        id SERIAL PRIMARY KEY,
        entity_id INTEGER REFERENCES entity(id),
        action TEXT NOT NULL,
        field TEXT,
        old_value TEXT,
        new_value TEXT,
        reason TEXT,
        evidence_urls TEXT[],
        confidence TEXT,
        agent TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)

    await client.query(
      `
      INSERT INTO verification_audit
        (entity_id, action, field, old_value, new_value, reason, evidence_urls, confidence, agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `,
      [
        auditEntry.entity_id,
        auditEntry.action,
        auditEntry.field || null,
        auditEntry.old_value || null,
        auditEntry.new_value || null,
        auditEntry.reason || null,
        auditEntry.evidence_urls || null,
        auditEntry.confidence || null,
        auditEntry.agent || 'verification_pipeline',
      ],
    )

    return true
  } finally {
    client.release()
  }
}

// ── Human Review Queue ──

/**
 * Add entity/field to human review queue
 *
 * @param {object} reviewItem - Item for human review
 * @returns {Promise<boolean>} Success
 */
export async function addToHumanReviewQueue(reviewItem) {
  const client = await pool.connect()

  try {
    // Check if human_review_queue table exists, create if not
    await client.query(`
      CREATE TABLE IF NOT EXISTS human_review_queue (
        id SERIAL PRIMARY KEY,
        entity_id INTEGER REFERENCES entity(id),
        entity_name TEXT,
        field TEXT NOT NULL,
        current_value TEXT,
        proposed_value TEXT,
        reason TEXT NOT NULL,
        evidence_summary TEXT,
        evidence_urls TEXT[],
        priority TEXT DEFAULT 'normal',
        status TEXT DEFAULT 'pending',
        resolved_at TIMESTAMP,
        resolved_by TEXT,
        resolution TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)

    await client.query(
      `
      INSERT INTO human_review_queue
        (entity_id, entity_name, field, current_value, proposed_value, reason, evidence_summary, evidence_urls, priority)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `,
      [
        reviewItem.entity_id,
        reviewItem.entity_name,
        reviewItem.field,
        reviewItem.current_value || null,
        reviewItem.proposed_value || null,
        reviewItem.reason,
        reviewItem.evidence_summary || null,
        reviewItem.evidence_urls || null,
        reviewItem.priority || 'normal',
      ],
    )

    return true
  } finally {
    client.release()
  }
}

/**
 * Get pending human review items
 *
 * @param {object} options - Filter options
 * @returns {Promise<object[]>} Pending review items
 */
export async function getHumanReviewQueue(options = {}) {
  const { limit = 50, status = 'pending' } = options

  const client = await pool.connect()

  try {
    const result = await client.query(
      `
      SELECT * FROM human_review_queue
      WHERE status = $1
      ORDER BY
        CASE priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END,
        created_at ASC
      LIMIT $2
    `,
      [status, limit],
    )
    return result.rows
  } catch {
    // Table may not exist yet
    return []
  } finally {
    client.release()
  }
}

// ── Cleanup ──

export async function closePool() {
  await pool.end()
}

export { pool }
