import { useMutation, useQueryClient } from '@tanstack/react-query'
import { submitEntity } from '../lib/api'
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

/**
 * Optimistically add a newly-created pending org to the entity cache.
 * Called after org creation panel submits successfully.
 * The org uses the submission ID (not entity ID) — this is existing behavior.
 */
export function useAddPendingOrg() {
  const queryClient = useQueryClient()

  return (org: { id: number; name: string; category?: string | null }) => {
    queryClient.setQueryData(['map-data'], (old: unknown) => {
      if (!old || typeof old !== 'object') return old
      const data = old as { organizations?: Entity[] }
      return {
        ...data,
        organizations: [
          ...(data.organizations ?? []),
          {
            id: org.id,
            entity_type: 'organization' as const,
            name: org.name,
            category: org.category ?? null,
            status: 'pending' as const,
            _pending: true, // marker for UI
          },
        ],
      }
    })
  }
}
