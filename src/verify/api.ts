import { getVoterId } from '../shared/field-feedback-utils'

export interface Task {
  entityId: number
  name: string
  entityType: string
  category: string | null
  primaryOrg: string | null
  fieldName: string
  fieldValue: string
}

export interface FlagCorrection {
  errorType: string
  correctedValue: string
}

export async function verifyFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Voter-Id': getVoterId(),
      ...init?.headers,
    },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<T>
}
