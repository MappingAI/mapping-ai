import { useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Entity } from '../types/entity'

const STORAGE_KEY = 'mappingai_session_submissions'
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

interface LedgerEntry {
  id: number
  entity_type: 'person' | 'organization' | 'resource'
  name: string
  category: string | null
  title: string | null
  primary_org: string | null
  location: string | null
  submittedAt: string // ISO timestamp
}

interface LedgerData {
  version: 1
  entries: LedgerEntry[]
}

function readLedger(): LedgerEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const data: LedgerData = JSON.parse(raw)
    if (data.version !== 1) return []
    const now = Date.now()
    // Prune entries older than 7 days
    return data.entries.filter((e) => now - new Date(e.submittedAt).getTime() < MAX_AGE_MS)
  } catch {
    return []
  }
}

function writeLedger(entries: LedgerEntry[]): void {
  try {
    const data: LedgerData = { version: 1, entries }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // localStorage full or unavailable
  }
}

/**
 * Manages a localStorage ledger of entities submitted during recent sessions.
 * Entries survive page reloads and auto-expire after 7 days.
 */
export function useSubmissionLedger() {
  const addEntry = useCallback((entry: Omit<LedgerEntry, 'submittedAt'>) => {
    const entries = readLedger()
    // Avoid duplicates
    if (entries.some((e) => e.id === entry.id && e.entity_type === entry.entity_type)) return
    entries.push({ ...entry, submittedAt: new Date().toISOString() })
    writeLedger(entries)
  }, [])

  const getEntries = useCallback(() => readLedger(), [])

  const pruneApproved = useCallback((approvedEntities: Entity[]) => {
    const entries = readLedger()
    const approvedNames = new Set(
      approvedEntities.map((e) => `${e.entity_type}:${e.name.toLowerCase()}`),
    )
    const remaining = entries.filter(
      (e) => !approvedNames.has(`${e.entity_type}:${e.name.toLowerCase()}`),
    )
    if (remaining.length !== entries.length) {
      writeLedger(remaining)
    }
  }, [])

  return { addEntry, getEntries, pruneApproved }
}

const TYPE_TO_ARRAY: Record<string, string> = {
  person: 'people',
  organization: 'organizations',
  resource: 'resources',
}

/**
 * Seeds the TanStack Query cache with ledger entries on initialization.
 * Call once during app startup (e.g., in useEntityCache or App component).
 */
export function useSeedCacheFromLedger() {
  const queryClient = useQueryClient()
  const seededRef = useRef(false)

  return useCallback(() => {
    if (seededRef.current) return
    seededRef.current = true

    const entries = readLedger()
    if (entries.length === 0) return

    queryClient.setQueryData(['map-data'], (old: unknown) => {
      if (!old || typeof old !== 'object') return old
      const data = old as Record<string, Entity[]>

      // Group ledger entries by type
      const toAdd: Record<string, Entity[]> = { people: [], organizations: [], resources: [] }
      for (const entry of entries) {
        const arrayKey = TYPE_TO_ARRAY[entry.entity_type]
        if (!arrayKey) continue
        const existing = data[arrayKey] ?? []
        const pendingId = -Math.abs(entry.id)
        // Skip if already in cache (by negative ID or name+type match)
        if (
          existing.some(
            (e) =>
              e.id === pendingId ||
              (e.name.toLowerCase() === entry.name.toLowerCase() &&
                e.entity_type === entry.entity_type),
          )
        ) {
          continue
        }
        toAdd[arrayKey]!.push({
          id: pendingId,
          entity_type: entry.entity_type,
          name: entry.name,
          category: entry.category,
          title: entry.title,
          primary_org: entry.primary_org,
          location: entry.location,
          status: 'pending',
          _pending: true,
        } as unknown as Entity)
      }

      return {
        ...data,
        people: [...(data.people ?? []), ...(toAdd.people ?? [])],
        organizations: [...(data.organizations ?? []), ...(toAdd.organizations ?? [])],
        resources: [...(data.resources ?? []), ...(toAdd.resources ?? [])],
      }
    })
  }, [queryClient])
}
