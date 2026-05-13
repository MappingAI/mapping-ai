import { useState, useRef, useEffect, type ReactNode } from 'react'

interface InfoTooltipProps {
  children: ReactNode
  /** Width of the tooltip in pixels (default 280) */
  width?: number
}

/**
 * Small "i" circle that shows a tooltip on hover (desktop) or tap (mobile).
 * Matches the original contribute.html info-tip pattern.
 */
export function InfoTooltip({ children, width = 280 }: InfoTooltipProps) {
  const [tapped, setTapped] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  // Close on outside tap
  useEffect(() => {
    if (!tapped) return
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setTapped(false)
      }
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [tapped])

  return (
    <span
      ref={ref}
      className="group relative inline-flex items-center justify-center w-[20px] h-[20px] max-[600px]:w-[28px] max-[600px]:h-[28px] rounded-full bg-[#ddd] text-[#888] font-mono text-[9px] font-medium cursor-help ml-1.5 hover:bg-[#2563eb] hover:text-white"
      onClick={() => setTapped(!tapped)}
    >
      i
      <span
        className={`${tapped ? 'block' : 'hidden'} group-hover:block absolute bottom-[calc(100%+2px)] left-1/2 -translate-x-1/2 bg-white text-[#1a1a1a] font-mono text-[10px] font-normal leading-relaxed p-[0.6rem_0.8rem] rounded-md border border-[#ddd] shadow-[0_4px_16px_rgba(0,0,0,0.1)] z-[100] pointer-events-auto normal-case tracking-normal [&_a]:text-[#2563eb] [&_a:hover]:underline [&_strong]:font-semibold max-[600px]:left-auto max-[600px]:right-0 max-[600px]:translate-x-0 max-[600px]:max-w-[calc(100vw-48px)]`}
        style={{ width }}
      >
        {children}
        {/* Invisible bridge so mouse can travel from icon to tooltip */}
        <span className="absolute top-full left-0 right-0 h-2" />
      </span>
    </span>
  )
}
