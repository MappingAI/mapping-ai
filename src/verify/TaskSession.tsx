import { useState, useCallback, useEffect } from 'react'
import { verifyFetch, type Task, type FlagCorrection } from './api'
import { VerifyTask } from './VerifyTask'

interface SessionStats {
  confirmed: number
  flagged: number
  skipped: number
}

interface Props {
  onSwitchToBrowse: () => void
}

export function TaskSession({ onSwitchToBrowse }: Props) {
  const [task, setTask] = useState<Task | null | undefined>(undefined) // undefined = loading
  const [submitting, setSubmitting] = useState(false)
  const [stats, setStats] = useState<SessionStats>({ confirmed: 0, flagged: 0, skipped: 0 })
  const [error, setError] = useState<string | null>(null)

  const fetchNext = useCallback(() => {
    setTask(undefined)
    setError(null)
    verifyFetch<{ task: Task | null }>('/verify?action=next_task')
      .then((data) => setTask(data.task))
      .catch(() => {
        setError('Failed to load next task')
        setTask(null)
      })
  }, [])

  useEffect(() => {
    fetchNext()
  }, [fetchNext])

  const handleVote = useCallback(
    async (vote: 1 | -1 | 0, correction?: FlagCorrection) => {
      if (!task) return
      setSubmitting(true)
      setError(null)

      // Optimistically update skip count (no server call for skip)
      if (vote === 0) {
        setStats((s) => ({ ...s, skipped: s.skipped + 1 }))
        setSubmitting(false)
        fetchNext()
        return
      }

      try {
        const result = await verifyFetch<{ ok: boolean; sessionStats: { confirmed: number; flagged: number } }>(
          '/verify',
          {
            method: 'POST',
            body: JSON.stringify({
              action: 'task_vote',
              entityId: task.entityId,
              fieldName: task.fieldName,
              originalValue: task.fieldValue,
              vote,
              errorType: correction?.errorType,
              correctedValue: correction?.correctedValue,
            }),
          },
        )
        setStats((s) => ({
          confirmed: result.sessionStats.confirmed,
          flagged: result.sessionStats.flagged,
          skipped: s.skipped,
        }))
        setSubmitting(false)
        fetchNext()
      } catch {
        setError('Submission failed. Try again.')
        setSubmitting(false)
      }
    },
    [task, fetchNext],
  )

  // Loading state
  if (task === undefined) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="font-mono text-[12px] text-[#aaa]">Loading...</p>
      </div>
    )
  }

  // All done
  if (task === null && !error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
        <p className="text-[28px] italic text-[#1a1a1a]" style={{ fontFamily: "'EB Garamond', Georgia, serif" }}>
          All caught up
        </p>
        <p className="font-mono text-[12px] text-[#888]">You've verified everything in the queue.</p>
        <StatLine stats={stats} />
        <button
          onClick={onSwitchToBrowse}
          className="mt-2 font-mono text-[11px] uppercase tracking-wider px-4 py-2 rounded border border-[#ccc] bg-white text-[#555] hover:border-[#999] cursor-pointer transition-colors"
        >
          Browse entities →
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-full py-12 px-6">
      {task && <VerifyTask task={task} onVote={handleVote} isSubmitting={submitting} />}

      {error && <p className="mt-4 font-mono text-[11px] text-red-500">{error}</p>}

      <div className="mt-8 flex items-center gap-4">
        <StatLine stats={stats} />
        <span className="text-[#ddd]">·</span>
        <button
          onClick={onSwitchToBrowse}
          className="font-mono text-[10px] uppercase tracking-wider text-[#aaa] hover:text-[#1a1a1a] cursor-pointer transition-colors"
        >
          Browse →
        </button>
      </div>
    </div>
  )
}

function StatLine({ stats }: { stats: SessionStats }) {
  const parts: string[] = []
  if (stats.confirmed > 0) parts.push(`${stats.confirmed} confirmed`)
  if (stats.flagged > 0) parts.push(`${stats.flagged} flagged`)
  if (stats.skipped > 0) parts.push(`${stats.skipped} skipped`)

  if (parts.length === 0) {
    return <span className="font-mono text-[11px] text-[#bbb]">No votes yet</span>
  }
  return <span className="font-mono text-[11px] text-[#888]">{parts.join(' · ')}</span>
}
