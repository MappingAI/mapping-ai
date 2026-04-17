import React, { useState, useRef, useCallback } from 'react'
import { searchEntities } from '../lib/api'
import type { FormType } from './ContributeForm'

interface ExampleSubmissionProps {
  activeTab: FormType
}

const TYPE_LABELS: Record<string, string> = {
  person: 'Person',
  organization: 'Organization',
  resource: 'Resource',
}

/** Hoverable @mention with a tooltip card that enriches from the search API. */
const Mention = ({ name, type }: { name: string; type: string }) => {
  const [show, setShow] = useState(false)
  const [detail, setDetail] = useState<string | null>(null)
  const fetchedRef = useRef(false)

  const handleEnter = useCallback(() => {
    setShow(true)
    if (fetchedRef.current) return
    fetchedRef.current = true
    searchEntities(name, type).then((results) => {
      const match = results[0]
      if (match) {
        const parts = [match.category, match.title, match.primary_org ? `at ${match.primary_org}` : ''].filter(Boolean)
        if (parts.length > 0) setDetail(parts.join(' \u00b7 '))
      }
    }).catch(() => {})
  }, [name, type])

  return (
    <span
      className="relative inline-block bg-[#e8f0fe] rounded px-0.5 text-[#2563eb] font-medium cursor-pointer hover:bg-[#d0e2fc]"
      onMouseEnter={handleEnter}
      onMouseLeave={() => setShow(false)}
    >
      @{name}
      {show && (
        <span className="absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 bg-white text-[#1a1a1a] font-mono text-[10px] font-normal leading-snug p-[0.5rem_0.7rem] rounded border border-[#ddd] shadow-[0_4px_12px_rgba(0,0,0,0.08)] min-w-[180px] max-w-[260px] z-[100] pointer-events-none whitespace-normal normal-case tracking-normal">
          <strong className="block">{name}</strong>
          <span className="text-[#666]">{detail ?? TYPE_LABELS[type] ?? type}</span>
          {/* Arrow */}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-[#ddd]" />
        </span>
      )}
    </span>
  )
}

function PersonExample() {
  return (
    <div className="text-[13px] font-serif leading-relaxed space-y-1">
      <div><strong className="font-mono text-[11px] uppercase text-[#555]">Name:</strong> Dario Amodei</div>
      <div><strong className="font-mono text-[11px] uppercase text-[#555]">Role:</strong> Executive</div>
      <div><strong className="font-mono text-[11px] uppercase text-[#555]">Title:</strong> CEO, Anthropic</div>
      <div><strong className="font-mono text-[11px] uppercase text-[#555]">Primary org:</strong> Anthropic</div>
      <div><strong className="font-mono text-[11px] uppercase text-[#555]">Location:</strong> San Francisco, CA</div>
      <div><strong className="font-mono text-[11px] uppercase text-[#555]">Regulatory stance:</strong> Moderate</div>
      <div><strong className="font-mono text-[11px] uppercase text-[#555]">AGI timeline:</strong> Within 2-3 years</div>
      <div><strong className="font-mono text-[11px] uppercase text-[#555]">AI risk level:</strong> Potentially catastrophic</div>
      <div><strong className="font-mono text-[11px] uppercase text-[#555]">Key concerns:</strong> Concentration of power, Weapons proliferation, Loss of human control</div>
      <div><strong className="font-mono text-[11px] uppercase text-[#555]">Influence type:</strong> Decision-maker, Builder, Narrator</div>
      <div><strong className="font-mono text-[11px] uppercase text-[#555]">Twitter/X:</strong> @DarioAmodei</div>
      <div>
        <strong className="font-mono text-[11px] uppercase text-[#555]">Notes:</strong>{' '}
        Co-founded <Mention name="Anthropic" type="organization" /> after leaving{' '}
        <Mention name="OpenAI" type="organization" /> over safety disagreements. Published{' '}
        <Mention name="Machines of Loving Grace" type="resource" /> (Oct 2024). Close collaborator with{' '}
        <Mention name="Daniela Amodei" type="person" />. Advocates for &ldquo;responsible scaling&rdquo; rather than pausing.
      </div>
    </div>
  )
}

function OrganizationExample() {
  return (
    <div className="text-[13px] font-serif leading-relaxed space-y-1">
      <div><strong className="font-mono text-[11px] uppercase text-[#555]">Name:</strong> Anthropic</div>
      <div><strong className="font-mono text-[11px] uppercase text-[#555]">Category:</strong> Frontier Lab</div>
      <div><strong className="font-mono text-[11px] uppercase text-[#555]">Website:</strong> https://anthropic.com</div>
      <div><strong className="font-mono text-[11px] uppercase text-[#555]">Location:</strong> San Francisco, CA</div>
      <div><strong className="font-mono text-[11px] uppercase text-[#555]">Funding model:</strong> Mixed (commercial + philanthropic)</div>
      <div><strong className="font-mono text-[11px] uppercase text-[#555]">Regulatory stance:</strong> Moderate</div>
      <div>
        <strong className="font-mono text-[11px] uppercase text-[#555]">Notes:</strong>{' '}
        Public benefit corporation founded by <Mention name="Dario Amodei" type="person" /> and{' '}
        <Mention name="Daniela Amodei" type="person" />. Pioneered &ldquo;responsible scaling policy&rdquo; framework. Competes directly with{' '}
        <Mention name="OpenAI" type="organization" /> and <Mention name="Google DeepMind" type="organization" />.
      </div>
    </div>
  )
}

function ResourceExample() {
  return (
    <div className="text-[13px] font-serif leading-relaxed space-y-1">
      <div><strong className="font-mono text-[11px] uppercase text-[#555]">Title:</strong> Situational Awareness</div>
      <div><strong className="font-mono text-[11px] uppercase text-[#555]">Author:</strong> Leopold Aschenbrenner</div>
      <div><strong className="font-mono text-[11px] uppercase text-[#555]">Type:</strong> Essay</div>
      <div><strong className="font-mono text-[11px] uppercase text-[#555]">URL:</strong> https://situational-awareness.ai</div>
      <div><strong className="font-mono text-[11px] uppercase text-[#555]">Year:</strong> 2024</div>
      <div><strong className="font-mono text-[11px] uppercase text-[#555]">Key argument:</strong> AGI is likely by 2027, superintelligence by end of decade. The US needs to treat frontier AI as a national security priority.</div>
      <div>
        <strong className="font-mono text-[11px] uppercase text-[#555]">Notes:</strong>{' '}
        Written by former <Mention name="OpenAI" type="organization" /> researcher{' '}
        <Mention name="Leopold Aschenbrenner" type="person" />. Widely circulated in Silicon Valley and DC policy circles. Influenced thinking of{' '}
        <Mention name="Dario Amodei" type="person" /> and others.
      </div>
    </div>
  )
}

const EXAMPLES: Record<FormType, { component: () => React.ReactNode }> = {
  person: { component: PersonExample },
  organization: { component: OrganizationExample },
  resource: { component: ResourceExample },
}

export function ExampleSubmission({ activeTab }: ExampleSubmissionProps) {
  const { component: ExampleComponent } = EXAMPLES[activeTab]

  return (
    <details className="mb-4 border border-[#eee] rounded">
      <summary className="px-4 py-2.5 font-mono text-[12px] text-[#888] cursor-pointer hover:text-[#1a1a1a] select-none">
        See example submission
      </summary>
      <div className="px-4 py-3 border-t border-[#eee] bg-[#fafafa]">
        <ExampleComponent />
      </div>
    </details>
  )
}
