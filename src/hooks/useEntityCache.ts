import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchMapData, fetchMapDetail } from '../lib/api'
import { useSeedCacheFromLedger } from './useSubmissionLedger'
import type { Entity, EntityCache } from '../types/entity'

/** Fetches map-data.json — the core entity data. staleTime: Infinity. */
export function useMapData() {
  return useQuery({
    queryKey: ['map-data'],
    queryFn: fetchMapData,
    staleTime: Infinity,
  })
}

/** Fetches map-detail.json — optional detail data. Fails gracefully. */
export function useMapDetail() {
  return useQuery({
    queryKey: ['map-detail'],
    queryFn: fetchMapDetail,
    staleTime: Infinity,
    retry: false,
  })
}

/**
 * Combined entity cache — merges map-data.json + map-detail.json into a
 * flat array with a byId lookup map. Handles detail fetch failure gracefully
 * (entities available without notes/social data).
 */
export function useEntityCache(): {
  cache: EntityCache | null
  isLoading: boolean
  error: Error | null
} {
  const mapData = useMapData()
  const mapDetail = useMapDetail()
  const seedFromLedger = useSeedCacheFromLedger()

  // Seed cache with localStorage ledger entries once data loads
  useEffect(() => {
    if (mapData.data && !mapData.isPending) {
      seedFromLedger()
    }
  }, [mapData.data, mapData.isPending, seedFromLedger])

  if (mapData.isPending) {
    return { cache: null, isLoading: true, error: null }
  }

  if (mapData.error) {
    return { cache: null, isLoading: false, error: mapData.error }
  }

  const data = mapData.data!
  const detail = mapDetail.data ?? {}

  // Merge detail fields into entities (immutable — never mutate cached objects)
  const allEntities: Entity[] = [
    ...(data.people ?? []).map((e) => {
      const d = detail[String(e.id)]
      return d ? { ...e, ...d } : e
    }),
    ...(data.organizations ?? []).map((e) => {
      const d = detail[String(e.id)]
      return d ? { ...e, ...d } : e
    }),
    ...(data.resources ?? []).map((e) => {
      const d = detail[String(e.id)]
      return d ? { ...e, ...d } : e
    }),
  ]

  const byId = new Map<number, Entity>()
  for (const entity of allEntities) {
    byId.set(entity.id, entity)
  }

  return {
    cache: { entities: allEntities, byId },
    isLoading: false,
    error: null,
  }
}
