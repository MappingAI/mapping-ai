import { useState, useEffect, useCallback } from 'react'
import { getVoterId, getLocalVotes, setLocalVote } from '../shared/field-feedback-utils'
import { FieldNoteButton } from './FieldNoteButton'

interface Props {
  entityId: number
  field: string
  entityName?: string
  fieldLabel?: string
  verificationStatus?: 'verified' | 'unverified' | null
}

export function FieldFeedback({ entityId, field, entityName, fieldLabel, verificationStatus }: Props) {
  const [localUp, setLocalUp] = useState(() => !!getLocalVotes(entityId)[field]?.up)
  const [localDown, setLocalDown] = useState(() => !!getLocalVotes(entityId)[field]?.down)
  const [serverCounts, setServerCounts] = useState<{ confirms: number; flags: number } | null>(null)

  useEffect(() => {
    setLocalUp(!!getLocalVotes(entityId)[field]?.up)
    setLocalDown(!!getLocalVotes(entityId)[field]?.down)
    setServerCounts(null)
  }, [entityId, field])

  const loadFromServer = useCallback(() => {
    fetch('/api/field-feedback?entityId=' + entityId)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.feedback) return
        setServerCounts(data.feedback[field] || { confirms: 0, flags: 0 })
      })
      .catch(() => {})
  }, [entityId, field])

  useEffect(() => {
    loadFromServer()
  }, [loadFromServer])

  const handleVote = (vote: 1 | -1) => {
    const dir = vote === 1 ? 'up' : 'down'
    const isActive = dir === 'up' ? localUp : localDown
    const nowActive = !isActive
    if (dir === 'up') setLocalUp(nowActive)
    else setLocalDown(nowActive)
    setLocalVote(entityId, field, dir, nowActive)
    setServerCounts((prev) => {
      if (!prev) return prev
      const delta = nowActive ? 1 : -1
      return dir === 'up'
        ? { ...prev, confirms: Math.max(0, prev.confirms + delta) }
        : { ...prev, flags: Math.max(0, prev.flags + delta) }
    })
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
      .then((r) => {
        if (!r.ok) return
        return r.json()
      })
      .then(() => loadFromServer())
      .catch(() => {})
  }

  const c = serverCounts?.confirms || 0
  const f = serverCounts?.flags || 0
  const showC = localUp ? Math.max(c, 1) : c
  const showF = localDown ? Math.max(f, 1) : f

  return (
    <span className="field-feedback-row">
      <span
        className={
          verificationStatus === 'verified'
            ? 'field-verified-badge'
            : verificationStatus === 'unverified'
              ? 'field-inferred-badge'
              : 'field-not-verified-badge'
        }
      >
        {verificationStatus === 'verified'
          ? 'verified'
          : verificationStatus === 'unverified'
            ? 'unverified'
            : 'not yet verified'}
      </span>
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
      <FieldNoteButton entityId={entityId} field={field} entityName={entityName} fieldLabel={fieldLabel} />
    </span>
  )
}
