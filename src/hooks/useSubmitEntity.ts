import { useMutation, useQueryClient } from '@tanstack/react-query'
import { submitEntity } from '../lib/api'
import { useSubmissionLedger } from './useSubmissionLedger'
import type { SubmitRequest, SubmitResponse, ApiError } from '../types/api'
import type { Entity } from '../types/entity'

interface SubmitError extends Error {
  status: number
  body: ApiError
}

/**
 * Mutation for submitting entities via POST /submit.
 *
 * Does NOT invalidate the entity cache on success — map-data.json is static
 * and only changes on admin approval. Uses setQueryData for optimistic updates
 * when adding pending orgs from the inline creation panel.
 */
export function useSubmitEntity() {
  return useMutation<SubmitResponse, SubmitError, SubmitRequest>({
    mutationFn: submitEntity,
  })
}

/** Fields accepted when injecting a pending entity into the cache. */
export interface PendingEntityData {
  id: number
  name: string
  entity_type: 'person' | 'organization' | 'resource'
  category?: string | null
  title?: string | null
  primary_org?: string | null
  location?: string | null
}

const TYPE_TO_ARRAY: Record<string, string> = {
  person: 'people',
  organization: 'organizations',
  resource: 'resources',
}

/**
 * Optimistically add any entity type to the TanStack Query cache.
 * Makes the entity instantly searchable via fuzzySearch / useEntityCache.
 * Uses submission ID (not entity ID) — entity ID is assigned on admin approval.
 */
export function useAddPendingEntity() {
  const queryClient = useQueryClient()
  const { addEntry } = useSubmissionLedger()

  return (entity: PendingEntityData) => {
    // Persist to localStorage ledger (survives page reload)
    addEntry({
      id: entity.id,
      entity_type: entity.entity_type,
      name: entity.name,
      category: entity.category ?? null,
      title: entity.title ?? null,
      primary_org: entity.primary_org ?? null,
      location: entity.location ?? null,
    })

    const arrayKey = TYPE_TO_ARRAY[entity.entity_type]
    if (!arrayKey) return

    queryClient.setQueryData(['map-data'], (old: unknown) => {
      if (!old || typeof old !== 'object') return old
      const data = old as Record<string, Entity[]>
      const existing = data[arrayKey] ?? []

      // Use negative ID to avoid collision with entity table IDs
      // (submission IDs and entity IDs are different auto-increment sequences)
      const pendingId = -Math.abs(entity.id)

      // Avoid duplicates
      if (existing.some((e) => e.id === pendingId)) return old

      return {
        ...data,
        [arrayKey]: [
          ...existing,
          {
            id: pendingId,
            entity_type: entity.entity_type,
            name: entity.name,
            category: entity.category ?? null,
            title: entity.title ?? null,
            primary_org: entity.primary_org ?? null,
            location: entity.location ?? null,
            status: 'pending' as const,
            _pending: true,
          },
        ],
      }
    })
  }
}

/** @deprecated Use useAddPendingEntity instead */
export function useAddPendingOrg() {
  const addPendingEntity = useAddPendingEntity()
  return (org: { id: number; name: string; category?: string | null }) => {
    addPendingEntity({ ...org, entity_type: 'organization' })
  }
}
