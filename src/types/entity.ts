/** Frontend entity shape — matches toFrontendShape() in api/export-map.js */
export interface Entity {
  id: number
  entity_type: 'person' | 'organization' | 'resource'
  name: string
  category: string | null
  other_categories: string | null
  title: string | null
  primary_org: string | null
  other_orgs: string | null
  website: string | null
  funding_model: string | null
  parent_org_id: number | null
  location: string | null
  influence_type: string | null
  twitter: string | null
  bluesky: string | null
  notes: string | null
  notes_html: string | null
  thumbnail_url: string | null
  submission_count: number | null
  status: 'approved' | 'pending' | 'internal'

  // Belief fields (mapped from belief_* DB columns)
  regulatory_stance: string | null
  regulatory_stance_detail: string | null
  evidence_source: string | null
  agi_timeline: string | null
  ai_risk_level: string | null
  threat_models: string | null

  // Numeric scores (wavg from submissions, or text-label fallback)
  stance_score: number | null
  timeline_score: number | null
  risk_score: number | null

  // Resource-specific fields
  author?: string | null
  resource_type?: string | null
  url?: string | null
  year?: string | null
  key_argument?: string | null

  // Added by map-detail.json merge or edge queries
  source_type?: string | null
}

export interface Edge {
  source_id: number
  target_id: number
  edge_type: string
  role: string | null
  is_primary: boolean | null
  evidence: string | null
}

/** Shape of map-data.json as served from S3/CloudFront */
export interface MapData {
  people: Entity[]
  organizations: Entity[]
  resources: Entity[]
  edges: Edge[]
}

/** Shape of map-detail.json — keyed by entity ID */
export type MapDetail = Record<string, Partial<Entity>>

/** Merged entity cache for client-side search */
export interface EntityCache {
  entities: Entity[]
  byId: Map<number, Entity>
}
