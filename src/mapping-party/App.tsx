import { useState, useEffect } from 'react'
import { Navigation } from '../components/Navigation'
import { Footer } from '../components/Footer'

const TOC_ITEMS = [
  { id: 'what', label: 'What is a Mapping Party' },
  { id: 'before', label: 'Before the Event' },
  { id: 'agenda', label: 'Sample Agenda' },
  { id: 'streams', label: 'Activity Streams' },
  { id: 'materials', label: 'Materials' },
  { id: 'after', label: 'After the Event' },
]

export function App() {
  const [activeSection, setActiveSection] = useState('what')

  useEffect(() => {
    const sections = TOC_ITEMS.map((item) => item.id)
    const handleScroll = () => {
      const scrollY = window.scrollY + 80
      if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 8) {
        setActiveSection(sections[sections.length - 1]!)
        return
      }
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i]!)
        if (el && el.getBoundingClientRect().top + window.scrollY <= scrollY) {
          setActiveSection(sections[i]!)
          return
        }
      }
      setActiveSection('what')
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <>
      <Navigation />

      {/* Hero */}
      <div className="max-w-[720px] mx-auto px-8 pt-24 pb-8 max-[600px]:px-4">
        <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#888] mb-4">Host an Event</div>
        <h1
          className="text-[36px] font-normal italic leading-[1.2] mb-5 max-[600px]:text-[26px]"
          style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
        >
          Host a Mapping Party
        </h1>
        <p
          className="text-[19px] text-[#555] leading-[1.55] max-[600px]:text-[16px]"
          style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
        >
          A Mapping Party is a collaborative working session where a group of people contributes to the AI policy
          stakeholder map together. This guide covers everything you need to host one in your community.
        </p>

        {/* Photos from first mapping party */}
        <div className="grid grid-cols-3 gap-3 mt-8 mb-4 max-[600px]:grid-cols-1">
          <img
            src="/images/mapping-party-1.jpg"
            alt="Mapping Party participants working together at tables"
            className="w-full aspect-[4/3] object-cover rounded-md"
          />
          <img
            src="/images/mapping-party-2.jpg"
            alt="Mapping Party group working session"
            className="w-full aspect-[4/3] object-cover rounded-md"
          />
          <img
            src="/images/mapping-party-3.jpg"
            alt="Mapping Party collaboration"
            className="w-full aspect-[4/3] object-cover rounded-md"
          />
        </div>
        <p className="text-[13px] text-[#888] italic mb-6" style={{ fontFamily: "'EB Garamond', Georgia, serif" }}>
          Photos from the first Mapping Party, hosted in Washington, DC before the public launch.
        </p>

        {/* Quick action buttons */}
        <div className="flex flex-wrap gap-3 mb-4">
          <a
            href="https://discord.gg/HtqceQRV3f"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#5865F2] text-white rounded-md font-mono text-[12px] no-underline hover:bg-[#4752c4] transition-colors"
          >
            Join Discord to coordinate
          </a>
          <a
            href="mailto:info@mapping-ai.org?subject=Hosting%20a%20Mapping%20Party"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] text-white rounded-md font-mono text-[12px] no-underline hover:bg-[#333] transition-colors"
          >
            Email us for support
          </a>
          <a
            href="/guide"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#f8f7f5] border border-[#bbb] text-[#1a1a1a] rounded-md font-mono text-[12px] no-underline hover:border-[#555] transition-colors"
          >
            Tool guide for attendees
          </a>
        </div>
      </div>

      {/* TOC sidebar */}
      <nav className="hidden min-[1100px]:block fixed top-1/2 -translate-y-1/2 w-[160px] left-8">
        {TOC_ITEMS.map(({ id, label }) => (
          <a
            key={id}
            href={`#${id}`}
            className={`block font-mono text-[10px] tracking-[0.04em] no-underline py-[0.35rem] pl-3 border-l-2 transition-colors duration-150 leading-[1.4] hover:text-[#555] hover:no-underline ${
              activeSection === id ? 'text-[#2563eb] border-[#2563eb]' : 'text-[#888] border-transparent'
            }`}
          >
            {label}
          </a>
        ))}
      </nav>

      {/* Content */}
      <div
        className="max-w-[720px] mx-auto px-8 pb-16 text-[17px] leading-[1.65] text-[#1a1a1a] max-[600px]:px-4"
        style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
      >
        {/* WHAT */}
        <SectionHeading id="what">What is a Mapping Party?</SectionHeading>

        <p className="mb-4">
          A Mapping Party is an in-person event (typically 2-3 hours) where participants explore and contribute to the
          Mapping AI project together. Think of it like a hackathon, but focused on mapping the AI policy landscape
          rather than building software.
        </p>

        <p className="mb-4">Participants can contribute in several ways, regardless of their technical background:</p>

        <ul className="mb-4 pl-6">
          <li className="mb-2">
            <strong>Adding data:</strong> Submit new people, organizations, or resources to the map
          </li>
          <li className="mb-2">
            <strong>Verifying data:</strong> Check existing entries for accuracy and flag errors
          </li>
          <li className="mb-2">
            <strong>Finding bugs:</strong> Test the tool on different devices and report issues
          </li>
          <li className="mb-2">
            <strong>Research and analysis:</strong> Explore the data and surface interesting patterns
          </li>
          <li className="mb-2">
            <strong>Outreach planning:</strong> Brainstorm how to get the tool in front of more people
          </li>
        </ul>

        <Callout>
          <strong>No technical skills required.</strong> The most valuable contributions are data submissions and
          verification, which anyone familiar with AI policy can do through the web form. Coding is optional.
        </Callout>

        <Divider />

        {/* BEFORE */}
        <SectionHeading id="before">Before the Event</SectionHeading>

        <H4>2-3 weeks before</H4>

        <ChecklistItem>
          Pick a date, time, and venue. You need wifi, power outlets, and enough table space for laptops. A conference
          room, coworking space, university classroom, or library meeting room all work well. Evening events (6-9pm)
          tend to get the best turnout.
        </ChecklistItem>

        <ChecklistItem>
          Create an event page. Use <ExtLink href="https://partiful.com">Partiful</ExtLink>, Eventbrite, Luma, or a
          simple Google Form. Include: what Mapping AI is (one sentence), what participants will do, what to bring
          (laptop), and a link to the tool.
        </ChecklistItem>

        <ChecklistItem>
          Invite your network. Aim for 8-25 people. Good audiences: policy students and researchers, journalism
          programs, civic tech meetup groups, think tank staff, congressional staff, AI company employees interested in
          governance. Post in relevant Slack/Discord channels, mailing lists, and group chats.
        </ChecklistItem>

        <ChecklistItem>
          Email{' '}
          <a
            href="mailto:info@mapping-ai.org?subject=Hosting%20a%20Mapping%20Party"
            className="text-[#2563eb] no-underline hover:underline"
          >
            info@mapping-ai.org
          </a>{' '}
          to let us know. We can help with promotion, provide presentation slides, and give your group a shoutout on our
          channels.
        </ChecklistItem>

        <H4>1 week before</H4>

        <ChecklistItem>
          Familiarize yourself with the tool. Spend 15-20 minutes browsing the{' '}
          <a href="/map" className="text-[#2563eb] no-underline hover:underline">
            map
          </a>
          ,{' '}
          <a href="/contribute" className="text-[#2563eb] no-underline hover:underline">
            contribute form
          </a>
          , and{' '}
          <a href="/insights" className="text-[#2563eb] no-underline hover:underline">
            insights page
          </a>
          . Read the{' '}
          <a href="/guide" className="text-[#2563eb] no-underline hover:underline">
            tool guide
          </a>{' '}
          so you can answer questions.
        </ChecklistItem>

        <ChecklistItem>
          Decide which activity streams to offer (see below). For a first event, we recommend starting with Data
          Enrichment and Data Quality, since those are accessible to everyone. Add Bug Hunting if you have a
          tech-oriented crowd.
        </ChecklistItem>

        <ChecklistItem>
          Send a reminder to RSVPs with: the event link, a reminder to bring a laptop, and a suggestion to browse the
          map beforehand so they arrive with some context.
        </ChecklistItem>

        <H4>Day of</H4>

        <ChecklistItem>
          Arrive 30 minutes early to set up. Test the wifi, make sure the projector or screen works if you have one, and
          open the map on your laptop to have it ready for the demo.
        </ChecklistItem>

        <ChecklistItem>
          Print or project the{' '}
          <a href="/workshop/slides.html" target="_blank" className="text-[#2563eb] no-underline hover:underline">
            slides
          </a>{' '}
          for the introduction. If you do not have a projector, you can walk people through the tool live on a shared
          screen or just have everyone follow along on their own devices.
        </ChecklistItem>

        <Divider />

        {/* AGENDA */}
        <SectionHeading id="agenda">Sample Agenda (2.5 hours)</SectionHeading>

        <div className="space-y-0 mb-6">
          <AgendaItem time="0:00" duration="15 min" title="Welcome and introductions">
            Brief round of names and backgrounds. Explain what Mapping AI is in 2-3 sentences: it is an open-source tool
            for exploring who shapes AI policy in the U.S. The database tracks people, organizations, resources, their
            beliefs about AI regulation, and how they connect to each other.
          </AgendaItem>

          <AgendaItem time="0:15" duration="15 min" title="Live demo of the tool">
            Walk through the map, search for a well-known person, show the detail panel, switch to Plot view, open the
            contribute form. Share the{' '}
            <a href="/guide" className="text-[#2563eb] no-underline hover:underline">
              guide page
            </a>{' '}
            link for anyone who wants a reference.
          </AgendaItem>

          <AgendaItem time="0:30" duration="5 min" title="Assign activity streams">
            Have people choose a stream based on their interests (see below). Groups of 2-4 per stream work well. Hand
            out the stream-specific instructions or project them on screen.
          </AgendaItem>

          <AgendaItem time="0:35" duration="75 min" title="Working session">
            Participants work in their chosen streams. Circulate to answer questions and help with the contribute form.
            Encourage cross-stream communication: a policy expert who finds a data error can flag it to the verification
            team in real time.
          </AgendaItem>

          <AgendaItem time="1:50" duration="15 min" title="Break" />

          <AgendaItem time="2:05" duration="20 min" title="Share findings">
            Each stream spends 3-4 minutes sharing what they found, added, or fixed. This is the most energizing part:
            hearing what the group accomplished together. Capture notable findings (interesting patterns, surprising
            gaps, good new entries) for a post-event summary.
          </AgendaItem>

          <AgendaItem time="2:25" duration="5 min" title="Wrap up">
            Thank everyone. Share links to the <ExtLink href="https://discord.gg/HtqceQRV3f">Discord</ExtLink> for
            continued involvement. Mention that submissions will appear on the map after review.
          </AgendaItem>
        </div>

        <Callout>
          <strong>Shorter format (1.5 hours):</strong> Skip the break, reduce the working session to 45 minutes, and
          keep the share-out to 10 minutes. Works well for lunchtime events or when you have a smaller group.
        </Callout>

        <Divider />

        {/* STREAMS */}
        <SectionHeading id="streams">Activity Streams</SectionHeading>

        <p className="mb-4">
          Assign each participant to a stream based on their interests. Everyone should have the{' '}
          <a href="/guide" className="text-[#2563eb] no-underline hover:underline">
            tool guide
          </a>{' '}
          open for reference.
        </p>

        <StreamCard
          number="1"
          title="Data Enrichment"
          audience="Anyone familiar with AI policy"
          description="Add new people, organizations, or resources to the map. Focus on categories that are underrepresented: state-level policymakers, congressional staff, defense tech companies, civil society groups, and international organizations with U.S. influence."
          instructions={[
            'Open mapping-ai.org/contribute',
            'Search first to check if the entity already exists',
            'Focus on the notes field: explain why this person or org matters to AI policy in 2-4 sentences',
            'Only set belief fields (regulatory stance, AGI timeline, risk level) if you have evidence',
            'Quality matters more than quantity. Five well-researched submissions beat twenty stubs.',
          ]}
        />

        <StreamCard
          number="2"
          title="Data Quality and Verification"
          audience="Detail-oriented people, fact-checkers"
          description="Review existing entries for accuracy. Look for stale titles (people who changed roles), wrong org affiliations, unsourced claims, and thin notes that need more context."
          instructions={[
            'Open mapping-ai.org/map and browse entities',
            'Click any entity to see its detail panel',
            'Use the vote buttons to flag incorrect information',
            'Submit corrections through the contribute form',
            'Start with well-known figures whose facts you can verify from memory, then move to less-familiar entries',
          ]}
        />

        <StreamCard
          number="3"
          title="Bug Hunting"
          audience="Anyone with a phone, tablet, or laptop"
          description="Test the tool on different devices and browsers. Try unusual inputs, resize your window, test on your phone. When something looks off or does not work right, write it up."
          instructions={[
            'Test the map: search, click nodes, toggle views, zoom, filter',
            'Test the contribute form: fill out all fields, try the org search, @mentions in notes',
            'Test on your phone: does everything work and look right?',
            'Report bugs in Discord #forum or GitHub Issues with: page, steps to reproduce, expected vs. actual behavior, browser/device, screenshot',
          ]}
        />

        <StreamCard
          number="4"
          title="Research and Analysis"
          audience="Researchers, data analysts, policy students"
          description="Explore the data and surface interesting patterns. The full dataset is available as JSON. Look for funding overlaps, geographic patterns, network centrality, or sector-level belief breakdowns."
          instructions={[
            'Download the dataset from mapping-ai.org/map-full.json',
            'Explore the existing insights page for inspiration',
            'Look for patterns: Who funds whom? Where are the geographic clusters? Which sectors agree on regulation?',
            'Share findings in Discord or write them up as a short analysis',
          ]}
        />

        <StreamCard
          number="5"
          title="Outreach and Strategy"
          audience="Communicators, policy advocates, connectors"
          description="Think about who would benefit from this tool and how to reach them. Draft pitch messages, identify distribution channels, and brainstorm partnership ideas."
          instructions={[
            'Who should know about this tool? Make a list of specific people, organizations, and channels',
            'Draft a one-sentence pitch that would make someone click the link',
            'Identify 5-10 specific Substacks, podcasts, mailing lists, or social accounts that could share the tool',
            'Post your ideas in the outreach planning doc (linked in the workshop page)',
          ]}
        />

        <Divider />

        {/* MATERIALS */}
        <SectionHeading id="materials">Materials and Resources</SectionHeading>

        <div className="space-y-3 mb-6">
          <ResourceLink href="/guide" label="Tool guide" description="Step-by-step walkthrough for new users" />
          <ResourceLink
            href="/workshop/slides.html"
            label="Presentation slides"
            description="Intro deck for the demo portion"
            external
          />
          <ResourceLink
            href="/workshop"
            label="Full contribution guide"
            description="Detailed instructions for all six contribution streams"
          />
          <ResourceLink href="/map" label="Interactive map" description="The main tool" />
          <ResourceLink href="/contribute" label="Contribute form" description="Where participants submit data" />
          <ResourceLink href="/insights" label="Research insights" description="Existing analysis and findings" />
          <ResourceLink
            href="https://discord.gg/HtqceQRV3f"
            label="Discord community"
            description="For coordination before, during, and after the event"
            external
          />
        </div>

        <Callout>
          <strong>Need printed materials?</strong> Email{' '}
          <a
            href="mailto:info@mapping-ai.org?subject=Mapping%20Party%20Materials"
            className="text-[#2563eb] no-underline hover:underline"
          >
            info@mapping-ai.org
          </a>{' '}
          and we can send you a printable one-page reference sheet and stream assignment cards.
        </Callout>

        <Divider />

        {/* AFTER */}
        <SectionHeading id="after">After the Event</SectionHeading>

        <p className="mb-4">
          Within a day or two of the event, share a brief summary with participants and the Mapping AI team:
        </p>

        <ul className="mb-4 pl-6">
          <li className="mb-2">How many people attended</li>
          <li className="mb-2">How many submissions were made (we can look this up from the database)</li>
          <li className="mb-2">Any interesting findings, patterns, or discussions that came up</li>
          <li className="mb-2">Bugs or feature requests that were identified</li>
          <li className="mb-2">Feedback on the format: what worked, what to change for next time</li>
        </ul>

        <p className="mb-4">
          Post the summary in the <ExtLink href="https://discord.gg/HtqceQRV3f">Discord #forum</ExtLink> so other hosts
          can learn from your experience. We will review and approve submissions from your group within a few days.
        </p>

        <p className="mb-6">
          If your event goes well, consider making it a recurring meetup. Monthly or bi-monthly Mapping Parties keep the
          data fresh and build a community of contributors who become more effective over time as they learn the tool
          and the landscape.
        </p>

        {/* Final CTA */}
        <div className="p-6 bg-[#f0eeeb] border border-[#ddd] rounded-lg text-center mb-12 max-[600px]:p-4">
          <h2
            className="text-[22px] font-normal italic mb-3 max-[600px]:text-[18px]"
            style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
          >
            Ready to host?
          </h2>
          <p className="text-[15px] text-[#555] mb-5 max-[600px]:text-[14px]">
            Email us to let us know you are planning a Mapping Party. We can help with promotion, provide materials, and
            connect you with other hosts.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href="mailto:info@mapping-ai.org?subject=Hosting%20a%20Mapping%20Party"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#1a1a1a] text-white rounded-md font-mono text-[12px] uppercase tracking-wider no-underline hover:bg-[#333] transition-colors"
            >
              Get in touch
            </a>
            <a
              href="https://discord.gg/HtqceQRV3f"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#5865F2] text-white rounded-md font-mono text-[12px] uppercase tracking-wider no-underline hover:bg-[#4752c4] transition-colors"
            >
              Join Discord
            </a>
          </div>
        </div>

        <Footer />
      </div>
    </>
  )
}

function SectionHeading({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="font-mono text-[13px] font-medium uppercase tracking-[0.14em] text-[#1a1a1a] mt-12 mb-4 pb-[0.4rem] border-b border-[#ddd] scroll-mt-16"
    >
      {children}
    </h2>
  )
}

function H4({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="font-mono text-[12px] font-medium uppercase tracking-[0.1em] text-[#555] mt-6 mb-[0.4rem]">
      {children}
    </h4>
  )
}

function Callout({ children }: { children: React.ReactNode }) {
  return <div className="bg-[#f0eeeb] border-l-[3px] border-[#2563eb] px-5 py-4 mb-4 rounded-r">{children}</div>
}

function Divider() {
  return <hr className="border-t border-[#ddd] my-12" style={{ borderTop: '1px solid #ddd' }} />
}

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[#2563eb] no-underline hover:text-[#1d4ed8] hover:underline"
    >
      {children}
    </a>
  )
}

function ChecklistItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 mb-3">
      <span className="text-[#2563eb] font-mono text-[14px] mt-0.5 shrink-0">☐</span>
      <p className="text-[16px] leading-relaxed m-0">{children}</p>
    </div>
  )
}

function AgendaItem({
  time,
  duration,
  title,
  children,
}: {
  time: string
  duration: string
  title: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex gap-4 py-3 border-b border-[#f0f0f0] max-[600px]:flex-col max-[600px]:gap-1">
      <div className="w-[120px] shrink-0 max-[600px]:w-auto max-[600px]:flex max-[600px]:gap-2">
        <span className="font-mono text-[12px] text-[#2563eb]">{time}</span>
        <span className="font-mono text-[11px] text-[#888] ml-2 max-[600px]:ml-0">({duration})</span>
      </div>
      <div className="flex-1">
        <div className="font-medium mb-1">{title}</div>
        {children && <p className="text-[15px] text-[#555] leading-relaxed m-0">{children}</p>}
      </div>
    </div>
  )
}

function StreamCard({
  number,
  title,
  audience,
  description,
  instructions,
}: {
  number: string
  title: string
  audience: string
  description: string
  instructions: string[]
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="mb-4 border border-[#e0dfdd] rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left p-4 bg-white cursor-pointer hover:bg-[#fafaf9] transition-colors"
      >
        <div className="flex items-start gap-3">
          <span className="font-mono text-[18px] font-medium text-[#2563eb] leading-none mt-0.5">{number}</span>
          <div className="flex-1">
            <h3 className="text-[18px] font-medium mb-1" style={{ fontFamily: "'EB Garamond', Georgia, serif" }}>
              {title}
            </h3>
            <p className="text-[13px] text-[#888] m-0 font-mono">Best for: {audience}</p>
          </div>
          <span className="font-mono text-[14px] text-[#888] mt-1">{open ? '−' : '+'}</span>
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-0 border-t border-[#f0f0f0]">
          <p className="text-[15px] text-[#555] leading-relaxed mt-3 mb-3">{description}</p>
          <div className="font-mono text-[10px] uppercase tracking-wider text-[#888] mb-2">
            Instructions for participants
          </div>
          <ol className="pl-5 space-y-1.5">
            {instructions.map((item, i) => (
              <li key={i} className="text-[14px] text-[#555] leading-relaxed">
                {item}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

function ResourceLink({
  href,
  label,
  description,
  external,
}: {
  href: string
  label: string
  description: string
  external?: boolean
}) {
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className="flex items-center gap-4 p-3 border border-[#e0dfdd] rounded-lg no-underline hover:border-[#bbb] hover:no-underline transition-colors max-[600px]:flex-col max-[600px]:items-start max-[600px]:gap-1"
    >
      <span className="font-mono text-[12px] font-medium text-[#1a1a1a] uppercase tracking-wider">{label}</span>
      <span className="text-[14px] text-[#888]" style={{ fontFamily: "'EB Garamond', Georgia, serif" }}>
        {description}
      </span>
      {external && <span className="text-[10px] text-[#888]">↗</span>}
    </a>
  )
}
