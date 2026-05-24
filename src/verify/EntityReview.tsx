import { useState } from 'react'
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
  review: { verdict: string; notes: string } | null
}

interface Props {
  verifyKey: string
  entityId: number
}

const STRUCTURED_FIELDS = [
  { key: 'category', label: 'Category' },
  { key: 'belief_regulatory_stance', label: 'Regulatory Stance' },
  { key: 'belief_agi_timeline', label: 'AGI Timeline' },
  { key: 'belief_ai_risk', label: 'AI Risk Level' },
  { key: 'belief_threat_models', label: 'Threat Models' },
  { key: 'belief_evidence_source', label: 'Evidence Source' },
  { key: 'funding_model', label: 'Funding Model' },
  { key: 'other_categories', label: 'Other Categories' },
] as const

const LABEL = 'font-mono text-[10px] uppercase tracking-wider text-[#888]'
const BTN = 'font-mono text-[11px] uppercase tracking-wider px-3 py-1.5 rounded cursor-pointer border transition-colors'

export function EntityReview({ verifyKey, entityId }: Props) {
  const queryClient = useQueryClient()
  const [activeCorrection, setActiveCorrection] = useState<{
    type: 'field' | 'claim' | 'edge' | 'notes'
    fieldName?: string
    claimId?: string
    edgeId?: number
    originalValue?: string
  } | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['verify-entity', entityId],
    queryFn: () => verifyFetch<EntityData>(`/verify?action=entity&id=${entityId}`, verifyKey),
  })

  const submitReview = useMutation({
    mutationFn: (args: { verdict: string; notes?: string }) =>
      verifyFetch('/verify', verifyKey, {
        method: 'POST',
        body: JSON.stringify({ action: 'review', entityId, ...args }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verify-entity', entityId] })
      queryClient.invalidateQueries({ queryKey: ['verify-queue'] })
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

  const hasCorrection = (fieldName: string) => fieldCorrections.some((c) => c.field_name === fieldName)
  const hasClaimCorrection = (claimId: string) => claimCorrections.some((c) => c.claim_id === claimId)
  const hasEdgeCorrection = (edgeId: number) => edgeCorrections.some((c) => c.edge_id === edgeId)

  return (
    <div className="max-w-[900px] mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
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
            {review.verdict.replace('_', ' ')}
          </div>
        )}
      </div>

      {/* Structured Fields */}
      <section className="mb-8">
        <h2 className={`${LABEL} mb-3`}>Structured Fields</h2>
        <div className="space-y-2">
          {STRUCTURED_FIELDS.map(({ key, label }) => {
            const value = entity[key] as string | null
            if (!value) return null
            const corrected = hasCorrection(key)
            return (
              <div
                key={key}
                className={`flex items-start gap-3 p-2 rounded border ${corrected ? 'border-amber-300 bg-amber-50' : 'border-[#eee]'}`}
              >
                <div className="flex-1 min-w-0">
                  <span className={LABEL}>{label}</span>
                  <div className="font-mono text-[13px] text-[#1a1a1a]">{value}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {corrected ? (
                    <span className="font-mono text-[10px] text-amber-600 uppercase">Corrected</span>
                  ) : (
                    <>
                      <button
                        onClick={() =>
                          setActiveCorrection({
                            type: 'field',
                            fieldName: key,
                            originalValue: value,
                          })
                        }
                        className={`${BTN} text-[10px] bg-white text-[#555] border-[#ccc] hover:border-red-400 hover:text-red-600`}
                      >
                        Flag
                      </button>
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
      {claims.length > 0 && (
        <section className="mb-8">
          <h2 className={`${LABEL} mb-3`}>Claims ({claims.length})</h2>
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
                    originalValue: `${claim.belief_dimension}: ${claim.stance_label || claim.stance} (score: ${claim.stance_score})`,
                  })
                }
                verifyKey={verifyKey}
                entityId={entityId}
              />
            ))}
          </div>
        </section>
      )}

      {/* Edges */}
      {edges.length > 0 && (
        <section className="mb-8">
          <h2 className={`${LABEL} mb-3`}>Edges ({edges.length})</h2>
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
              />
            ))}
          </div>
        </section>
      )}

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
            />
          </div>
        </div>
      )}

      {/* Review Verdict */}
      <section className="mt-8 pt-6 border-t border-[#ddd]">
        <h2 className={`${LABEL} mb-3`}>Submit Review</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => submitReview.mutate({ verdict: 'confirmed' })}
            disabled={submitReview.isPending}
            className={`${BTN} bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700`}
          >
            Confirmed
          </button>
          <button
            onClick={() => submitReview.mutate({ verdict: 'needs_correction' })}
            disabled={submitReview.isPending}
            className={`${BTN} bg-amber-600 text-white border-amber-600 hover:bg-amber-700`}
          >
            Needs Correction
          </button>
          <button
            onClick={() => submitReview.mutate({ verdict: 'flagged' })}
            disabled={submitReview.isPending}
            className={`${BTN} bg-red-600 text-white border-red-600 hover:bg-red-700`}
          >
            Flag for Review
          </button>
        </div>
        {submitReview.isPending && <p className="mt-2 font-mono text-[11px] text-[#888]">Submitting...</p>}
      </section>
    </div>
  )
}
