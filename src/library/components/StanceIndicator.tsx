import { ADVOCATED_STANCE_OPTIONS } from '../../lib/resourceTaxonomy'

interface StanceIndicatorProps {
  stance: string | null
  timeline?: string | null
  risk?: string | null
  compact?: boolean
}

// Map the 7-point stance vocabulary to a 0-100% position on the gradient bar.
// Accelerate (left) → Nationalize (right).
const STANCE_POSITION: Record<string, number> = {
  Accelerate: 5,
  'Light-touch': 20,
  Targeted: 35,
  Moderate: 50,
  Restrictive: 65,
  Precautionary: 80,
  Nationalize: 95,
}

/**
 * Gradient bar with a position marker for advocated_stance, plus optional
 * inline timeline / risk labels. Falls back to a muted "stance unknown"
 * variant when no stance data exists.
 */
export function StanceIndicator({ stance, timeline, risk, compact = false }: StanceIndicatorProps) {
  const pos = stance ? STANCE_POSITION[stance] : null
  const known = pos != null
  const labels: string[] = []
  if (stance) labels.push(stance)
  if (timeline) labels.push(`${timeline} timeline`)
  if (risk) labels.push(`risk ${risk}`)

  return (
    <div
      className={`flex items-center gap-2 ${compact ? '' : 'flex-wrap'}`}
      role="img"
      aria-label={
        stance
          ? `Advocated stance: ${labels.join(', ')}`
          : 'Advocated stance: unknown — no stance data recorded for this resource'
      }
    >
      <div
        className={`relative h-[3px] w-[44px] rounded ${known ? 'opacity-100' : 'opacity-30'}`}
        style={{
          backgroundImage: 'linear-gradient(90deg, #c25a3a 0%, #8b7a3a 50%, #567b9b 100%)',
        }}
      >
        {known && (
          <span
            className="absolute -top-[3px] h-[9px] w-[3px] rounded-[1px] bg-[#1a1a1a]"
            style={{ left: `${pos}%` }}
          />
        )}
      </div>
      {labels.length > 0 ? (
        <span className="font-mono text-[11px] text-[#6b7280]">{labels.join(' · ')}</span>
      ) : (
        <span className="font-mono text-[11px] text-[#9ca3af]">stance unknown</span>
      )}
    </div>
  )
}

// Exported for reuse by filter-rail checkbox labels.
export const STANCE_ORDER = ADVOCATED_STANCE_OPTIONS
