import { useState, useEffect, useRef } from 'react'

export function App() {
  const [activeSection, setActiveSection] = useState('overview')

  useEffect(() => {
    const sections = [
      'overview',
      'community',
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
      const scrollY = window.scrollY + 80

      if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 8) {
        setActiveSection('setup')
        return
      }

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
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <>
      {/* Site nav */}
      <nav className="fixed top-0 left-0 right-0 z-[100] flex justify-between items-center bg-white/92 backdrop-blur-sm border-b border-[#bbb] px-8 py-[0.85rem] max-[600px]:px-4">
        <a href="/" className="font-mono text-[12px] tracking-[0.1em] uppercase text-text-primary no-underline">
          Mapping AI
        </a>
        <div className="flex gap-8 max-[600px]:gap-4">
          <a
            href="/"
            className="font-mono text-[12px] tracking-[0.1em] uppercase text-text-secondary no-underline hover:text-text-primary max-[600px]:hidden"
          >
            Background
          </a>
          <a
            href="/contribute"
            className="font-mono text-[12px] tracking-[0.1em] uppercase text-text-secondary no-underline hover:text-text-primary"
          >
            Contribute
          </a>
          <a
            href="/map"
            className="font-mono text-[12px] tracking-[0.1em] uppercase text-text-secondary no-underline hover:text-text-primary"
          >
            Map
          </a>
          <a
            href="/about"
            className="font-mono text-[12px] tracking-[0.1em] uppercase text-text-secondary no-underline hover:text-text-primary"
          >
            About
          </a>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-[720px] mx-auto px-8 pt-24 pb-8 max-[600px]:px-4">
        <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-tertiary mb-4">Get Involved</div>
        <h1
          className="text-[36px] font-normal italic leading-[1.2] mb-5 max-[600px]:text-[26px]"
          style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
        >
          Contribute to Mapping AI
        </h1>
        <p
          className="text-[19px] text-text-secondary leading-[1.55]"
          style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
        >
          Mapping AI is an open, collaborative project. Whether you follow AI policy, write code, fact-check research,
          or think about distribution strategy, there&rsquo;s a contribution stream for you. This guide covers
          everything you need to get started.
        </p>

        {/* Quick Links */}
        <div className="mt-8 bg-[#f5f4f2] border border-[#e0dfdd] rounded-lg p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#888] mb-3">Quick Links</div>
          <div className="flex flex-wrap gap-3 mb-4">
            <a
              href="https://discord.gg/EFZ3FxAt"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#5865F2] text-white rounded-md font-mono text-[12px] no-underline hover:bg-[#4752c4] transition-colors"
            >
              <DiscordIcon size={16} />
              Discord
            </a>
            <a
              href="https://github.com/MappingAI/mapping-ai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#24292e] text-white rounded-md font-mono text-[12px] no-underline hover:bg-[#1a1e22] transition-colors"
            >
              GitHub Repo
            </a>
            <a
              href="/workshop/slides.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#2563eb] text-white rounded-md font-mono text-[12px] no-underline hover:bg-[#1d4ed8] transition-colors"
            >
              Slides
            </a>
            <a
              href="https://partiful.com/e/oss7k2FKaQo0HYOaie3p?c=d5y9WbrZ"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#f8f7f5] border border-[#bbb] text-text-primary rounded-md font-mono text-[12px] no-underline hover:border-text-secondary transition-colors"
            >
              Upcoming Events
            </a>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#888] mb-2 mt-4">
            Jump in by Stream
          </div>
          <div className="space-y-1.5 text-[14px]">
            <p>
              <strong>Bugs, features, ideas:</strong>{' '}
              <ExtLink href="https://discord.gg/EFZ3FxAt">Discord #forum</ExtLink>
            </p>
            <p>
              <strong>Outreach strategy:</strong>{' '}
              <ExtLink href="https://docs.google.com/document/d/1WNVM22lGeCOcZHvi5KwF9Yn9be6T6V7xbsocL0SQsLQ/edit?usp=sharing">
                Outreach planning doc
              </ExtLink>
            </p>
            <p>
              <strong>Research, analysis, viz:</strong>{' '}
              <ExtLink href="https://docs.google.com/document/d/1DrQl909NOVmX3ZAo9pZuOuCGqhSehjjgMWDmWrDuzVo/edit?usp=sharing">
                Research questions doc
              </ExtLink>
            </p>
          </div>
        </div>
      </div>

      {/* Left sidebar TOC */}
      <nav className="hidden min-[1100px]:block fixed top-1/2 -translate-y-1/2 w-[160px] left-8">
        <TocLink href="#overview" active={activeSection === 'overview'}>
          Overview
        </TocLink>
        <TocLink href="#community" active={activeSection === 'community'}>
          Community
        </TocLink>
        <TocLink href="#streams" active={activeSection === 'streams'}>
          Streams
        </TocLink>
        <TocLink href="#stream-1" active={activeSection === 'stream-1'}>
          1. Bug Hunting
        </TocLink>
        <TocLink href="#stream-2" active={activeSection === 'stream-2'}>
          2. Data Enrichment
        </TocLink>
        <TocLink href="#stream-3" active={activeSection === 'stream-3'}>
          3. Data Quality
        </TocLink>
        <TocLink href="#stream-4" active={activeSection === 'stream-4'}>
          4. New Features
        </TocLink>
        <TocLink href="#stream-5" active={activeSection === 'stream-5'}>
          5. Outreach
        </TocLink>
        <TocLink href="#stream-6" active={activeSection === 'stream-6'}>
          6. Data Viz
        </TocLink>
        <TocLink href="#setup" active={activeSection === 'setup'}>
          Quick Reference
        </TocLink>
      </nav>

      {/* Content */}
      <div
        className="max-w-[720px] mx-auto px-8 pb-16 text-[17px] leading-[1.65] text-text-primary max-[600px]:px-4"
        style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
      >
        {/* OVERVIEW */}
        <SectionHeading id="overview">What is Mapping AI?</SectionHeading>

        <p className="mb-4">
          <a href="/map" className="text-accent no-underline hover:text-[#1d4ed8] hover:underline">
            Mapping AI
          </a>{' '}
          is an interactive visualization of everyone who matters in U.S. AI policy: policymakers, lab executives,
          researchers, civil society groups, investors, journalists. The map shows who they are, what they believe about
          AI regulation, how they&rsquo;re connected, and what resources they&rsquo;ve published.
        </p>

        <p className="mb-4">
          The database currently has about <strong>709 people</strong>, <strong>734 organizations</strong>, and{' '}
          <strong>161 resources</strong>, linked by <strong>2,228 relationships</strong>. These are the publicly visible
          entities on the map, with additional pending entries in the review queue.
        </p>

        <p className="mb-4">
          The stack: React + Vite for the frontend, D3.js for the visualization, Cloudflare Pages Functions for the API,
          Neon Postgres for the database, and R2 for asset storage. People submit data through{' '}
          <a href="/contribute" className="text-accent no-underline hover:text-[#1d4ed8] hover:underline">
            the contribute form
          </a>
          , submissions go into a review queue, and approved entries show up on the map.
        </p>

        <Callout>
          <strong>This project is openly developed.</strong> The{' '}
          <ExtLink href="https://github.com/MappingAI/mapping-ai">source code</ExtLink> is public. We welcome
          contributions of all kinds: data submissions, code, bug reports, research insights, and outreach ideas. Anyone
          who contributes meaningfully will be listed as a contributor on our{' '}
          <a href="/about" className="text-accent no-underline hover:text-[#1d4ed8] hover:underline">
            About page
          </a>
          .
          <br />
          <br />
          <strong>
            Join the <ExtLink href="https://discord.gg/EFZ3FxAt">Discord server</ExtLink>
          </strong>{' '}
          to coordinate with the team. The <strong>#forum</strong> channel has active discussion threads for bugs,
          feature requests, research questions, and outreach planning. Pick a thread and jump in.
        </Callout>

        <div className="flex flex-wrap gap-3 mb-6">
          <a
            href="https://discord.gg/EFZ3FxAt"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-white text-[14px] font-mono font-medium uppercase tracking-[0.06em] no-underline hover:no-underline hover:bg-[#4752C4] transition-colors"
            style={{ background: '#5865F2' }}
          >
            <DiscordIcon size={20} />
            Join the Discord
          </a>
          <a
            href="/map"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#1a1a1a] text-white text-[13px] font-mono uppercase tracking-[0.06em] no-underline hover:no-underline hover:bg-[#333]"
          >
            View the Map
          </a>
          <a
            href="/contribute"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#f8f7f5] border border-[#bbb] text-[13px] font-mono uppercase tracking-[0.06em] text-text-primary no-underline hover:no-underline hover:border-text-secondary"
          >
            Contribute Data
          </a>
        </div>

        {/* COMMUNITY */}
        <SectionHeading id="community">Community &amp; the MappingParty</SectionHeading>

        <p className="mb-4">
          Before our public launch, we hosted the first <strong>MappingParty</strong>: an in-person working session
          where a group of researchers, developers, and policy-minded people spent an evening contributing to the
          project. Teams split into streams (bug hunting, data enrichment, feature development, outreach planning) and
          made significant progress across the board. We learned that small groups working with direct database access
          and clear instructions can accomplish a surprising amount in a few hours, and that the cross-pollination
          between streams (a policy researcher flagging a data issue, a developer fixing it in real time) was one of the
          most valuable parts of the format.
        </p>

        {/* MappingParty photos */}
        <div className="grid grid-cols-3 gap-3 mb-6 max-[600px]:grid-cols-1">
          <img
            src="/assets/images/mapping-party-1.jpg"
            alt="MappingParty contributors working together"
            className="w-full aspect-[4/3] object-cover rounded-md"
          />
          <img
            src="/assets/images/mapping-party-2.jpg"
            alt="MappingParty working session"
            className="w-full aspect-[4/3] object-cover rounded-md"
          />
          <img
            src="/assets/images/mapping-party-3.jpg"
            alt="MappingParty group collaboration"
            className="w-full aspect-[4/3] object-cover rounded-md"
          />
        </div>

        <p className="mb-4">
          We plan to continue hosting MappingParties as the project grows. If you&rsquo;re interested in attending the
          next one or organizing one in your city, check the{' '}
          <ExtLink href="https://partiful.com/e/oss7k2FKaQo0HYOaie3p?c=d5y9WbrZ">Partiful event page</ExtLink> and join
          the <ExtLink href="https://discord.gg/EFZ3FxAt">Discord</ExtLink> to stay in the loop.
        </p>

        <p className="mb-6">
          We&rsquo;re grateful that the tool has already found an audience organically. This tweet from{' '}
          <ExtLink href="https://x.com/frances__lorenz">Frances Lorenz</ExtLink> sharing the map received 211 saves,
          confirming that this kind of resource fills a real gap in the policy community:
        </p>

        <TweetEmbed url="https://x.com/frances__lorenz/status/2041928059239199067" />

        <Divider />

        {/* STREAMS */}
        <SectionHeading id="streams">Contribution Streams</SectionHeading>

        <p className="mb-4">
          Pick whichever stream sounds most interesting. You can always switch or combine streams. Each one has its own
          instructions below.
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
        <StreamTag>Best for: anyone with a browser and an eye for detail</StreamTag>

        <p className="mb-4">
          Your job is to break things. Open the site, click around, try weird inputs, resize your window, test on your
          phone. When something looks off or doesn&rsquo;t work right, write it up.
        </p>

        <H4>Where to look</H4>

        <p className="mb-4">
          <strong>
            <ExtLink href="https://mapping-ai.org/map">The map</ExtLink>
          </strong>{' '}
          is where most of the complexity lives. Try searching for people and organizations. Click nodes to see their
          detail panel. Toggle between the Network and Plot views using the buttons at the top. Try the filter chips on
          the left. Zoom in and out. Collapse and expand the controls sidebar. Open the contribute panel from the map
          page and see if it plays nicely with the sidebar.
        </p>

        <p className="mb-4">
          <strong>
            <ExtLink href="https://mapping-ai.org/contribute">The contribute form</ExtLink>
          </strong>{' '}
          has three tabs: Person, Organization, Resource. Each has custom dropdowns, tag inputs, location search
          (powered by Photon/OpenStreetMap), org search, and a rich text editor for notes. Fill out a form completely
          and submit it. Try the org search. Try creating a new org from the inline panel that slides in. Try the
          @mention feature in the notes field. Check what happens if you leave required fields blank.
        </p>

        <p className="mb-4">
          <strong>
            <ExtLink href="https://mapping-ai.org">The homepage</ExtLink>
          </strong>{' '}
          and{' '}
          <strong>
            <ExtLink href="https://mapping-ai.org/about">about page</ExtLink>
          </strong>{' '}
          are simpler but still worth checking. Test navigation between pages. Check mobile responsiveness on all of
          them.
        </p>

        <H4>How to report bugs</H4>

        <p className="mb-4">
          Post bugs as threads in the <ExtLink href="https://discord.gg/EFZ3FxAt">Discord #forum channel</ExtLink> or
          open an issue on <ExtLink href="https://github.com/MappingAI/mapping-ai/issues">GitHub</ExtLink>. Include:
        </p>

        <Pre>{`Page: [which page]
What I did: [steps to reproduce]
What I expected: [what should have happened]
What happened: [what actually happened]
Browser/device: [Chrome on Mac, Safari on iPhone, etc.]
Screenshot: [paste one if you can]`}</Pre>

        <p className="mb-4">
          Functional stuff takes priority over cosmetic stuff. A dropdown that won&rsquo;t close matters more than a
          font that looks slightly off. But note both if you see them.
        </p>

        <Divider />

        {/* STREAM 2 */}
        <StreamHeading id="stream-2">Stream 2: Data Enrichment &amp; Seeding</StreamHeading>
        <StreamTag>Best for: people who follow AI policy or enjoy research</StreamTag>

        <p className="mb-4">
          The map is only as useful as its data. Most entities have notes, but many are thin, unsourced, or out of date.
          Your job is to add new entities we&rsquo;re missing and flesh out ones that are already there.
        </p>

        <p className="mb-4">
          <strong>Start by exploring the current data.</strong> Browse{' '}
          <ExtLink href="https://mapping-ai.org/map">the map</ExtLink> to see what&rsquo;s there. Use the search bar to
          check whether a person or org already exists before adding them.
        </p>

        <H4>What to add</H4>

        <p className="mb-4">Some categories that could use more coverage:</p>

        <ul className="mb-4 pl-6">
          <li className="mb-[0.35rem]">State-level policymakers working on AI (governors, AGs, state legislators)</li>
          <li className="mb-[0.35rem]">Congressional staffers and committee staff who actually draft AI bills</li>
          <li className="mb-[0.35rem]">AI companies beyond the big labs (defense tech, enterprise AI, AI infra)</li>
          <li className="mb-[0.35rem]">Civil society groups, labor unions, and advocacy organizations</li>
          <li className="mb-[0.35rem]">
            International organizations with significant U.S. influence (OECD AI Policy Observatory, UN AI Advisory
            Body)
          </li>
          <li className="mb-[0.35rem]">
            Recent key resources: executive orders, major reports, landmark papers, influential essays or books
          </li>
        </ul>

        <H4>How to submit</H4>

        <p className="mb-4">
          Go to <ExtLink href="https://mapping-ai.org/contribute">mapping-ai.org/contribute</ExtLink> and submit through
          the form. Entries go into the database and will appear on the live map after admin approval.
        </p>

        <p className="mb-4">A few things worth knowing about the form:</p>

        <p className="mb-4">
          The <strong>relationship pills</strong> at the top of each form matter. If you&rsquo;re submitting info about
          yourself, pick &ldquo;I am this person.&rdquo; If you know the person and can introduce us, pick &ldquo;I can
          connect you.&rdquo; Otherwise, pick &ldquo;Someone I know of.&rdquo; These affect how the data gets weighted.
        </p>

        <p className="mb-4">
          The <strong>notes field</strong> is the most important part. Write 2-4 sentences explaining why this person or
          organization matters to U.S. AI policy. Don&rsquo;t just copy their bio from Wikipedia. Focus on what
          they&rsquo;ve done, said, or funded that shapes how AI gets built or governed in America. Use the @mention
          feature to link to other entities in the database.
        </p>

        <p className="mb-4">
          For <strong>belief fields</strong> (regulatory stance, AGI timeline, AI risk level), only fill these in if you
          have actual evidence: a direct quote, testimony, or published position paper. Leave them blank rather than
          guessing.
        </p>

        <p className="mb-4">Here&rsquo;s what a good person entry looks like:</p>

        <Callout>
          <strong>Name:</strong> Chuck Schumer
          <br />
          <strong>Title:</strong> U.S. Senator, NY; Senate Majority Leader (2021-2025), Senate Minority Leader
          (2017-2021, 2025-present)
          <br />
          <strong>Category:</strong> Policymaker
          <br />
          <strong>Primary Org:</strong> United States Senate
          <br />
          <strong>Other Orgs:</strong> Bipartisan Senate AI Working Group (Co-founder/Leader), Senate Finance Committee,
          Senate Rules Committee
          <br />
          <strong>Location:</strong> New York, NY
          <br />
          <strong>Twitter:</strong> @SenSchumer
          <br />
          <strong>Notes:</strong> Chuck Schumer is a Democratic U.S. Senator from New York who has served since 1999 and
          is currently Senate Majority Leader. He led a bipartisan working group that released a 31-page AI policy
          roadmap in May 2024, recommending at least $32 billion in government spending to accelerate AI research and
          development. The roadmap was developed after months of AI Insight Forums with tech companies, civil rights
          leaders, and other stakeholders. Schumer has described regulating artificial intelligence as &ldquo;a
          challenge for Congress unlike any other&rdquo; and has made election protection from AI interference a high
          priority.
          <br />
          <strong>Regulatory stance:</strong> Moderate
        </Callout>

        <H4>Quality over quantity</H4>

        <p className="mb-4">
          Five well-researched submissions with sourced notes are worth more than twenty stubs with just a name and
          title. Everything goes through admin review before it shows up on the map, so don&rsquo;t worry about making
          mistakes. But do your homework.
        </p>

        <Divider />

        {/* STREAM 3 */}
        <StreamHeading id="stream-3">Stream 3: Data Quality &amp; Verification</StreamHeading>
        <StreamTag>Best for: skeptics, fact-checkers, people who enjoy catching errors</StreamTag>

        <p className="mb-4">
          The database was built through a combination of manual research, web scraping, and AI-assisted enrichment.
          That means it contains unverifiable claims, formatting artifacts, stale information, and outright
          fabrications. Your job is to find and flag these problems.
        </p>

        <H4>Known issues to look for</H4>

        <ul className="mb-4 pl-6">
          <li className="mb-[0.35rem]">
            <strong>Hallucinated facts.</strong> The AI-generated notes sometimes include claims that sound very
            specific and plausible but are just wrong. Suspiciously precise founding dates, round dollar amounts,
            inflated competition results, awards that don&rsquo;t exist. If something sounds weirdly specific,
            it&rsquo;s worth a quick check.
          </li>
          <li className="mb-[0.35rem]">
            <strong>Stale information.</strong> Some entries list people at organizations they&rsquo;ve since left.
            Government officials who changed roles after the 2025 transition come up a lot.
          </li>
          <li className="mb-[0.35rem]">
            <strong>Wrong org affiliations.</strong> Primary org set to a completely different entity with a
            similar-sounding name. These are especially bad because they create false connections on the map.
          </li>
          <li className="mb-[0.35rem]">
            <strong>Edges missing evidence.</strong> About 30% of relationships have no supporting evidence. If a
            relationship seems questionable, check whether there&rsquo;s evidence for it.
          </li>
          <li className="mb-[0.35rem]">
            <strong>Thin or missing context.</strong> Notes that are technically accurate but don&rsquo;t explain why
            someone matters to AI policy. &ldquo;John Smith is the CEO of Acme Corp&rdquo; is less useful than
            explaining what Acme Corp does and why it&rsquo;s relevant.
          </li>
        </ul>

        <H4>How to report issues</H4>

        <p className="mb-4">When you find something wrong:</p>

        <ul className="mb-4 pl-6">
          <li className="mb-[0.35rem]">
            <strong>Submit a correction</strong> through{' '}
            <ExtLink href="https://mapping-ai.org/contribute">mapping-ai.org/contribute</ExtLink>. Search for the
            existing entity and submit an update with the corrected information.
          </li>
          <li className="mb-[0.35rem]">
            <strong>
              Post in <ExtLink href="https://discord.gg/EFZ3FxAt">Discord #forum</ExtLink>
            </strong>{' '}
            if you find a pattern of issues (e.g., &ldquo;all the Government/Agency entries have stale titles&rdquo;) so
            the team can address them in bulk.
          </li>
        </ul>

        <p className="mb-4">
          Start with well-known figures whose facts you can check from memory. Then move to less-familiar entities where
          you&rsquo;ll need to do some quick googling.
        </p>

        <Divider />

        {/* STREAM 4 */}
        <StreamHeading id="stream-4">Stream 4: New Features</StreamHeading>
        <StreamTag>Best for: developers who want to write code</StreamTag>

        <p className="mb-4">
          The stack is React + Vite, D3.js for the map visualization, Cloudflare Pages Functions for the API, and Neon
          Postgres for the database. If you can write TypeScript, React, CSS, or Node.js, you can contribute.
        </p>

        <H4>Prerequisites</H4>

        <p className="mb-4">
          You need <strong>Node.js 20+</strong> and <strong>pnpm</strong>. If you don&rsquo;t have them:
        </p>

        <Pre>{`# Install pnpm
brew install pnpm

# Or via npm
npm install -g pnpm

# If you need Node.js
brew install node
# Or use nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 20 && nvm use 20`}</Pre>

        <H4>Getting set up</H4>

        <p className="mb-4">Fork and clone the repo, then install dependencies and set up pre-commit hooks:</p>

        <Pre>{`# Fork the repo on GitHub first, then:
git clone https://github.com/YOUR_USERNAME/mapping-ai.git
cd mapping-ai
pnpm install --frozen-lockfile

# Set up pre-commit hooks
brew install lefthook
lefthook install`}</Pre>

        <p className="mb-4">
          For frontend-only work (map UI, contribute form, styling), you can start right away without any environment
          variables. Download the production data snapshot so the map renders:
        </p>

        <Pre>{`curl -o map-data.json https://mapping-ai.org/map-data.json
curl -o map-detail.json https://mapping-ai.org/map-detail.json`}</Pre>

        <p className="mb-4">Start local dev:</p>

        <Pre>{`pnpm run dev`}</Pre>

        <p className="mb-4">
          Visit <Code>localhost:5173</Code>. This runs both the Vite dev server and the Express API proxy together.
        </p>

        <Callout>
          <strong>Need database access or API keys?</strong> If your feature touches the backend (API functions,
          database queries, search, admin panel), email{' '}
          <a
            href="mailto:info@mapping-ai.org"
            className="text-accent no-underline hover:text-[#1d4ed8] hover:underline"
          >
            info@mapping-ai.org
          </a>{' '}
          and describe what you&rsquo;re working on. We&rsquo;ll provide the environment variables you need.
        </Callout>

        <H4>Useful commands</H4>

        <Pre>{`pnpm run dev               # Vite + Express API together
pnpm run dev:web           # Vite only (frontend)
pnpm run dev:api           # Express API only
pnpm run lint              # Check for lint errors
pnpm run format            # Auto-format with Prettier
pnpm run typecheck         # TypeScript type checking
pnpm exec vitest run       # Run tests`}</Pre>

        <p className="mb-4">
          Pre-commit hooks run automatically via lefthook (typecheck + lint + format). If a commit fails the hook, fix
          the issue and commit again.
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
                ['src/admin/', 'Admin panel for reviewing submissions, editing entities, managing the approval queue.'],
                ['src/components/', 'Shared React components: CustomSelect, TagInput, TipTapEditor, Navigation, etc.'],
                [
                  'functions/api/',
                  'Cloudflare Pages Functions. submit.ts handles form submissions, search.ts does full-text search, admin.ts manages the review queue.',
                ],
                ['scripts/', 'Database scripts: export-map-data, migrations, seeding, backups.'],
              ] as const
            ).map(([file, desc], i) => (
              <tr key={i}>
                <td className="p-2 border-b border-[#eee] align-top">
                  <Code>{file}</Code>
                </td>
                <td className="p-2 border-b border-[#eee] align-top">{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <H4>Feature ideas</H4>

        <p className="mb-4">
          These are roughly ordered by complexity. Pick whatever interests you, or pitch your own idea.
        </p>

        <p className="mb-4">
          <strong>Shareable entity links.</strong> Right now, clicking a node on the map doesn&rsquo;t update the URL.
          It&rsquo;d be useful to have <Code>map.html?entity=123</Code> or <Code>map.html?name=OpenAI</Code> that
          auto-selects and zooms to that entity on load. Good starter project.
        </p>

        <p className="mb-4">
          <strong>Timeline view.</strong> The database has edge start/end dates (when someone joined or left an org,
          when a relationship began). A timeline slider or playback feature that shows how the network evolved over time
          would be compelling.
        </p>

        <p className="mb-4">
          <strong>Improved Plot view.</strong> The Plot view (scatter/beeswarm) works but could use better axis labels,
          a legend, and maybe the ability to color by a different dimension than the axes.
        </p>

        <p className="mb-4">
          <strong>Entity diff / edit history.</strong> The database tracks submissions but there&rsquo;s no UI for
          seeing what changed over time for a given entity. An audit trail would help with data quality.
        </p>

        <p className="mb-4">
          <strong>Export / embed.</strong> Let people export a filtered view of the map as a PNG or SVG, or generate an
          embed snippet for a specific cluster or entity.
        </p>

        <p className="mb-4">
          Before starting on something, check the <ExtLink href="https://discord.gg/EFZ3FxAt">Discord #forum</ExtLink>{' '}
          or <ExtLink href="https://github.com/MappingAI/mapping-ai/issues">GitHub Issues</ExtLink> to see what others
          are working on and post what you&rsquo;re tackling. When you&rsquo;re done, open a pull request against{' '}
          <Code>main</Code>.
        </p>

        <H4>Conventions</H4>

        <p className="mb-4">
          Commit messages use conventional prefixes: <Code>feat:</Code>, <Code>fix:</Code>, <Code>refactor:</Code>,{' '}
          <Code>docs:</Code>. Tests live in <Code>src/__tests__/</Code> (Vitest + jsdom + React Testing Library); run{' '}
          <Code>pnpm exec vitest run</Code>. CSS for React pages is Tailwind via <Code>src/styles/global.css</Code>; the
          legacy <Code>map.html</Code> has inline styles. The map loads <Code>map-data.json</Code> which uses different
          field names than the database (mapping layer in <Code>scripts/export-map-data.js</Code>). Read{' '}
          <Code>docs/architecture/current.md</Code> for the schema, field mappings, and infrastructure reference, and{' '}
          <Code>CLAUDE.md</Code> for codebase conventions.
        </p>

        <Divider />

        {/* STREAM 5 */}
        <StreamHeading id="stream-5">Stream 5: Outreach, Policy, Big Picture</StreamHeading>
        <StreamTag>Best for: people who think about audiences, distribution, and strategy</StreamTag>

        <p className="mb-4">
          The tool exists. The question now is who uses it and why. This stream is about figuring out how Mapping AI
          fits into the broader AI policy conversation and how to get it in front of the people who&rsquo;d benefit from
          it.
        </p>

        <H4>Questions to discuss</H4>

        <p className="mb-4">
          <strong>Who is this for?</strong> Journalists covering AI? Hill staffers researching a bill? Academics
          studying the policy landscape? Advocacy groups planning campaigns? AI company employees trying to understand
          the regulatory environment? The answer shapes everything from what data we prioritize to how we describe the
          project.
        </p>

        <p className="mb-4">
          <strong>What&rsquo;s the pitch?</strong> When you tell someone about Mapping AI in one sentence, what do you
          say? We&rsquo;ve been describing it as &ldquo;an interactive map of the U.S. AI policy ecosystem&rdquo; but
          that&rsquo;s abstract. What would make someone actually click the link?
        </p>

        <p className="mb-4">
          <strong>Where do we distribute?</strong> Think about specific channels. Which Substacks, podcasts, Slack
          communities, Twitter/Bluesky accounts, university departments, think tank mailing lists, or congressional
          offices should know about this? Make a concrete list with contact info or links where possible.
        </p>

        <p className="mb-4">
          <strong>What partnerships make sense?</strong> Are there organizations doing adjacent work who might want to
          co-brand, share data, or link to the map from their own resources?
        </p>

        <H4>Deliverable</H4>

        <p className="mb-4">
          Add your ideas to{' '}
          <ExtLink href="https://docs.google.com/document/d/1WNVM22lGeCOcZHvi5KwF9Yn9be6T6V7xbsocL0SQsLQ/edit?usp=sharing">
            the outreach planning doc
          </ExtLink>{' '}
          and post highlights in the <ExtLink href="https://discord.gg/EFZ3FxAt">Discord #forum</ExtLink>. This could
          include target audiences, distribution channels, pitch ideas, partnership leads, content angles, or draft
          thread copy.
        </p>

        <Divider />

        {/* STREAM 6 */}
        <StreamHeading id="stream-6">Stream 6: Data Viz &amp; Research Insights</StreamHeading>
        <StreamTag>Best for: data people, researchers, anyone curious about patterns</StreamTag>

        <p className="mb-4">
          The database is full of interesting data that nobody has really explored yet. Regulatory stances, AGI timeline
          beliefs, organizational affiliations, funding relationships, geographic clusters. Your job is to pull insights
          out of it and sketch visualizations or blog post drafts we could publish.
        </p>

        <p className="mb-4">
          See <ExtLink href="https://mapping-ai.org/insights">mapping-ai.org/insights</ExtLink> for examples of what
          this could look like.
        </p>

        <H4>Getting the data</H4>

        <p className="mb-4">The full dataset is available as a single JSON file:</p>
        <Pre>https://mapping-ai.org/map-full.json</Pre>

        <p className="mb-4">
          This includes all entities (people, organizations, resources), their relationships, scores, notes, and
          metadata. You can fetch and work with it in whatever you prefer: Python (pandas, matplotlib, seaborn), R,
          Observable notebooks, Excel.
        </p>

        <H4>Research questions worth exploring</H4>

        <Callout>
          <strong>Full research questions doc:</strong>{' '}
          <ExtLink href="https://docs.google.com/document/d/1DrQl909NOVmX3ZAo9pZuOuCGqhSehjjgMWDmWrDuzVo/edit?usp=sharing">
            Research Questions (Google Doc)
          </ExtLink>
        </Callout>

        <p className="mb-4">
          <strong>Outlier Stances.</strong> Which people and organizations hold the most outlier positions on AI
          regulation, AGI timelines, and the overall level of AI risk?
        </p>

        <p className="mb-4">
          <strong>Funding Overlap.</strong> What is the overlap in funding sources between AI safety organizations and
          AI accelerationist organizations?
        </p>

        <p className="mb-4">
          <strong>Network Centrality.</strong> Based on connection count, who are the ten most structurally central
          individuals in US AI governance?
        </p>

        <p className="mb-4">
          <strong>Geographic patterns.</strong> Where are AI policy actors concentrated? Is it all DC and SF, or is
          there more geographic spread than people assume?
        </p>

        <p className="mb-4">
          <strong>The regulatory stance landscape.</strong> How do different sectors break down on AI regulation? Are
          frontier labs more &ldquo;light-touch&rdquo; than think tanks? How do researchers compare to executives?
        </p>

        <H4>Output format</H4>

        <p className="mb-4">
          Aim for something we could turn into a blog post or Substack piece. A clear finding in one sentence, a
          visualization that backs it up, and a couple paragraphs of context. It doesn&rsquo;t need to be polished. A
          Jupyter notebook with rough charts and some annotations is plenty. We&rsquo;ll clean it up later.
        </p>

        <p className="mb-4">
          Post your research questions and findings as threads in the{' '}
          <ExtLink href="https://discord.gg/EFZ3FxAt">Discord #forum</ExtLink>. Each thread becomes a trackable
          discussion that others can build on.
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
              ['Interactive map', 'https://mapping-ai.org/map', 'mapping-ai.org/map'],
              ['Insights page', 'https://mapping-ai.org/insights', 'mapping-ai.org/insights'],
              ['Contribute form', 'https://mapping-ai.org/contribute', 'mapping-ai.org/contribute'],
              ['GitHub repo', 'https://github.com/MappingAI/mapping-ai', 'github.com/MappingAI/mapping-ai'],
              ['Map data (JSON)', 'https://mapping-ai.org/map-data.json', 'mapping-ai.org/map-data.json'],
              ['Discord community', 'https://discord.gg/EFZ3FxAt', 'Discord #forum'],
              ['Upcoming events', 'https://partiful.com/e/oss7k2FKaQo0HYOaie3p?c=d5y9WbrZ', 'Partiful'],
              [
                'Outreach strategy doc',
                'https://docs.google.com/document/d/1WNVM22lGeCOcZHvi5KwF9Yn9be6T6V7xbsocL0SQsLQ/edit?usp=sharing',
                'Google Doc',
              ],
              [
                'Research questions doc',
                'https://docs.google.com/document/d/1DrQl909NOVmX3ZAo9pZuOuCGqhSehjjgMWDmWrDuzVo/edit?usp=sharing',
                'Google Doc',
              ],
              ['Contact', 'mailto:info@mapping-ai.org', 'info@mapping-ai.org'],
            ].map(([label, href, text], i) => (
              <tr key={i}>
                <td className="p-2 border-b border-[#eee] align-top">{label}</td>
                <td className="p-2 border-b border-[#eee] align-top">
                  <ExtLink href={href!}>{text}</ExtLink>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="text-text-tertiary text-[14px] mt-12 font-mono">mapping-ai.org</p>
      </div>
    </>
  )
}

/* Shared sub-components */

function SectionHeading({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="font-mono text-[13px] font-medium uppercase tracking-[0.14em] text-text-primary mt-12 mb-4 pb-[0.4rem] border-b border-[#ddd] scroll-mt-16"
    >
      {children}
    </h2>
  )
}

function StreamHeading({ id, children }: { id: string; children: React.ReactNode }) {
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
  return <p className="font-mono text-[11px] text-text-tertiary uppercase tracking-[0.1em] mb-4">{children}</p>
}

function H4({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="font-mono text-[12px] font-medium uppercase tracking-[0.1em] text-text-secondary mt-6 mb-[0.4rem]">
      {children}
    </h4>
  )
}

function Callout({ children }: { children: React.ReactNode }) {
  return <div className="bg-[#f0eeeb] border-l-[3px] border-accent px-5 py-4 mb-4 rounded-r">{children}</div>
}

function Pre({ children }: { children: React.ReactNode }) {
  return (
    <pre className="bg-bg-secondary border border-[#ddd] rounded px-4 py-4 overflow-x-auto font-mono text-[13px] leading-normal mb-4">
      {children}
    </pre>
  )
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="font-mono text-[14px] bg-[#f0eeeb] px-[0.4em] py-[0.15em] rounded-[3px]">{children}</code>
}

function Divider() {
  return <hr className="border-t border-[#ddd] my-12" style={{ borderTop: '1px solid #ddd' }} />
}

function TocLink({ href, active, children }: { href: string; active?: boolean; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className={`block font-mono text-[10px] tracking-[0.04em] no-underline py-[0.35rem] pl-3 border-l-2 transition-colors duration-150 leading-[1.4] hover:text-[#555] hover:no-underline ${
        active ? 'text-[#2563eb] border-[#2563eb]' : 'text-[#888] border-transparent'
      }`}
    >
      {children}
    </a>
  )
}

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
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

function DiscordIcon({ size = 16 }: { size?: number }) {
  const h = Math.round(size * 0.77)
  return (
    <svg width={size} height={h} viewBox="0 0 71 55" fill="currentColor">
      <path d="M60.1 4.9A58.5 58.5 0 0045.4.2a.2.2 0 00-.2.1 40.8 40.8 0 00-1.8 3.7 54 54 0 00-16.2 0A37.3 37.3 0 0025.4.3a.2.2 0 00-.2-.1A58.4 58.4 0 0010.5 5 59.5 59.5 0 00.4 45.1a.3.3 0 00.1.2A58.7 58.7 0 0018.1 55a.2.2 0 00.3-.1 42 42 0 003.6-5.9.2.2 0 00-.1-.3 38.6 38.6 0 01-5.5-2.6.2.2 0 01 0-.4c.4-.3.7-.6 1.1-.8a.2.2 0 01.3 0 41.8 41.8 0 0035.6 0 .2.2 0 01.2 0c.3.3.7.6 1.1.9a.2.2 0 010 .3 36.3 36.3 0 01-5.5 2.6.2.2 0 00-.1.4 47.1 47.1 0 003.6 5.8.2.2 0 00.2.1A58.5 58.5 0 0070.7 45.3a.3.3 0 00.1-.2c1.8-18.6-3-34.7-12.7-49a.2.2 0 00-.1-.1zM23.7 37c-3.6 0-6.6-3.3-6.6-7.4s2.9-7.4 6.6-7.4c3.7 0 6.7 3.4 6.6 7.4 0 4.1-2.9 7.4-6.6 7.4zm24.4 0c-3.6 0-6.6-3.3-6.6-7.4s2.9-7.4 6.6-7.4c3.7 0 6.7 3.4 6.6 7.4 0 4.1-2.9 7.4-6.6 7.4z" />
    </svg>
  )
}

function TweetEmbed({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://platform.twitter.com/widgets.js'
    script.async = true
    script.charset = 'utf-8'
    containerRef.current?.appendChild(script)
  }, [])

  return (
    <div ref={containerRef} className="mb-6">
      <blockquote className="twitter-tweet" data-theme="light">
        <a href={url}>View on X</a>
      </blockquote>
    </div>
  )
}
