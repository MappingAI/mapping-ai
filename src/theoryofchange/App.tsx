import { useEffect, useRef, useState, useCallback } from 'react'
import { Navigation } from '../components/Navigation'

/* ---------- Table of Contents sidebar ---------- */
const TOC_SECTIONS = [
  { id: 'the-problem', label: 'The Problem' },
  { id: 'the-landscape', label: 'The Landscape' },
  { id: 'our-principle', label: 'Our Principle' },
  { id: 'the-mechanisms', label: 'The Mechanisms' },
  { id: 'causal-pathway', label: 'Causal Pathway' },
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

/* ---------- Beta Overlay ---------- */
function BetaOverlay() {
  const [visible, setVisible] = useState(true)

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) setVisible(false)
      }}
    >
      <div className="bg-white rounded-lg px-8 py-6 max-w-[480px] w-[90%] font-serif shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
        <h2 className="font-mono text-[13px] uppercase tracking-[0.08em] mb-3">Pre-Launch Beta</h2>
        <p className="text-[15px] leading-relaxed text-text-secondary mb-4">
          This tool is in a pre-launch beta. We are actively improving data issues and enrichment, as well as adding new
          features and improving the UX.
        </p>
        <p className="text-[15px] leading-relaxed text-text-secondary mb-5">
          Please email us at{' '}
          <a href="mailto:info@mapping-ai.org" className="text-accent">
            info@mapping-ai.org
          </a>{' '}
          if you&rsquo;d like to contribute or provide any feedback.
        </p>
        <button
          onClick={() => setVisible(false)}
          className="font-mono text-[11px] uppercase tracking-[0.08em] px-6 py-[0.6rem] bg-text-primary text-white border-none rounded cursor-pointer"
        >
          Got it
        </button>
      </div>
    </div>
  )
}

/* ---------- Reusable sub-components ---------- */
function LandscapeBox({
  label,
  title,
  body,
  links,
}: {
  label: string
  title: string
  body: string
  links: { text: string; href?: string }[]
}) {
  return (
    <div className="bg-bg-secondary rounded-md px-4 py-[0.9rem] border border-transparent transition-all duration-150 hover:-translate-y-0.5 hover:border-border">
      <div className="font-mono text-[10px] text-text-tertiary tracking-[0.1em] uppercase mb-[0.35rem]">{label}</div>
      <div className="font-serif text-[15.5px] font-medium mb-[0.4rem] leading-[1.3] text-text-primary">{title}</div>
      <div className="font-mono text-[11.5px] text-text-secondary leading-relaxed mb-[0.6rem]">{body}</div>
      <div className="flex flex-col gap-1">
        {links.map((link, i) =>
          link.href ? (
            <a
              key={i}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[10.5px] text-accent leading-[1.4] no-underline"
            >
              {link.text}
            </a>
          ) : (
            <span key={i} className="font-mono text-[10.5px] text-accent leading-[1.4]">
              {link.text}
            </span>
          ),
        )}
      </div>
    </div>
  )
}

function ApproachBlock({
  title,
  bodyIntro,
  items,
  bodyOutro,
}: {
  title: string
  bodyIntro: string
  items: { label: string; text: string }[]
  bodyOutro?: string
}) {
  return (
    <FadeIn>
      <div className="border-l-[1.5px] border-border pl-4 mb-[1.4rem]">
        <div className="font-serif text-[16px] font-medium mb-[0.3rem] text-text-primary">{title}</div>
        <div className="font-serif text-[15.5px] text-text-secondary leading-relaxed">
          {bodyIntro}
          <div className="mt-[0.6rem] flex flex-col gap-1">
            {items.map((item, i) => (
              <div key={i} className="font-serif text-[15px] text-text-secondary leading-normal">
                <strong className="text-text-primary font-medium">{item.label}:</strong> {item.text}
              </div>
            ))}
          </div>
          {bodyOutro && <div className="mt-[0.6rem]">{bodyOutro}</div>}
        </div>
      </div>
    </FadeIn>
  )
}

function TimelineStep({
  time,
  children,
  isLast = false,
}: {
  time: string
  children: React.ReactNode
  isLast?: boolean
}) {
  return (
    <div className="grid grid-cols-[36px_1fr] gap-x-3 group">
      <div className="flex flex-col items-center">
        <div className="w-[9px] h-[9px] rounded-full bg-text-secondary shrink-0 mt-[6px] transition-all duration-200 group-hover:bg-accent group-hover:scale-[1.3]" />
        {!isLast && <div className="w-px flex-1 bg-border mt-1 min-h-5" />}
      </div>
      <div className="pb-[1.15rem] transition-transform duration-200 group-hover:translate-x-1">
        <div className="font-mono text-[10px] text-text-tertiary tracking-[0.1em] uppercase mb-[0.2rem] transition-colors duration-200 group-hover:text-accent">
          {time}
        </div>
        <div className="font-serif text-[15.5px] leading-[1.55] transition-colors duration-200 group-hover:text-text-primary">
          {children}
        </div>
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

  return (
    <>
      <Navigation />
      <TableOfContents activeId={activeSection} />
      <BetaOverlay />

      <div className="max-w-[680px] mx-auto px-4 pt-[calc(2.5rem+48px)] pb-12 font-serif text-text-primary text-[17px] leading-[1.75]">
        {/* Header */}
        <div className="font-mono text-[11px] tracking-[0.12em] uppercase text-text-secondary mb-3">
          Mapping AI&mdash;Theory of Change
        </div>
        <h1
          className="text-[28px] font-normal italic leading-[1.25] mb-1"
          style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
        >
          The Endless Frontier, Revisited
        </h1>
        <div className="font-mono text-[12px] text-text-secondary mb-9 tracking-[0.04em]">
          Working Draft &middot; March 2026
        </div>

        {/* === THE PROBLEM === */}
        <FadeIn>
          <div
            id="the-problem"
            className="font-mono text-[13px] font-medium tracking-[0.14em] uppercase text-text-secondary mb-3 scroll-mt-16"
          >
            The problem
          </div>
        </FadeIn>
        <FadeIn>
          <p className="mb-[1.1rem] text-[16.5px]">
            AI represents a step change that demands a renegotiation between government, industry, and the public. In
            short, a new social contract. But the conversation today is stuck in old paradigms: the US vs. China,
            accelerationism vs. safety, regulation vs. laissez faire. None of these address the fundamental question: on
            what terms is the value of American technological innovation secured for the public?
          </p>
        </FadeIn>
        <FadeIn>
          <p className="mb-[1.1rem] text-[16.5px]">
            The historical record offers a clear model: when a revolutionary technology arrives, societies that build
            new institutions to meet the moment are able to distribute that technology&rsquo;s benefits broadly.
            Consider American electrification. By 1935, forty years after the construction of the first power plants,
            90% of urban homes had power, but only 10% of rural ones did. Rather than subsidize private utilities or
            wait for the markets to adapt, FDR and the New Deal coalition created the Rural Electrification
            Administration, Tennessee Valley Authority, and community-owned financing structures. By 1950, the
            rural/urban electricity gap had closed.
          </p>
        </FadeIn>
        <FadeIn>
          <p className="mb-[1.1rem] text-[16.5px]">
            Our existing institutions were not designed to handle the AI transition. The question is: can we build the
            new institutions we desperately need?
          </p>
        </FadeIn>
        <FadeIn>
          <p className="mb-[1.1rem] text-[16.5px]">
            Crucially, AI is different from electricity. Its adoption is faster than any other technology in history.
            Its risks are existential. And it&rsquo;s owned by a handful of firms, controlling not just a market or an
            infrastructure, but the frontier of knowledge production itself. These companies built their products upon
            decades of publicly funded research, open-source infrastructure, human-generated data, and combined
            ingenuity, yet have misaligned incentives to return value to the public&mdash;and face no real consequences
            if something goes terribly wrong. There is no compact governing this relationship. Our shared inheritance
            depends on forging a new one.
          </p>
        </FadeIn>

        {/* === THE LANDSCAPE === */}
        <FadeIn>
          <div
            id="the-landscape"
            className="font-mono text-[13px] font-medium tracking-[0.14em] uppercase text-text-secondary mb-3 scroll-mt-16"
          >
            The existing landscape
          </div>
        </FadeIn>
        <FadeIn>
          <p className="text-[15px] text-text-secondary mb-5">
            Each camp has a diagnosis. None has a compact. This is the vacuum we are filling.
          </p>
        </FadeIn>

        <FadeIn>
          <div className="grid grid-cols-1 gap-3 my-5">
            <LandscapeBox
              label="Republican establishment"
              title="Competition and dominance"
              body="Deregulate, accelerate, and command the global market. The US-China frame is a prominent motivator. Distribution is an afterthought; workforce training is the concession to labor. Preempting state regulation is the active political agenda right now."
              links={[
                {
                  text: "\u2197 America's AI Action Plan",
                  href: 'https://www.whitehouse.gov/wp-content/uploads/2025/07/Americas-AI-Action-Plan.pdf',
                },
                {
                  text: '\u2197 Dean Ball, "How I Approach AI Policy"',
                  href: 'https://www.hyperdimensional.co/p/how-i-approach-ai-policy',
                },
                { text: '\u2197 White House, "A National Policy Framework for Artificial Intelligence"' },
              ]}
            />
            <LandscapeBox
              label="Democratic establishment"
              title="Regulation and taxation"
              body="Privacy, civil rights, job protections, and responsible deployment. Proposes taxing AI gains to fund workforce retraining, and generally frames labor issues in terms of AI deployment. Others condemn potential environmental or energy costs of data centers. Proposals have not yet cohered into a structural compact."
              links={[
                {
                  text: '\u2197 Kelly, AI for America',
                  href: 'https://www.kelly.senate.gov/wp-content/uploads/2025/09/KELLY-AI-FOR-AMERICA.pdf',
                },
                {
                  text: '\u2197 Khanna, "A New Tech Social Contract"',
                  href: 'https://www.foxnews.com/opinion/rep-ro-khanna-we-need-new-tech-social-contract-reclaim-ai-from-billionaires',
                },
                {
                  text: '\u2197 Karen Hao, Empire of AI',
                  href: 'https://www.penguinrandomhouse.com/books/743569/empire-of-ai-by-karen-hao/',
                },
                {
                  text: '\u2197 Kagan-Kans, "The Left is Missing Out on AI"',
                  href: 'https://www.transformernews.ai/p/the-left-is-missing-out-on-ai-sanders-doctorow-bender-bores',
                },
              ]}
            />
            <LandscapeBox
              label="AI frontier"
              title="Exponential transformation"
              body='Highly diverse views across the board, but all agree that capabilities are accelerating. Main camp holds that AGI is imminent, and the priority is ensuring the "right" actors in Western labs win. Preventing existential risk and institutional collapse is key—distribution and labor are largely afterthoughts. A faction argues that alignment is unsolved and building ASI risks catastrophic outcomes. Other subsets are focused on near-term harms, accountability, auditing, and institutional design, or argue that AI will diffuse slowly, giving institutions time to respond. Concentration of power is a key focus.'
              links={[
                { text: '\u2197 Aschenbrenner, "Situational Awareness"', href: 'https://situational-awareness.ai/' },
                { text: '\u2197 AI 2027 (Kokotajlo et al.)', href: 'https://ai-2027.com/' },
                {
                  text: '\u2197 Dario Amodei, "Machines of Loving Grace"',
                  href: 'https://darioamodei.com/essay/machines-of-loving-grace',
                },
                {
                  text: '\u2197 Yudkowsky & Soares, If Anyone Builds It, Everyone Dies',
                  href: 'https://ifanyonebuildsit.com/',
                },
                {
                  text: '\u2197 Narayanan & Kapoor, "AI as Normal Technology"',
                  href: 'https://knightcolumbia.org/content/ai-as-normal-technology',
                },
              ]}
            />
          </div>
        </FadeIn>

        {/* === OUR PRINCIPLE === */}
        <FadeIn>
          <div
            id="our-principle"
            className="font-mono text-[13px] font-medium tracking-[0.14em] uppercase text-text-secondary mb-3 scroll-mt-16"
          >
            Our operating principle
          </div>
        </FadeIn>
        <FadeIn>
          <p className="mb-[1.1rem] text-[16.5px]">
            People First: AI for the public, building from how innovation is financed, how infrastructure is
            constructed, and how knowledge is maintained. The emphasis is on ensuring gains for the public by design,
            rather than downstream redistribution alone. Bringing together labor, safety, national security, and
            institutional design, our aim is to proactively ensure that the American public captures the value of
            American innovation. The overarching mandate is to secure public return.
          </p>
        </FadeIn>

        {/* === THE MECHANISMS === */}
        <FadeIn>
          <div
            id="the-mechanisms"
            className="font-mono text-[13px] font-medium tracking-[0.14em] uppercase text-text-secondary mb-3 scroll-mt-16"
          >
            The mechanisms
          </div>
        </FadeIn>

        <ApproachBlock
          title="01—Institutional construction"
          bodyIntro="Government must create, not just regulate or subsidize. The New Deal's REA both regulated private utilities to serve rural America and built new institutional forms that private utilities never would. A new compact for AI requires the same constructive ambition, to three new ends:"
          items={[
            {
              label: 'Measurement',
              text: 'continuous assessment of how capabilities develop and how broadly benefits flow.',
            },
            {
              label: 'Access',
              text: 'development of public compute and AI infrastructure alongside private offerings.',
            },
            { label: 'Steering', text: 'regulation with an affirmative mandate to build, not just bind.' },
          ]}
        />
        <ApproachBlock
          title="02—Return architecture"
          bodyIntro="Public investment should generate public return by structure, not by taxation after concentration has already occurred. The problem with redistribution as a governance strategy is that it operates on outcomes while leaving intact the architecture of who captures value in the first place. A new compact intervenes at the source, meaning:"
          items={[
            { label: 'Ownership', text: 'distributive ownership structures where the users own the infrastructure.' },
            { label: 'Commons', text: 'shared resources are treated as public property from the start.' },
            { label: 'Financing', text: "capital instruments that don't require monopolistic scale to be worthwhile." },
          ]}
          bodyOutro="These are early directions in a design space still being built out. The principle is fixed even where the instruments are not: public return by design."
        />
        <ApproachBlock
          title="03—Adaptive governance"
          bodyIntro="AI is developing faster than the pace of new legislation. Sunset clauses and mandatory review periods start to address this, but they are scheduled flexibility rather than genuine adaptability. Adaptive governance operates at three layers:"
          items={[
            {
              label: 'Sensing',
              text: 'a continuous, real-time picture of what the technology is doing and who it is affecting.',
            },
            {
              label: 'Response',
              text: 'pre-committed mechanisms triggered by observable conditions rather than political calendars.',
            },
            {
              label: 'Recalibration',
              text: 'a process for updating the response thresholds and mechanisms themselves as understanding evolves.',
            },
          ]}
          bodyOutro="The closest analogs to adaptive governance come from deliberative democratic institutions, like Taiwan's Alignment Assemblies. A broader international survey of adaptive governance experiments is part of this project's ongoing research agenda."
        />
        <ApproachBlock
          title="04—Coalitions"
          bodyIntro="Safety researchers, governance scholars, labor advocates, national security strategists, civil rights organizations, and industry leaders are each developing answers to related questions, but in different languages and with different threat models. Few actors are building across divisions. We work with anyone who agrees that AI's capabilities should serve human flourishing and dignity. The governing agenda must be:"
          items={[
            { label: 'Specific', text: 'implementable policies rather than vague goals.' },
            { label: 'Staffed', text: 'personnel with technical expertise, including from industry.' },
            { label: 'Deployable', text: 'impact on day one.' },
          ]}
          bodyOutro="Operationally, we orient towards building capacity rather than dismantling it."
        />
        <ApproachBlock
          title="05—Pluralism"
          bodyIntro="The current trajectory of AI development tends toward convergence: a small number of general-purpose models, built on overlapping data and shared architectures, concentrated in the same cities and private companies. Monocultures lack resilience. When one architecture has a fundamental blind spot, models trained on it tend to share this vulnerability. A plurality of approaches, ownership structures, purposes, and scales is a property of healthy technological ecosystems. We seek pluralism in the following issue areas:"
          items={[
            {
              label: 'Financing',
              text: 'creating markets for smaller, purpose-built models to serve communities that would otherwise be left behind.',
            },
            {
              label: 'Supply chains',
              text: 'investment in open-source infrastructure that serves the public good, and hardware speciation that avoids single points of failure.',
            },
            {
              label: 'Alignment',
              text: 'diversity in the teams conducting AI research and in the values they instill.',
            },
          ]}
        />

        {/* === CAUSAL PATHWAY === */}
        <FadeIn>
          <div
            id="causal-pathway"
            className="font-mono text-[13px] font-medium tracking-[0.14em] uppercase text-text-secondary mb-3 scroll-mt-16"
          >
            Causal pathway
          </div>
        </FadeIn>
        <FadeIn>
          <div className="my-5 flex flex-col">
            <TimelineStep time="Now—Apr 2026">
              <a href="/" className="text-accent no-underline hover:underline">
                Stakeholder map
              </a>
              , working draft, team assembly. Begin outreach to first-ring contacts. This is where we are.
            </TimelineStep>
            <TimelineStep time="May – Aug 2026">
              Expert review workshops validate the framework and convert reviewers into endorsers. Domain experts
              co-author or formally consult on each section. Industry participants see a positive-sum case for
              engagement, not a compliance burden.
            </TimelineStep>
            <TimelineStep time="Late 2026—Midterms">
              Launch endorsed framework with co-signatories spanning academia, former officials, industry, labor, and
              civil society. Set the intellectual terms of the debate before the incumbent frames harden into the
              default.
            </TimelineStep>
            <TimelineStep time="Early 2027">
              Congressional champion introduces legislation in the 120th Congress, making the framework a live vehicle
              that 2028 candidates must engage with.
            </TimelineStep>
            <TimelineStep time="2028 Primary">
              Presidential candidates adopt elements of the framework. AI governance becomes a defining issue on
              kitchen-table terms&mdash;who benefits from American innovation&mdash;not elite policy discourse.
            </TimelineStep>
            <TimelineStep time="2029—Day one" isLast>
              A new administration has a specific, staffed technology-society compact ready to implement. New
              institutions are not drafted&mdash;they are ready to build.
            </TimelineStep>
          </div>
        </FadeIn>

        {/* Footer */}
        <div className="flex justify-between items-center mt-10 pt-6 border-t border-border/50">
          <span className="font-mono text-[10.5px] text-text-tertiary tracking-[0.06em]">Mapping AI</span>
          <span className="font-mono text-[10.5px] text-text-tertiary tracking-[0.06em]">
            For internal circulation &middot; March 2026
          </span>
        </div>
        <div className="mt-2 font-mono text-[9px] text-text-tertiary tracking-[0.03em] text-center max-w-[600px] leading-normal">
          This tool is in a pre-launch beta. We are actively improving data and adding new features. Email{' '}
          <a href="mailto:info@mapping-ai.org" className="text-text-tertiary">
            info@mapping-ai.org
          </a>{' '}
          to contribute or provide feedback.
        </div>
      </div>
    </>
  )
}
