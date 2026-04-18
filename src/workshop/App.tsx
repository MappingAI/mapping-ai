import { useState, useEffect } from 'react'

const WORKSHOP_PASSWORD_HASH = '0097a985fe9f093319930d7c25ea42e46682b87b88a791d3b49c0094ba82a19d'

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function PasswordGate({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const hash = await hashPassword(password)
    if (hash === WORKSHOP_PASSWORD_HASH) {
      localStorage.setItem('workshop-authenticated', 'true')
      window.scrollTo(0, 0)
      onSuccess()
    } else {
      setError(true)
      setPassword('')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#faf9f7]">
      <div className="max-w-[400px] w-full px-8">
        <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#888] mb-4">
          Mapping AI Workshop
        </div>
        <h1
          className="text-[28px] font-normal italic leading-[1.2] mb-6"
          style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
        >
          Enter the workshop password
        </h1>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(false) }}
            placeholder="Password"
            className={`w-full px-4 py-3 border rounded-md font-mono text-[14px] outline-none transition-colors ${
              error ? 'border-red-400 bg-red-50' : 'border-[#ccc] focus:border-[#2563eb]'
            }`}
            autoFocus
          />
          {error && (
            <p className="text-red-500 text-[13px] mt-2 font-mono">Incorrect password</p>
          )}
          <button
            type="submit"
            className="mt-4 w-full bg-[#2563eb] text-white py-3 rounded-md font-mono text-[13px] tracking-[0.05em] hover:bg-[#1d4ed8] transition-colors"
          >
            Enter
          </button>
        </form>
      </div>
    </div>
  )
}

export function App() {
  const [authenticated, setAuthenticated] = useState(() => {
    return localStorage.getItem('workshop-authenticated') === 'true'
  })
  const [activeSection, setActiveSection] = useState('overview')

  useEffect(() => {
    const sections = [
      'overview',
      'streams',
      'stream-1',
      'stream-2',
      'stream-3',
      'stream-4',
      'stream-5',
      'stream-6',
      'setup',
    ]

    const handleScroll = () => {
      const scrollY = window.scrollY + 80 // offset for nav

      // Check if at bottom of page
      if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 8) {
        setActiveSection('setup')
        return
      }

      // Find the current section
      for (let i = sections.length - 1; i >= 0; i--) {
        const sectionId = sections[i]
        if (!sectionId) continue
        const el = document.getElementById(sectionId)
        if (el && el.getBoundingClientRect().top + window.scrollY <= scrollY) {
          setActiveSection(sectionId)
          return
        }
      }
      setActiveSection('overview')
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Initial check
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (!authenticated) {
    return <PasswordGate onSuccess={() => setAuthenticated(true)} />
  }

  return (
    <>
      {/* Site nav matching main site */}
      <nav className="fixed top-0 left-0 right-0 z-[100] flex justify-between items-center bg-white/92 backdrop-blur-sm border-b border-[#bbb] px-8 py-[0.85rem]">
        <a
          href="https://mapping-ai.org"
          className="font-mono text-[12px] tracking-[0.1em] uppercase text-text-primary no-underline"
        >
          Mapping AI
        </a>
        <div className="flex gap-8">
          <a
            href="https://mapping-ai.org/"
            className="font-mono text-[12px] tracking-[0.1em] uppercase text-text-secondary no-underline hover:text-text-primary"
          >
            Background
          </a>
          <a
            href="https://mapping-ai.org/contribute"
            className="font-mono text-[12px] tracking-[0.1em] uppercase text-text-secondary no-underline hover:text-text-primary"
          >
            Contribute
          </a>
          <a
            href="https://mapping-ai.org/map"
            className="font-mono text-[12px] tracking-[0.1em] uppercase text-text-secondary no-underline hover:text-text-primary"
          >
            Map
          </a>
          <a
            href="https://mapping-ai.org/about"
            className="font-mono text-[12px] tracking-[0.1em] uppercase text-text-secondary no-underline hover:text-text-primary"
          >
            About
          </a>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-[720px] mx-auto px-8 pt-24 pb-8 max-[600px]:px-4">
        <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-tertiary mb-4">
          Mapping Party
        </div>
        <h1
          className="text-[36px] font-normal italic leading-[1.2] mb-5 max-[600px]:text-[26px]"
          style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
        >
          Help us map the people, organizations, and ideas shaping U.S. AI
          policy
        </h1>
        <p
          className="text-[19px] text-text-secondary leading-[1.55]"
          style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
        >
          We&rsquo;ve been building a stakeholder map of the American AI policy
          landscape and it&rsquo;s almost ready for a public launch. Pick a
          stream below and get started.
        </p>

        {/* Quick Links */}
        <div className="mt-8 bg-[#f5f4f2] border border-[#e0dfdd] rounded-lg p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#888] mb-3">
            Quick Links
          </div>
          <div className="flex flex-wrap gap-3 mb-4">
            <a
              href="/workshop/slides.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#2563eb] text-white rounded-md font-mono text-[12px] no-underline hover:bg-[#1d4ed8] transition-colors"
            >
              Slides
            </a>
            <a
              href="https://discord.gg/2gntpaxV"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#5865F2] text-white rounded-md font-mono text-[12px] no-underline hover:bg-[#4752c4] transition-colors"
            >
              Discord Server
            </a>
            <a
              href="https://github.com/MappingAI/mapping-ai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#24292e] text-white rounded-md font-mono text-[12px] no-underline hover:bg-[#1a1e22] transition-colors"
            >
              GitHub Repo
            </a>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#888] mb-2 mt-4">
            Environment Files (Doppler)
          </div>
          <div className="space-y-2 font-mono text-[12px]">
            <div className="flex flex-wrap items-center gap-2">
              <a
                href="https://share.doppler.com/s/me5nqn6qqd1ime0bwnc53sxrnaqkqzhqnlxaoqbg"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#2563eb] no-underline hover:underline"
              >
                .env.debugging
              </a>
              <code className="text-[10px] bg-[#e8e7e5] px-2 py-0.5 rounded text-[#555] select-all">
                2bmjRVgjtZd0LWTKbqRrtUHj6XamG8L9XmIUxXYvNkKhv330TL1xZJNpUD9G52aA
              </code>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href="https://share.doppler.com/s/tla4as7kd6w61axclos7gsfyoqlxuojnw9y4vofy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#2563eb] no-underline hover:underline"
              >
                .env.enrichment
              </a>
              <code className="text-[10px] bg-[#e8e7e5] px-2 py-0.5 rounded text-[#555] select-all">
                XgiIWtraTUNwHWqf3D01aKBV3nWD0y9nihjXbSXDHQ1914oofOXDWdXuxO03kaSs
              </code>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href="https://share.doppler.com/s/pkjtfqg6ymme8uelkjcyurlmdidxbumqspt9a673"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#2563eb] no-underline hover:underline"
              >
                .env.seeding
              </a>
              <code className="text-[10px] bg-[#e8e7e5] px-2 py-0.5 rounded text-[#555] select-all">
                oJd3coZJjT91rtXs9sep33U7D0shACS8c3kmu6yN1MeXac6cswFBpFyfKx8LsYIX
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* Left sidebar TOC - only visible on wide screens */}
      <nav className="hidden min-[1100px]:block fixed top-1/2 -translate-y-1/2 w-[160px] left-8">
        <TocLink href="#overview" active={activeSection === 'overview'}>Overview</TocLink>
        <TocLink href="#streams" active={activeSection === 'streams'}>Streams</TocLink>
        <TocLink href="#stream-1" active={activeSection === 'stream-1'}>1. Bug Hunting</TocLink>
        <TocLink href="#stream-2" active={activeSection === 'stream-2'}>2. Data Enrichment</TocLink>
        <TocLink href="#stream-3" active={activeSection === 'stream-3'}>3. Data Quality</TocLink>
        <TocLink href="#stream-4" active={activeSection === 'stream-4'}>4. New Features</TocLink>
        <TocLink href="#stream-5" active={activeSection === 'stream-5'}>5. Outreach</TocLink>
        <TocLink href="#stream-6" active={activeSection === 'stream-6'}>6. Data Viz</TocLink>
        <TocLink href="#setup" active={activeSection === 'setup'}>Quick Reference</TocLink>
      </nav>

      {/* Content */}
      <div
        className="max-w-[720px] mx-auto px-8 pb-16 text-[17px] leading-[1.65] text-text-primary max-[600px]:px-4"
        style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
      >
        {/* OVERVIEW */}
        <SectionHeading id="overview">What is Mapping AI?</SectionHeading>

        <p className="mb-4">
          <a
            href="https://mapping-ai.org/map"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent no-underline hover:text-[#1d4ed8] hover:underline"
          >
            Mapping AI
          </a>{' '}
          is an interactive visualization of everyone who matters in U.S. AI
          policy. Think policymakers, lab executives, researchers, civil society
          groups, investors, journalists. The map shows who they are, what they
          believe about AI regulation, how they&rsquo;re connected, and what
          resources they&rsquo;ve published.
        </p>

        <p className="mb-4">
          The database currently has about <strong>706 people</strong>,{' '}
          <strong>717 organizations</strong>, and{' '}
          <strong>149 resources</strong>, linked by{' '}
          <strong>2,143 relationships</strong>. These are the publicly visible
          entities on the map. There are additional pending entries in the
          review queue.
        </p>

        <p className="mb-4">
          The tech stack is simple: React + Vite for the frontend, D3.js for the
          visualization, PostgreSQL on AWS, and a few Lambda functions for form
          submissions and search. People submit data through a form on the site,
          it goes into a review queue, and approved entries show up on the map.
        </p>

        <Callout>
          <strong>The site is in beta.</strong> We soft-launched to a small group
          a week ago. The data is messy. The UI has rough edges. Some features
          are half-built. That&rsquo;s why you&rsquo;re here.
          <br /><br />
          <strong>Use the Discord forum channels</strong> to track bugs, post feature
          requests, share research questions, viz ideas, and coordinate with others.
          Each thread becomes a trackable item.
        </Callout>

        <div className="flex flex-wrap gap-3 mb-6">
          <a
            href="https://discord.gg/2gntpaxV"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-white text-[13px] font-mono uppercase tracking-[0.06em] no-underline hover:no-underline"
            style={{ background: '#5865F2' }}
          >
            Join Discord
          </a>
          <a
            href="https://docs.google.com/document/d/1DrQl909NOVmX3ZAo9pZuOuCGqhSehjjgMWDmWrDuzVo/edit?usp=sharing"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#f8f7f5] border border-[#bbb] text-[13px] font-mono uppercase tracking-[0.06em] text-text-primary no-underline hover:no-underline hover:border-text-secondary"
          >
            Research Questions Doc
          </a>
          <a
            href="https://mapping-ai.org/map"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#1a1a1a] text-white text-[13px] font-mono uppercase tracking-[0.06em] no-underline hover:no-underline hover:bg-[#333]"
          >
            View the Map
          </a>
        </div>

        {/* SCHEDULE */}
        <SectionHeading>Schedule</SectionHeading>

        <table className="w-full border-collapse mb-4 text-[16px]">
          <thead>
            <tr>
              <th className="font-mono text-[11px] uppercase tracking-[0.08em] text-left p-2 border-b-2 border-text-primary text-text-secondary">
                Time
              </th>
              <th className="font-mono text-[11px] uppercase tracking-[0.08em] text-left p-2 border-b-2 border-text-primary text-text-secondary">
                What
              </th>
            </tr>
          </thead>
          <tbody>
            {[
              ['7:00', 'Pizza, ice cream floats, welcome/mingle'],
              [
                '7:30',
                'Project walkthrough (live demo of the map, contribute form, admin panel); stream overview, pick your group',
              ],
              ['7:50', 'Work session'],
              ['9:30', 'Discussion: big picture, next steps'],
              ['10:00', 'Wrap'],
            ].map(([time, what], i) => (
              <tr key={i}>
                <td className="p-2 border-b border-[#eee] align-top">
                  {time}
                </td>
                <td className="p-2 border-b border-[#eee] align-top">
                  {what}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* STREAMS */}
        <SectionHeading id="streams">Streams</SectionHeading>

        <p className="mb-4">
          Pick whichever stream sounds most interesting. You can switch
          mid-session if you want. Each stream has its own instructions below.
        </p>

        <div className="mb-4">
          {[
            { href: '#stream-1', label: '1. Bug Hunting' },
            { href: '#stream-2', label: '2. Data Enrichment & Seeding' },
            {
              href: '#stream-3',
              label: '3. Data Quality & Verification',
            },
            { href: '#stream-4', label: '4. New Features' },
            {
              href: '#stream-5',
              label: '5. Outreach, Policy, Big Picture',
            },
            {
              href: '#stream-6',
              label: '6. Data Viz & Research Insights',
            },
          ].map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="block py-[0.3rem] text-text-secondary font-mono text-[13px] no-underline hover:text-text-primary hover:no-underline"
            >
              {label}
            </a>
          ))}
        </div>

        <Divider />

        {/* STREAM 1 */}
        <StreamHeading id="stream-1">Stream 1: Bug Hunting</StreamHeading>
        <StreamTag>
          Best for: anyone with a browser and an eye for detail
        </StreamTag>

        <p className="mb-4">
          Your job is to break things. Open the site, click around, try weird
          inputs, resize your window, test on your phone. When something looks
          off or doesn&rsquo;t work right, write it up.
        </p>

        <H4>Where to look</H4>

        <p className="mb-4">
          <strong>
            <ExtLink href="https://mapping-ai.org/map">The map</ExtLink>
          </strong>{' '}
          is where most of the complexity lives. Try searching for people and
          organizations. Click nodes to see their detail panel. Toggle between
          the Network and Plot views using the buttons at the top. Try the
          filter chips on the left. Zoom in and out. Collapse and expand the
          controls sidebar. Open the contribute panel from the map page and see
          if it plays nicely with the sidebar.
        </p>

        <p className="mb-4">
          <strong>
            <ExtLink href="https://mapping-ai.org/contribute">
              The contribute form
            </ExtLink>
          </strong>{' '}
          has three tabs: Person, Organization, Resource. Each has custom
          dropdowns, tag inputs, location search (powered by
          Photon/OpenStreetMap), org search, and a rich text editor for notes.
          Fill out a form completely and submit it. Try the org search. Try
          creating a new org from the inline panel that slides in. Try the
          @mention feature in the notes field. Check what happens if you leave
          required fields blank.
        </p>

        <p className="mb-4">
          <strong>
            <ExtLink href="https://mapping-ai.org">The homepage</ExtLink>
          </strong>{' '}
          and{' '}
          <strong>
            <ExtLink href="https://mapping-ai.org/about">
              about page
            </ExtLink>
          </strong>{' '}
          are simpler but still worth checking. Test navigation between pages.
          Check mobile responsiveness on all of them.
        </p>

        <H4>How to report bugs</H4>

        <p className="mb-4">
          Log bugs in{' '}
          <ExtLink href="https://docs.google.com/document/d/134ZCFOo-hRDqw9ddzMhq7eHEJ3XuuikI7RoMIMDhWL4/edit?usp=sharing">
            this shared doc
          </ExtLink>{' '}
          using this format:
        </p>

        <Pre>{`Page: [which page]
What I did: [steps to reproduce]
What I expected: [what should have happened]
What happened: [what actually happened]
Browser/device: [Chrome on Mac, Safari on iPhone, etc.]
Screenshot: [paste one if you can]`}</Pre>

        <p className="mb-4">
          Functional stuff takes priority over cosmetic stuff. A dropdown that
          won&rsquo;t close matters more than a font that looks slightly off.
          But note both if you see them.
        </p>

        <Divider />

        {/* STREAM 2 */}
        <StreamHeading id="stream-2">
          Stream 2: Data Enrichment &amp; Seeding
        </StreamHeading>
        <StreamTag>
          Best for: people who follow AI policy or enjoy research
        </StreamTag>

        <p className="mb-4">
          The map is only as useful as its data. Most entities now have notes,
          but many are thin, unsourced, or out of date. Your job today is to add
          new entities we&rsquo;re missing and flesh out ones that are already
          there.
        </p>

        <p className="mb-4">
          <strong>Start by exploring the current data.</strong> Browse{' '}
          <ExtLink href="https://mapping-ai.org/map">the map</ExtLink> to see
          what&rsquo;s there. You also have access to the staging database (via
          the <Code>.env</Code> file) and can query it directly or look at the
          exported <Code>map-data.json</Code>. This will help you identify gaps
          and avoid duplicating work.
        </p>

        <H4>What to add</H4>

        <p className="mb-4">
          Think about who&rsquo;s missing. Search the map first (the search bar
          on{' '}
          <ExtLink href="https://mapping-ai.org/map">map.html</ExtLink>
          {' '}works well for this) to make sure the person or org isn&rsquo;t
          already there. Some categories that could use more coverage:
        </p>

        <ul className="mb-4 pl-6">
          <li className="mb-[0.35rem]">
            State-level policymakers working on AI (governors, AGs, state
            legislators)
          </li>
          <li className="mb-[0.35rem]">
            Congressional staffers and committee staff who actually draft AI
            bills
          </li>
          <li className="mb-[0.35rem]">
            AI companies beyond the big labs (defense tech, enterprise AI, AI
            infra)
          </li>
          <li className="mb-[0.35rem]">
            Civil society groups, labor unions, and advocacy organizations
          </li>
          <li className="mb-[0.35rem]">
            International organizations with significant U.S. influence (OECD AI
            Policy Observatory, UN AI Advisory Body)
          </li>
          <li className="mb-[0.35rem]">
            Recent key resources: executive orders, major reports, landmark
            papers, influential essays or books
          </li>
        </ul>

        <H4>How to submit</H4>

        <p className="mb-4">
          There are two options:
        </p>

        <p className="mb-4">
          <strong>Option 1: Direct to staging database (recommended for workshop)</strong>
          <br />
          You&rsquo;ll receive a <Code>.env</Code> file with credentials for the
          staging database, which lets you read and write directly via SQL. This
          is a complete copy of production data that you can freely modify
          without affecting the live site. See{' '}
          <Code>workshop/DATABASE-ORIENTATION.md</Code> for the full schema
          reference, example queries, and quality guidelines.
        </p>

        <p className="mb-4">
          <strong>Option 2: Live contribute form</strong>
          <br />
          Go directly to{' '}
          <ExtLink href="https://mapping-ai.org/contribute">
            mapping-ai.org/contribute
          </ExtLink>{' '}
          and submit there. Entries go into the production database and will
          appear on the live map after admin approval.
        </p>

        <p className="mb-4">
          A few things worth knowing about the form:
        </p>

        <p className="mb-4">
          The <strong>relationship pills</strong> at the top of each form
          matter. If you&rsquo;re submitting info about yourself, pick &ldquo;I
          am this person.&rdquo; If you know the person and can introduce us,
          pick &ldquo;I can connect you.&rdquo; Otherwise, pick &ldquo;Someone I
          know of.&rdquo; These affect how the data gets weighted.
        </p>

        <p className="mb-4">
          The <strong>notes field</strong> is the most important part. Write 2-4
          sentences explaining why this person or organization matters to U.S.
          AI policy. Don&rsquo;t just copy their bio from Wikipedia. Focus on
          what they&rsquo;ve done, said, or funded that shapes how AI gets built
          or governed in America. Use the @mention feature to link to other
          entities in the database.
        </p>

        <p className="mb-4">
          For <strong>belief fields</strong> (regulatory stance, AGI timeline, AI
          risk level), only fill these in if you have actual evidence. A direct
          quote, testimony, published position paper. Leave them blank rather
          than guessing.
        </p>

        <p className="mb-4">
          Here&rsquo;s what a good person entry looks like:
        </p>

        <Callout>
          <strong>Name:</strong> Chuck Schumer
          <br />
          <strong>Title:</strong> U.S. Senator, NY; Senate Majority Leader
          (2021-2025), Senate Minority Leader (2017-2021, 2025-present)
          <br />
          <strong>Category:</strong> Policymaker
          <br />
          <strong>Primary Org:</strong> United States Senate
          <br />
          <strong>Other Orgs:</strong> Bipartisan Senate AI Working Group
          (Co-founder/Leader), Senate Finance Committee, Senate Rules Committee
          <br />
          <strong>Location:</strong> New York, NY
          <br />
          <strong>Twitter:</strong> @SenSchumer
          <br />
          <strong>Notes:</strong> Chuck Schumer is a Democratic U.S. Senator from
          New York who has served since 1999 and is currently Senate Majority
          Leader. He led a bipartisan working group that released a 31-page AI
          policy roadmap in May 2024, recommending at least $32 billion in
          government spending to accelerate AI research and development. The
          roadmap was developed after months of AI Insight Forums with tech
          companies, civil rights leaders, and other stakeholders. Schumer has
          described regulating artificial intelligence as &ldquo;a challenge for
          Congress unlike any other&rdquo; and has made election protection from
          AI interference a high priority.
          <br />
          <strong>Regulatory stance:</strong> Moderate
          <br />
          <strong>Stance detail:</strong> Advocates for &lsquo;Safe Innovation
          Framework&rsquo; emphasizing innovation as &lsquo;North Star&rsquo;
          while establishing necessary guardrails.
          <br />
          <strong>AGI timeline:</strong> 5-10 years
          <br />
          <strong>AI risk level:</strong> Serious
          <br />
          <strong>Threat models:</strong> Labor displacement, Power concentration,
          Democratic erosion, Misinformation
        </Callout>

        <H4>Quality over quantity</H4>

        <p className="mb-4">
          Five well-researched submissions with sourced notes are worth more than
          twenty stubs with just a name and title. Everything goes through admin
          review before it shows up on the map, so don&rsquo;t worry about
          making mistakes. But do your homework.
        </p>

        <Divider />

        {/* STREAM 3 */}
        <StreamHeading id="stream-3">
          Stream 3: Data Quality &amp; Verification
        </StreamHeading>
        <StreamTag>
          Best for: skeptics, fact-checkers, people who enjoy catching errors
        </StreamTag>

        <p className="mb-4">
          The database was built through a combination of manual research, web
          scraping, and AI-assisted enrichment. That means it contains
          unverifiable claims, formatting artifacts, stale information, and
          outright fabrications. Your job is to find and flag these problems.
        </p>

        <H4>Known issues to look for</H4>

        <ul className="mb-4 pl-6">
          <li className="mb-[0.35rem]">
            <strong>Hallucinated facts.</strong> The AI-generated notes sometimes
            include claims that sound very specific and plausible but are just
            wrong. Suspiciously precise founding dates, round dollar amounts,
            inflated competition results, awards that don&rsquo;t exist. If
            something sounds weirdly specific, it&rsquo;s worth a quick check.
          </li>
          <li className="mb-[0.35rem]">
            <strong>Stale information.</strong> Some entries list people at
            organizations they&rsquo;ve since left. Government officials who
            changed roles after the 2025 transition come up a lot.
          </li>
          <li className="mb-[0.35rem]">
            <strong>Wrong org affiliations.</strong> Primary org set to a
            completely different entity with a similar-sounding name. These are
            especially bad because they create false connections on the map.
          </li>
          <li className="mb-[0.35rem]">
            <strong>Edges missing evidence.</strong> About 30% of relationships
            have no supporting evidence. If a relationship seems questionable,
            check whether there&rsquo;s evidence for it.
          </li>
          <li className="mb-[0.35rem]">
            <strong>Thin or missing context.</strong> Notes that are technically
            accurate but don&rsquo;t explain why someone matters to AI policy.
            &ldquo;John Smith is the CEO of Acme Corp&rdquo; is less useful than
            explaining what Acme Corp does and why it&rsquo;s relevant.
          </li>
        </ul>

        <H4>How to fix issues</H4>

        <p className="mb-4">
          When you find something wrong, fix it directly:
        </p>

        <ul className="mb-4 pl-6">
          <li className="mb-[0.35rem]">
            <strong>Option 1: Staging database.</strong> Use the <Code>.env</Code>{' '}
            file credentials to connect to the staging DB and run UPDATE queries.
            See <Code>workshop/DATABASE-ORIENTATION.md</Code> for examples.
          </li>
          <li className="mb-[0.35rem]">
            <strong>Option 2: Contribute form.</strong> Go to{' '}
            <ExtLink href="https://mapping-ai.org/contribute">
              mapping-ai.org/contribute
            </ExtLink>{' '}
            and submit a correction. This goes into the production review queue.
          </li>
        </ul>

        <p className="mb-4">
          Start with well-known figures whose facts you can check from memory.
          Then move to less-familiar entities where you&rsquo;ll need to do some
          quick googling.
        </p>

        <Divider />

        {/* STREAM 4 */}
        <StreamHeading id="stream-4">Stream 4: New Features</StreamHeading>
        <StreamTag>Best for: developers who want to write code</StreamTag>

        <p className="mb-4">
          It&rsquo;s a React + Vite site with a D3.js map, AWS Lambda functions
          for the API, and a PostgreSQL database. If you can write TypeScript,
          React, CSS, or Node.js, you can contribute.
        </p>

        <H4>Prerequisites</H4>

        <p className="mb-4">
          You need <strong>Node.js 20+</strong> and <strong>npm</strong>.
          If you don&rsquo;t have them:
        </p>

        <Pre>{`# macOS (with Homebrew)
brew install node

# Or use nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 20 && nvm use 20`}</Pre>

        <H4>Getting set up</H4>

        <p className="mb-4">Clone the repo, install dependencies, and set up pre-commit hooks:</p>

        <Pre>{`git clone https://github.com/MappingAI/mapping-ai.git
cd mapping-ai
npm ci
brew install lefthook
lefthook install`}</Pre>

        <p className="mb-4">
          Create a <Code>.env</Code> file with database credentials (shared via
          Doppler, or ask an organizer). See{' '}
          <Code>workshop/DATABASE-ORIENTATION.md</Code> for details.
        </p>

        <p className="mb-4">Start two terminals for local dev:</p>

        <Pre>{`# Terminal 1: React dev server (all pages except map)
npx vite dev          # http://localhost:5173

# Terminal 2: API proxy + map page
node dev-server.js    # http://localhost:3000`}</Pre>

        <p className="mb-4">
          Visit <Code>localhost:5173</Code> for React pages (contribute, admin, insights, about).
          Visit <Code>localhost:3000</Code> for the map (it&rsquo;s inline HTML, not React).
          API calls from the Vite dev server proxy through to localhost:3000.
        </p>

        <H4>Useful commands</H4>

        <Pre>{`npm run lint          # Check for lint errors
npm run format        # Auto-format with Prettier
npm run typecheck     # TypeScript type checking
npm run test          # Run tests`}</Pre>

        <p className="mb-4">
          Pre-commit hooks run automatically (typecheck + lint + format).
          If a commit fails the hook, fix the issue and commit again.
        </p>

        <p className="mb-4">
          If you&rsquo;re working with the staging database (for data-related
          features), you&rsquo;ll need the <Code>.env</Code> file - see{' '}
          <Code>workshop/DATABASE-ORIENTATION.md</Code>.
        </p>

        <H4>Project structure</H4>

        <p className="mb-4">The important files:</p>

        <table className="w-full border-collapse mb-4 text-[16px]">
          <thead>
            <tr>
              <th className="font-mono text-[11px] uppercase tracking-[0.08em] text-left p-2 border-b-2 border-text-primary text-text-secondary">
                File
              </th>
              <th className="font-mono text-[11px] uppercase tracking-[0.08em] text-left p-2 border-b-2 border-text-primary text-text-secondary">
                What it does
              </th>
            </tr>
          </thead>
          <tbody>
            {(
              [
                [
                  'src/map/',
                  'The D3.js map components. Loads map-data.json, a static file generated from the database.',
                ],
                [
                  'src/contribute/',
                  'The submission forms. Custom dropdowns, tag inputs, org search, location search, TipTap rich text editor, autosave.',
                ],
                [
                  'src/admin/',
                  'Admin panel for reviewing submissions, editing entities, managing the approval queue.',
                ],
                [
                  'src/components/',
                  'Shared React components: CustomSelect, TagInput, TipTapEditor, Navigation, etc.',
                ],
                [
                  'api/*.js',
                  'Lambda functions. submit.js handles form submissions, search.js does full-text search, admin.js handles the review queue.',
                ],
                [
                  'template.yaml',
                  'AWS SAM template defining all the infrastructure.',
                ],
              ] as const
            ).map(([file, desc], i) => (
              <tr key={i}>
                <td className="p-2 border-b border-[#eee] align-top">
                  <Code>{file}</Code>
                </td>
                <td className="p-2 border-b border-[#eee] align-top">
                  {desc}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <H4>Feature ideas</H4>

        <p className="mb-4">
          These are roughly ordered by complexity. Pick whatever interests you,
          or pitch your own idea.
        </p>

        <p className="mb-4">
          <strong>Shareable entity links.</strong> Right now, clicking a node on
          the map doesn&rsquo;t update the URL. It&rsquo;d be useful to have{' '}
          <Code>map.html?entity=123</Code> or{' '}
          <Code>map.html?name=OpenAI</Code> that auto-selects and zooms to that
          entity on load. Good starter project.
        </p>

        <p className="mb-4">
          <strong>Timeline view.</strong> The database has edge start/end dates
          (when someone joined or left an org, when a relationship began). A
          timeline slider or playback feature that shows how the network evolved
          over time would be compelling.
        </p>

        <p className="mb-4">
          <strong>Improved Plot view.</strong> The Plot view (scatter/beeswarm)
          works but could use better axis labels, a legend, and maybe the
          ability to color by a different dimension than the axes.
        </p>

        <p className="mb-4">
          <strong>Entity diff / edit history.</strong> The database tracks
          submissions but there&rsquo;s no UI for seeing what changed over time
          for a given entity. An audit trail would help with data quality.
        </p>

        <p className="mb-4">
          <strong>Export / embed.</strong> Let people export a filtered view of
          the map as a PNG or SVG, or generate an embed snippet for a specific
          cluster or entity.
        </p>

        <p className="mb-4">
          Before starting on something, check the{' '}
          <ExtLink href="https://discord.gg/2gntpaxV">
            Discord
          </ExtLink>{' '}
          to see what others are working on and post what you&rsquo;re tackling.
          When you&rsquo;re done, open a pull request against <Code>main</Code>.
        </p>

        <H4>Conventions</H4>

        <p className="mb-4">
          Commit messages use conventional prefixes: <Code>feat:</Code>,{' '}
          <Code>fix:</Code>, <Code>refactor:</Code>, <Code>docs:</Code>. There
          are no tests (yes, we know). CSS is inline per page, not in a shared
          stylesheet. The map loads <Code>map-data.json</Code> which uses
          different field names than the database (there&rsquo;s a mapping layer
          in <Code>api/export-map.js</Code>). Read the <Code>CLAUDE.md</Code>{' '}
          in the repo root for full documentation of the schema, field mappings,
          and architecture.
        </p>

        <Divider />

        {/* STREAM 5 */}
        <StreamHeading id="stream-5">
          Stream 5: Outreach, Policy, Big Picture
        </StreamHeading>
        <StreamTag>
          Best for: people who think about audiences, distribution, and strategy
        </StreamTag>

        <p className="mb-4">
          The tool exists. The question now is who uses it and why. This stream
          is about figuring out how Mapping AI fits into the broader AI policy
          conversation and how to get it in front of the people who&rsquo;d
          benefit from it.
        </p>

        <H4>Questions to discuss</H4>

        <p className="mb-4">
          <strong>Who is this for?</strong> Journalists covering AI? Hill
          staffers researching a bill? Academics studying the policy landscape?
          Advocacy groups planning campaigns? AI company employees trying to
          understand the regulatory environment? The answer shapes everything
          from what data we prioritize to how we describe the project.
        </p>

        <p className="mb-4">
          <strong>What&rsquo;s the pitch?</strong> When you tell someone about
          Mapping AI in one sentence, what do you say? We&rsquo;ve been
          describing it as &ldquo;an interactive map of the U.S. AI policy
          ecosystem&rdquo; but that&rsquo;s abstract. What would make someone
          actually click the link?
        </p>

        <p className="mb-4">
          <strong>Where do we distribute?</strong> Think about specific channels.
          Which Substacks, podcasts, Slack communities, Twitter/Bluesky accounts,
          university departments, think tank mailing lists, or congressional
          offices should know about this? Make a concrete list with contact info
          or links where possible.
        </p>

        <p className="mb-4">
          <strong>What partnerships make sense?</strong> Are there organizations
          doing adjacent work who might want to co-brand, share data, or link to
          the map from their own resources? Think about groups like the AI Policy
          Institute, the Federation of American Scientists, university AI policy
          programs, or journalism outlets that cover AI.
        </p>

        <p className="mb-4">
          <strong>What should we write about?</strong> We&rsquo;re planning to
          publish research insights from the database (see Stream 6). What
          angles would get attention? What would be genuinely useful to the
          policy community vs. what would just be content for content&rsquo;s
          sake?
        </p>

        <H4>Deliverable</H4>

        <p className="mb-4">
          By the end of the session, write up your ideas in{' '}
          <ExtLink href="https://docs.google.com/document/d/1WNVM22lGeCOcZHvi5KwF9Yn9be6T6V7xbsocL0SQsLQ/edit?usp=sharing">
            this shared doc
          </ExtLink>
          . This could include target audiences, distribution channels, pitch
          ideas, partnership leads, content angles — whatever feels most useful.
        </p>

        <Divider />

        {/* STREAM 6 */}
        <StreamHeading id="stream-6">
          Stream 6: Data Viz &amp; Research Insights
        </StreamHeading>
        <StreamTag>
          Best for: data people, researchers, anyone curious about patterns
        </StreamTag>

        <p className="mb-4">
          The database is full of interesting data that nobody has really
          explored yet. Regulatory stances, AGI timeline beliefs, organizational
          affiliations, funding relationships, geographic clusters. Your job is
          to pull insights out of it and sketch visualizations or blog post
          drafts we could publish.
        </p>

        <p className="mb-4">
          See{' '}
          <ExtLink href="https://mapping-ai.org/insights">
            mapping-ai.org/insights
          </ExtLink>{' '}
          for examples of what this could look like.
        </p>

        <H4>Getting the data</H4>

        <p className="mb-4">
          The full dataset is available as a single JSON file:
        </p>
        <Pre>https://mapping-ai.org/map-full.json</Pre>

        <p className="mb-4">
          This includes all entities (people, organizations, resources), their
          relationships, scores, notes, and metadata. You can fetch and work
          with it in whatever you prefer: Python (pandas, matplotlib, seaborn),
          R, Observable notebooks, Excel.
        </p>

        <p className="mb-4">
          We also have the full database export (including pending and internal
          entities) if you want it. Just ask.
        </p>

        <H4>Research questions worth exploring</H4>

        <Callout>
          <strong>Full research questions doc:</strong>{' '}
          <ExtLink href="https://docs.google.com/document/d/1DrQl909NOVmX3ZAo9pZuOuCGqhSehjjgMWDmWrDuzVo/edit?usp=sharing">
            Research Questions (Google Doc)
          </ExtLink>
        </Callout>

        <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.1em] text-[#2563eb]">
          Priority Questions
        </p>

        <p className="mb-4">
          <strong>Outlier Stances.</strong> Which people and organizations hold the most
          outlier positions on AI regulation, AGI timelines, and the overall level
          of AI risk? <em>Viz: Plot view (2D plot / political compass style)</em>
        </p>

        <p className="mb-4">
          <strong>Funding Overlap.</strong> What is the overlap in funding sources
          between AI safety organizations and AI accelerationist organizations?{' '}
          <em>Viz: Case studies illustrating graph structure (nodes and edges)</em>
        </p>

        <p className="mb-4">
          <strong>Structural Conflicts of Interest.</strong> Which philanthropies
          and VCs provide simultaneous funding to both frontier AI labs and the
          think tanks that produce AI governance frameworks?{' '}
          <em>Viz: Graph structure (nodes and edges)</em>
        </p>

        <p className="mb-4">
          <strong>Crosspartisan Convergence.</strong> Where do organizations from
          opposite ends of the political spectrum converge on specific AI policy
          positions, such as state preemption, open source, or compute governance?{' '}
          <em>Viz: Mapping partisan lines (1D plot) or graph of outlier stances</em>
        </p>

        <p className="mb-4">
          <strong>Network Centrality.</strong> Based on connection count, who are the
          ten most structurally central individuals in US AI governance?{' '}
          <em>Viz: Rank view</em>
        </p>

        <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.1em] text-text-tertiary">
          More questions to explore
        </p>

        <p className="mb-4">
          <strong>The regulatory stance landscape.</strong> How do different
          sectors break down on AI regulation? Are frontier labs more
          &ldquo;light-touch&rdquo; than think tanks? How do researchers compare
          to executives? A stacked bar chart or alluvial diagram showing stance
          distribution by category would tell a clear story.
        </p>

        <p className="mb-4">
          <strong>Network structure.</strong> Who are the most connected people
          and organizations? Are there distinct clusters or communities in the
          network? Which entities bridge between otherwise disconnected groups?
          Standard network analysis metrics (degree centrality, betweenness,
          community detection) would surface this.
        </p>

        <p className="mb-4">
          <strong>The AGI timeline spectrum.</strong> How do AGI timeline beliefs
          distribute across the landscape? Is there a correlation between
          someone&rsquo;s timeline beliefs and their regulatory stance? A scatter
          plot of timeline vs. stance, colored by entity type, could be
          revealing.
        </p>

        <p className="mb-4">
          <strong>Geographic patterns.</strong> Where are AI policy actors
          concentrated? Is it all DC and SF, or is there more geographic spread
          than people assume? A simple map or treemap of entity locations would
          show this.
        </p>

        <p className="mb-4">
          <strong>The resource landscape.</strong> What kinds of AI policy
          resources exist in the database? Who writes them? Which organizations
          publish the most? A breakdown by resource type, category, and year
          could highlight gaps and trends.
        </p>

        <p className="mb-4">
          <strong>Funding flows.</strong> The edge data includes
          &ldquo;funded_by&rdquo; relationships. Can you trace funding networks?
          Which funders are connected to which policy positions?
        </p>

        <H4>Output format</H4>

        <p className="mb-4">
          Ideally, aim for something we could turn into a blog post or Substack
          piece. A clear finding in one sentence, a visualization that backs it
          up, and a couple paragraphs of context. It doesn&rsquo;t need to be
          polished. A Jupyter notebook or Observable notebook with rough charts
          and some annotations is plenty. We&rsquo;ll clean it up later.
        </p>

        <p className="mb-4">
          Post your research questions and findings in the{' '}
          <ExtLink href="https://discord.gg/2gntpaxV">
            Discord
          </ExtLink>{' '}
          forum channel to discuss with others, or log them in{' '}
          <ExtLink href="https://docs.google.com/document/d/1dl8B8SWOs5ucmzUpuC7EukPpgncxLZxeil2edVkFleI/edit?usp=sharing">
            this shared doc
          </ExtLink>
          .
        </p>

        <Divider />

        {/* QUICK REFERENCE */}
        <SectionHeading id="setup">Quick Reference</SectionHeading>

        <table className="w-full border-collapse mb-4 text-[16px]">
          <thead>
            <tr>
              <th className="font-mono text-[11px] uppercase tracking-[0.08em] text-left p-2 border-b-2 border-text-primary text-text-secondary">
                Resource
              </th>
              <th className="font-mono text-[11px] uppercase tracking-[0.08em] text-left p-2 border-b-2 border-text-primary text-text-secondary">
                Link
              </th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Live site', 'https://mapping-ai.org', 'mapping-ai.org'],
              [
                'Interactive map',
                'https://mapping-ai.org/map',
                'mapping-ai.org/map',
              ],
              [
                'Insights page',
                'https://mapping-ai.org/insights',
                'mapping-ai.org/insights',
              ],
              [
                'Contribute form',
                'https://mapping-ai.org/contribute',
                'mapping-ai.org/contribute',
              ],
              [
                'GitHub repo',
                'https://github.com/MappingAI/mapping-ai',
                'github.com/MappingAI/mapping-ai',
              ],
              [
                'Map data (JSON)',
                'https://mapping-ai.org/map-data.json',
                'mapping-ai.org/map-data.json',
              ],
              [
                'File bugs / Coordinate',
                'https://discord.gg/2gntpaxV',
                'Discord',
              ],
            ].map(([label, href, text], i) => (
              <tr key={i}>
                <td className="p-2 border-b border-[#eee] align-top">
                  {label}
                </td>
                <td className="p-2 border-b border-[#eee] align-top">
                  <ExtLink href={href!}>{text}</ExtLink>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="text-text-tertiary text-[14px] mt-12 font-mono">
          mapping-ai.org
        </p>
      </div>
    </>
  )
}

/* Shared sub-components */

function SectionHeading({
  id,
  children,
}: {
  id?: string
  children: React.ReactNode
}) {
  return (
    <h2
      id={id}
      className="font-mono text-[13px] font-medium uppercase tracking-[0.14em] text-text-primary mt-12 mb-4 pb-[0.4rem] border-b border-[#ddd] scroll-mt-16"
    >
      {children}
    </h2>
  )
}

function StreamHeading({
  id,
  children,
}: {
  id: string
  children: React.ReactNode
}) {
  return (
    <h3
      id={id}
      className="text-[22px] font-normal mt-8 mb-[0.6rem] scroll-mt-16"
      style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
    >
      {children}
    </h3>
  )
}

function StreamTag({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] text-text-tertiary uppercase tracking-[0.1em] mb-4">
      {children}
    </p>
  )
}

function H4({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="font-mono text-[12px] font-medium uppercase tracking-[0.1em] text-text-secondary mt-6 mb-[0.4rem]">
      {children}
    </h4>
  )
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#f0eeeb] border-l-[3px] border-accent px-5 py-4 mb-4 rounded-r">
      {children}
    </div>
  )
}

function Pre({ children }: { children: React.ReactNode }) {
  return (
    <pre className="bg-bg-secondary border border-[#ddd] rounded px-4 py-4 overflow-x-auto font-mono text-[13px] leading-normal mb-4">
      {children}
    </pre>
  )
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="font-mono text-[14px] bg-[#f0eeeb] px-[0.4em] py-[0.15em] rounded-[3px]">
      {children}
    </code>
  )
}

function Divider() {
  return <hr className="border-t border-[#ddd] my-12" style={{ borderTop: '1px solid #ddd' }} />
}

function TocLink({
  href,
  active,
  children,
}: {
  href: string
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      className={`block font-mono text-[10px] tracking-[0.04em] no-underline py-[0.35rem] pl-3 border-l-2 transition-colors duration-150 leading-[1.4] hover:text-[#555] hover:no-underline ${
        active
          ? 'text-[#2563eb] border-[#2563eb]'
          : 'text-[#888] border-transparent'
      }`}
    >
      {children}
    </a>
  )
}

function ExtLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent no-underline hover:text-[#1d4ed8] hover:underline"
    >
      {children}
    </a>
  )
}
