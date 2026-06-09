import { useEffect, useRef, useState, useCallback } from 'react'
import { Navigation } from '../components/Navigation'
import { Footer } from '../components/Footer'
import { WelcomeOverlay } from '../components/WelcomeOverlay'

/* ---------- Table of Contents sidebar ---------- */
const TOC_SECTIONS = [
  { id: 'data-collection', label: 'Data Collection' },
  { id: 'database', label: 'Database' },
  { id: 'submissions', label: 'Submissions' },
  { id: 'verification', label: 'Verification' },
  { id: 'scoring', label: 'Scoring' },
  { id: 'agi-definitions', label: 'AGI Definitions' },
  { id: 'visualization', label: 'Visualization' },
  { id: 'apis', label: 'Services' },
  { id: 'roadmap', label: 'Roadmap' },
]

function TableOfContents({ activeId }: { activeId: string }) {
  const handleClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault()
    const el = document.getElementById(id)
    if (!el) return
    const targetY = el.getBoundingClientRect().top + window.scrollY - 64
    window.scrollTo({ top: targetY, behavior: 'smooth' })
  }, [])

  return (
    <nav
      className="hidden min-[1200px]:block fixed top-1/2 -translate-y-1/2 w-[130px]"
      style={{ left: 'calc(50% - 340px - 3rem - 130px)' }}
    >
      {TOC_SECTIONS.map(({ id, label }) => (
        <a
          key={id}
          href={`#${id}`}
          onClick={(e) => handleClick(e, id)}
          className={`block font-mono text-[11px] tracking-[0.07em] uppercase no-underline py-[0.45rem] pl-[0.65rem] border-l leading-[1.4] transition-colors duration-150 ${
            activeId === id
              ? 'text-text-primary border-text-primary'
              : 'text-text-tertiary border-transparent hover:text-text-secondary'
          }`}
        >
          {label}
        </a>
      ))}
    </nav>
  )
}

/* ---------- Fade-in on scroll ---------- */
function FadeIn({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]: IntersectionObserverEntry[]) => {
        if (entry?.isIntersecting) {
          setVisible(true)
          observer.unobserve(el)
        }
      },
      { threshold: 0.1 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`transition-all duration-500 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
      } ${className}`}
    >
      {children}
    </div>
  )
}

/* ---------- Section heading ---------- */
function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <FadeIn>
      <div
        id={id}
        className="font-mono text-[13px] font-medium tracking-[0.14em] uppercase text-text-secondary mb-3 scroll-mt-16 mt-10 first:mt-0"
      >
        {children}
      </div>
    </FadeIn>
  )
}

/* ---------- Belief scale visualization ---------- */
const BELIEF_SCALES = [
  {
    label: 'Regulatory stance',

    items: [
      { score: 1, name: 'Accelerate', tip: 'Remove barriers to AI development' },
      { score: 2, name: 'Light-touch', tip: 'Minimal, voluntary guidelines' },
      { score: 3, name: 'Targeted', tip: 'Regulate specific high-risk uses' },
      { score: 4, name: 'Moderate', tip: 'Balanced mandatory and voluntary measures' },
      { score: 5, name: 'Restrictive', tip: 'Broad mandatory requirements' },
      { score: 6, name: 'Precautionary', tip: 'Default to restriction unless proven safe' },
      { score: 7, name: 'Nationalize', tip: 'Public ownership of frontier AI' },
    ],
  },
  {
    label: 'AGI timeline',

    items: [
      { score: 1, name: 'Already here', tip: 'AGI capabilities exist today' },
      { score: 2, name: '2–3 years', tip: 'By ~2028' },
      { score: 3, name: '5–10 years', tip: 'By ~2031–2036' },
      { score: 4, name: '10–25 years', tip: 'By ~2036–2051' },
      { score: 5, name: '25+ / never', tip: 'Decades away or conceptually incoherent' },
    ],
  },
  {
    label: 'AI risk level',

    items: [
      { score: 1, name: 'Overstated', tip: 'Risks are exaggerated relative to benefits' },
      { score: 2, name: 'Manageable', tip: 'Real but addressable with existing tools' },
      { score: 3, name: 'Serious', tip: 'Significant harm likely without intervention' },
      { score: 4, name: 'Catastrophic', tip: 'Could cause irreversible large-scale harm' },
      { score: 5, name: 'Existential', tip: 'Threatens human survival or autonomy' },
    ],
  },
] as const

function BeliefScales() {
  const [hover, setHover] = useState<{ scale: number; item: number } | null>(null)

  return (
    <div className="space-y-5 my-6">
      {BELIEF_SCALES.map((scale, si) => (
        <div key={scale.label} className="pb-10">
          <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-text-tertiary mb-2">{scale.label}</div>
          <div className="flex gap-0">
            {scale.items.map((item, ii) => {
              const isHovered = hover?.scale === si && hover?.item === ii
              const frac = ii / (scale.items.length - 1)
              return (
                <div
                  key={item.score}
                  className="flex-1 relative cursor-default"
                  onMouseEnter={() => setHover({ scale: si, item: ii })}
                  onMouseLeave={() => setHover(null)}
                >
                  <div
                    className={`h-[28px] flex items-center justify-center font-mono text-[10px] transition-all duration-100 ${
                      ii === 0 ? 'rounded-l-md' : ''
                    } ${ii === scale.items.length - 1 ? 'rounded-r-md' : ''} ${
                      isHovered ? 'ring-1 ring-text-primary z-10 scale-[1.04]' : ''
                    }`}
                    style={{
                      opacity: isHovered ? 1 : 0.8,
                      background:
                        si === 0
                          ? `rgb(${Math.round(240 - frac * 176)}, ${Math.round(192 - frac * 144)}, ${Math.round(80 - frac * 64)})`
                          : si === 1
                            ? `rgb(${Math.round(198 - frac * 190)}, ${Math.round(219 - frac * 138)}, ${Math.round(239 - frac * 83)})`
                            : `rgb(${Math.round(254 - frac * 101)}, ${Math.round(224 - frac * 224)}, ${Math.round(210 - frac * 197)})`,
                      color: frac > 0.5 ? 'white' : '#1a1a1a',
                    }}
                  >
                    {item.score}
                  </div>
                  {isHovered && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 bg-white border border-[#bbb] rounded px-2.5 py-1.5 shadow-sm z-20 whitespace-nowrap pointer-events-none">
                      <div className="font-serif text-[13px] font-medium text-text-primary">{item.name}</div>
                      <div className="font-mono text-[10px] text-text-secondary mt-0.5">{item.tip}</div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="flex justify-between font-mono text-[9px] text-text-tertiary mt-1 px-0.5">
            <span>{scale.items[0]!.name}</span>
            <span>{scale.items[scale.items.length - 1]!.name}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ---------- Crosspartisan scale ---------- */
const CROSS_ITEMS = [
  { score: -2, label: 'Strongly oppose', color: '#dc2626' },
  { score: -1, label: 'Oppose', color: '#f87171' },
  { score: 0, label: 'Neutral', color: '#d4d4d4' },
  { score: 1, label: 'Support', color: '#86efac' },
  { score: 2, label: 'Strongly support', color: '#22c55e' },
] as const

function CrosspartisanScale() {
  const [hovered, setHovered] = useState<number | null>(null)
  return (
    <div className="my-5 pb-10">
      <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-text-tertiary mb-2">
        Policy mechanism stance (crosspartisan claims)
      </div>
      <div className="flex gap-0">
        {CROSS_ITEMS.map((item, i) => {
          const isHovered = hovered === i
          return (
            <div
              key={item.score}
              className="flex-1 relative cursor-default"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              <div
                className={`h-[28px] flex items-center justify-center font-mono text-[11px] font-medium transition-all duration-100 ${
                  i === 0 ? 'rounded-l-md' : ''
                } ${i === CROSS_ITEMS.length - 1 ? 'rounded-r-md' : ''} ${
                  isHovered ? 'ring-1 ring-text-primary z-10 scale-[1.04]' : ''
                }`}
                style={{ backgroundColor: item.color, color: Math.abs(item.score) >= 2 ? 'white' : '#1a1a1a' }}
              >
                {item.score > 0 ? `+${item.score}` : item.score}
              </div>
              {isHovered && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 bg-white border border-[#bbb] rounded px-2.5 py-1.5 shadow-sm z-20 whitespace-nowrap pointer-events-none">
                  <div className="font-serif text-[13px] font-medium text-text-primary">{item.label}</div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="flex justify-between font-mono text-[9px] text-text-tertiary mt-1 px-0.5">
        <span>Strongly oppose</span>
        <span>Strongly support</span>
      </div>
    </div>
  )
}

/* ---------- Roadmap item ---------- */
const STATUS_STYLES = {
  active: { dot: 'bg-[#22c55e]', badge: 'text-[#166534] bg-[#dcfce7]', text: 'Active' },
  planned: { dot: 'bg-[#f59e0b]', badge: 'text-[#92400e] bg-[#fef3c7]', text: 'Planned' },
  future: { dot: 'bg-[#94a3b8]', badge: 'text-[#475569] bg-[#f1f5f9]', text: 'Future' },
} as const

function RoadmapItem({
  status,
  label,
  children,
}: {
  status: keyof typeof STATUS_STYLES
  label: string
  children: React.ReactNode
}) {
  const s = STATUS_STYLES[status]
  return (
    <div className="flex gap-3 items-start py-3 border-b border-border/40 last:border-0">
      <div className={`mt-[7px] w-[8px] h-[8px] rounded-full shrink-0 ${s.dot}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="font-serif text-[15.5px] font-medium text-text-primary">{label}</span>
          <span className={`font-mono text-[9px] uppercase tracking-[0.1em] px-1.5 py-0.5 rounded ${s.badge}`}>
            {s.text}
          </span>
        </div>
        <div className="font-serif text-[14.5px] text-text-secondary leading-relaxed">{children}</div>
      </div>
    </div>
  )
}

/* ---------- Main App ---------- */
export function App() {
  const [activeSection, setActiveSection] = useState(TOC_SECTIONS[0]!.id)

  useEffect(() => {
    const sectionEls = TOC_SECTIONS.map(({ id }) => document.getElementById(id)).filter(Boolean) as HTMLElement[]

    function updateToc() {
      if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 8) {
        setActiveSection(TOC_SECTIONS[TOC_SECTIONS.length - 1]!.id)
        return
      }
      const fromTop = window.scrollY + 72
      let activeIdx = 0
      sectionEls.forEach((s, i) => {
        if (s.getBoundingClientRect().top + window.scrollY <= fromTop) activeIdx = i
      })
      setActiveSection(TOC_SECTIONS[activeIdx]!.id)
    }

    window.addEventListener('scroll', updateToc, { passive: true })
    updateToc()
    return () => window.removeEventListener('scroll', updateToc)
  }, [])

  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (!hash) return
    const frame = requestAnimationFrame(() => {
      const el = document.getElementById(hash)
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 64
        window.scrollTo({ top: y, behavior: 'smooth' })
      }
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <>
      <WelcomeOverlay />
      <Navigation />
      <TableOfContents activeId={activeSection} />

      <div className="max-w-[680px] mx-auto px-4 pt-[calc(2.5rem+48px)] pb-12 font-serif text-text-primary text-[17px] leading-[1.75]">
        {/* Header */}
        <div className="font-mono text-[11px] tracking-[0.12em] uppercase text-text-secondary mb-3">
          Mapping AI&mdash;Methodology
        </div>
        <h1
          className="text-[28px] font-normal italic leading-[1.25] mb-1"
          style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
        >
          Methodology
        </h1>
        <div className="font-mono text-[12px] text-text-secondary mb-9 tracking-[0.04em]">June 2026</div>

        <FadeIn>
          <p className="mb-[1.1rem] text-[16.5px]">
            Mapping AI is an interactive stakeholder map of the U.S. AI policy landscape, tracking the people,
            organizations, and resources shaping AI governance (see the{' '}
            <a href="/" className="text-accent no-underline hover:underline">
              background page
            </a>{' '}
            for the full motivation, or the{' '}
            <a href="/about" className="text-accent no-underline hover:underline">
              about page
            </a>{' '}
            for who we are). The dataset combines manually seeded public information, crowdsourced{' '}
            <a href="/contribute" className="text-accent no-underline hover:underline">
              submissions
            </a>
            , and structured research with automated verification. The entire project is{' '}
            <a
              href="https://github.com/MappingAI/mapping-ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent no-underline hover:underline"
            >
              open source
            </a>
            .
          </p>
        </FadeIn>

        {/* Overall process diagram */}
        <FadeIn>
          <div className="my-6 font-mono text-[12px] leading-[1.7] bg-[#f8f7f5] border border-[#e0dfdd] rounded-md px-5 py-4 overflow-x-auto">
            <div className="text-[10px] uppercase tracking-[0.1em] text-text-tertiary mb-3">End-to-end pipeline</div>
            <div className="whitespace-pre text-text-secondary">{`  Data sources                     Processing                      Output
┌──────────────┐
│ Curated seed │──┐
│ lists (CSV)  │  │
└──────────────┘  │   ┌──────────────────┐   ┌───────────────┐   ┌──────────────┐
┌──────────────┐  ├──▶│ Neon Postgres    │──▶│ Verification  │──▶│ map-data.json│
│ Crowdsourced │──┤   │ (entity/edge/    │   │ (adversarial  │   │ map-detail   │
│ submissions  │  │   │  submission)     │   │  pipelines +  │   │ .json        │
└──────────────┘  │   └──────┬───────────┘   │  crowdsourced │   └──────┬───────┘
┌──────────────┐  │          │               │  feedback)    │          │
│ Exa search   │──┘   ┌──────▼───────────┐   └───────────────┘   ┌──────▼───────┐
│ enrichment   │      │ Admin review     │                       │ D3 + Canvas  │
└──────────────┘      │ (approve/reject/ │                       │ interactive  │
                      │  merge)          │                       │ map          │
                      └──────────────────┘                       └──────────────┘`}</div>
          </div>
        </FadeIn>

        {/* === DATA COLLECTION === */}
        <SectionHeading id="data-collection">Data collection</SectionHeading>

        <FadeIn>
          <p className="mb-[1.1rem] text-[16.5px]">
            The initial dataset was seeded from curated lists of people and organizations active in U.S. AI governance:
            policymakers, executives, researchers, investors, journalists, organizers. Each entity was populated with
            publicly available information including name, title, organizational affiliation, location, category, and
            where available, belief positions on regulatory stance, AGI timeline, and AI risk level. Additional seeds
            drew from the{' '}
            <a
              href="https://www.aisafety.com/map"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent no-underline hover:underline"
            >
              AI Safety Map
            </a>{' '}
            dataset (for coverage of the safety and alignment community) and the{' '}
            <a
              href="https://time.com/collection/time100-ai-2025/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent no-underline hover:underline"
            >
              TIME 100 AI 2025
            </a>{' '}
            list. The seeding and enrichment scripts are in the{' '}
            <a
              href="https://github.com/MappingAI/mapping-ai/tree/main/scripts"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent no-underline hover:underline"
            >
              scripts/
            </a>{' '}
            directory of the repository.
          </p>
        </FadeIn>
        <FadeIn>
          <p className="mb-[1.1rem] text-[16.5px]">
            Enrichment scripts use the{' '}
            <a
              href="https://exa.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent no-underline hover:underline"
            >
              Exa
            </a>{' '}
            web search API to fill in sparse fields and discover relationships between entities. For each entity, the
            pipeline queries for recent coverage, extracts structured fields from the results, and writes them with
            confidence scores and source citations. The enrichment process evolved over several iterations, with each
            round tightening the requirements: later versions require mandatory source grounding, verbatim citations,
            and per-claim confidence scoring. Entity fields written by enrichment are flagged for human review before
            they appear on the live map.
          </p>
        </FadeIn>
        <FadeIn>
          <p className="mb-[1.1rem] text-[16.5px]">
            The current pipeline design separates claims from conclusions: rather than writing directly to entity belief
            fields, it extracts individual claims (with verbatim citations and source URLs) into a dedicated claims
            table, so each piece of attributed information has its own provenance chain. A crosspartisan enrichment pass
            covered 271 entities across 6 policy areas, producing 628 sourced claims that power the belief trajectory
            sparklines and sourced belief badges visible on entity cards.
          </p>
        </FadeIn>
        <FadeIn>
          <p className="mb-[1.1rem] text-[16.5px]">
            Edge enrichment (the relationships between entities) works similarly. Discovery scripts search for funding,
            employment, advisory, and founding connections, then stage candidates in a review queue with source
            evidence. An admin reviews these, promotes the approved ones to the production database, and rejects the
            rest. Post-processing catches duplicates, filters out generic placeholder entities (names like
            &ldquo;Investors&rdquo; or &ldquo;Tech Companies&rdquo;), and expands abbreviations.
          </p>
        </FadeIn>
        <FadeIn>
          <p className="mb-[1.1rem] text-[16.5px]">
            Thumbnail images for people are sourced from Wikipedia via its REST API, and organizational logos come from
            Google Favicons. These are cached to our own storage with long-lived cache headers so the map never makes
            real-time calls to external image services during normal use.
          </p>
        </FadeIn>

        <hr className="border-none border-t border-border/50 my-8" />

        {/* === DATABASE === */}
        <SectionHeading id="database">Database structure</SectionHeading>

        <FadeIn>
          <p className="mb-[1.1rem] text-[16.5px]">
            The production database is{' '}
            <a
              href="https://neon.tech"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent no-underline hover:underline"
            >
              Neon
            </a>{' '}
            Postgres 17 with a unified entity table that holds people, organizations, and resources in one schema. Each
            entity record carries its category, belief fields, organizational affiliations, location, social handles,
            rich text notes, and a thumbnail URL. Database triggers maintain weighted-average aggregate columns for each
            belief dimension, so scores stay in sync with the underlying submission data without requiring any batch
            recomputation step.
          </p>
        </FadeIn>
        <FadeIn>
          <p className="mb-[1.1rem] text-[16.5px]">
            A submission table stores every contribution in its raw form, including the submitter relationship type
            (self-report, connector, or external observer) and ordinal belief scores. Submissions start as
            &ldquo;pending&rdquo; and sit in a review queue until an admin approves, rejects, or merges them. An edge
            table captures typed relationships between entities (affiliated, funder, critic, collaborator, authored_by),
            with a uniqueness constraint on source, target, and type to prevent duplicates.
          </p>
        </FadeIn>
        <FadeIn>
          <p className="mb-[1.1rem] text-[16.5px]">
            There are also auxiliary tables: contributor keys for API-based batch submissions from trusted research
            contributors (with daily rate limits), field feedback for per-field confirm/flag votes from site visitors,
            and field notes for rich text correction notes with entity mentions. A separate database branch holds the
            claims and source tables used by the enrichment pipeline, where each claim records a belief dimension,
            verbatim citation, source URL, and confidence level.
          </p>
        </FadeIn>

        {/* Database structure diagram */}
        <FadeIn>
          <div className="my-6 font-mono text-[12px] leading-[1.7] bg-[#f8f7f5] border border-[#e0dfdd] rounded-md px-5 py-4 overflow-x-auto">
            <div className="text-[10px] uppercase tracking-[0.1em] text-text-tertiary mb-3">Production schema</div>
            <div className="whitespace-pre text-text-secondary">{`┌──────────────────────────┐     ┌──────────────────────────┐
│  entity                  │     │  submission              │
│──────────────────────────│     │──────────────────────────│
│  id (PK)                 │◀────│  entity_id (FK, nullable)│
│  entity_type             │     │  entity_type             │
│  name, title, category   │     │  submitter_relationship  │
│  belief_* fields         │     │  belief_*_score (ordinal)│
│  belief_*_wavg (trigger) │     │  status: pending/approved│
│  qa_approved (gate)      │     │  /rejected               │
│  field_verification JSON │     └──────────────────────────┘
│  search_vector (tsvector)│
└──────────┬───────────────┘     ┌──────────────────────────┐
           │                     │  field_feedback          │
           │                     │  field_feedback          │
           │  ┌──────────────┐   │──────────────────────────│
           ├──│  edge        │   │  entity_id (FK)          │
           │  │──────────────│   │  field_name, vote (+1/-1)│
           │  │  source_id   │   │  voter_id (hashed)       │
           │  │  target_id   │   └──────────────────────────┘
           │  │  edge_type   │
           │  │  role        │   ┌──────────────────────────┐
           │  └──────────────┘   │  field_notes             │
           │                     │──────────────────────────│
           └─────────────────────│  entity_id (FK)          │
                                 │  field_name, note (rich) │
                                 └──────────────────────────┘

Claims-pilot branch (separate):
┌────────────┐    ┌────────────┐    ┌────────────────┐
│  source    │◀───│  claim     │    │  edge_evidence │
│  (by URL)  │    │  per-field │    │  dates, amounts│
└────────────┘    └────────────┘    └────────────────┘`}</div>
          </div>
        </FadeIn>

        <hr className="border-none border-t border-border/50 my-8" />

        {/* === SUBMISSIONS === */}
        <SectionHeading id="submissions">How submissions are processed</SectionHeading>

        <FadeIn>
          <p className="mb-[1.1rem] text-[16.5px]">
            When a user fills out one of the contribution forms (for a person, organization, or resource), the form
            auto-saves a draft to localStorage every 500 milliseconds, so nothing is lost if the browser closes. Before
            submission, a client-side duplicate search checks the name or title against existing entities and shows
            matches in a sidebar, so users can choose to edit an existing entry rather than creating a duplicate. The
            submitter selects their relationship to the entity (&ldquo;I am this person,&rdquo; &ldquo;I can connect
            you,&rdquo; or &ldquo;Someone I know of&rdquo;), which determines the weight their data carries in the
            scoring system.
          </p>
        </FadeIn>
        <FadeIn>
          <p className="mb-[1.1rem] text-[16.5px]">
            On the server, submissions pass through a honeypot check (a hidden field that bots tend to fill), field
            validation, and rate limiting (10 submissions per hour per IP for anonymous users, or a configurable daily
            limit for contributor-key holders). Belief text labels are mapped to ordinal scores at submission time, and
            the submission is inserted with &ldquo;pending&rdquo; status to await admin review.
          </p>
        </FadeIn>
        <FadeIn>
          <p className="mb-[1.1rem] text-[16.5px]">
            An admin reviews each pending submission and can approve it (creating a new entity or updating an existing
            one), reject it (with optional notes), or merge selected fields from an edit submission into the entity.
            Approving a new submission triggers a database function that creates the entity row, generates a URL slug,
            and refreshes the map data files. The weighted score triggers recalculate belief averages whenever a
            submission status changes, so entity scores reflect the latest approved data.
          </p>
        </FadeIn>

        {/* Submission flow diagram */}
        <FadeIn>
          <div className="my-6 font-mono text-[12px] leading-[1.7] bg-[#f8f7f5] border border-[#e0dfdd] rounded-md px-5 py-4 overflow-x-auto">
            <div className="text-[10px] uppercase tracking-[0.1em] text-text-tertiary mb-3">Submission flow</div>
            <div className="whitespace-pre text-text-secondary">{`User fills form          Honeypot + validation      Admin review queue
  (auto-save)      ──▶    Rate limit check     ──▶    Approve / Reject / Merge
  Duplicate check          Score mapping                    │
                           INSERT pending                   ▼
                                                    DB trigger creates entity
                                                    Slug generated
                                                    Map data refreshed on R2`}</div>
          </div>
        </FadeIn>

        <hr className="border-none border-t border-border/50 my-8" />

        {/* === VERIFICATION === */}
        <SectionHeading id="verification">Verification</SectionHeading>

        <FadeIn>
          <p className="mb-[1.1rem] text-[16.5px]">
            Verification has several layers. At the most basic level, enrichment scripts flag entities for human review
            before they appear on the live map, using a QA approval gate in the database. Entities created by enrichment
            (as opposed to user submissions that an admin approves) do not appear in the public dataset until they pass
            manual review.
          </p>
        </FadeIn>
        <FadeIn>
          <p className="mb-[1.1rem] text-[16.5px]">
            Beyond that, automated verification pipelines cross-check entity fields against external sources. There are
            three separate pipelines, each targeting a different part of the entity record: belief fields (regulatory
            stance, AGI timeline, AI risk level), relationship edges (affiliations, funding, founding connections), and
            free-text notes. Each pipeline is run from the command line against a staging database branch, and
            corrections are written to a JSONL output file and optionally to a corrections table, never applied directly
            to production data.
          </p>
        </FadeIn>
        <FadeIn>
          <p className="mb-[1.1rem] text-[16.5px]">
            The belief verification pipeline uses an adversarial framing. For each belief field on each entity, the
            system runs two parallel searches via the Exa API: one biased toward finding evidence that contradicts the
            current value, and one biased toward confirming it. Each side builds an attribution chain (who said what,
            where, when) from the search results. A judge model (Claude Opus with extended thinking) reads only the
            debate transcript, not the raw search results, and renders a verdict: confirm the current value, correct it
            to a specific alternative, or flag for human review. The adversarial structure ensures that both sides of
            the evidence are represented before any judgment is made.
          </p>
        </FadeIn>

        {/* Verification pipeline diagram */}
        <FadeIn>
          <div className="my-6 font-mono text-[12px] leading-[1.7] bg-[#f8f7f5] border border-[#e0dfdd] rounded-md px-5 py-4 overflow-x-auto">
            <div className="text-[10px] uppercase tracking-[0.1em] text-text-tertiary mb-3">
              Belief verification pipeline (per field, per entity)
            </div>
            <div className="whitespace-pre text-text-secondary">{`Entity queue                   Parallel Exa search              Judge (Opus)
(priority-sorted)              ┌─ Prosecutor: 5 results ─┐
      │                        │  (biased: contradictions)│
      ▼                        │                          │      Reads debate
  Decomposer (Sonnet)    ──▶   │                          ├──▶   transcript only
  Generates search queries     │  Defender: 5 results     │      Extended thinking
  (one pro, one contra)        │  (biased: confirmation)  │           │
                               └──────────────────────────┘           ▼
                                         │                      Verdict:
                                         ▼                       confirm │
                                  Attribution (Sonnet × 2)       correct │
                                  Who said what, where, when     flag    │
                                                                        ▼
                                                              corrections.jsonl
                                                              (staged, not auto-applied)`}</div>
          </div>
        </FadeIn>

        <FadeIn>
          <p className="mb-[1.1rem] text-[16.5px]">
            The crowdsourced layer sits on top of both. Every field on every entity has upvote and downvote buttons, and
            a correction notes feature lets visitors submit rich text notes (with entity mentions) explaining what they
            think is wrong. Voter identity is hashed from IP and a browser-generated ID to prevent duplicate voting
            while preserving anonymity. Verification status appears as colored indicators on the map (green, yellow,
            red) based on the proportion of fields that have been checked, with a minimum of 8 verifiable fields
            required before computing the ratio so that sparse entities don&rsquo;t appear artificially well-verified.
          </p>
        </FadeIn>

        <hr className="border-none border-t border-border/50 my-8" />

        {/* === SCORING === */}
        <SectionHeading id="scoring">Belief scoring</SectionHeading>

        <FadeIn>
          <p className="mb-[1.1rem] text-[16.5px]">
            Belief scores (regulatory stance, AGI timeline, AI risk level) are ordinal values mapped to numeric scales.
            Hover over each segment to see the label and definition.
          </p>
        </FadeIn>

        <FadeIn>
          <BeliefScales />
        </FadeIn>
        <FadeIn>
          <p className="mb-[1.1rem] text-[16.5px]">
            When multiple submissions exist for the same entity, scores are computed as weighted averages: self-reports
            carry a weight of 10, connectors carry 2, and external observations carry 1. A single self-report outweighs
            five external observations, on the reasoning that the person themselves is generally the most reliable
            source on their own beliefs. The database also tracks weighted variance across submitters, which serves as a
            rough disagreement indicator: high variance means different submitters reported substantially different
            values for the same field.
          </p>
        </FadeIn>
        <FadeIn>
          <p className="mb-[1.1rem] text-[16.5px]">
            Where entities have no crowdsourced submissions (common for entities added through research enrichment),
            scores fall back to a direct lookup from the belief label stored on the entity record. Inferred positions
            are labeled as such and do not claim to represent official views. Where explicit public statements are
            available, we cite them directly; where beliefs are inferred from public actions, voting records,
            organizational membership, or published writing, we note that the position is inferred and include an
            evidence source tag.
          </p>
        </FadeIn>
        <FadeIn>
          <p className="mb-[1.1rem] text-[16.5px]">
            The crosspartisan enrichment pipeline uses a separate -2 to +2 scale for policy-area claims on specific
            mechanisms (licensing requirements, liability frameworks, compute governance). These per-mechanism scores
            power the crosspartisan convergence analysis on the{' '}
            <a href="/insights" className="text-accent no-underline hover:underline">
              insights page
            </a>
            .
          </p>
        </FadeIn>

        <FadeIn>
          <CrosspartisanScale />
        </FadeIn>
        <FadeIn>
          <p className="mb-[1.1rem] text-[16.5px]">
            Every claim extracted by the enrichment pipeline also carries a confidence level. &ldquo;High&rdquo;
            confidence means a direct, unambiguous statement on the specific mechanism (e.g., a floor speech or signed
            letter explicitly endorsing a particular approach). &ldquo;Medium&rdquo; confidence means a clear position
            but expressed indirectly or on a related topic rather than the exact mechanism being scored.
            &ldquo;Low&rdquo; confidence means the position is inferred from actions, organizational membership, or
            voting patterns rather than a public statement. When the AGI definitions or belief displays select among
            multiple claims for the same entity, they prefer the highest-confidence claim, with ties broken by recency.
          </p>
        </FadeIn>

        <hr className="border-none border-t border-border/50 my-8" />

        {/* === AGI DEFINITIONS === */}
        <SectionHeading id="agi-definitions">AGI definition space</SectionHeading>

        <FadeIn>
          <p className="mb-[1.1rem] text-[16.5px]">
            The Beliefs view on the map page includes an AGI definitions visualization that maps how different
            stakeholders define &ldquo;artificial general intelligence.&rdquo; For each entity where a definition could
            be sourced from public statements, the pipeline extracts verbatim definition text with a citation, then
            embeds it using the Voyage AI voyage-3 model. These high-dimensional embeddings are projected to two
            dimensions using UMAP, which preserves local neighborhood structure well enough that definitions with
            similar semantic content end up near each other in the final layout.
          </p>
        </FadeIn>
        <FadeIn>
          <p className="mb-[1.1rem] text-[16.5px]">
            Each definition is also classified into one of eight semantic clusters that were identified by reviewing the
            range of definitions in the dataset. The clusters cover human-level cognitive parity, economic work
            automation, autonomous research capability, superintelligent systems, general-purpose agents, transformative
            societal impact, conceptual critiques of the AGI framing itself, and augmentative tools (AI as enhancing
            human capabilities). Classification uses Claude Haiku with a structured prompt, and each entity is assigned
            to exactly one cluster.
          </p>
        </FadeIn>
        <FadeIn>
          <p className="mb-[1.1rem] text-[16.5px]">
            The current dataset covers roughly 370 entities with sourced AGI definitions. Where an entity has multiple
            claims about their AGI definition (from different sources or time periods), the highest-confidence claim is
            selected, with ties broken by recency. Related analyses (crosspartisan convergence, outlier stance
            detection) are on the{' '}
            <a href="/insights" className="text-accent no-underline hover:underline">
              insights page
            </a>
            .
          </p>
        </FadeIn>

        <hr className="border-none border-t border-border/50 my-8" />

        {/* === VISUALIZATION === */}
        <SectionHeading id="visualization">Visualization design</SectionHeading>

        <FadeIn>
          <p className="mb-[1.1rem] text-[16.5px]">
            The interactive map uses D3.js with a force-directed simulation rendered to a single HTML Canvas element. We
            moved from SVG to Canvas because at 1,500+ nodes and 3,600+ edges, SVG was creating over 10,000 DOM elements
            that needed to be re-rasterized on every pan and zoom; Canvas draws to a composited bitmap where transforms
            are essentially free. Hit testing for hover, click, and drag uses a d3.quadtree for O(log N) spatial
            lookups, and entity images are pre-rasterized as circle-clipped sprites on offscreen canvases so they can be
            composited efficiently during animation frames.
          </p>
        </FadeIn>
        <FadeIn>
          <p className="mb-[1.1rem] text-[16.5px]">
            Entities are grouped by category into orbital clusters arranged around a center point, with the cluster
            ordering determined by a connectivity-based algorithm: categories with the most relationships between them
            are placed adjacent. This means Frontier Labs and AI Safety organizations tend to appear near each other
            (because researchers move between them), and Think Tanks sit near Government agencies (because of advisory
            relationships). Cluster orbit radius scales dynamically with the number of visible categories. Resources are
            positioned near their most closely related entity from the relationship table, and orphaned resources are
            anchored near the category cluster matching their topic.
          </p>
        </FadeIn>
        <FadeIn>
          <p className="mb-[1.1rem] text-[16.5px]">
            Category colors use the RColorBrewer Paired palette, chosen for perceptual distinctness across 12
            organizational categories and 8 person categories. Belief dimensions (regulatory stance, AGI timeline, AI
            risk level) are encoded as opacity overlays on the category colors rather than replacing them, which lets
            users see both category membership and belief position simultaneously. Sequential color gradients (warm gold
            for regulatory stance, blue for AGI timeline, red for AI risk) indicate ordered magnitude within each
            dimension.
          </p>
        </FadeIn>
        <FadeIn>
          <p className="mb-[1.1rem] text-[16.5px]">
            The Plot view offers a scatter plot and beeswarm mode for examining where entities fall on continuous belief
            dimensions. Any two of the three belief dimensions can be mapped to the x and y axes, and entities missing
            scores for the selected dimensions are excluded with a count shown. The beeswarm (one-dimensional) mode uses
            a violin-shaped jitter distribution to prevent overplotting.
          </p>
        </FadeIn>
        <FadeIn>
          <p className="mb-[1.1rem] text-[16.5px]">
            Selecting a node highlights its direct connections and dims everything else, which makes it possible to
            trace a single entity&rsquo;s network through a dense graph. Edges respond to hover with a gold highlight
            and can be clicked to open relationship details. Edge labels are bidirectional (e.g., &ldquo;funds / funded
            by&rdquo;) in both the detail panel and tooltips. Entities with five or more submissions show a subtle gold
            ring indicating depth of crowdsourced coverage.
          </p>
        </FadeIn>
        <FadeIn>
          <p className="mb-[1.1rem] text-[16.5px]">
            The map data is split into a lightweight skeleton file (containing only render-critical fields like name,
            category, scores, thumbnail, and pre-computed positions) and a lazily loaded detail file (containing notes,
            belief detail, social handles, and verification status). D3 force simulation positions are pre-computed
            server-side and normalized to a [0,1] range, so the client can render immediately without running the
            expensive simulation. On mobile devices (under 768px), the force graph is replaced entirely by a card-based
            directory with category bubbles, belief spectrum bars, and search, since force-graph nodes are too small for
            reliable touch interaction.
          </p>
        </FadeIn>

        <hr className="border-none border-t border-border/50 my-8" />

        {/* === APIS === */}
        <SectionHeading id="apis">External services</SectionHeading>

        <FadeIn>
          <p className="mb-[1.1rem] text-[16.5px]">
            The platform depends on a small number of external services. Anthropic&rsquo;s Claude API is used across the
            enrichment and verification pipelines for field extraction and evidence evaluation (Haiku for
            classification, Sonnet for attribution, Opus for adversarial judging). The Exa API provides web search for
            enrichment scripts, entity discovery, and claim sourcing. Voyage AI generates text embeddings for the AGI
            definition space. Photon (an open geocoding service backed by OpenStreetMap) powers location search in the
            contribution forms, and the Bluesky public API provides handle autocomplete. Wikipedia and Google Favicons
            supply entity thumbnails and logos, cached to our own infrastructure so the map serves images from
            Cloudflare R2 rather than making real-time calls to external hosts.
          </p>
        </FadeIn>
        <FadeIn>
          <p className="mb-[1.1rem] text-[16.5px]">
            The site itself is hosted on Cloudflare Pages with Pages Functions handling the API layer, Neon Postgres as
            the database, and Cloudflare R2 for data file storage. The entire codebase is{' '}
            <a
              href="https://github.com/MappingAI/mapping-ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent no-underline hover:underline"
            >
              open source on GitHub
            </a>
            , including database schema definitions, enrichment scripts, and the D3 visualization engine. The repository
            README has setup instructions for local development, and the{' '}
            <a href="/workshop" className="text-accent no-underline hover:underline">
              contribution guide
            </a>{' '}
            covers everything from data enrichment to code contributions.
          </p>
        </FadeIn>

        <hr className="border-none border-t border-border/50 my-8" />

        {/* === ROADMAP === */}
        <SectionHeading id="roadmap">Roadmap</SectionHeading>

        <FadeIn>
          <div className="space-y-3 mb-6">
            <RoadmapItem status="active" label="Crowdsourced verification site">
              Building a public verification interface for systematic entity review with structured correction forms and
              claim-level fact-checking.
            </RoadmapItem>
            <RoadmapItem status="active" label="Verification pipeline improvements">
              Prompt engineering, coverage expansion, and pipeline hardening for the automated belief/edge/notes
              verification scripts.
            </RoadmapItem>
            <RoadmapItem status="active" label="LLM-powered map search">
              Natural language search or chatbot for the map, building on an existing prototype branch.
            </RoadmapItem>
            <RoadmapItem status="planned" label="Claims schema integration">
              Merging the claims and source tables into the main production database so per-claim provenance is
              available in the admin workflow.
            </RoadmapItem>
            <RoadmapItem status="planned" label="Contribute page for general audiences">
              Merging the contribution flow with a more general-audience user experience.
            </RoadmapItem>
            <RoadmapItem status="planned" label="Performance improvements">
              Loading speed on heavier pages (particularly Research Insights) and general bug discovery.
            </RoadmapItem>
            <RoadmapItem status="planned" label="Temporal edge data">
              Surfacing employment start/end dates, funding amounts, and founding years in the visualization.
            </RoadmapItem>
            <RoadmapItem status="planned" label="Codebase and documentation cleanup">
              Updated database reference, architecture docs, and code organization.
            </RoadmapItem>
            <RoadmapItem status="future" label="React map migration">
              Moving the map rendering from its current inline architecture to a React component, eliminating the legacy
              TipTap esbuild bundle.
            </RoadmapItem>
            <RoadmapItem status="future" label="Open API / MCP">
              Programmatic access to the dataset for researchers, other tools, and AI agents via a public API and MCP
              server.
            </RoadmapItem>
          </div>
        </FadeIn>
        <FadeIn>
          <p className="mb-[1.1rem] text-[16.5px]">
            If you have questions about the methodology, spot issues in the data, or want to contribute, please{' '}
            <a href="/contribute" className="text-accent no-underline hover:underline">
              submit a correction
            </a>
            , open an issue on{' '}
            <a
              href="https://github.com/MappingAI/mapping-ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent no-underline hover:underline"
            >
              GitHub
            </a>
            , or email us at{' '}
            <a href="mailto:info@mapping-ai.org" className="text-accent no-underline hover:underline">
              info@mapping-ai.org
            </a>
            . Our{' '}
            <a href="/workshop" className="text-accent no-underline hover:underline">
              contribution guide
            </a>{' '}
            covers six ways to get involved, from data enrichment and quality control to outreach and new features.
          </p>
        </FadeIn>

        <Footer />
      </div>
    </>
  )
}
