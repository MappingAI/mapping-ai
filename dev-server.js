/**
 * Local development server — serves static files + API endpoints
 * Mimics the Lambda/API Gateway setup for local testing.
 *
 * Uses the 3-table schema: entity, submission, edge
 *
 * Usage: node dev-server.js
 * Opens at http://localhost:3000
 */
import express from 'express'
import pg from 'pg'
import 'dotenv/config'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { generateMapData } from './api/export-map.js'
import { handler as chatHandler } from './api/chat.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = 3000

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

app.use(express.json())

const ADMIN_KEY = process.env.ADMIN_KEY || 'dev-admin-key'

// ── API: Search ──
app.get('/search', async (req, res) => {
  const { q, type, status, key } = req.query
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Query must be at least 2 characters' })
  }
  const query = q.trim()
  const isAdmin = ADMIN_KEY && key === ADMIN_KEY

  // Build parameterized clauses
  const params = [query, `%${query}%`]
  let paramIdx = 3
  const clauses = []

  const typeMap = { person: 'person', organization: 'organization', resource: 'resource' }
  const entityType = typeMap[type]
  if (entityType) {
    clauses.push(`AND entity_type = $${paramIdx}`)
    params.push(entityType)
    paramIdx++
  }

  if (status === 'pending') {
    clauses.push(`AND status = $${paramIdx}`)
    params.push('pending')
    paramIdx++
  } else if (status === 'all' && isAdmin) {
    // No status filter
  } else {
    clauses.push(`AND status = $${paramIdx}`)
    params.push('approved')
    paramIdx++
  }
  const whereExtra = clauses.join(' ')

  const client = await pool.connect()
  try {
    const result = await client.query(
      `SELECT id, entity_type, name, category, title, primary_org, location,
              belief_regulatory_stance AS regulatory_stance, status,
              resource_title, resource_type, resource_author, resource_category, website, parent_org_id,
              ts_rank(search_vector, plainto_tsquery('english', $1)) AS rank
       FROM entity
       WHERE (search_vector @@ plainto_tsquery('english', $1)
          OR name ILIKE $2
          OR resource_title ILIKE $2) ${whereExtra}
       ORDER BY
         CASE WHEN name ILIKE $2 OR resource_title ILIKE $2 THEN 0 ELSE 1 END,
         ts_rank(search_vector, plainto_tsquery('english', $1)) DESC
       LIMIT 30`,
      params,
    )

    const results = { people: [], organizations: [], resources: [] }
    for (const row of result.rows) {
      if (row.entity_type === 'person') {
        results.people.push(row)
      } else if (row.entity_type === 'organization') {
        results.organizations.push(row)
      } else if (row.entity_type === 'resource') {
        row.title = row.resource_title
        row.author = row.resource_author
        results.resources.push(row)
      }
    }
    res.json(results)
  } catch (err) {
    console.error('Search error:', err)
    res.status(500).json({ error: 'Internal server error' })
  } finally {
    client.release()
  }
})

// ── API: Submit ──
app.post('/submit', async (req, res) => {
  const { type, timestamp, data, _hp } = req.body
  if (_hp) return res.json({ success: true, message: 'Submission received' })
  if (!type || !data) return res.status(400).json({ error: 'Missing required fields' })
  if (!['person', 'organization', 'resource'].includes(type)) {
    return res.status(400).json({ error: 'Invalid submission type' })
  }
  if ((type === 'person' || type === 'organization') && !data.name) {
    return res.status(400).json({ error: 'Missing required field: name' })
  }
  if (type === 'resource' && !data.title) {
    return res.status(400).json({ error: 'Missing required field: title' })
  }

  const STANCE_SCORES = {
    Accelerate: 1,
    'Light-touch': 2,
    Targeted: 3,
    Moderate: 4,
    Restrictive: 5,
    Precautionary: 6,
    Nationalize: 7,
  }
  const TIMELINE_SCORES = {
    'Already here': 1,
    '2-3 years': 2,
    '5-10 years': 3,
    '10-25 years': 4,
    '25+ years or never': 5,
  }
  const RISK_SCORES = { Overstated: 1, Manageable: 2, Serious: 3, Catastrophic: 4, Existential: 5 }

  function normalizeRelationship(raw) {
    if (!raw) return null
    if (raw === 'self') return 'self'
    if (raw === 'connector' || raw === 'close_relation') return 'connector'
    return 'external'
  }

  const client = await pool.connect()
  try {
    const ts = timestamp || new Date().toISOString()
    const entityId = data.entityId ? parseInt(data.entityId, 10) : null
    const relationship = normalizeRelationship(data.submitterRelationship)
    const stanceScore = STANCE_SCORES[data.regulatoryStance] ?? null
    const timelineScore = TIMELINE_SCORES[data.agiTimeline] ?? null
    const riskScore = RISK_SCORES[data.aiRiskLevel] ?? null
    const notesHtml = data.notesHtml || null
    const notesMentions = data.notesMentions ? JSON.parse(data.notesMentions) : null

    await client.query(
      `INSERT INTO submission (
        entity_type, entity_id,
        submitter_email, submitter_relationship,
        name, title, category, primary_org, other_orgs,
        website, funding_model, parent_org_id,
        resource_title, resource_category, resource_author, resource_type,
        resource_url, resource_year, resource_key_argument,
        location, influence_type, twitter, bluesky, notes, notes_html, notes_mentions,
        belief_regulatory_stance, belief_regulatory_stance_score,
        belief_regulatory_stance_detail, belief_evidence_source,
        belief_agi_timeline, belief_agi_timeline_score,
        belief_ai_risk, belief_ai_risk_score,
        belief_threat_models,
        submitted_at, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17, $18, $19,
        $20, $21, $22, $23, $24, $25, $26,
        $27, $28, $29, $30, $31, $32, $33, $34, $35,
        $36, 'pending'
      )`,
      [
        type,
        entityId,
        data.submitterEmail || null,
        relationship,
        data.name || null,
        data.title || null,
        data.category || null,
        data.primaryOrg || null,
        data.otherOrgs || null,
        data.website || null,
        data.fundingModel || null,
        data.parentOrgId ? parseInt(data.parentOrgId, 10) : null,
        type === 'resource' ? data.title || null : null,
        type === 'resource' ? data.category || null : null,
        data.author || null,
        data.resourceType || null,
        data.url || null,
        data.year || null,
        data.keyArgument || null,
        data.location || null,
        data.influenceType || null,
        data.twitter || null,
        data.bluesky || null,
        data.notes || null,
        notesHtml,
        notesMentions ? JSON.stringify(notesMentions) : null,
        data.regulatoryStance || null,
        stanceScore,
        data.regulatoryStanceDetail || null,
        data.evidenceSource || null,
        data.agiTimeline || null,
        timelineScore,
        data.aiRiskLevel || null,
        riskScore,
        data.threatModels || null,
        ts,
      ],
    )

    res.json({ success: true, message: 'Submission received' })
  } catch (err) {
    console.error('Submit error:', err)
    res.status(500).json({ error: 'Internal server error' })
  } finally {
    client.release()
  }
})

// ── API: Submissions ──
app.get('/submissions', async (req, res) => {
  const { type, status } = req.query
  const filterStatus = status || 'approved'
  const client = await pool.connect()
  try {
    const data = await generateMapData(client)
    res.json(data)
  } catch (err) {
    console.error('Submissions error:', err)
    res.status(500).json({ error: 'Internal server error' })
  } finally {
    client.release()
  }
})

// ── API: Admin GET ──
app.get('/admin', async (req, res) => {
  const { action, type, entity_type: entityType, status: statusFilter, key } = req.query
  if (key !== ADMIN_KEY) return res.status(401).json({ error: 'Unauthorized' })

  const client = await pool.connect()
  try {
    if (action === 'stats') {
      const approved = await client.query(
        `SELECT entity_type, COUNT(*)::int FROM entity WHERE status = 'approved' GROUP BY entity_type`,
      )
      const pending = await client.query(
        `SELECT entity_type, COUNT(*)::int FROM entity WHERE status = 'pending'  GROUP BY entity_type`,
      )
      const pendingNew = await client.query(
        `SELECT COUNT(*)::int FROM submission WHERE entity_id IS NULL AND status = 'pending'`,
      )
      const pendingEdit = await client.query(
        `SELECT COUNT(*)::int FROM submission WHERE entity_id IS NOT NULL AND status = 'pending'`,
      )
      const edges = await client.query(`SELECT COUNT(*)::int FROM edge`)
      return res.json({
        approved: Object.fromEntries(approved.rows.map((r) => [r.entity_type, parseInt(r.count)])),
        pending: Object.fromEntries(pending.rows.map((r) => [r.entity_type, parseInt(r.count)])),
        pending_new_submissions: parseInt(pendingNew.rows[0].count),
        pending_edit_submissions: parseInt(pendingEdit.rows[0].count),
        edges: parseInt(edges.rows[0].count),
      })
    }

    if (action === 'pending') {
      const subs = await client.query(
        "SELECT * FROM submission WHERE status = 'pending' AND entity_id IS NULL ORDER BY id DESC",
      )
      return res.json({ submissions: subs.rows })
    }

    if (action === 'pending_merges') {
      const subs = await client.query(
        "SELECT * FROM submission WHERE status = 'pending' AND entity_id IS NOT NULL ORDER BY id DESC",
      )
      return res.json({ submissions: subs.rows })
    }

    if (action === 'all') {
      const typeFilter = entityType ? `AND entity_type = '${entityType}'` : ''
      const statusFilter2 = statusFilter ? `AND status = '${statusFilter}'` : ''
      const result = await client.query(
        `SELECT * FROM entity WHERE 1=1 ${typeFilter} ${statusFilter2} ORDER BY id DESC LIMIT 500`,
      )
      return res.json({ data: result.rows, total: result.rows.length })
    }

    res.status(400).json({ error: 'Unknown action' })
  } catch (err) {
    console.error('Admin GET error:', err)
    res.status(500).json({ error: 'Internal server error' })
  } finally {
    client.release()
  }
})

// ── API: Admin POST ──
app.post('/admin', async (req, res) => {
  const key = req.query.key || req.headers['x-admin-key']
  if (key !== ADMIN_KEY) return res.status(401).json({ error: 'Unauthorized' })

  const { action, entity_id, submission_id, data, merged_data, resolution_notes } = req.body
  const client = await pool.connect()
  try {
    if (action === 'approve') {
      if (!submission_id) return res.status(400).json({ error: 'Missing submission_id' })
      // Apply optional field overrides before approving
      if (data && Object.keys(data).length > 0) {
        const updates = []
        const values = []
        let idx = 1
        for (const [field, value] of Object.entries(data)) {
          updates.push(`${field} = $${idx++}`)
          values.push(value)
        }
        if (updates.length > 0) {
          values.push(submission_id)
          await client.query(`UPDATE submission SET ${updates.join(', ')} WHERE id = $${idx}`, values)
        }
      }
      await client.query(`UPDATE submission SET status = 'approved', reviewed_at = NOW() WHERE id = $1`, [
        submission_id,
      ])
      return res.json({ success: true, action: 'approved' })
    }

    if (action === 'reject') {
      if (!submission_id) return res.status(400).json({ error: 'Missing submission_id' })
      await client.query(`UPDATE submission SET status = 'rejected', reviewed_at = NOW() WHERE id = $1`, [
        submission_id,
      ])
      return res.json({ success: true, action: 'rejected' })
    }

    if (action === 'merge') {
      if (!submission_id) return res.status(400).json({ error: 'Missing submission_id' })
      const sub = await client.query(`SELECT entity_id FROM submission WHERE id = $1`, [submission_id])
      if (sub.rows.length === 0) return res.status(404).json({ error: 'Submission not found' })
      const eid = sub.rows[0].entity_id
      if (eid && merged_data && Object.keys(merged_data).length > 0) {
        const updates = []
        const values = []
        let idx = 1
        for (const [field, value] of Object.entries(merged_data)) {
          updates.push(`${field} = $${idx++}`)
          values.push(value)
        }
        if (updates.length > 0) {
          values.push(eid)
          await client.query(`UPDATE entity SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx}`, values)
        }
      }
      await client.query(
        `UPDATE submission SET status = 'approved', reviewed_at = NOW(), resolution_notes = $1 WHERE id = $2`,
        [resolution_notes || null, submission_id],
      )
      return res.json({ success: true, action: 'merged' })
    }

    if (action === 'update_entity') {
      if (!entity_id || !data) return res.status(400).json({ error: 'Missing entity_id or data' })
      const updates = []
      const values = []
      let idx = 1
      for (const [field, value] of Object.entries(data)) {
        updates.push(`${field} = $${idx++}`)
        values.push(value)
      }
      if (updates.length === 0) return res.status(400).json({ error: 'No valid fields' })
      values.push(entity_id)
      await client.query(`UPDATE entity SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx}`, values)
      return res.json({ success: true, action: 'updated' })
    }

    if (action === 'delete') {
      if (!entity_id) return res.status(400).json({ error: 'Missing entity_id' })
      await client.query(`DELETE FROM entity WHERE id = $1`, [entity_id])
      return res.json({ success: true, action: 'deleted' })
    }

    if (action === 'reject_submission') {
      if (!submission_id) return res.status(400).json({ error: 'Missing submission_id' })
      await client.query(
        `UPDATE submission SET status = 'rejected', reviewed_at = NOW(), resolution_notes = $1 WHERE id = $2`,
        [resolution_notes || null, submission_id],
      )
      return res.json({ success: true, action: 'rejected_submission' })
    }

    res.status(400).json({ error: 'Unknown action' })
  } catch (err) {
    console.error('Admin POST error:', err)
    res.status(500).json({ error: 'Internal server error' })
  } finally {
    client.release()
  }
})

// ── API: Chat (wraps Lambda handler) ──
app.post('/chat', async (req, res) => {
  const fakeEvent = {
    requestContext: { http: { method: 'POST' } },
    headers: { origin: req.headers.origin || `http://localhost:${PORT}` },
    body: JSON.stringify(req.body || {}),
  }
  try {
    const result = await chatHandler(fakeEvent)
    res.status(result.statusCode || 200)
    if (result.headers) {
      for (const [k, v] of Object.entries(result.headers)) {
        if (k.toLowerCase() === 'access-control-allow-origin') continue
        res.setHeader(k, v)
      }
    }
    res.type('application/json').send(result.body || '')
  } catch (err) {
    console.error('Chat dev-server error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.options('/chat', (req, res) => res.status(204).end())

// Serve static files (AFTER API routes to avoid /admin → admin.html conflict)
app.use(
  express.static(__dirname, {
    extensions: ['html'],
    index: 'index.html',
  }),
)

app.listen(PORT, () => {
  console.log(`Dev server running at http://localhost:${PORT}`)
  console.log(`  Map:        http://localhost:${PORT}/map.html`)
  console.log(`  Contribute: http://localhost:${PORT}/contribute.html`)
  console.log(`  Admin:      http://localhost:${PORT}/admin.html`)
  console.log(`  API search: http://localhost:${PORT}/search?q=anthropic`)
})
