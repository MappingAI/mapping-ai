import { useState, useEffect, useCallback } from 'react'

function getVoterId(): string {
  let id = localStorage.getItem('fieldVoterId')
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem('fieldVoterId', id)
  }
  return id
}

function getLocalVotes(entityId: number): Record<string, { up?: boolean; down?: boolean }> {
  try {
    return JSON.parse(localStorage.getItem('fieldVotes2_' + entityId) || '{}')
  } catch {
    return {}
  }
}

function setLocalVote(entityId: number, field: string, dir: 'up' | 'down', active: boolean) {
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

interface Props {
  entityId: number
  field: string
}

export function FieldFeedback({ entityId, field }: Props) {
  const [localUp, setLocalUp] = useState(() => !!getLocalVotes(entityId)[field]?.up)
  const [localDown, setLocalDown] = useState(() => !!getLocalVotes(entityId)[field]?.down)
  const [serverCounts, setServerCounts] = useState<{ confirms: number; flags: number } | null>(null)

  const loadFromServer = useCallback(() => {
    fetch('/api/field-feedback?entityId=' + entityId)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.feedback?.[field]) {
          setServerCounts(data.feedback[field])
        }
      })
      .catch(() => {})
  }, [entityId, field])

  useEffect(() => {
    loadFromServer()
  }, [loadFromServer])

  const handleVote = (vote: number) => {
    const dir = vote === 1 ? 'up' : 'down'
    const isActive = dir === 'up' ? localUp : localDown
    const nowActive = !isActive
    if (dir === 'up') setLocalUp(nowActive)
    else setLocalDown(nowActive)
    setLocalVote(entityId, field, dir as 'up' | 'down', nowActive)
    fetch('/api/field-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityId,
        fieldName: field,
        vote,
        voterId: getVoterId(),
        action: nowActive ? 'add' : 'remove',
      }),
    })
      .then((r) => r.ok && r.json())
      .then(() => loadFromServer())
      .catch(() => {})
  }

  const c = serverCounts?.confirms || 0
  const f = serverCounts?.flags || 0
  const showC = localUp ? Math.max(c, 1) : c
  const showF = localDown ? Math.max(f, 1) : f

  return (
    <span className="field-feedback-row">
      <span className="field-inferred-badge">unverified</span>
      <button
        className={`field-vote field-vote-confirm${localUp ? ' voted' : ''}`}
        title="Looks correct"
        onClick={(e) => {
          e.stopPropagation()
          handleVote(1)
        }}
      >
        &#x25B2;
      </button>
      <button
        className={`field-vote field-vote-flag${localDown ? ' voted' : ''}`}
        title="Flag as incorrect"
        onClick={(e) => {
          e.stopPropagation()
          handleVote(-1)
        }}
      >
        &#x25BC;
      </button>
      <span className="field-vote-counts">
        {showC > 0 && <span style={{ color: '#16a34a' }}>&#x25B2;{showC}</span>}
        {showC > 0 && showF > 0 && ' '}
        {showF > 0 && <span style={{ color: '#dc2626' }}>&#x25BC;{showF}</span>}
      </span>
    </span>
  )
}
