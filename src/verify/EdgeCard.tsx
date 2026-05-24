import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { verifyFetch } from './App'

const BTN = 'font-mono text-[11px] uppercase tracking-wider px-3 py-1.5 rounded cursor-pointer border transition-colors'

interface EdgeEvidence {
  citation: string
  source_url?: string
  source_title?: string
  confidence?: string
  role_title?: string
}

interface Props {
  edge: Record<string, unknown>
  entityId: number
  hasCorrected: boolean
  onFlag: () => void
  verifyKey: string
}

export function EdgeCard({ edge, entityId, hasCorrected, onFlag, verifyKey }: Props) {
  const queryClient = useQueryClient()
  const isSource = (edge.source_id as number) === entityId
  const direction = isSource ? '→' : '←'
  const otherName = edge.other_name as string
  const edgeType = ((edge.edge_type as string) || '').replace(/_/g, ' ')
  const role = edge.role as string | null
  const evidence = edge.evidence as string | null
  const evidenceRecords = (edge.evidence_records as EdgeEvidence[]) || []

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
          edgeId: edge.id,
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

  return (
    <div className={`p-3 rounded border ${hasCorrected ? 'border-amber-300 bg-amber-50' : 'border-[#e0e0e0]'}`}>
      <div className="font-mono text-[13px] text-[#1a1a1a] mb-1">
        {direction} {otherName}
        <span className="text-[#888] ml-1">
          ({edgeType}
          {role ? `, ${role}` : ''})
        </span>
      </div>

      {/* Inline evidence text */}
      {evidence && (
        <div className="mb-2 pl-3 border-l-2 border-[#ddd]">
          <p className="text-[12px] text-[#333] leading-relaxed">"{evidence}"</p>
        </div>
      )}

      {/* Edge evidence records with source links */}
      {evidenceRecords.length > 0 && (
        <div className="space-y-2 mb-2">
          {evidenceRecords.map((ev, i) => (
            <div key={i} className="pl-3 border-l-2 border-[#ddd]">
              <p className="text-[12px] text-[#333] leading-relaxed">"{ev.citation}"</p>
              {ev.source_url && (
                <a
                  href={ev.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[11px] text-blue-600 hover:underline mt-0.5 inline-block"
                >
                  {ev.source_title || ev.source_url} ↗
                </a>
              )}
              {ev.confidence && (
                <span
                  className={`ml-2 font-mono text-[10px] px-1.5 py-0.5 rounded ${
                    ev.confidence === 'high'
                      ? 'bg-emerald-100 text-emerald-700'
                      : ev.confidence === 'medium'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700'
                  }`}
                >
                  {ev.confidence}
                </span>
              )}
            </div>
          ))}
        </div>
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
          Edge supported
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
