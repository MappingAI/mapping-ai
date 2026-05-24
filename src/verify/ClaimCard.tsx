import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { verifyFetch } from './App'

const BTN = 'font-mono text-[11px] uppercase tracking-wider px-3 py-1.5 rounded cursor-pointer border transition-colors'
const LABEL = 'font-mono text-[10px] uppercase tracking-wider text-[#888]'

const DIMENSION_LABELS: Record<string, string> = {
  regulatory_stance: 'Regulatory Stance',
  agi_timeline: 'AGI Timeline',
  ai_risk_level: 'AI Risk Level',
  founded_year: 'Founded Year',
  end_year: 'End Year',
}

interface Props {
  claim: Record<string, unknown>
  hasCorrected: boolean
  onFlag: () => void
  verifyKey: string
  entityId: number
}

export function ClaimCard({ claim, hasCorrected, onFlag, verifyKey, entityId }: Props) {
  const queryClient = useQueryClient()
  const [sourceChecks, setSourceChecks] = useState({
    accessible: false,
    quoteFound: false,
    supported: false,
  })

  const markCorrect = useMutation({
    mutationFn: () =>
      verifyFetch('/verify', verifyKey, {
        method: 'POST',
        body: JSON.stringify({
          action: 'correction',
          entityId,
          claimId: claim.claim_id,
          sourceAccessible: sourceChecks.accessible,
          quoteFound: sourceChecks.quoteFound,
          conclusionSupported: sourceChecks.supported,
          correctedValue: null,
          errorType: null,
          correctionNote: 'Verified as correct',
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verify-entity', entityId] })
    },
  })

  const dimension = claim.belief_dimension as string
  const sourceUrl = claim.source_url as string | null
  const sourceTitle = claim.source_title as string | null
  const cachedExcerpt = claim.cached_excerpt as string | null
  const citation = claim.citation as string
  const confidence = claim.confidence as string | null

  return (
    <div className={`p-3 rounded border ${hasCorrected ? 'border-amber-300 bg-amber-50' : 'border-[#e0e0e0]'}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <span className={LABEL}>{DIMENSION_LABELS[dimension] || dimension}</span>
          <div className="font-mono text-[13px] text-[#1a1a1a]">
            {String(claim.stance_label || claim.stance || '(no stance)')}
            {claim.stance_score != null ? (
              <span className="text-[#888] ml-1">(score: {String(claim.stance_score)})</span>
            ) : null}
          </div>
        </div>
        {confidence && (
          <span
            className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
              confidence === 'high'
                ? 'bg-emerald-100 text-emerald-700'
                : confidence === 'medium'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-red-100 text-red-700'
            }`}
          >
            {confidence}
          </span>
        )}
      </div>

      {/* Citation */}
      <div className="mb-2 pl-3 border-l-2 border-[#ddd]">
        <p className="text-[13px] italic text-[#444]" style={{ fontFamily: "'EB Garamond', Georgia, serif" }}>
          "{citation}"
        </p>
        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[11px] text-blue-600 hover:underline mt-1 inline-block"
          >
            {sourceTitle || sourceUrl} ↗
          </a>
        )}
      </div>

      {/* Cached excerpt (collapsible) */}
      {cachedExcerpt && (
        <details className="mb-2">
          <summary className="font-mono text-[10px] text-[#888] cursor-pointer hover:text-[#555]">
            View source excerpt
          </summary>
          <div className="mt-1 p-2 bg-[#f8f8f8] rounded text-[12px] text-[#555] max-h-[200px] overflow-y-auto whitespace-pre-wrap">
            {cachedExcerpt}
          </div>
        </details>
      )}

      {/* Source verification checkboxes */}
      <div className="flex flex-wrap gap-3 mb-2">
        <label className="flex items-center gap-1 font-mono text-[11px] text-[#555] cursor-pointer">
          <input
            type="checkbox"
            checked={sourceChecks.accessible}
            onChange={(e) => setSourceChecks((s) => ({ ...s, accessible: e.target.checked }))}
            className="rounded"
          />
          Source accessible
        </label>
        <label className="flex items-center gap-1 font-mono text-[11px] text-[#555] cursor-pointer">
          <input
            type="checkbox"
            checked={sourceChecks.quoteFound}
            onChange={(e) => setSourceChecks((s) => ({ ...s, quoteFound: e.target.checked }))}
            className="rounded"
          />
          Quote found
        </label>
        <label className="flex items-center gap-1 font-mono text-[11px] text-[#555] cursor-pointer">
          <input
            type="checkbox"
            checked={sourceChecks.supported}
            onChange={(e) => setSourceChecks((s) => ({ ...s, supported: e.target.checked }))}
            className="rounded"
          />
          Conclusion supported
        </label>
      </div>

      {/* Actions */}
      <div className="flex gap-1">
        {hasCorrected ? (
          <span className="font-mono text-[10px] text-amber-600 uppercase">Correction submitted</span>
        ) : (
          <>
            <button
              onClick={() => markCorrect.mutate()}
              disabled={markCorrect.isPending}
              className={`${BTN} text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100`}
            >
              Correct
            </button>
            <button
              onClick={onFlag}
              className={`${BTN} text-[10px] bg-white text-[#555] border-[#ccc] hover:border-red-400 hover:text-red-600`}
            >
              Needs Correction
            </button>
          </>
        )}
      </div>
    </div>
  )
}
