import { useState, useEffect, useRef, useCallback } from 'react'
import DOMPurify from 'dompurify'
import { verifyFetch } from './api'
import { CorrectionForm, type CorrectionPayload } from './CorrectionForm'
import { PERSON_FIELDS, ORG_FIELDS, type FieldDef } from './field-options'

interface Correction {
  id: number
  field_name: string | null
  error_type: string | null
  original_value: string | null
  corrected_value: string | null
  correction_note: string | null
  correction_note_html: string | null
  created_at: string
}

interface Review {
  verdict: string
  duration_ms: number | null
  revisions: number | null
  reviewed_at: string
}

interface EntityData {
  id: number
  name: string
  entity_type: string
  category: string | null
  primary_org: string | null
  other_orgs: string | null
  location: string | null
  title: string | null
  website: string | null
  twitter: string | null
  bluesky: string | null
  belief_regulatory_stance: string | null
  belief_agi_timeline: string | null
  belief_ai_risk: string | null
  belief_threat_models: string | null
  funding_model: string | null
  influence_type: string | null
  belief_evidence_source: string | null
  field_verification: Record<string, 'verified' | 'unverified'> | null
  notes: string | null
  notes_html: string | null
}

interface Props {
  entityId: number
  onReviewed: () => void
}

const BTN = 'font-mono text-[11px] uppercase tracking-wider px-3 py-1.5 rounded cursor-pointer border transition-colors'
const LABEL = 'font-mono text-[10px] uppercase tracking-wider text-[#888]'

function Timer({ running, elapsed }: { running: boolean; elapsed: number }) {
  const secs = Math.floor(elapsed / 1000)
  const mins = Math.floor(secs / 60)
  return (
    <span className={`font-mono text-[12px] tabular-nums ${running ? 'text-[#666]' : 'text-[#bbb]'}`}>
      {mins}:{String(secs % 60).padStart(2, '0')}
    </span>
  )
}

export function EntityReview({ entityId, onReviewed }: Props) {
  const [entity, setEntity] = useState<EntityData | null>(null)
  const [corrections, setCorrections] = useState<Correction[]>([])
  const [review, setReview] = useState<Review | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [activeCorrection, setActiveCorrection] = useState<{
    type: 'field' | 'notes'
    fieldName?: string
    originalValue: string
    existing?: Correction | null
  } | null>(null)
  const [correcting, setCorrectingField] = useState(false)

  // Timer
  const [timerRunning, setTimerRunning] = useState(true)
  const [timerElapsed, setTimerElapsed] = useState(0)
  const timerStartRef = useRef(Date.now())
  const accumulatedRef = useRef(0)

  useEffect(() => {
    setTimerRunning(true)
    setTimerElapsed(0)
    accumulatedRef.current = 0
    timerStartRef.current = Date.now()
  }, [entityId])

  useEffect(() => {
    if (!timerRunning) return undefined
    timerStartRef.current = Date.now()
    const interval = setInterval(() => {
      setTimerElapsed(accumulatedRef.current + (Date.now() - timerStartRef.current))
    }, 1000)
    return () => {
      accumulatedRef.current += Date.now() - timerStartRef.current
      clearInterval(interval)
    }
  }, [timerRunning])

  // Auto-pause on 2min inactivity
  useEffect(() => {
    let inactivity: ReturnType<typeof setTimeout>
    const reset = () => {
      clearTimeout(inactivity)
      if (!timerRunning) return
      inactivity = setTimeout(() => setTimerRunning(false), 120_000)
    }
    window.addEventListener('mousemove', reset)
    window.addEventListener('keydown', reset)
    window.addEventListener('click', reset)
    reset()
    return () => {
      clearTimeout(inactivity)
      window.removeEventListener('mousemove', reset)
      window.removeEventListener('keydown', reset)
      window.removeEventListener('click', reset)
    }
  }, [timerRunning])

  // Load entity
  useEffect(() => {
    setLoading(true)
    setError(null)
    verifyFetch<{
      entity: EntityData
      corrections: Correction[]
      review: Review | null
    }>(`/verify?action=entity&id=${entityId}`)
      .then((data) => {
        setEntity(data.entity)
        setCorrections(data.corrections)
        setReview(data.review)
      })
      .catch(() => setError('Failed to load entity'))
      .finally(() => setLoading(false))
  }, [entityId])

  const getCorrection = useCallback(
    (fieldName: string) => corrections.find((c) => c.field_name === fieldName) ?? null,
    [corrections],
  )

  const handleSubmitCorrection = async (payload: CorrectionPayload) => {
    if (!entity) return
    setCorrectingField(true)
    try {
      const existing = activeCorrection?.existing
      if (existing) {
        await verifyFetch('/verify', {
          method: 'POST',
          body: JSON.stringify({ action: 'update_correction', correctionId: existing.id, ...payload }),
        })
        setCorrections((prev) =>
          prev.map((c) =>
            c.id === existing.id
              ? {
                  ...c,
                  error_type: payload.errorType,
                  corrected_value: payload.correctedValue,
                  correction_note: payload.correctionNote,
                  correction_note_html: payload.correctionNoteHtml,
                }
              : c,
          ),
        )
      } else {
        const result = await verifyFetch<{ ok: boolean; id: number }>('/verify', {
          method: 'POST',
          body: JSON.stringify({ action: 'correction', entityId: entity.id, ...payload }),
        })
        const newCorrection: Correction = {
          id: result.id,
          field_name: payload.fieldName,
          error_type: payload.errorType,
          original_value: payload.originalValue,
          corrected_value: payload.correctedValue,
          correction_note: payload.correctionNote,
          correction_note_html: payload.correctionNoteHtml,
          created_at: new Date().toISOString(),
        }
        setCorrections((prev) => [...prev, newCorrection])
      }
      setActiveCorrection(null)
    } catch (err) {
      console.error('Failed to submit correction:', err)
      // keep form open so user can retry
    } finally {
      setCorrectingField(false)
    }
  }

  const handleDeleteCorrection = async (correctionId: number) => {
    const previous = corrections
    setCorrections((prev) => prev.filter((c) => c.id !== correctionId))
    try {
      await verifyFetch('/verify', {
        method: 'POST',
        body: JSON.stringify({ action: 'delete_correction', correctionId }),
      })
    } catch (err) {
      console.error('Failed to delete correction:', err)
      setCorrections(previous)
    }
  }

  const submitReview = useCallback(
    async (verdict: string) => {
      if (!entity || submitting) return
      const durationMs = accumulatedRef.current + (timerRunning ? Date.now() - timerStartRef.current : 0)
      setSubmitting(true)
      setSubmitError(null)
      try {
        await verifyFetch('/verify', {
          method: 'POST',
          body: JSON.stringify({ action: 'review', entityId: entity.id, verdict, durationMs }),
        })
        setReview({
          verdict,
          duration_ms: durationMs,
          revisions: review ? (review.revisions ?? 1) + 1 : 1,
          reviewed_at: new Date().toISOString(),
        })
        setTimerRunning(false)
        window.dispatchEvent(new CustomEvent('entity-reviewed', { detail: { entityId: entity.id, verdict } }))
        onReviewed()
      } catch {
        setSubmitError('Submission failed. Check connection and try again.')
      } finally {
        setSubmitting(false)
      }
    },
    [entity, submitting, timerRunning, review, onReviewed],
  )

  const handleMarkComplete = useCallback(() => {
    const flagCount = corrections.filter((c) => c.error_type && c.error_type !== 'CANT_VERIFY').length
    return submitReview(flagCount > 0 ? 'needs_correction' : 'confirmed')
  }, [corrections, submitReview])

  const handleCantVerify = useCallback(() => submitReview('flagged'), [submitReview])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="font-mono text-[12px] text-[#aaa]">Loading...</p>
      </div>
    )
  }
  if (error || !entity) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="font-mono text-[12px] text-red-400">{error ?? 'Entity not found'}</p>
      </div>
    )
  }

  const fields: FieldDef[] = entity.entity_type === 'person' ? PERSON_FIELDS : ORG_FIELDS
  const flagCount = corrections.filter((c) => c.error_type && c.error_type !== 'CANT_VERIFY').length
  const cantVerifyCount = corrections.filter((c) => c.error_type === 'CANT_VERIFY').length

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#999] bg-[#f0f0f0] px-1.5 py-0.5 rounded">
              {entity.entity_type}
            </span>
            {entity.category && <span className="font-mono text-[10px] text-[#999]">{entity.category}</span>}
          </div>
          <h1 className="text-2xl italic text-[#1a1a1a]" style={{ fontFamily: "'EB Garamond', Georgia, serif" }}>
            {entity.name}
          </h1>
          {entity.primary_org && <p className="font-mono text-[12px] text-[#888] mt-0.5">{entity.primary_org}</p>}
          {entity.website && (
            <a
              href={entity.website}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[11px] text-blue-600 hover:underline"
            >
              {entity.website} ↗
            </a>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <Timer running={timerRunning} elapsed={timerElapsed} />
            <button
              onClick={() => setTimerRunning((r) => !r)}
              className="font-mono text-[10px] text-[#888] hover:text-[#333] cursor-pointer"
            >
              {timerRunning ? 'pause' : 'resume'}
            </button>
            <button
              onClick={() => {
                setTimerElapsed(0)
                accumulatedRef.current = 0
                timerStartRef.current = Date.now()
                setTimerRunning(true)
              }}
              className="font-mono text-[10px] text-[#bbb] hover:text-[#666] cursor-pointer"
            >
              reset
            </button>
          </div>
          <a
            href={`/map?entity=${entity.id}`}
            target="_blank"
            rel="noopener"
            className="font-mono text-[10px] uppercase tracking-wider text-[#aaa] hover:text-[#1a1a1a] transition-colors no-underline"
          >
            View on map →
          </a>
        </div>
      </div>

      {/* Review badge */}
      {review && (
        <div
          className={`mb-4 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider px-2 py-0.5 rounded ${
            review.verdict === 'confirmed'
              ? 'bg-emerald-100 text-emerald-800'
              : review.verdict === 'needs_correction'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-[#f0f0f0] text-[#888]'
          }`}
        >
          <span>
            {review.verdict === 'confirmed'
              ? 'Confirmed'
              : review.verdict === 'needs_correction'
                ? 'Needs correction'
                : "Can't verify"}
          </span>
          {review.duration_ms && <span>· {Math.round(review.duration_ms / 1000)}s</span>}
          {review.revisions && review.revisions > 1 && <span>· {review.revisions} passes</span>}
        </div>
      )}

      {/* Progress summary */}
      {(flagCount > 0 || cantVerifyCount > 0) && (
        <p className="font-mono text-[11px] text-[#888] mb-4">
          {flagCount > 0 && <span className="text-amber-600">{flagCount} flagged</span>}
          {flagCount > 0 && cantVerifyCount > 0 && <span className="mx-1">·</span>}
          {cantVerifyCount > 0 && <span>{cantVerifyCount} can't verify</span>}
        </p>
      )}

      {/* Structured fields */}
      <section className="mb-8">
        <h2 className={`${LABEL} mb-3`}>Structured Fields</h2>
        <div className="space-y-2">
          {fields.map(({ key, label }) => {
            const rawValue = entity[key as keyof EntityData]
            const value = typeof rawValue === 'string' ? rawValue : null
            const correction = getCorrection(key)
            const isCorrected = !!correction

            return (
              <div
                key={key}
                className={`flex items-start gap-3 p-2 rounded border ${
                  isCorrected ? 'border-amber-300 bg-amber-50' : value ? 'border-[#eee]' : 'border-[#eee] bg-[#fafafa]'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <span className={LABEL}>{label}</span>
                  <div
                    className={`text-[13px] ${value ? 'text-[#1a1a1a]' : 'font-mono text-[#bbb] italic'}`}
                    style={value ? { fontFamily: "'EB Garamond', Georgia, serif" } : undefined}
                  >
                    {value || 'Not set'}
                  </div>
                  {correction?.corrected_value && (
                    <div className="font-mono text-[11px] text-amber-700 mt-0.5">→ {correction.corrected_value}</div>
                  )}
                  {correction?.error_type && (
                    <div className="font-mono text-[10px] text-[#aaa] mt-0.5">{correction.error_type}</div>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0 mt-1">
                  {isCorrected ? (
                    <>
                      <button
                        onClick={() =>
                          setActiveCorrection({
                            type: 'field',
                            fieldName: key,
                            originalValue: value ?? '(empty)',
                            existing: correction,
                          })
                        }
                        className="font-mono text-[10px] text-amber-600 uppercase hover:text-amber-800 cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCorrection(correction.id)}
                        className="font-mono text-[10px] text-[#bbb] hover:text-red-500 cursor-pointer ml-1"
                      >
                        Remove
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() =>
                          setActiveCorrection({
                            type: 'field',
                            fieldName: key,
                            originalValue: value ?? '(empty)',
                          })
                        }
                        className={`${BTN} text-[10px] bg-white ${
                          value
                            ? 'text-[#555] border-[#ccc] hover:border-red-400 hover:text-red-600'
                            : 'text-blue-600 border-blue-200 hover:border-blue-400'
                        }`}
                      >
                        {value ? 'Flag' : 'Set'}
                      </button>
                      {value && (
                        <button
                          onClick={() =>
                            handleSubmitCorrection({
                              fieldName: key,
                              errorType: 'CANT_VERIFY',
                              originalValue: value,
                              correctedValue: null,
                              correctionNote: null,
                              correctionNoteHtml: null,
                            })
                          }
                          className="font-mono text-[10px] text-[#aaa] hover:text-[#666] cursor-pointer"
                          title="No evidence to verify or refute this value"
                        >
                          Can't verify
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Notes */}
      {entity.notes && (
        <section className="mb-8">
          <h2 className={`${LABEL} mb-3`}>Notes</h2>
          <div className="p-3 rounded border border-[#eee]">
            {entity.notes_html ? (
              <div
                className="prose prose-sm max-w-none text-[13px]"
                style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(entity.notes_html) }}
              />
            ) : (
              <p className="text-[13px] text-[#333]" style={{ fontFamily: "'EB Garamond', Georgia, serif" }}>
                {entity.notes}
              </p>
            )}
            <div className="mt-2">
              {(() => {
                const noteCorrection = getCorrection('notes')
                return noteCorrection ? (
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-amber-600 uppercase">Flagged</span>
                    <button
                      onClick={() => handleDeleteCorrection(noteCorrection.id)}
                      className="font-mono text-[10px] text-[#bbb] hover:text-red-500 cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() =>
                      setActiveCorrection({
                        type: 'notes',
                        fieldName: 'notes',
                        originalValue: entity.notes ?? '',
                      })
                    }
                    className={`${BTN} text-[10px] bg-white text-[#555] border-[#ccc] hover:border-red-400 hover:text-red-600`}
                  >
                    Flag Notes
                  </button>
                )
              })()}
            </div>
          </div>
        </section>
      )}

      {/* Complete review */}
      <section className="mt-8 pt-6 border-t border-[#e0e0e0]">
        {!review ? (
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleMarkComplete}
              disabled={submitting}
              className={`${BTN} bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700`}
            >
              {submitting ? 'Submitting...' : 'Mark Complete'}
            </button>
            <button
              onClick={handleCantVerify}
              disabled={submitting}
              className={`${BTN} bg-white text-[#888] border-[#ccc] hover:border-[#999]`}
              title="Can't fully verify this entity (missing sources, out of domain)"
            >
              Can't verify
            </button>
            <span className="font-mono text-[10px] text-[#aaa]">
              {flagCount > 0 ? `${flagCount} correction${flagCount > 1 ? 's' : ''} flagged` : 'No corrections flagged'}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-emerald-600">
              Review submitted
              {review.duration_ms ? ` (${Math.round(review.duration_ms / 1000)}s total)` : ''}
              {review.revisions && review.revisions > 1 ? ` · ${review.revisions} passes` : ''}
            </span>
            <button
              onClick={handleMarkComplete}
              disabled={submitting}
              className={`${BTN} text-[10px] bg-white text-[#555] border-[#ccc] hover:border-[#999]`}
            >
              Update
            </button>
          </div>
        )}
        {submitError && <p className="mt-2 font-mono text-[11px] text-red-500">{submitError}</p>}
      </section>

      {/* Correction form modal */}
      {activeCorrection && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-[600px] w-full max-h-[80vh] overflow-y-auto p-6">
            <CorrectionForm
              correctionType={activeCorrection.type}
              fieldName={activeCorrection.fieldName}
              originalValue={activeCorrection.originalValue}
              fieldOptions={
                activeCorrection.type === 'field' && activeCorrection.fieldName
                  ? (fields.find((f) => f.key === activeCorrection.fieldName)?.options ?? [])
                  : []
              }
              isMultiSelect={
                activeCorrection.type === 'field' && activeCorrection.fieldName
                  ? !!fields.find((f) => f.key === activeCorrection.fieldName)?.multiSelect
                  : false
              }
              onSubmit={handleSubmitCorrection}
              onCancel={() => setActiveCorrection(null)}
              isSubmitting={correcting}
              existingCorrection={
                activeCorrection.existing
                  ? {
                      id: activeCorrection.existing.id,
                      error_type: activeCorrection.existing.error_type,
                      corrected_value: activeCorrection.existing.corrected_value,
                      correction_note: activeCorrection.existing.correction_note,
                      correction_note_html: activeCorrection.existing.correction_note_html,
                    }
                  : null
              }
            />
          </div>
        </div>
      )}
    </div>
  )
}
