import { useQuery } from '@tanstack/react-query'

export interface TrackSummary {
  id: string
  title: string
  subtitle: string
  audience: string
  file: string
}

export interface TrackItem {
  /**
   * Resolved against the resource cache by fuzzy title match at render time.
   * Intentional loose coupling — track content outlives specific DB IDs, so
   * a resource rename shouldn't break a track.
   */
  title_hint: string
  blurb: string
}

export interface Track extends TrackSummary {
  items: TrackItem[]
}

/** Fetch the track index (small, cheap). */
export function useTrackIndex() {
  return useQuery<TrackSummary[]>({
    queryKey: ['tracks-index'],
    queryFn: async () => {
      const res = await fetch('/tracks/index.json')
      if (!res.ok) throw new Error(`Failed to load tracks index: ${res.status}`)
      const json = (await res.json()) as { tracks: TrackSummary[] }
      return json.tracks
    },
    staleTime: 10 * 60 * 1000,
  })
}

/** Lazily fetch a specific track's items. */
export function useTrack(id: string | null) {
  return useQuery<Track | null>({
    queryKey: ['track', id],
    queryFn: async () => {
      if (!id) return null
      const res = await fetch(`/tracks/${id}.json`)
      if (!res.ok) throw new Error(`Failed to load track ${id}: ${res.status}`)
      return (await res.json()) as Track
    },
    enabled: id != null,
    staleTime: 10 * 60 * 1000,
  })
}
