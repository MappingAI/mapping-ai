export function App() {
  return (
    <>
      {/* Page-specific nav (NOT the standard site Navigation) */}
      <nav className="sticky top-0 z-[100] bg-white/95 backdrop-blur-sm border-b border-[#ddd] px-8 py-[0.6rem] flex items-center gap-8 font-mono text-[11px] uppercase tracking-[0.1em] max-[600px]:px-4 max-[600px]:gap-4 max-[600px]:text-[10px]">
        <span className="font-medium text-[12px] tracking-[0.14em] text-text-primary">
          Mapping AI
        </span>
        <a
          href="#overview"
          className="text-text-secondary no-underline hover:text-text-primary hover:no-underline"
        >
          Overview
        </a>
        <a
          href="#streams"
          className="text-text-secondary no-underline hover:text-text-primary hover:no-underline"
        >
          Streams
        </a>
        <a
          href="#setup"
          className="text-text-secondary no-underline hover:text-text-primary hover:no-underline"
        >
          Setup
        </a>
        <a
          href="https://mapping-ai.org"
          target="_blank"
          rel="noopener noreferrer"
          className="text-text-secondary no-underline hover:text-text-primary hover:no-underline"
        >
          Live Site
        </a>
      </nav>

      {/* Hero */}
      <div className="max-w-[720px] mx-auto px-8 pt-16 pb-8 max-[600px]:px-4">
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
        <p className="text-[19px] text-text-secondary leading-[1.55] mb-6">
          We&rsquo;re building an open, interactive stakeholder map of the
          American AI landscape. Today, you&rsquo;ll help us make it better.
          Pick a stream, grab a laptop, and dig in.
        </p>
        <a
          href="https://discord.com/events/1491894381773590609/1494729391509340281"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-[#5865F2] text-white font-mono text-[14px] font-medium uppercase tracking-[0.08em] px-6 py-3 rounded-lg no-underline hover:bg-[#4752C4] hover:text-white hover:no-underline transition-colors"
        >
          <svg width="20" height="16" viewBox="0 0 71 55" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M60.1 4.9A58.5 58.5 0 0045.4.2a.2.2 0 00-.2.1 40.8 40.8 0 00-1.8 3.7 54 54 0 00-16.2 0A37.3 37.3 0 0025.4.3a.2.2 0 00-.2-.1A58.4 58.4 0 0010.5 5 59.5 59.5 0 00.4 45.1a.3.3 0 00.1.2A58.7 58.7 0 0018.1 55a.2.2 0 00.3-.1 42 42 0 003.6-5.9.2.2 0 00-.1-.3 38.6 38.6 0 01-5.5-2.6.2.2 0 01 0-.4c.4-.3.7-.6 1.1-.8a.2.2 0 01.3 0 41.8 41.8 0 0035.6 0 .2.2 0 01.2 0c.3.3.7.6 1.1.9a.2.2 0 010 .3 36.3 36.3 0 01-5.5 2.6.2.2 0 00-.1.4 47.1 47.1 0 003.6 5.8.2.2 0 00.2.1A58.5 58.5 0 0070.7 45.3a.3.3 0 00.1-.2c1.8-18.6-3-34.7-12.7-49a.2.2 0 00-.1-.1zM23.7 37c-3.6 0-6.6-3.3-6.6-7.4s2.9-7.4 6.6-7.4c3.7 0 6.7 3.4 6.6 7.4 0 4.1-2.9 7.4-6.6 7.4zm24.4 0c-3.6 0-6.6-3.3-6.6-7.4s2.9-7.4 6.6-7.4c3.7 0 6.7 3.4 6.6 7.4 0 4.1-2.9 7.4-6.6 7.4z" />
          </svg>
          Join the Discord Server
        </a>
      </div>

      {/* Content */}
      <div className="max-w-[720px] mx-auto px-8 pb-16 font-serif text-[17px] leading-[1.65] text-text-primary max-[600px]:px-4">
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
          The database currently holds <strong>709 people</strong>,{' '}
          <strong>734 organizations</strong>, and{' '}
          <strong>161 resources</strong>, linked by{' '}
          <strong>2,228 relationships</strong>. About 1,020 of those entities
          are publicly visible on the map. The rest are pending review or need
          enrichment before they&rsquo;re ready to publish.
        </p>

        <p className="mb-4">
          The frontend is a Vite multi-page app built with React 19, TypeScript,
          and Tailwind CSS. The interactive D3.js map remains as an inline HTML
          page. The backend is PostgreSQL on AWS RDS with Lambda functions
          handling form submissions and search through API Gateway.
          Contributions go through a form on the site and get reviewed by an
          admin before appearing on the map.
        </p>

        <Callout>
          <strong>The site is live but still evolving.</strong> The data is
          growing, the UI has rough edges, and some features are in progress.
          That&rsquo;s why you&rsquo;re here.
        </Callout>

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
              ['0:00', 'Welcome, introductions'],
              [
                '0:10',
                'Project walkthrough (live demo of the map, contribute form, admin panel)',
              ],
              ['0:25', 'Stream overview \u2014 pick your group'],
              ['0:35', 'Break into streams, get set up'],
              ['0:45', 'Work session 1'],
              ['1:45', 'Break / snacks / mingle'],
              ['2:00', 'Work session 2'],
              ['2:45', 'Stream readouts (3 min each)'],
              ['3:10', 'Discussion: big picture, next steps'],
              ['3:30', 'Wrap'],
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
          Use this format in a shared doc or spreadsheet:
        </p>

        <Pre>{`Page: [which page]
What I did: [steps to reproduce]
What I expected: [what should have happened]
What happened: [what actually happened]
Browser/device: [Chrome on Mac, Safari on iPhone, etc.]
Screenshot: [paste one if you can]`}</Pre>

        <p className="mb-4">
          Prioritize things that are broken or confusing over things that are
          cosmetic. A dropdown that doesn&rsquo;t close is more important than a
          font size that looks slightly off. But note both.
        </p>

        <p className="mb-4">
          If you&rsquo;re comfortable with GitHub, you can also file issues
          directly at{' '}
          <ExtLink href="https://github.com/MappingAI/mapping-ai/issues">
            github.com/MappingAI/mapping-ai/issues
          </ExtLink>
          .
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
          The map is only as useful as its data. Right now, about 44% of
          entities in the database have no notes at all, and many that do have
          notes are thin or unsourced. Your job is to add new entities and flesh
          out existing ones by submitting through the contribute form.
        </p>

        <H4>What to add</H4>

        <p className="mb-4">
          Think about who&rsquo;s missing. Search the map first (the search bar
          on{' '}
          <ExtLink href="https://mapping-ai.org/map">the map page</ExtLink>
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
          Go to{' '}
          <ExtLink href="https://mapping-ai.org/contribute">
            mapping-ai.org/contribute
          </ExtLink>{' '}
          and fill out the form. A few things to keep in mind:
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
          <strong>Name:</strong> Elizabeth Kelly
          <br />
          <strong>Title:</strong> Head of Beneficial Deployments, Anthropic
          <br />
          <strong>Category:</strong> Policymaker
          <br />
          <strong>Primary Org:</strong> Anthropic
          <br />
          <strong>Notes:</strong> Elizabeth Kelly served as the inaugural Director
          of the U.S. AI Safety Institute at NIST from February 2024 to February
          2025, appointed by Commerce Secretary Gina Raimondo to lead the
          government&rsquo;s effort to measure and mitigate risks from advanced
          AI systems. She was a key drafter of President Biden&rsquo;s Executive
          Order on AI. Under her leadership, the AISI reached agreements with
          OpenAI and Anthropic to test their models prior to release and helped
          establish the international network of AI safety institutes. She
          departed the AISI in February 2025 after the Trump administration
          rescinded Biden&rsquo;s AI executive order.
          <br />
          <strong>Regulatory stance:</strong> Moderate
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

        <p className="mb-4">
          <strong>Citation artifacts.</strong> About 316 entities have leftover{' '}
          <Code>[1]</Code>, <Code>[6,7]</Code> style references in their notes
          from the AI enrichment pipeline. These need to be flagged or cleaned.
        </p>

        <p className="mb-4">
          <strong>Hallucinated facts.</strong> AI-generated notes sometimes
          include plausible-sounding claims that are wrong. Hyper-specific
          founding dates, round dollar amounts, inflated competition results,
          invented awards. If a claim sounds surprisingly specific, verify it.
          One example we already found: an entity&rsquo;s notes claimed someone
          was a &ldquo;six-time finalist of the International Olympiad in
          Informatics&rdquo; when the official IOI records show they competed
          exactly once.
        </p>

        <p className="mb-4">
          <strong>Stale information.</strong> Some entries list people at
          organizations they&rsquo;ve since left. Government officials who
          changed roles after the 2025 transition are a common case.
        </p>

        <p className="mb-4">
          <strong>Wrong organizational affiliations.</strong> At least one entry
          had its primary organization set to a completely different entity with
          a similar-sounding name (an AI safety research org got confused with a
          university policy center). These are especially damaging because they
          create false connections on the map.
        </p>

        <H4>How to work</H4>

        <p className="mb-4">
          Browse entities on{' '}
          <ExtLink href="https://mapping-ai.org/map">the map</ExtLink>.
          Click on nodes to read their detail panels. When you find something
          that looks wrong, document it in a shared spreadsheet:
        </p>

        <Pre>{`Entity name: [who/what]
Problem: [what's wrong]
Evidence: [how you know it's wrong, with a source link]
Suggested fix: [what it should say instead]`}</Pre>

        <p className="mb-4">
          Spend your first few minutes on well-known figures whose facts you can
          check from memory. Then move to less-familiar entities where
          you&rsquo;ll need to do some quick googling. The goal is breadth:
          finding patterns of errors is more useful than perfecting one entry.
        </p>

        <Divider />

        {/* STREAM 4 */}
        <StreamHeading id="stream-4">Stream 4: New Features</StreamHeading>
        <StreamTag>Best for: developers who want to write code</StreamTag>

        <p className="mb-4">
          The codebase is a Vite multi-page app with React 19, TypeScript, and
          Tailwind CSS. The interactive D3.js map is an inline HTML page. The
          backend is AWS Lambda functions behind API Gateway, with PostgreSQL on
          AWS RDS. If you can write TypeScript, React, CSS, or Node.js, you can
          contribute.
        </p>

        <H4>Prerequisites</H4>

        <p className="mb-4">
          You need <strong>Node.js 20+</strong> and <strong>npm</strong> installed.
          If you don&rsquo;t have them:
        </p>

        <Pre>{`# macOS (with Homebrew)
brew install node

# Or use nvm (recommended for managing Node versions)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 20
nvm use 20

# Verify
node --version   # should be v20+
npm --version    # should be v10+`}</Pre>

        <H4>Getting set up</H4>

        <p className="mb-4">
          The repo is at{' '}
          <Code>MappingAI/mapping-ai</Code>. Clone it and install dependencies:
        </p>

        <Pre>{`git clone https://github.com/MappingAI/mapping-ai.git
cd mapping-ai
npm ci`}</Pre>

        <p className="mb-4">
          You need a <Code>.env</Code> file with database credentials
          to run the API locally. These will be shared via Doppler (colead is
          adding the link). Create the file in the project root:
        </p>

        <Pre>{`# .env (get values from Doppler or ask an organizer)
DATABASE_URL=postgresql://...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...`}</Pre>

        <p className="mb-4">Start the dev servers (two terminals):</p>

        <Pre>{`# Terminal 1: React dev server (all pages except map)
npx vite dev          # http://localhost:5173

# Terminal 2: API proxy (for form submissions + map)
node dev-server.js    # http://localhost:3000`}</Pre>

        <p className="mb-4">
          Visit <Code>localhost:5173</Code> for React pages (contribute, admin, insights, about).
          Visit <Code>localhost:3000</Code> for the map (it&rsquo;s inline HTML, not React).
        </p>

        <H4>Tips for coding with AI agents</H4>

        <p className="mb-4">
          If you&rsquo;re using Claude Code, Cursor, or another AI coding agent:
        </p>

        <ul className="list-disc pl-6 mb-4 space-y-2 text-[16px]">
          <li>Use <Code>agent-browser</Code> to test changes visually (screenshots, form filling, navigation testing)</li>
          <li>Run <Code>npx tsc --noEmit</Code> after changes to catch type errors</li>
          <li>Run <Code>npx vitest run</Code> to verify tests pass</li>
          <li>Read <Code>CLAUDE.md</Code> for the full codebase context and conventions</li>
          <li>The <Code>compound-engineering</Code> plugin skills like <Code>/ce:review</Code> and <Code>/ce:compound</Code> are helpful for code review and documentation</li>
        </ul>

        <H4>Architecture overview</H4>

        <Callout>
          <strong>Vite MPA</strong> with React 19 + TypeScript + Tailwind
          <br />
          <strong>7 React pages</strong> + 1 inline page (map.html with D3.js)
          <br />
          <strong>API:</strong> AWS Lambda + API Gateway
          <br />
          <strong>DB:</strong> PostgreSQL on AWS RDS
        </Callout>

        <H4>Key directories</H4>

        <table className="w-full border-collapse mb-4 text-[16px]">
          <thead>
            <tr>
              <th className="font-mono text-[11px] uppercase tracking-[0.08em] text-left p-2 border-b-2 border-text-primary text-text-secondary">
                Path
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
                  'src/',
                  'React pages (contribute, admin, about, workshop, etc.) with TypeScript components and shared UI.',
                ],
                [
                  'map.html',
                  'The interactive D3.js map. Visualization logic is inline. Loads data from map-data.json, a static file generated from the database.',
                ],
                [
                  'api/',
                  'Lambda functions. submit.js handles form submissions, search.js does full-text search, admin.js handles the review queue.',
                ],
                [
                  'scripts/',
                  'Utility scripts for database migration, data export, backups, and enrichment.',
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
          Before starting, check the{' '}
          <ExtLink href="https://github.com/MappingAI/mapping-ai/issues">
            GitHub issues
          </ExtLink>{' '}
          to see if someone&rsquo;s already working on what you have in mind.
          When you&rsquo;re done, open a pull request against{' '}
          <Code>main</Code>.
        </p>

        <H4>Conventions</H4>

        <p className="mb-4">
          Commit messages use conventional prefixes: <Code>feat:</Code>,{' '}
          <Code>fix:</Code>, <Code>refactor:</Code>, <Code>docs:</Code>.
          React pages use Tailwind for styling. The map loads{' '}
          <Code>map-data.json</Code> which uses different field names than the
          database (there&rsquo;s a mapping layer in{' '}
          <Code>api/export-map.js</Code>). Read the <Code>CLAUDE.md</Code> in
          the repo root for full documentation of the schema, field mappings,
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
          By the end of the session, write up a short strategy document: target
          audiences (ranked by priority), 10-20 specific distribution channels
          with links, a draft one-line pitch, and any partnership leads you
          identified. A Google Doc is fine.
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

        <H4>Getting the data</H4>

        <p className="mb-4">
          The public map data is available as a single JSON file:
        </p>
        <Pre>https://mapping-ai.org/map-data.json</Pre>

        <p className="mb-4">
          This contains all approved entities with their fields mapped to
          frontend names. You can fetch it directly and work with it in whatever
          tool you prefer: Python (pandas, matplotlib, seaborn), R, Observable
          notebooks, even just Excel if that&rsquo;s your thing.
        </p>

        <p className="mb-4">
          The raw database export (with all 1,604 entities and 2,228 edges,
          including pending/internal ones) is available from the organizers. Ask
          if you want it.
        </p>

        <H4>Research questions worth exploring</H4>

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
          Whatever you produce, aim for something we could turn into a blog
          post. That means: a clear finding stated in one sentence, a
          visualization that supports it, and 2-3 paragraphs of context. You
          don&rsquo;t need to polish it. A Jupyter notebook or Observable
          notebook with rough charts and annotations is plenty. We&rsquo;ll
          clean it up for publication.
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
              [
                'Discord server',
                'https://discord.com/events/1491894381773590609/1494729391509340281',
                'Join Discord',
              ],
              ['Live site', 'https://mapping-ai.org', 'mapping-ai.org'],
              [
                'Interactive map',
                'https://mapping-ai.org/map',
                'mapping-ai.org/map',
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
                'File bugs',
                'https://github.com/MappingAI/mapping-ai/issues',
                'GitHub Issues',
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
      className="font-mono text-[13px] font-medium uppercase tracking-[0.14em] text-text-primary mt-12 mb-4 pb-[0.4rem] border-b border-[#ddd]"
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
      className="text-[22px] font-normal mt-8 mb-[0.6rem]"
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
  return <hr className="border-none border-t border-[#ddd] my-12" />
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
