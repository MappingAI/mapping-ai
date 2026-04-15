interface PillToggleProps {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  className?: string
}

/**
 * Relationship pill toggle — click to select, click again to deselect.
 * Used for "I am this person" / "I am connected" / "Someone I know of".
 */
export function PillToggle({ value, onChange, options, className = '' }: PillToggleProps) {
  return (
    <div className={`flex gap-2 flex-wrap ${className}`}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value === value ? '' : opt.value)}
          className={`px-3 py-1.5 text-[12px] font-mono border rounded-full cursor-pointer transition-colors ${
            opt.value === value
              ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]'
              : 'bg-white text-[#555] border-[#ccc] hover:border-[#999]'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
