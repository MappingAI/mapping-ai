import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { verifyFetch } from './App'
import { ClaimCard } from './ClaimCard'
import { EdgeCard } from './EdgeCard'
import { CorrectionForm } from './CorrectionForm'
import { FIELD_OPTIONS } from './field-options'

interface EntityData {
  entity: Record<string, unknown>
  claims: Array<Record<string, unknown>>
  edges: Array<Record<string, unknown>>
  corrections: Array<Record<string, unknown>>
  review: { verdict: string; notes: string; duration_ms: number | null } | null
}

interface Props {
  verifyKey: string
  entityId: number
  onReviewSubmitted?: () => void
}

const PERSON_FIELDS = [
  { key: 'category', label: 'Category' },
  { key: 'title', label: 'Title / Role' },
  { key: 'primary_org', label: 'Primary Organization' },
  { key: 'website', label: 'Website' },
  { key: 'location', label: 'Location' },
  { key: 'belief_regulatory_stance', label: 'Regulatory Stance' },
  { key: 'belief_agi_timeline', label: 'AGI Timeline' },
  { key: 'belief_ai_risk', label: 'AI Risk Level' },
  { key: 'belief_threat_models', label: 'Threat Models' },
  { key: 'belief_evidence_source', label: 'Evidence Source' },
  { key: 'other_categories', label: 'Other Categories' },
] as const

const ORG_FIELDS = [
  { key: 'category', label: 'Category' },
  { key: 'website', label: 'Website' },
  { key: 'location', label: 'Location' },
  { key: 'funding_model', label: 'Funding Model' },
  { key: 'belief_regulatory_stance', label: 'Regulatory Stance' },
  { key: 'belief_agi_timeline', label: 'AGI Timeline' },
  { key: 'belief_ai_risk', label: 'AI Risk Level' },
  { key: 'belief_threat_models', label: 'Threat Models' },
  { key: 'belief_evidence_source', label: 'Evidence Source' },
  { key: 'other_categories', label: 'Other Categories' },
] as const

const LABEL = 'font-mono text-[10px] uppercase tracking-wider text-[#888]'
const BTN = 'font-mono text-[11px] uppercase tracking-wider px-3 py-1.5 rounded cursor-pointer border transition-colors'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      onClick={handleCopy}
      className="font-mono text-[10px] text-[#999] hover:text-[#333] cursor-pointer ml-1"
      title="Copy to clipboard"
    >
      {copied ? 'copied' : 'copy'}
    </button>
  )
}

function Timer({ running, elapsed }: { running: boolean; elapsed: number }) {
  const secs = Math.floor(elapsed / 1000)
  const mins = Math.floor(secs / 60)
  const display = `${mins}:${String(secs % 60).padStart(2, '0')}`
  return (
    <span className={`font-mono text-[12px] tabular-nums ${running ? 'text-[#666]' : 'text-[#bbb]'}`}>{display}</span>
  )
}

export function EntityReview({ verifyKey, entityId, onReviewSubmitted }: Props) {
  const queryClient = useQueryClient()
  const [activeCorrection, setActiveCorrection] = useState<{
    type: 'field' | 'claim' | 'edge' | 'notes'
    fieldName?: string
    claimId?: string
    edgeId?: number
    originalValue?: string
    existingCorrection?: Record<string, unknown> | null
  } | null>(null)

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

  // Auto-pause on inactivity (2 minutes)
  useEffect(() => {
    let inactivityTimer: ReturnType<typeof setTimeout>
    const resetInactivity = () => {
      clearTimeout(inactivityTimer)
      if (!timerRunning) return
      inactivityTimer = setTimeout(() => setTimerRunning(false), 120000)
    }
    window.addEventListener('mousemove', resetInactivity)
    window.addEventListener('keydown', resetInactivity)
    window.addEventListener('click', resetInactivity)
    resetInactivity()
    return () => {
      clearTimeout(inactivityTimer)
      window.removeEventListener('mousemove', resetInactivity)
      window.removeEventListener('keydown', resetInactivity)
      window.removeEventListener('click', resetInactivity)
    }
  }, [timerRunning])

  const { data, isLoading } = useQuery({
    queryKey: ['verify-entity', entityId],
    queryFn: () => verifyFetch<EntityData>(`/verify?action=entity&id=${entityId}`, verifyKey),
  })

  const submitReview = useMutation({
    mutationFn: (args: { verdict: string; durationMs?: number }) =>
      verifyFetch('/verify', verifyKey, {
        method: 'POST',
        body: JSON.stringify({ action: 'review', entityId, ...args }),
      }),
    onSuccess: () => {
      setTimerRunning(false)
      queryClient.invalidateQueries({ queryKey: ['verify-entity', entityId] })
      queryClient.invalidateQueries({ queryKey: ['verify-queue'] })
      onReviewSubmitted?.()
    },
  })

  const submitCorrection = useMutation({
    mutationFn: (correction: Record<string, unknown>) =>
      verifyFetch('/verify', verifyKey, {
        method: 'POST',
        body: JSON.stringify({ action: 'correction', entityId, ...correction }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verify-entity', entityId] })
      setActiveCorrection(null)
    },
  })

  const deleteCorrection = useMutation({
    mutationFn: (correctionId: number) =>
      verifyFetch('/verify', verifyKey, {
        method: 'POST',
        body: JSON.stringify({ action: 'delete_correction', correctionId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verify-entity', entityId] })
    },
  })

  const handleMarkComplete = useCallback(() => {
    const durationMs = accumulatedRef.current + (timerRunning ? Date.now() - timerStartRef.current : 0)
    const correctionCount = (data?.corrections || []).filter(
      (c) => (c as Record<string, unknown>).correction_note !== 'Verified as correct',
    ).length
    const verdict = correctionCount > 0 ? 'needs_correction' : 'confirmed'
    submitReview.mutate({ verdict, durationMs })
  }, [data, submitReview, timerRunning])

  const handleFlagForReview = useCallback(() => {
    const durationMs = accumulatedRef.current + (timerRunning ? Date.now() - timerStartRef.current : 0)
    submitReview.mutate({ verdict: 'flagged', durationMs })
  }, [submitReview, timerRunning])

  if (isLoading || !data) {
    return <div className="p-8 font-mono text-[13px] text-[#888]">Loading entity...</div>
  }

  const { entity, claims, edges, review } = data
  const entityType = entity.entity_type as string
  const existingCorrections = data.corrections || []

  const fieldCorrections = existingCorrections.filter((c) => c.field_name)
  const claimCorrections = existingCorrections.filter((c) => c.claim_id)
  const edgeCorrections = existingCorrections.filter((c) => c.edge_id)

  const getFieldOptions = (fieldKey: string): readonly string[] => {
    if (fieldKey === 'category') {
      return entityType === 'organization' ? FIELD_OPTIONS.orgCategory : FIELD_OPTIONS.personCategory
    }
    if (fieldKey === 'other_categories') {
      return entityType === 'organization' ? FIELD_OPTIONS.orgCategory : FIELD_OPTIONS.personCategory
    }
    const map: Record<string, readonly string[]> = {
      belief_regulatory_stance: FIELD_OPTIONS.regulatoryStance,
      belief_agi_timeline: FIELD_OPTIONS.agiTimeline,
      belief_ai_risk: FIELD_OPTIONS.aiRisk,
      belief_threat_models: FIELD_OPTIONS.threatModels,
      belief_evidence_source: FIELD_OPTIONS.evidenceSources,
      funding_model: FIELD_OPTIONS.fundingModel,
    }
    return map[fieldKey] || []
  }

  const getCorrection = (fieldName: string) => fieldCorrections.find((c) => c.field_name === fieldName) || null
  const getClaimCorrection = (claimId: string) => claimCorrections.find((c) => c.claim_id === claimId) || null
  const hasCorrection = (fieldName: string) => !!getCorrection(fieldName)
  const hasClaimCorrection = (claimId: string) => !!getClaimCorrection(claimId)
  const hasEdgeCorrection = (edgeId: number) => edgeCorrections.some((c) => c.edge_id === edgeId)

  const correctionCount = existingCorrections.filter((c) => c.correction_note !== 'Verified as correct').length
  const verifiedCount = existingCorrections.filter((c) => c.correction_note === 'Verified as correct').length

  return (
    <div className="max-w-[900px] mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl mb-1" style={{ fontFamily: "'EB Garamond', Georgia, serif" }}>
              {entity.name as string}
            </h1>
            <div className="font-mono text-[12px] text-[#666] flex items-center gap-2 flex-wrap">
              <span>{entityType}</span>
              {entity.category ? (
                <>
                  <span className="text-[#ccc]">·</span>
                  <span>{String(entity.category)}</span>
                </>
              ) : null}
              {entity.primary_org ? (
                <>
                  <span className="text-[#ccc]">·</span>
                  <span>{String(entity.primary_org)}</span>
                </>
              ) : null}
              {entity.location ? (
                <>
                  <span className="text-[#ccc]">·</span>
                  <span>{String(entity.location)}</span>
                </>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Timer running={timerRunning} elapsed={timerElapsed} />
            <button
              onClick={() => setTimerRunning((r) => !r)}
              className="font-mono text-[10px] text-[#888] hover:text-[#333] cursor-pointer"
            >
              {timerRunning ? 'pause' : 'resume'}
            </button>
          </div>
        </div>
        {entity.website ? (
          <a
            href={String(entity.website)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[11px] text-blue-600 hover:underline"
          >
            {String(entity.website)} ↗
          </a>
        ) : null}

        {review && (
          <div
            className={`mt-2 inline-block font-mono text-[11px] uppercase tracking-wider px-2 py-0.5 rounded ${
              review.verdict === 'confirmed'
                ? 'bg-emerald-100 text-emerald-800'
                : review.verdict === 'needs_correction'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-red-100 text-red-800'
            }`}
          >
            Complete
            {review.duration_ms ? ` (${Math.round(review.duration_ms / 1000)}s)` : ''}
          </div>
        )}

        {/* Progress summary */}
        {(correctionCount > 0 || verifiedCount > 0) && (
          <div className="mt-2 font-mono text-[11px] text-[#666]">
            {verifiedCount > 0 && <span className="text-emerald-600">{verifiedCount} verified</span>}
            {verifiedCount > 0 && correctionCount > 0 && <span className="mx-1">·</span>}
            {correctionCount > 0 && <span className="text-amber-600">{correctionCount} flagged</span>}
          </div>
        )}
      </div>

      {/* Structured Fields - show ALL fields, even null ones */}
      <section className="mb-8">
        <h2 className={`${LABEL} mb-3`}>Structured Fields</h2>
        <div className="space-y-2">
          {(entityType === 'organization' ? ORG_FIELDS : PERSON_FIELDS).map(({ key, label }) => {
            const value = entity[key] as string | null
            const corrected = hasCorrection(key)
            return (
              <div
                key={key}
                className={`flex items-start gap-3 p-2 rounded border ${
                  corrected ? 'border-amber-300 bg-amber-50' : value ? 'border-[#eee]' : 'border-[#eee] bg-[#fafafa]'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <span className={LABEL}>{label}</span>
                  <div className={`font-mono text-[13px] ${value ? 'text-[#1a1a1a]' : 'text-[#bbb] italic'}`}>
                    {value || 'Not set'}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {corrected ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setActiveCorrection({
                            type: 'field',
                            fieldName: key,
                            originalValue: value || '(empty)',
                            existingCorrection: getCorrection(key),
                          })
                        }
                        className="font-mono text-[10px] text-amber-600 uppercase hover:text-amber-800 cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          const c = getCorrection(key)
                          if (c?.id) deleteCorrection.mutate(c.id as number)
                        }}
                        className="font-mono text-[10px] text-[#bbb] hover:text-red-600 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() =>
                          setActiveCorrection({
                            type: 'field',
                            fieldName: key,
                            originalValue: value || '(empty)',
                          })
                        }
                        className={`${BTN} text-[10px] bg-white ${value ? 'text-[#555] border-[#ccc] hover:border-red-400 hover:text-red-600' : 'text-blue-600 border-blue-300 hover:border-blue-500'}`}
                      >
                        {value ? 'Flag' : 'Set'}
                      </button>
                      {value ? (
                        <button
                          onClick={() =>
                            submitCorrection.mutate({
                              fieldName: key,
                              errorType: 'CANT_VERIFY',
                              originalValue: value,
                              correctionNote: 'Unable to verify this field',
                            })
                          }
                          className="font-mono text-[10px] text-[#aaa] hover:text-[#666] cursor-pointer"
                          title="No evidence to verify or refute this value"
                        >
                          Can't verify
                        </button>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Notes */}
      {entity.notes_html ? (
        <section className="mb-8">
          <h2 className={`${LABEL} mb-3`}>Notes</h2>
          <div className="p-3 rounded border border-[#eee]">
            <div className="flex justify-end mb-1">
              <CopyButton text={String(entity.notes || '')} />
            </div>
            <div
              className="prose prose-sm max-w-none text-[13px]"
              style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
              dangerouslySetInnerHTML={{ __html: String(entity.notes_html) }}
            />
            <div className="mt-2 flex gap-1">
              {existingCorrections.some((c) => c.field_name === 'notes') ? (
                <span className="font-mono text-[10px] text-amber-600 uppercase">Corrected</span>
              ) : (
                <button
                  onClick={() =>
                    setActiveCorrection({
                      type: 'notes',
                      fieldName: 'notes',
                      originalValue: (entity.notes as string) || '',
                    })
                  }
                  className={`${BTN} text-[10px] bg-white text-[#555] border-[#ccc] hover:border-red-400 hover:text-red-600`}
                >
                  Flag Notes
                </button>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {/* Claims */}
      <section className="mb-8">
        <h2 className={`${LABEL} mb-3`}>Claims {claims.length > 0 ? `(${claims.length})` : ''}</h2>
        {claims.length > 0 ? (
          <div className="space-y-3">
            {claims.map((claim) => (
              <ClaimCard
                key={claim.claim_id as string}
                claim={claim}
                hasCorrected={hasClaimCorrection(claim.claim_id as string)}
                onFlag={() =>
                  setActiveCorrection({
                    type: 'claim',
                    claimId: claim.claim_id as string,
                    originalValue: `${claim.belief_dimension}: ${claim.stance_label || claim.stance || '(null)'} (score: ${claim.stance_score ?? 'null'})`,
                  })
                }
                verifyKey={verifyKey}
                entityId={entityId}
              />
            ))}
          </div>
        ) : (
          <div className="p-3 rounded border border-[#eee] bg-[#fafafa] font-mono text-[12px] text-[#999] italic">
            No claims found. Belief fields above are derived from submissions, not sourced claims.
          </div>
        )}
      </section>

      {/* Edges */}
      <section className="mb-8">
        <h2 className={`${LABEL} mb-3`}>Edges {edges.length > 0 ? `(${edges.length})` : ''}</h2>
        {edges.length > 0 ? (
          <div className="space-y-2">
            {edges.map((edge) => (
              <EdgeCard
                key={edge.id as number}
                edge={edge}
                entityId={entityId}
                hasCorrected={hasEdgeCorrection(edge.id as number)}
                onFlag={() =>
                  setActiveCorrection({
                    type: 'edge',
                    edgeId: edge.id as number,
                    originalValue: `${edge.edge_type} → ${edge.other_name}`,
                  })
                }
                verifyKey={verifyKey}
              />
            ))}
          </div>
        ) : (
          <div className="p-3 rounded border border-[#eee] bg-[#fafafa] font-mono text-[12px] text-[#999] italic">
            No edges found for this entity.
          </div>
        )}
      </section>

      {/* Active Correction Form */}
      {activeCorrection && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-[600px] w-full max-h-[80vh] overflow-y-auto p-6">
            <CorrectionForm
              correctionType={activeCorrection.type}
              fieldName={activeCorrection.fieldName}
              claimId={activeCorrection.claimId}
              edgeId={activeCorrection.edgeId}
              originalValue={activeCorrection.originalValue || ''}
              fieldOptions={activeCorrection.fieldName ? getFieldOptions(activeCorrection.fieldName) : []}
              isMultiSelect={
                activeCorrection.fieldName === 'belief_threat_models' ||
                activeCorrection.fieldName === 'other_categories' ||
                activeCorrection.fieldName === 'funding_model'
              }
              maxTags={activeCorrection.fieldName === 'belief_threat_models' ? 3 : undefined}
              onSubmit={(correction) => submitCorrection.mutate(correction)}
              onCancel={() => setActiveCorrection(null)}
              isSubmitting={submitCorrection.isPending}
              existingCorrection={activeCorrection.existingCorrection}
            />
          </div>
        </div>
      )}

      {/* Complete Review */}
      <section className="mt-8 pt-6 border-t border-[#ddd]">
        {!review ? (
          <div className="flex items-center gap-3">
            <button
              onClick={handleMarkComplete}
              disabled={submitReview.isPending}
              className={`${BTN} bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700`}
            >
              {submitReview.isPending ? 'Submitting...' : 'Mark Complete'}
            </button>
            <button
              onClick={handleFlagForReview}
              disabled={submitReview.isPending}
              className={`${BTN} bg-white text-[#888] border-[#ccc] hover:border-[#999]`}
              title="Cannot fully verify this entity (missing sources, needs domain expertise)"
            >
              Can't verify
            </button>
            <span className="font-mono text-[10px] text-[#999]">
              {correctionCount > 0
                ? `${correctionCount} correction${correctionCount > 1 ? 's' : ''} will be submitted`
                : 'No corrections flagged'}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-emerald-600">
              Review submitted
              {review.duration_ms ? ` (${Math.round(review.duration_ms / 1000)}s)` : ''}
            </span>
            <button
              onClick={handleMarkComplete}
              disabled={submitReview.isPending}
              className={`${BTN} text-[10px] bg-white text-[#555] border-[#ccc] hover:border-[#999]`}
            >
              Update
            </button>
          </div>
        )}
        {submitReview.isError && (
          <p className="mt-2 font-mono text-[11px] text-red-600">Submission failed. Check connection and try again.</p>
        )}
      </section>
    </div>
  )
}
