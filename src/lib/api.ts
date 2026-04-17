import type { SubmitRequest, SubmitResponse, SearchResponse, SearchResult } from '../types/api'
import type { MapData, MapDetail } from '../types/entity'

const API_BASE = import.meta.env.PROD
  ? 'https://j8jamvdf6i.execute-api.eu-west-2.amazonaws.com'
  : '/api'

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw Object.assign(new Error(body.message ?? body.error ?? `HTTP ${res.status}`), {
      status: res.status,
      body,
    })
  }
  return res.json()
}

/**
 * Fetch with graceful fallback for public forks. Production S3 + CloudFront
 * serves `/map-data.json` generated from the live DB; a fresh clone with no
 * build + no deploy won't have that file, so we fall back to the committed
 * fixture under `/fixtures/` so the map still renders with synthetic data.
 */
async function fetchJSONWithFixtureFallback<T>(primary: string, fallback: string): Promise<T> {
  try {
    return await fetchJSON<T>(primary)
  } catch (err) {
    const status = (err as { status?: number }).status
    if (status === 404) return await fetchJSON<T>(fallback)
    throw err
  }
}

export async function fetchMapData(): Promise<MapData> {
  return fetchJSONWithFixtureFallback<MapData>('/map-data.json', '/fixtures/map-data.json')
}

export async function fetchMapDetail(): Promise<MapDetail> {
  return fetchJSONWithFixtureFallback<MapDetail>('/map-detail.json', '/fixtures/map-detail.json')
}

/**
 * Search entities via GET /search.
 * API returns { people: [], organizations: [], resources: [] } — we flatten to a single array.
 */
export async function searchEntities(
  query: string,
  type?: string,
  status?: string,
): Promise<SearchResult[]> {
  const params = new URLSearchParams({ q: query })
  if (type) params.set('type', type)
  if (status) params.set('status', status)
  const grouped = await fetchJSON<SearchResponse>(`${API_BASE}/search?${params}`)
  return [...(grouped.people ?? []), ...(grouped.organizations ?? []), ...(grouped.resources ?? [])]
}

export async function submitEntity(data: SubmitRequest): Promise<SubmitResponse> {
  return fetchJSON<SubmitResponse>(`${API_BASE}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}
