export function getVoterId(): string {
  let id = localStorage.getItem('fieldVoterId')
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem('fieldVoterId', id)
  }
  return id
}

export function getLocalVotes(entityId: number): Record<string, { up?: boolean; down?: boolean }> {
  try {
    return JSON.parse(localStorage.getItem('fieldVotes2_' + entityId) || '{}')
  } catch {
    return {}
  }
}

export function setLocalVote(entityId: number, field: string, dir: 'up' | 'down', active: boolean): void {
  const votes = getLocalVotes(entityId)
  if (!votes[field]) votes[field] = {}
  if (active) {
    votes[field][dir] = true
  } else {
    delete votes[field][dir]
  }
  if (!votes[field].up && !votes[field].down) delete votes[field]
  localStorage.setItem('fieldVotes2_' + entityId, JSON.stringify(votes))
}
