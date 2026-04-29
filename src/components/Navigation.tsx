import { useState } from 'react'
import { IS_IFRAME } from '../lib/iframe'

const NAV_LINKS = [
  { href: '/', label: 'Background' },
  { href: '/contribute', label: 'Contribute' },
  { href: '/map', label: 'Map' },
  { href: '/insights', label: 'Insights' },
  { href: '/about', label: 'About' },
]

export function Navigation() {
  const [menuOpen, setMenuOpen] = useState(false)
  const currentPath = window.location.pathname.replace(/\.html$/, '') || '/'

  // In iframe, nav links should target the parent window
  const linkTarget = IS_IFRAME ? '_top' : undefined

  return (
    <nav className="fixed top-0 left-0 right-0 flex justify-between items-center px-8 h-12 bg-white border-b border-[#bbb]/50 z-[100] max-[600px]:px-4">
      <a
        href="/"
        target={linkTarget}
        className="font-mono text-xs tracking-wider uppercase text-[#1a1a1a] no-underline"
      >
        Mapping AI
      </a>

      {/* Hamburger (mobile only) */}
      <button
        className="hidden max-[600px]:flex flex-col justify-center gap-[5px] bg-transparent border-none cursor-pointer p-1"
        aria-label="Menu"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <span className="block w-5 h-[1.5px] bg-[#1a1a1a]" />
        <span className="block w-5 h-[1.5px] bg-[#1a1a1a]" />
        <span className="block w-5 h-[1.5px] bg-[#1a1a1a]" />
      </button>

      {/* Nav links */}
      <div
        className={`flex gap-8 max-[600px]:absolute max-[600px]:top-12 max-[600px]:left-0 max-[600px]:right-0 max-[600px]:bg-white max-[600px]:border-b max-[600px]:border-[#bbb]/50 max-[600px]:flex-col max-[600px]:px-6 max-[600px]:py-4 max-[600px]:gap-4 ${
          menuOpen ? 'max-[600px]:flex' : 'max-[600px]:hidden'
        }`}
      >
        {NAV_LINKS.map(({ href, label }) => {
          const isActive = href === currentPath || (href === '/contribute' && currentPath === '/contribute')

          return (
            <a
              key={href}
              href={href}
              target={linkTarget}
              className={`font-mono text-xs tracking-wider uppercase no-underline transition-colors duration-150 relative ${
                isActive ? 'text-[#1a1a1a]' : 'text-[#888] hover:text-[#1a1a1a]'
              }`}
            >
              {label}
              {/* Active underline */}
              <span
                className={`absolute -bottom-[3px] left-0 h-px bg-[#1a1a1a] transition-all duration-200 ${
                  isActive ? 'w-full' : 'w-0 group-hover:w-full'
                }`}
              />
            </a>
          )
        })}
      </div>
    </nav>
  )
}
