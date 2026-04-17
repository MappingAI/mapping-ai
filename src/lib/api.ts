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

export async function fetchMapData(): Promise<MapData> {
  return fetchJSON<MapData>('/map-data.json')
}

export async function fetchMapDetail(): Promise<MapDetail> {
  return fetchJSON<MapDetail>('/map-detail.json')
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
