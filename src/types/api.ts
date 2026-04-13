/** POST /submit request body */
export interface SubmitRequest {
  type: 'person' | 'organization' | 'resource'
  timestamp: string
  data: Record<string, unknown>
  _hp: string // honeypot field
}

/** POST /submit response */
export interface SubmitResponse {
  id: number
  message: string
}

/** GET /search response */
export interface SearchResult {
  id: number
  entity_type: 'person' | 'organization' | 'resource'
  name: string
  category: string | null
  title: string | null
  primary_org: string | null
  location: string | null
  status: 'approved' | 'pending'
}

/** Client-side fuzzy search result (local cache + pending merge) */
export interface FuzzySearchResult extends SearchResult {
  score: number
  isPending: boolean
}

/** Error response shape from API */
export interface ApiError {
  error: string
  message?: string
  details?: Record<string, string>
}

/** Photon geocoding API result */
export interface PhotonResult {
  properties: {
    name: string
    state?: string
    country?: string
    type?: string
    osm_id?: number
  }
}

/** Bluesky actor search result */
export interface BlueskyActor {
  did: string
  handle: string
  displayName?: string
  avatar?: string
}
