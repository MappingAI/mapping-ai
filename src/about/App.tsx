import { useState, useEffect, useRef, useCallback } from 'react'
import { Navigation } from '../components/Navigation'

/* ------------------------------------------------------------------ */
/*  Team data                                                          */
/* ------------------------------------------------------------------ */

interface TeamMember {
  name: string
  href: string
  role: string
  bio: string
}

const TEAM: TeamMember[] = [
  {
    name: 'Anushree Chaudhuri',
    href: 'https://www.linkedin.com/in/anushree-chaudhuri/',
    role: 'Working Group',
    bio: 'Anushree is a doctoral candidate at the University of Cambridge researching large-scale energy infrastructure. She has previously held roles in the Department of Energy and at MIT.',
  },
  {
    name: 'Olivia Sally',
    href: 'https://www.linkedin.com/in/oliviasally/',
    role: 'Working Group',
    bio: 'Olivia is a political strategist with experience in the White House and at multiple AI startups.',
  },
  {
    name: 'Pratyush Seshadri',
    href: 'https://www.linkedin.com/in/pratyushseshadri/',
    role: 'Working Group',
    bio: 'Pratyush is an economist with a background in finance, climate resilience, and energy infrastructure. He currently works for a labor economics research group.',
  },
  {
    name: 'Robby Hill',
    href: 'https://www.linkedin.com/in/robert-a-hill/',
    role: 'Working Group',
    bio: 'Robby is an expert in housing policy. He previously led outreach for a YIMBY organization and now serves as Chief Strategy Officer for a data analytics firm.',
  },
  {
    name: 'Sophia Wang',
    href: 'https://www.linkedin.com/in/sophia-j-wang/',
    role: 'Working Group',
    bio: 'Sophia leads research for a deep tech fund. She specializes in the development of highly autonomous systems and the design of new research institutions.',
  },
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
          This tool is in a pre-launch beta. We are actively improving data issues and enrichment,
          as well as adding new features and improving the UX.
        </p>
        <p className="text-[15px] leading-relaxed text-[#555] mb-5">
          Please email us at{' '}
          <a
            href="mailto:info@mapping-ai.org"
            className="text-[#2563eb] no-underline hover:underline"
          >
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
/*  Team card                                                          */
/* ------------------------------------------------------------------ */

function TeamCard({ member }: { member: TeamMember }) {
  const [open, setOpen] = useState(false)

  return (
    <div
      className={`bg-[#f8f7f5] rounded-md px-4 py-3.5 cursor-pointer border transition-all duration-150 ${
        open ? 'border-[#bbb]' : 'border-transparent hover:-translate-y-0.5 hover:border-[#bbb]'
      }`}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('a')) return
        setOpen(!open)
      }}
    >
      <div className="flex justify-between items-center mb-0.5">
        <div className="font-serif text-base font-medium text-[#1a1a1a]">
          <a
            href={member.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#2563eb] no-underline hover:underline"
          >
            {member.name}
          </a>
        </div>
        <button
          className={`font-mono text-sm leading-none text-[#888] bg-transparent border-none cursor-pointer px-0.5 shrink-0 transition-transform duration-200 ${
            open ? 'rotate-45' : ''
          }`}
          aria-label="Expand"
        >
          +
        </button>
      </div>
      <div className="font-mono text-[11px] text-[#888] tracking-wide">{member.role}</div>
      <div
        className={`font-serif text-[14.5px] text-[#555] leading-relaxed mt-2.5 overflow-hidden transition-all duration-500 ${
          open ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        {member.bio}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Mail icon (inline SVG)                                             */
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

      <div
        className="max-w-[680px] mx-auto px-6 pb-16 font-serif text-[#1a1a1a] text-[17px] leading-[1.75]"
        style={{ paddingTop: 'calc(3rem + 48px)' }}
      >
        {/* Eyebrow + title */}
        <div className="font-mono text-[11px] tracking-[0.12em] uppercase text-[#555] mb-3">
          Mapping AI—About
        </div>
        <h1
          className="font-serif text-[32px] font-normal italic leading-tight mb-8"
          style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
        >
          About this project
        </h1>

        {/* Who we are */}
        <div
          {...fadeProps(fi++)}
          className="font-mono text-[13px] font-medium tracking-[0.14em] uppercase text-[#555] mb-3"
        >
          Who we are
        </div>
        <p {...fadeProps(fi++)} className="mb-4 text-[16.5px]">
          We are a working group of researchers, policy experts, and practitioners building a
          comprehensive map of the U.S. AI policy landscape. Our goal is to identify who is shaping
          AI governance, where the coalitions are forming, and where the gaps are—and to use that
          map as the foundation for a coordinated policy agenda ahead of 2028.
        </p>

        <hr className="border-none border-t border-[#bbb]/50 my-10" />

        {/* What we believe */}
        <div
          {...fadeProps(fi++)}
          className="font-mono text-[13px] font-medium tracking-[0.14em] uppercase text-[#555] mb-3"
        >
          What we believe
        </div>
        <p {...fadeProps(fi++)} className="mb-4 text-[16.5px]">
          We take existential risks seriously and view the work of technical safety researchers,
          both in and out of frontier labs, as vitally important. But if we can avoid realizing
          existential outcomes, good governance will be critical to ensure human flourishing.
          Technical safety work is the prerequisite; governance is what shapes outcomes in the world
          where that work succeeds.
        </p>
        <p {...fadeProps(fi++)} className="mb-4 text-[16.5px]">
          Our organizing principle is distribution—not as an afterthought, and not as redistribution
          after the fact, but as the design criterion for how AI's benefits flow. The question that
          unifies labor, safety, national security, and institutional design is the same: who
          captures value from American innovation, and on what terms?
        </p>

        <hr className="border-none border-t border-[#bbb]/50 my-10" />

        {/* The team */}
        <div
          {...fadeProps(fi++)}
          className="font-mono text-[13px] font-medium tracking-[0.14em] uppercase text-[#555] mb-3"
        >
          The team
        </div>
        <div {...fadeProps(fi++)} className="grid grid-cols-2 max-[600px]:grid-cols-1 gap-3 my-5">
          {TEAM.map((member) => (
            <TeamCard key={member.name} member={member} />
          ))}
        </div>

        <hr className="border-none border-t border-[#bbb]/50 my-10" />

        {/* Other contributors */}
        <div
          {...fadeProps(fi++)}
          className="font-mono text-[13px] font-medium tracking-[0.14em] uppercase text-[#555] mb-3"
        >
          Other contributors
        </div>
        <p {...fadeProps(fi++)} className="mb-4 text-[16.5px]">
          Connor Mack
        </p>

        <hr className="border-none border-t border-[#bbb]/50 my-10" />

        {/* Get involved */}
        <div
          {...fadeProps(fi++)}
          className="font-mono text-[13px] font-medium tracking-[0.14em] uppercase text-[#555] mb-3"
        >
          Get involved
        </div>
        <p {...fadeProps(fi++)} className="mb-4 text-[16.5px]">
          If you work in or adjacent to AI policy, governance, safety, labor, or civil society, we
          welcome your contributions to the map.{' '}
          <a href="/contribute" className="text-[#2563eb] no-underline hover:underline">
            Add a person, organization, or resource →
          </a>
        </p>

        {/* Disclaimer */}
        <p
          {...fadeProps(fi++)}
          className="font-mono text-[11px] text-[#888] tracking-wide mt-10 leading-relaxed"
        >
          The views expressed on this site are our own and do not reflect the views of any of our
          employers or affiliated institutions.
        </p>

        {/* Footer */}
        <div className="flex justify-center items-center gap-2 mt-12 pt-6 border-t border-[#bbb]/50">
          <a
            href="/about"
            className="font-mono text-[10.5px] text-[#888] tracking-wide no-underline"
          >
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
          This tool is in a pre-launch beta. We are actively improving data and adding new features.
          Email{' '}
          <a href="mailto:info@mapping-ai.org" className="text-[#888]">
            info@mapping-ai.org
          </a>{' '}
          to contribute or provide feedback.
        </div>
      </div>
    </>
  )
}
