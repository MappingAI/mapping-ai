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

function XIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function BlueskyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.785 2.627 3.6 3.476 6.163 3.072-4.013.63-7.544 2.152-2.894 7.544 5.2 4.652 7.056-1.626 8.107-4.922.322-.984.472-.984.472-.984s.15 0 .472.984c1.051 3.296 2.908 9.574 8.107 4.922 4.65-5.392 1.12-6.913-2.894-7.544 2.564.404 5.378-.445 6.163-3.072.246-.828.624-5.79.624-6.479 0-.688-.139-1.86-.902-2.203-.659-.3-1.664-.62-4.3 1.24C17.046 4.748 14.087 8.687 13 10.8h-1z" />
    </svg>
  )
}

function LinkedInIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

function DiscordIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 71 55" fill="currentColor">
      <path d="M60.1 4.9A58.5 58.5 0 0045.4.2a.2.2 0 00-.2.1 40.8 40.8 0 00-1.8 3.7 54 54 0 00-16.2 0A37.3 37.3 0 0025.4.3a.2.2 0 00-.2-.1A58.4 58.4 0 0010.5 5 59.5 59.5 0 00.4 45.1a.3.3 0 00.1.2A58.7 58.7 0 0018.1 55a.2.2 0 00.3-.1 42 42 0 003.6-5.9.2.2 0 00-.1-.3 38.6 38.6 0 01-5.5-2.6.2.2 0 01 0-.4c.4-.3.7-.6 1.1-.8a.2.2 0 01.3 0 41.8 41.8 0 0035.6 0 .2.2 0 01.2 0c.3.3.7.6 1.1.9a.2.2 0 010 .3 36.3 36.3 0 01-5.5 2.6.2.2 0 00-.1.4 47.1 47.1 0 003.6 5.8.2.2 0 00.2.1A58.5 58.5 0 0070.7 45.3a.3.3 0 00.1-.2c1.8-18.6-3-34.7-12.7-49a.2.2 0 00-.1-.1zM23.7 37c-3.6 0-6.6-3.3-6.6-7.4s2.9-7.4 6.6-7.4c3.7 0 6.7 3.4 6.6 7.4 0 4.1-2.9 7.4-6.6 7.4zm24.4 0c-3.6 0-6.6-3.3-6.6-7.4s2.9-7.4 6.6-7.4c3.7 0 6.7 3.4 6.6 7.4 0 4.1-2.9 7.4-6.6 7.4z" />
    </svg>
  )
}

export function Footer() {
  return (
    <footer className="mt-12 pt-6 border-t border-[#bbb]/50">
      <div className="flex justify-center items-center gap-2 flex-wrap">
        <a href="/about" className="font-mono text-[10.5px] text-[#888] tracking-wide no-underline">
          Mapping AI Working Group
        </a>
        <span className="font-mono text-[10.5px] text-[#888] tracking-wide">&middot; 2026</span>
      </div>
      <div className="flex justify-center items-center gap-3 mt-3">
        <a
          href="mailto:info@mapping-ai.org"
          title="Email"
          className="text-[#888] no-underline hover:text-[#1a1a1a] transition-colors"
        >
          <MailIcon />
        </a>
        <a
          href="https://x.com/mapping_ai"
          target="_blank"
          rel="noopener noreferrer"
          title="X / Twitter"
          className="text-[#888] no-underline hover:text-[#1a1a1a] transition-colors"
        >
          <XIcon />
        </a>
        <a
          href="https://bsky.app/profile/mappingai.bsky.social"
          target="_blank"
          rel="noopener noreferrer"
          title="Bluesky"
          className="text-[#888] no-underline hover:text-[#1a1a1a] transition-colors"
        >
          <BlueskyIcon />
        </a>
        <a
          href="https://www.linkedin.com/company/mapping-ai-insights"
          target="_blank"
          rel="noopener noreferrer"
          title="LinkedIn"
          className="text-[#888] no-underline hover:text-[#1a1a1a] transition-colors"
        >
          <LinkedInIcon />
        </a>
        <a
          href="https://discord.gg/HtqceQRV3f"
          target="_blank"
          rel="noopener noreferrer"
          title="Discord"
          className="text-[#888] no-underline hover:text-[#1a1a1a] transition-colors"
        >
          <DiscordIcon />
        </a>
      </div>
      <div className="mt-3 font-mono text-[9px] text-[#888] tracking-tight text-center max-w-[600px] mx-auto leading-normal">
        Data is sourced from public records, user submissions, and LLM-assisted research. Inferred beliefs do not claim
        to represent official positions. We welcome corrections via{' '}
        <a href="/contribute" className="text-[#888]">
          contribute
        </a>{' '}
        or{' '}
        <a href="mailto:info@mapping-ai.org" className="text-[#888]">
          info@mapping-ai.org
        </a>
        .
      </div>
    </footer>
  )
}
