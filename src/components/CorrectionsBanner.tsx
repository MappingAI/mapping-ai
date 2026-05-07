export function CorrectionsBanner() {
  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-[#fef3c7] border-b border-[#fde68a] px-4 py-1.5 text-center font-mono text-[10px] text-[#92400e] tracking-wide leading-relaxed">
      We&apos;re aware of corrections on entity data (
      <a
        href="https://x.com/AndyMasley/status/1920202288963199437"
        target="_blank"
        rel="noopener noreferrer"
        className="underline"
      >
        see discussion
      </a>
      ) and are actively addressing these. Thanks for your feedback.
    </div>
  )
}
