import { useState } from 'react'
import { IS_IFRAME } from '../lib/iframe'

const DISMISSED_KEY = 'contributeInfoDismissed'

export function HowItWorks() {
  const [dismissed, setDismissed] = useState(
    () => IS_IFRAME || localStorage.getItem(DISMISSED_KEY) === '1',
  )

  if (dismissed) return null

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1')
    setDismissed(true)
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.35)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss()
      }}
    >
      <div className="bg-white rounded-xl px-8 py-7 max-w-[520px] w-[92%] shadow-2xl font-serif">
        <h2 className="font-mono text-sm uppercase tracking-wider mb-4">
          How Submissions Work
        </h2>
        <p className="text-[15px] leading-relaxed text-[#1a1a1a] mb-4">
          Your contribution helps build a comprehensive resource for
          understanding the AI policy landscape.
        </p>
        <div className="space-y-3 mb-5">
          <div className="text-[14px] leading-relaxed">
            <strong>Review:</strong> All submissions are manually reviewed by
            our team before appearing on the map.
          </div>
          <div className="text-[14px] leading-relaxed">
            <strong>Enrichment:</strong> We use AI-assisted research to verify
            and expand entries with additional context, affiliations, and public
            statements.
          </div>
          <div className="text-[14px] leading-relaxed">
            <strong>Belief Scores:</strong> Stance, timeline, and risk
            assessments are weighted averages. Self-submissions carry more
            weight than external observations.
          </div>
          <div className="text-[14px] leading-relaxed">
            <strong>Privacy:</strong> We only include publicly available
            information. You can request changes or removal anytime.
          </div>
        </div>
        <p className="text-[13px] leading-relaxed text-[#555] mb-5 p-3 bg-[#f5f5f5] rounded-md">
          This tool is in a pre-launch beta. We are actively improving data
          issues and enrichment, as well as adding new features and improving
          the UX. Please email us at{' '}
          <a href="mailto:info@mapping-ai.org" className="text-[#2563eb]">
            info@mapping-ai.org
          </a>{' '}
          if you&apos;d like to contribute or provide any feedback.
        </p>
        <button
          onClick={dismiss}
          className="font-mono text-[11px] uppercase tracking-wider px-6 py-2.5 bg-[#1a1a1a] text-white border-none rounded cursor-pointer"
        >
          Got it
        </button>
      </div>
    </div>
  )
}
