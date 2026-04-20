import { useState, useEffect, useRef, useCallback } from 'react'
import { Navigation } from '../components/Navigation'

/* ------------------------------------------------------------------ */
/*  Grid data                                                          */
/* ------------------------------------------------------------------ */

interface GridItem {
  title: string
  description: string
}

const WHO_GRID: GridItem[] = [
  { title: 'Frontier labs', description: 'OpenAI, Anthropic, DeepMind, Meta AI, xAI' },
  { title: 'Infrastructure & compute', description: 'Nvidia, TSMC, Qualcomm, Cloudflare' },
  { title: 'Deployers & platforms', description: 'Amazon, Scale AI, Midjourney' },
  { title: 'AI safety & alignment', description: 'MIRI, CAIS, ARC, Redwood, Apollo' },
  { title: 'Think tanks & policy orgs', description: 'Secure AI, IAPS, GovAI, New Consensus' },
  { title: 'Government', description: 'Congressional offices, state legislatures, agencies' },
  { title: 'Academic researchers', description: 'CS, econ, law, STS, political science' },
  { title: 'VC & capital', description: 'a16z, Sequoia, YC, philanthropic funders' },
  { title: 'Labor & civil society', description: 'Unions, creative guilds, advocacy groups' },
  { title: 'Ethics, bias & rights', description: 'AI Now, FAccT community, EFF' },
  { title: 'Media & public discourse', description: 'Journalists, Substacks, podcasts' },
  { title: 'Philanthropies', description: 'Chan Zuckerberg Initiative, Bloomberg Philanthropies, Arnold Ventures' },
]

/* ------------------------------------------------------------------ */
/*  TOC data                                                           */
/* ------------------------------------------------------------------ */

const TOC_ITEMS = [
  { id: 'what', label: 'What' },
  { id: 'why-now', label: 'Why Now' },
  { id: 'the-gap', label: 'The Gap' },
  { id: 'who', label: "Who We're Mapping" },
  { id: 'vision', label: 'Vision' },
  { id: 'take-part', label: 'Take Part' },
]

/* ------------------------------------------------------------------ */
/*  Fade-in observer hook                                              */
/* ------------------------------------------------------------------ */

function useFadeIn() {
  const refs = useRef<(HTMLElement | null)[]>([])

  const setRef = useCallback(
    (index: number) => (el: HTMLElement | null) => {
      refs.current[index] = el
    },
    [],
  )

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            ;(e.target as HTMLElement).style.opacity = '1'
            ;(e.target as HTMLElement).style.transform = 'translateY(0)'
            observer.unobserve(e.target)
          }
        })
      },
      { threshold: 0.1 },
    )
    refs.current.forEach((el) => el && observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return setRef
}

/* ------------------------------------------------------------------ */
/*  Table of Contents sidebar                                          */
/* ------------------------------------------------------------------ */

function TableOfContents() {
  const [activeId, setActiveId] = useState(TOC_ITEMS[0]!.id)

  useEffect(() => {
    const sections = TOC_ITEMS.map((item) => document.getElementById(item.id)).filter(Boolean) as HTMLElement[]

    function update() {
      const scrollY = window.scrollY
      const docHeight = document.documentElement.scrollHeight

      // If at bottom, highlight last item
      if (scrollY + window.innerHeight >= docHeight - 8) {
        setActiveId(TOC_ITEMS[TOC_ITEMS.length - 1]!.id)
        return
      }

      const fromTop = scrollY + 72
      let active = TOC_ITEMS[0]!.id
      sections.forEach((s, i) => {
        if (s.getBoundingClientRect().top + scrollY <= fromTop) {
          active = TOC_ITEMS[i]!.id
        }
      })
      setActiveId(active)
    }

    window.addEventListener('scroll', update, { passive: true })
    update()
    return () => window.removeEventListener('scroll', update)
  }, [])

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault()
    const el = document.getElementById(id)
    if (!el) return

    const targetY = Math.min(
      el.getBoundingClientRect().top + window.scrollY - 64,
      Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
    )

    const startY = window.scrollY
    const diff = targetY - startY
    const duration = 750
    let start: number | null = null
    const html = document.documentElement
    html.style.scrollBehavior = 'auto'

    function step(ts: number) {
      if (!start) start = ts
      const p = Math.min((ts - start) / duration, 1)
      const ease = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p
      window.scrollTo(0, startY + diff * ease)
      if (p < 1) {
        requestAnimationFrame(step)
      } else {
        html.style.scrollBehavior = 'smooth'
      }
    }
    requestAnimationFrame(step)
  }

  return (
    <nav
      className="hidden min-[1200px]:block fixed top-1/2 -translate-y-1/2"
      style={{ left: 'calc(50% - 340px - 3rem - 130px)', width: 130 }}
    >
      {TOC_ITEMS.map(({ id, label }) => (
        <a
          key={id}
          href={`#${id}`}
          onClick={(e) => handleClick(e, id)}
          className={`block font-mono text-[11px] tracking-wider uppercase no-underline py-1.5 pl-2.5 border-l transition-colors duration-150 leading-snug ${
            activeId === id ? 'text-[#1a1a1a] border-[#1a1a1a]' : 'text-[#888] border-transparent hover:text-[#555]'
          }`}
        >
          {label}
        </a>
      ))}
    </nav>
  )
}

/* ------------------------------------------------------------------ */
/*  Beta overlay                                                       */
/* ------------------------------------------------------------------ */

function BetaOverlay() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('beta-dismissed')) setVisible(true)
  }, [])

  if (!visible) return null

  const dismiss = () => {
    setVisible(false)
    localStorage.setItem('beta-dismissed', '1')
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss()
      }}
    >
      <div
        className="bg-white rounded-lg px-8 py-6 max-w-[480px] w-[90%] shadow-2xl"
        style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
      >
        <h2 className="font-mono text-[13px] uppercase tracking-wider mb-3">Pre-Launch Beta</h2>
        <p className="text-[15px] leading-relaxed text-[#555] mb-4">
          This tool is in a pre-launch beta. We are actively improving data issues and enrichment, as well as adding new
          features and improving the UX.
        </p>
        <p className="text-[15px] leading-relaxed text-[#555] mb-5">
          Please email us at{' '}
          <a href="mailto:info@mapping-ai.org" className="text-[#2563eb] no-underline hover:underline">
            info@mapping-ai.org
          </a>{' '}
          if you'd like to contribute or provide any feedback.
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

/* ------------------------------------------------------------------ */
/*  Mail icon                                                          */
/* ------------------------------------------------------------------ */

function MailIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  App                                                                */
/* ------------------------------------------------------------------ */

export function App() {
  const setRef = useFadeIn()
  let fi = 0

  const fadeProps = (index: number) => ({
    ref: setRef(index),
    style: {
      opacity: 0,
      transform: 'translateY(12px)',
      transition: 'opacity 0.5s ease, transform 0.5s ease',
    } as const,
  })

  return (
    <>
      <BetaOverlay />
      <Navigation />
      <TableOfContents />

      <div
        className="max-w-[680px] mx-auto px-6 pb-16 font-serif text-[#1a1a1a] text-[17px] leading-[1.75]"
        style={{ paddingTop: 'calc(3rem + 48px)' }}
      >
        {/* Title + CTA */}
        <h1
          className="font-serif text-[32px] font-normal italic leading-tight mb-0"
          style={{ fontFamily: "'EB Garamond', Georgia, serif", marginTop: 'calc(11px * 1.75 + 0.75rem)' }}
        >
          Mapping the U.S. AI Policy Landscape
        </h1>
        <div className="flex gap-4 flex-wrap mb-10 mt-8">
          <a
            href="/map"
            className="inline-block font-mono text-[11px] tracking-wider uppercase px-6 py-2.5 bg-[#1a1a1a] text-white rounded no-underline hover:opacity-85 transition-opacity"
          >
            View Map (Beta)
          </a>
          <a
            href="/contribute"
            className="inline-block font-mono text-[11px] tracking-wider uppercase px-6 py-2.5 bg-transparent text-[#1a1a1a] border border-[#1a1a1a] rounded no-underline hover:bg-[#f8f7f5] transition-colors"
          >
            Contribute
          </a>
        </div>

        {/* What */}
        <div
          {...fadeProps(fi++)}
          id="what"
          className="font-mono text-[13px] font-medium tracking-[0.14em] uppercase text-[#555] mb-3 scroll-mt-16"
        >
          What
        </div>
        <p {...fadeProps(fi++)} className="mb-4 text-[16.5px]">
          We are building a comprehensive map of the individuals and groups with the potential to shape AI policy in the
          United States. The goal is to produce a structured, shareable, and dynamic resource that identifies{' '}
          <span className="font-medium">
            who is working on what, where the gaps are, and which partnerships might form
          </span>{' '}
          across ideological and organizational lines.
        </p>

        {/* Why Now */}
        <div
          {...fadeProps(fi++)}
          id="why-now"
          className="font-mono text-[13px] font-medium tracking-[0.14em] uppercase text-[#555] mb-3 scroll-mt-16"
        >
          Why Now
        </div>
        <p {...fadeProps(fi++)} className="mb-4 text-[16.5px]">
          <span className="font-medium">The landscape of AI policy in the U.S. is fragmented.</span> Safety researchers,
          frontier labs, legislators, civil society, and investors all have a stake in AI governance, yet there is no
          public resource showing where these actors stand on critical issues in AI. The 2026 midterms and 2028
          presidential elections are rapidly approaching, and these groups are laying the intellectual groundwork for
          candidates' technology platforms. A clear layout of the competing worldviews and theories of change is a
          necessary step to political coordination.{' '}
          <span className="font-medium">
            This work is long overdue—those who engage first will set the terms of the discussion.
          </span>
        </p>

        {/* The Gap */}
        <div
          {...fadeProps(fi++)}
          id="the-gap"
          className="font-mono text-[13px] font-medium tracking-[0.14em] uppercase text-[#555] mb-3 scroll-mt-16"
        >
          The Gap
        </div>
        <p {...fadeProps(fi++)} className="mb-4 text-[16.5px]">
          Michel Justen's{' '}
          <a
            href="https://substack.com/home/post/p-185759007"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#2563eb] no-underline hover:underline"
          >
            "A Guide to the AI Tribes"
          </a>{' '}
          provides a useful taxonomy of the ideological camps shaping AI discourse, while{' '}
          <a
            href="https://www.aisafety.com/map"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#2563eb] no-underline hover:underline"
          >
            aisafety.com
          </a>{' '}
          visualizes the safety ecosystem.{' '}
          <span className="font-medium">
            But we've yet to see anything that maps the full potential of the policy landscape
          </span>
          —civil society, industry, government—and where these actors stand on crucial governance questions, such as the
          technology's capabilities and the role of public policy. We aim to fill that gap.
        </p>

        {/* Who We're Mapping */}
        <div
          {...fadeProps(fi++)}
          id="who"
          className="font-mono text-[13px] font-medium tracking-[0.14em] uppercase text-[#555] mb-3 scroll-mt-16"
        >
          Who We're Mapping
        </div>
        <div {...fadeProps(fi++)} className="grid grid-cols-2 max-[600px]:grid-cols-1 gap-3 my-5">
          {WHO_GRID.map((item) => (
            <div
              key={item.title}
              className="bg-[#f8f7f5] rounded-md px-4 py-3.5 font-mono text-xs text-[#555] leading-normal border border-transparent transition-all duration-150 hover:-translate-y-0.5 hover:border-[#bbb]"
            >
              <span className="block font-serif text-[15px] font-medium text-[#1a1a1a] mb-1">{item.title}</span>
              {item.description}
            </div>
          ))}
        </div>

        {/* Vision */}
        <div
          {...fadeProps(fi++)}
          id="vision"
          className="font-mono text-[13px] font-medium tracking-[0.14em] uppercase text-[#555] mb-3 scroll-mt-16"
        >
          Vision
        </div>
        <p {...fadeProps(fi++)} className="mb-4 text-[16.5px]">
          By mapping key actors, we hope to identify and fuse a new partnership for AI governance. We intend this
          alliance to be as transformative for technology policy as the NSF, NIH, and DARPA were in the postwar period.{' '}
          <span className="font-medium">
            The goal is not just to regulate emerging technology, but to articulate a new social contract between the
            technological frontier and the public—and to build the institutions necessary to realize that vision.
          </span>
        </p>

        {/* Take Part */}
        <div
          {...fadeProps(fi++)}
          id="take-part"
          className="font-mono text-[13px] font-medium tracking-[0.14em] uppercase text-[#555] mb-3 scroll-mt-16"
        >
          Take Part
        </div>
        <p {...fadeProps(fi++)} className="mb-4 text-[16.5px]">
          We're compiling an initial list of organizations, individuals, and influential resources. If you work in or
          adjacent to any of the categories above, we welcome your input on who and what should be included.{' '}
          <a href="/contribute" className="text-[#2563eb] no-underline hover:underline">
            <span className="font-medium">Add a person, organization, or resource →</span>
          </a>
        </p>

        {/* Footer */}
        <div className="flex justify-center items-center gap-2 mt-12 pt-6 border-t border-[#bbb]/50">
          <a href="/about" className="font-mono text-[10.5px] text-[#888] tracking-wide no-underline">
            Mapping AI Working Group
          </a>
          <span className="font-mono text-[10.5px] text-[#888] tracking-wide">&middot; 2026</span>
          <span className="font-mono text-[10.5px] text-[#888] tracking-wide">&middot;</span>
          <a
            href="mailto:info@mapping-ai.org"
            className="font-mono text-[10.5px] text-[#888] tracking-wide no-underline inline-flex items-center gap-1"
          >
            <MailIcon />
            info@mapping-ai.org
          </a>
        </div>
        <div className="mt-2 font-mono text-[9px] text-[#888] tracking-tight text-center max-w-[600px] leading-normal">
          This tool is in a pre-launch beta. We are actively improving data and adding new features. Email{' '}
          <a href="mailto:info@mapping-ai.org" className="text-[#888]">
            info@mapping-ai.org
          </a>{' '}
          to contribute or provide feedback.
        </div>
      </div>
    </>
  )
}
