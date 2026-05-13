import { useState } from 'react'
import { CORRECTIONS_NOTICE } from '../shared/corrections-notice'

export function WelcomeOverlay() {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('welcomeDismissed') === '1')

  if (dismissed) return null

  const dismiss = () => {
    localStorage.setItem('welcomeDismissed', '1')
    setDismissed(true)
  }

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.35)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss()
      }}
    >
      <div
        className="bg-white rounded-xl px-8 py-7 max-w-[540px] w-[92%] shadow-2xl font-serif max-h-[calc(90vh-env(safe-area-inset-top)-env(safe-area-inset-bottom))] overflow-y-auto pb-8"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <a
          href="https://x.com/mapping_ai/status/2051334980144710112"
          target="_blank"
          rel="noopener noreferrer"
          className="block mb-4 p-2.5 bg-[#fffbeb] border border-[#fde68a] rounded-md text-center font-mono text-[10.5px] text-[#92400e] tracking-wide no-underline hover:bg-[#fef3c7] transition-colors"
        >
          Thanks for the love on our <span className="underline decoration-dotted underline-offset-2">launch</span>!
          283k+ views, 1.4k saves, 1.3k likes and counting
        </a>

        <h2 className="font-mono text-sm uppercase tracking-wider mb-4">Welcome to Mapping AI</h2>

        <p className="text-[14.5px] leading-relaxed text-[#1a1a1a] mb-4">
          Mapping AI is an open-source tool for exploring the U.S. AI policy landscape. It is under active development
          and may contain errors or incomplete data.
        </p>

        <div className="text-[13px] leading-relaxed text-[#555] mb-5 p-3 bg-[#f5f5f5] rounded-md">
          <p className="mb-2">
            Data is sourced from public records, user submissions, and LLM-assisted research. Where explicit statements
            are not available, beliefs may be inferred and do not claim to represent official positions.
          </p>
          <p>
            This tool is only as strong as its data. If you find it useful, please submit corrections, additions, and
            enrichments via our{' '}
            <a href="/contribute" className="text-[#2563eb] no-underline hover:underline">
              contribute form
            </a>{' '}
            or email{' '}
            <a href="mailto:info@mapping-ai.org" className="text-[#2563eb] no-underline hover:underline">
              info@mapping-ai.org
            </a>
            .
          </p>
        </div>

        <p className="text-[13.5px] leading-relaxed text-[#555] mb-5">
          We welcome discussion, bug reports, and feature requests via{' '}
          <a
            href="https://discord.gg/HtqceQRV3f"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#2563eb] no-underline hover:underline"
          >
            Discord
          </a>{' '}
          or{' '}
          <a
            href="https://github.com/MappingAI/mapping-ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#2563eb] no-underline hover:underline"
          >
            GitHub
          </a>
          . We're also open to ideas on collaborations or new directions for this resource.
        </p>

        <div className="text-[12px] leading-relaxed mb-5 p-3 bg-[#fef3c7] rounded-md text-[#92400e]">
          <strong className="text-[#78350f]">Update:</strong> {CORRECTIONS_NOTICE}
        </div>

        <button
          onClick={dismiss}
          className="font-mono text-[11px] uppercase tracking-wider px-6 py-2.5 bg-[#1a1a1a] text-white border-none rounded cursor-pointer hover:opacity-85 transition-opacity"
        >
          Got it
        </button>
      </div>
    </div>
  )
}
