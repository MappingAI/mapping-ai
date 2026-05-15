import { useState } from 'react'
import { Navigation } from '../components/Navigation'
import { Footer } from '../components/Footer'

interface Step {
  title: string
  description: string
  tip?: string
  linkText?: string
  linkHref?: string
}

const EXPLORE_STEPS: Step[] = [
  {
    title: 'Open the interactive map',
    description:
      'The map shows hundreds of people, organizations, and resources that shape AI policy in the United States. Each dot represents a stakeholder, colored by their sector or role.',
    tip: 'On mobile, you will see a searchable directory instead of the full network visualization. You can browse by category, search by name, and tap any card to see details.',
    linkText: 'Open the map',
    linkHref: '/map',
  },
  {
    title: 'Search for anyone',
    description:
      'Type a name, organization, or topic into the search bar. The search understands related terms, so typing "safety" will also find alignment researchers and related organizations.',
    tip: 'Try searching for "OpenAI", "regulation", or a name you heard in the episode.',
  },
  {
    title: 'Click to explore connections',
    description:
      "Clicking any node on the map (or tapping a card on mobile) opens a detail panel showing that person or organization's profile: their role, affiliations, beliefs about AI regulation, and how they connect to others in the ecosystem.",
  },
  {
    title: 'Filter by category',
    description:
      'Use the colored category chips in the sidebar (or the filter bubbles on mobile) to focus on specific groups. For example, show only "Think Tank/Policy Org" to see the policy organizations, or "Frontier Lab" to see AI companies building the most advanced systems.',
  },
  {
    title: 'Compare beliefs',
    description:
      'Switch to the "Plot" view to see where stakeholders fall on key questions: How should AI be regulated? How soon will we have AGI (artificial general intelligence)? How risky is AI? Each dot is a person or organization, positioned by their stated or inferred beliefs.',
    tip: 'Not everyone has a position on every question. Entities without data on a particular dimension are excluded from that chart.',
  },
  {
    title: 'Explore AI definitions',
    description:
      'The "Beliefs" view shows how different stakeholders define AGI and what they think it means for the future. You can see clusters of similar definitions, search for specific people, and explore how views differ across sectors.',
  },
]

const CONTRIBUTE_STEPS: Step[] = [
  {
    title: 'Choose what to add',
    description:
      'You can add a person (like a policymaker, researcher, or executive), an organization (a company, think tank, or government agency), or a resource (a report, book, podcast, or article).',
    linkText: 'Open the contribute form',
    linkHref: '/contribute',
  },
  {
    title: 'Fill in what you know',
    description:
      'Start with a name and category. Then add whatever context you have: their title, organization, location, social media handles, and most importantly, a few sentences about why they matter to AI policy. You do not need to fill every field.',
    tip: 'The notes field is the most valuable part. Focus on what the person or organization has done, said, or funded that shapes how AI gets built or governed.',
  },
  {
    title: 'Set belief dimensions (if you have evidence)',
    description:
      'For people and organizations, you can indicate their position on AI regulation (from "Accelerate" to "Cautious"), their AGI timeline estimate, and their view of AI risk level. Only set these if you have evidence: a direct quote, testimony, or published position.',
  },
  {
    title: 'Submit and wait for review',
    description:
      'All submissions are reviewed by our team before appearing on the map. We verify information and may add additional context through our research process. Your contribution helps build a more complete picture of the landscape.',
  },
]

const INSIGHTS_STEPS: Step[] = [
  {
    title: 'Browse research findings',
    description:
      'The Insights page presents data-driven analysis of the AI policy landscape, including funding flows between organizations, cross-partisan convergence on regulation, network connectivity patterns, and outlier stance detection.',
    linkText: 'Open Insights',
    linkHref: '/insights',
  },
  {
    title: 'Interact with visualizations',
    description:
      'Charts and graphs are interactive. Hover over data points to see details, and look for tooltips that explain what each visualization shows. The data comes directly from the map database.',
  },
]

export function App() {
  const [expandedSection, setExpandedSection] = useState<string | null>('explore')

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  return (
    <>
      <Navigation />
      <main className="max-w-[720px] mx-auto px-6 pt-20 pb-16 max-[600px]:px-4 max-[600px]:pt-16">
        {/* Hero */}
        <div className="mb-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#888] mb-3">Getting Started</p>
          <h1
            className="text-[34px] font-normal italic leading-[1.2] mb-4 max-[600px]:text-[26px]"
            style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
          >
            How to Use Mapping AI
          </h1>
          <p
            className="text-[18px] text-[#555] leading-[1.55] max-[600px]:text-[16px]"
            style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
          >
            Mapping AI is a free, open-source tool that lets you explore who shapes AI policy in the United States. This
            guide walks you through the basics.
          </p>
        </div>

        {/* What is this tool */}
        <div className="mb-10 p-5 bg-[#f5f4f2] border border-[#e0dfdd] rounded-lg max-[600px]:p-4">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.1em] text-[#888] mb-3">What you will find</h2>
          <div className="grid grid-cols-3 gap-4 max-[600px]:grid-cols-1">
            <div className="text-center max-[600px]:text-left max-[600px]:flex max-[600px]:items-start max-[600px]:gap-3">
              <div className="text-2xl mb-2 max-[600px]:mb-0 max-[600px]:text-xl">👤</div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-[#888] mb-1">People</div>
                <p
                  className="text-[14px] leading-snug text-[#555]"
                  style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
                >
                  Executives, policymakers, researchers, investors, journalists, and advocates working on AI
                </p>
              </div>
            </div>
            <div className="text-center max-[600px]:text-left max-[600px]:flex max-[600px]:items-start max-[600px]:gap-3">
              <div className="text-2xl mb-2 max-[600px]:mb-0 max-[600px]:text-xl">🏢</div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-[#888] mb-1">Organizations</div>
                <p
                  className="text-[14px] leading-snug text-[#555]"
                  style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
                >
                  AI labs, think tanks, government agencies, nonprofits, investors, and media outlets
                </p>
              </div>
            </div>
            <div className="text-center max-[600px]:text-left max-[600px]:flex max-[600px]:items-start max-[600px]:gap-3">
              <div className="text-2xl mb-2 max-[600px]:mb-0 max-[600px]:text-xl">📄</div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-[#888] mb-1">Resources</div>
                <p
                  className="text-[14px] leading-snug text-[#555]"
                  style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
                >
                  Key reports, books, essays, podcasts, and articles that shape the AI policy conversation
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick start buttons */}
        <div className="flex flex-wrap gap-3 mb-10">
          <a
            href="/map"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1a1a1a] text-white rounded-md font-mono text-[12px] uppercase tracking-wider no-underline hover:bg-[#333] transition-colors"
          >
            Open the Map
          </a>
          <a
            href="/contribute"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2563eb] text-white rounded-md font-mono text-[12px] uppercase tracking-wider no-underline hover:bg-[#1d4ed8] transition-colors"
          >
            Contribute Data
          </a>
          <a
            href="/insights"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#f8f7f5] border border-[#bbb] text-[#1a1a1a] rounded-md font-mono text-[12px] uppercase tracking-wider no-underline hover:border-[#555] transition-colors"
          >
            View Insights
          </a>
        </div>

        {/* Step-by-step sections */}
        <WalkthroughSection
          id="explore"
          number="1"
          title="Explore the Map"
          subtitle="Browse stakeholders, search by name, and discover connections"
          steps={EXPLORE_STEPS}
          expanded={expandedSection === 'explore'}
          onToggle={() => toggleSection('explore')}
        />

        <WalkthroughSection
          id="contribute"
          number="2"
          title="Contribute Data"
          subtitle="Add people, organizations, or resources you know about"
          steps={CONTRIBUTE_STEPS}
          expanded={expandedSection === 'contribute'}
          onToggle={() => toggleSection('contribute')}
        />

        <WalkthroughSection
          id="insights"
          number="3"
          title="Explore Research Insights"
          subtitle="See data-driven analysis of the AI policy landscape"
          steps={INSIGHTS_STEPS}
          expanded={expandedSection === 'insights'}
          onToggle={() => toggleSection('insights')}
        />

        {/* Glossary */}
        <div className="mt-12 mb-10">
          <h2 className="font-mono text-[13px] font-medium uppercase tracking-[0.14em] text-[#1a1a1a] mb-4 pb-2 border-b border-[#ddd]">
            Key Terms
          </h2>
          <div className="space-y-4">
            <GlossaryTerm
              term="Regulatory stance"
              definition='Where someone falls on AI regulation, from "Accelerate" (minimal regulation, let companies move fast) to "Cautious" (strong regulation, slow down development). Most stakeholders fall somewhere in the middle.'
            />
            <GlossaryTerm
              term="AGI timeline"
              definition="How soon someone thinks we will have artificial general intelligence (AI that can do anything a human can do). Estimates range from under 2 years to 20+ years or never."
            />
            <GlossaryTerm
              term="AI risk level"
              definition='How dangerous someone thinks advanced AI could be, from "Minimal" (not a significant threat) to "Existential" (could threaten human civilization).'
            />
            <GlossaryTerm
              term="Frontier lab"
              definition="Companies building the most advanced AI systems, like OpenAI, Anthropic, Google DeepMind, Meta AI, and xAI."
            />
            <GlossaryTerm
              term="Think tank / Policy org"
              definition="Organizations that research policy questions and make recommendations to lawmakers. Examples: Brookings Institution, RAND Corporation, Institute for AI Policy and Strategy."
            />
            <GlossaryTerm
              term="Edges / Connections"
              definition="Lines on the map showing relationships between entities, like employment, funding, advisory roles, or co-authorship."
            />
          </div>
        </div>

        {/* FAQ */}
        <div className="mb-10">
          <h2 className="font-mono text-[13px] font-medium uppercase tracking-[0.14em] text-[#1a1a1a] mb-4 pb-2 border-b border-[#ddd]">
            Common Questions
          </h2>
          <div className="space-y-4">
            <FAQ
              question="Where does the data come from?"
              answer="Data is sourced from public records, community submissions through our contribute form, and AI-assisted research. All entries are reviewed by our team before appearing on the map. Where explicit public statements are not available, beliefs may be inferred and are labeled as such."
            />
            <FAQ
              question="Can I add someone to the map?"
              answer="Yes! Anyone can submit entries through the contribute form. You can add a person, organization, or resource. Submissions go through a review process before appearing on the map. You do not need to fill out every field."
            />
            <FAQ
              question="I found an error. How do I fix it?"
              answer="Search for the entity on the contribute form and submit a correction. You can also click any entity on the map and use the vote buttons to flag incorrect information, or leave a correction note."
            />
            <FAQ
              question="Is this tool free?"
              answer="Yes. Mapping AI is free to use and open source. The code is on GitHub and anyone can contribute."
            />
            <FAQ
              question="What does the map look like on mobile?"
              answer="On phones, the map appears as a searchable card directory rather than the full network visualization. You can browse by category, filter by beliefs, search by name, and tap any card to see full details and a mini connection graph."
            />
            <FAQ
              question="I want to host a Mapping Party in my community. How?"
              answer="We have a full hosting guide with everything you need: agenda templates, preparation checklists, and contribution stream assignments."
            />
          </div>
        </div>

        {/* CTA */}
        <div className="p-6 bg-[#f0eeeb] border border-[#ddd] rounded-lg text-center mb-12 max-[600px]:p-4">
          <h2
            className="text-[22px] font-normal italic mb-3 max-[600px]:text-[18px]"
            style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
          >
            Ready to explore?
          </h2>
          <p
            className="text-[15px] text-[#555] mb-5 max-[600px]:text-[14px]"
            style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
          >
            The map is free, open-source, and always growing. Jump in and see who shapes AI policy.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href="/map"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#1a1a1a] text-white rounded-md font-mono text-[12px] uppercase tracking-wider no-underline hover:bg-[#333] transition-colors"
            >
              Open the Map
            </a>
            <a
              href="/workshop/mapping-party"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#f8f7f5] border border-[#bbb] text-[#1a1a1a] rounded-md font-mono text-[12px] uppercase tracking-wider no-underline hover:border-[#555] transition-colors"
            >
              Host a Mapping Party
            </a>
          </div>
        </div>

        <Footer />
      </main>
    </>
  )
}

function WalkthroughSection({
  id,
  number,
  title,
  subtitle,
  steps,
  expanded,
  onToggle,
}: {
  id: string
  number: string
  title: string
  subtitle: string
  steps: Step[]
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div className="mb-6" id={id}>
      <button
        onClick={onToggle}
        className="w-full text-left p-5 bg-white border border-[#e0dfdd] rounded-lg cursor-pointer hover:border-[#bbb] transition-colors max-[600px]:p-4"
        style={{ background: expanded ? '#fff' : '#fafaf9' }}
      >
        <div className="flex items-start gap-4">
          <span className="font-mono text-[20px] font-medium text-[#2563eb] leading-none mt-0.5 max-[600px]:text-[18px]">
            {number}
          </span>
          <div className="flex-1">
            <h2
              className="text-[20px] font-medium mb-1 max-[600px]:text-[17px]"
              style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
            >
              {title}
            </h2>
            <p
              className="text-[14px] text-[#888] m-0 max-[600px]:text-[13px]"
              style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
            >
              {subtitle}
            </p>
          </div>
          <span className="font-mono text-[14px] text-[#888] mt-1 shrink-0">{expanded ? '−' : '+'}</span>
        </div>
      </button>

      {expanded && (
        <div className="border border-t-0 border-[#e0dfdd] rounded-b-lg overflow-hidden">
          {steps.map((step, i) => (
            <div key={i} className="p-5 border-b border-[#f0f0f0] last:border-b-0 max-[600px]:p-4">
              <div className="flex items-start gap-3">
                <span className="font-mono text-[11px] text-[#2563eb] bg-[#eff6ff] rounded-full w-6 h-6 flex items-center justify-center shrink-0 mt-0.5">
                  {String.fromCharCode(97 + i)}
                </span>
                <div className="flex-1">
                  <h3 className="font-mono text-[12px] font-medium uppercase tracking-wider text-[#1a1a1a] mb-2">
                    {step.title}
                  </h3>
                  <p
                    className="text-[15px] leading-relaxed text-[#555] mb-0 max-[600px]:text-[14px]"
                    style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
                  >
                    {step.description}
                  </p>
                  {step.tip && (
                    <div className="mt-3 p-3 bg-[#fffbeb] border border-[#fde68a] rounded text-[13px] leading-relaxed text-[#92400e] max-[600px]:text-[12px]">
                      <strong className="text-[#78350f]">Tip:</strong> {step.tip}
                    </div>
                  )}
                  {step.linkText && step.linkHref && (
                    <a
                      href={step.linkHref}
                      className="inline-flex items-center gap-1 mt-3 font-mono text-[11px] uppercase tracking-wider text-[#2563eb] no-underline hover:text-[#1d4ed8]"
                    >
                      {step.linkText} →
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function GlossaryTerm({ term, definition }: { term: string; definition: string }) {
  return (
    <div className="flex gap-4 max-[600px]:flex-col max-[600px]:gap-1">
      <dt className="font-mono text-[12px] font-medium uppercase tracking-wider text-[#1a1a1a] w-[160px] shrink-0 pt-0.5 max-[600px]:w-auto">
        {term}
      </dt>
      <dd
        className="text-[14px] leading-relaxed text-[#555] m-0"
        style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
      >
        {definition}
      </dd>
    </div>
  )
}

function FAQ({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-[#e0dfdd] rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left px-4 py-3 bg-white cursor-pointer hover:bg-[#fafaf9] transition-colors flex items-center justify-between gap-4"
      >
        <span
          className="text-[15px] font-medium text-[#1a1a1a] max-[600px]:text-[14px]"
          style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
        >
          {question}
        </span>
        <span className="font-mono text-[14px] text-[#888] shrink-0">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="px-4 pb-3 pt-0">
          <p
            className="text-[14px] leading-relaxed text-[#555] m-0 max-[600px]:text-[13px]"
            style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
          >
            {answer}
          </p>
        </div>
      )}
    </div>
  )
}
