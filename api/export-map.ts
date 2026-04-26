/**
 * Shared map-data export logic — used by the admin Lambda on approve/merge
 * and by scripts/export-map-data.js for local/CI builds.
 *
 * Bridges the DB row shape (see src/shared/db-types.ts) to the frontend
 * shape (see src/types/entity.ts). If you add a new DB column, update
 * both this mapping and the relevant row type — otherwise the two halves
 * of the contract will drift silently.
 */

import type { DbEntityRow } from '../src/shared/db-types.js'

/**
 * Generic SQL query function compatible with @neondatabase/serverless.
 * Accepts a query string and positional params, returns the rows array.
 */
type SqlQueryFn = (query: string, params?: unknown[]) => Promise<Record<string, unknown>[]>

const SENSITIVE = new Set<keyof DbEntityRow>([
  // submitter_email / submitter_relationship live on the `submission` table,
  // not `entity`, so SELECT * on entity never returns them. search_vector is
  // always stripped because it's tsvector text nobody outside Postgres cares
  // about. We still run the delete-in-a-loop defensively in case a future
  // schema change adds something we should scrub here.
  'search_vector',
])

type RawEntityRow = DbEntityRow & Record<string, unknown>

function stripSensitive(row: RawEntityRow): RawEntityRow {
  const clean: RawEntityRow = { ...row }
  for (const field of SENSITIVE) {
    delete (clean as Record<string, unknown>)[field]
  }
  return clean
}

// Ordinal scores derived from text labels — used as fallback when the entity
// has no approved submissions (i.e. belief_*_wavg is null).
const STANCE_SCORES: Record<string, number> = {
  Accelerate: 1,
  'Light-touch': 2,
  'Light-touch regulation': 2,
  Targeted: 3,
  'Targeted regulation': 3,
  Moderate: 4,
  'Moderate regulation': 4,
  Restrictive: 5,
  'Restrictive regulation': 5,
  Precautionary: 6,
  Nationalize: 7,
}
const TIMELINE_SCORES: Record<string, number> = {
  'Already here': 1,
  '2-3 years': 2,
  'Within 2-3 years': 2,
  '5-10 years': 3,
  '10-25 years': 4,
  '25+ years or never': 5,
}
const RISK_SCORES: Record<string, number> = {
  Overstated: 1,
  Manageable: 2,
  Serious: 3,
  Catastrophic: 4,
  'Potentially catastrophic': 4,
  Existential: 5,
}

/**
 * Frontend-facing entity shape produced by {@link toFrontendShape}. Matches
 * `Entity` in src/types/entity.ts; kept looser here because the output
 * dictionary is also consumed by the map.html inline D3 code which reads
 * fields by name without a TS layer.
 */
export type FrontendEntity = Record<string, unknown> & {
  id: number
  entity_type: DbEntityRow['entity_type']
  name: string | null
  source_type?: string
}

/**
 * Map a DB entity row to the shape the frontend expects.
 *
 * Bridges new DB column names (`belief_*`) → old frontend field names
 * (`regulatory_stance`, `agi_timeline`, `ai_risk_level`, `title` for resources).
 */
export function toFrontendShape(row: RawEntityRow): FrontendEntity {
  // Explicit allowlist — only export fields the frontend needs.
  const out: FrontendEntity = {
    id: row.id,
    entity_type: row.entity_type,
    name: row.name,
    category: row.category,
    other_categories: row.other_categories ?? null,
    title: row.title,
    primary_org: row.primary_org,
    other_orgs: row.other_orgs,
    website: row.website,
    funding_model: row.funding_model,
    parent_org_id: row.parent_org_id,
    location: row.location,
    influence_type: row.influence_type,
    twitter: row.twitter,
    bluesky: row.bluesky,
    notes: row.notes,
    thumbnail_url: row.thumbnail_url,
    submission_count: row.submission_count,
    status: row.status,
  }

  // Map belief columns → frontend field names.
  out.regulatory_stance = row.belief_regulatory_stance
  out.regulatory_stance_detail = row.belief_regulatory_stance_detail
  out.evidence_source = row.belief_evidence_source
  out.agi_timeline = row.belief_agi_timeline
  out.ai_risk_level = row.belief_ai_risk
  out.threat_models = row.belief_threat_models

  // Resources: frontend uses `title` (mapped from resource_title).
  if (row.entity_type === 'resource') {
    out.title = row.resource_title ?? row.name
    out.category = row.resource_category ?? row.category
    out.author = row.resource_author
    out.resource_type = row.resource_type
    out.url = row.resource_url
    out.year = row.resource_year
    out.key_argument = row.resource_key_argument
    // Resource tagging: topic_tags supplements/replaces single category
    out.topic_tags = row.topic_tags ?? null
    out.format_tags = row.format_tags ?? null
    // Advocated beliefs: what the resource argues for (vs. entity's own beliefs)
    out.advocated_stance = row.advocated_stance ?? null
    out.advocated_timeline = row.advocated_timeline ?? null
    out.advocated_risk = row.advocated_risk ?? null
  }

  // Numeric scores: prefer wavg from submissions, fall back to text label lookup.
  const regStance = typeof out.regulatory_stance === 'string' ? out.regulatory_stance : null
  const agiTimeline = typeof out.agi_timeline === 'string' ? out.agi_timeline : null
  const riskLevel = typeof out.ai_risk_level === 'string' ? out.ai_risk_level : null

  out.stance_score = row.belief_regulatory_stance_wavg ?? (regStance ? (STANCE_SCORES[regStance] ?? null) : null)
  out.timeline_score = row.belief_agi_timeline_wavg ?? (agiTimeline ? (TIMELINE_SCORES[agiTimeline] ?? null) : null)
  out.risk_score = row.belief_ai_risk_wavg ?? (riskLevel ? (RISK_SCORES[riskLevel] ?? null) : null)

  return out
}

/**
 * source_type priority: self > connector > external.
 * Derived from any approved submission for the entity.
 */
async function computeSourceTypes(sql: SqlQueryFn): Promise<Map<number, string>> {
  const rows = (await sql(`
    SELECT entity_id,
      CASE
        WHEN bool_or(submitter_relationship = 'self')      THEN 'self'
        WHEN bool_or(submitter_relationship = 'connector') THEN 'connector'
        ELSE 'external'
      END AS source_type
    FROM submission
    WHERE entity_id IS NOT NULL AND status = 'approved'
    GROUP BY entity_id
  `)) as { entity_id: number; source_type: string }[]
  return new Map(rows.map((r) => [r.entity_id, r.source_type]))
}

interface EdgeJoinRow {
  id: number
  source_id: number
  target_id: number
  edge_type: string | null
  role: string | null
  is_primary: boolean
  evidence: string | null
  created_by: string
  source_type: string
  target_type: string
}

export interface MapRelationship {
  source_type: string
  target_type: string
  source_id: number
  target_id: number
  relationship_type: string | null
  role: string | null
  evidence: string | null
}

export interface PersonOrganizationEdge {
  person_id: number
  organization_id: number
  role: string | null
  is_primary: boolean
}

export interface GeneratedMapData {
  _meta: { generated_at: string }
  people: FrontendEntity[]
  organizations: FrontendEntity[]
  resources: FrontendEntity[]
  relationships: MapRelationship[]
  person_organizations: PersonOrganizationEdge[]
}

export async function generateMapData(sql: SqlQueryFn): Promise<GeneratedMapData> {
  // Only export entities that have passed QA review.
  const entityRows = (await sql(
    `SELECT * FROM entity WHERE status = 'approved' AND qa_approved = true ORDER BY id`,
  )) as RawEntityRow[]
  // Only export edges between QA-approved entities.
  const edgeRows = (await sql(
    `SELECT e.id, e.source_id, e.target_id, e.edge_type, e.role, e.is_primary,
            e.evidence, e.created_by,
            src.entity_type AS source_type,
            tgt.entity_type AS target_type
     FROM edge e
     JOIN entity src ON src.id = e.source_id AND src.qa_approved = true
     JOIN entity tgt ON tgt.id = e.target_id AND tgt.qa_approved = true
     ORDER BY e.id`,
  )) as unknown as EdgeJoinRow[]

  const sourceTypeMap = await computeSourceTypes(sql)

  const people: FrontendEntity[] = []
  const organizations: FrontendEntity[] = []
  const resources: FrontendEntity[] = []

  for (const row of entityRows) {
    const clean = stripSensitive(row)
    const shaped = toFrontendShape(clean)
    shaped.source_type = sourceTypeMap.get(row.id) ?? 'external'

    if (row.entity_type === 'person') people.push(shaped)
    else if (row.entity_type === 'organization') organizations.push(shaped)
    else if (row.entity_type === 'resource') resources.push(shaped)
  }

  // Build relationships in the shape map.html expects.
  const relationships: MapRelationship[] = edgeRows.map((e) => ({
    source_type: e.source_type,
    target_type: e.target_type,
    source_id: e.source_id,
    target_id: e.target_id,
    relationship_type: e.edge_type,
    role: e.role,
    evidence: e.evidence,
  }))

  // Build person_organizations from affiliation edges that cross person↔org.
  const person_organizations: PersonOrganizationEdge[] = edgeRows
    .filter(
      (e) =>
        e.edge_type === 'affiliated' &&
        ((e.source_type === 'person' && e.target_type === 'organization') ||
          (e.source_type === 'organization' && e.target_type === 'person')),
    )
    .map((e) => ({
      person_id: e.source_type === 'person' ? e.source_id : e.target_id,
      organization_id: e.source_type === 'organization' ? e.source_id : e.target_id,
      role: e.role,
      is_primary: e.is_primary,
    }))

  return {
    _meta: { generated_at: new Date().toISOString() },
    people,
    organizations,
    resources,
    relationships,
    person_organizations,
  }
}

/**
 * Detail-only fields — heavy text (notes, stance_detail, threat_models)
 * plus fields only shown when clicking a node. These are stripped from
 * the skeleton and served as a separate lazy-loaded file.
 */
const DETAIL_FIELDS = new Set<string>([
  'notes',
  'regulatory_stance_detail',
  'evidence_source',
  'threat_models',
  'key_argument',
  'author',
  'url',
  'year',
  'twitter',
  'bluesky',
  'parent_org_id',
  'status',
  // Resource detail-only fields
  'format_tags',
  'advocated_stance',
  'advocated_timeline',
  'advocated_risk',
])

export interface SplitMapData {
  skeleton: GeneratedMapData
  detail: Record<string, Record<string, unknown>>
}

/**
 * Split full map data into skeleton (render-critical) + detail (lazy-loaded).
 * Skeleton: id, name, category, scores, thumbnail, positions, relationships.
 * Detail: keyed by entity id — notes, stance_detail, threat_models, etc.
 */
export function splitMapData(fullData: GeneratedMapData): SplitMapData {
  const detail: Record<string, Record<string, unknown>> = {}

  function stripDetail(entity: FrontendEntity): FrontendEntity {
    const d: Record<string, unknown> = {}
    const skeleton: FrontendEntity = {
      id: entity.id,
      entity_type: entity.entity_type,
      name: entity.name,
    }
    for (const [k, v] of Object.entries(entity)) {
      if (DETAIL_FIELDS.has(k) && v != null) {
        d[k] = v
      } else if (!(k in skeleton)) {
        skeleton[k] = v
      }
    }
    if (Object.keys(d).length > 0) {
      detail[String(entity.id)] = d
    }
    return skeleton
  }

  const skeleton: GeneratedMapData = {
    _meta: fullData._meta,
    people: fullData.people.map(stripDetail),
    organizations: fullData.organizations.map(stripDetail),
    resources: fullData.resources.map(stripDetail),
    relationships: fullData.relationships,
    person_organizations: fullData.person_organizations,
  }

  return { skeleton, detail }
}
