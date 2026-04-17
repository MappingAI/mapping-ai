import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react'

export interface SelectOption {
  value: string
  label: string
  color?: string
}

interface CustomSelectProps {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  searchable?: boolean
  clearable?: boolean
  disabled?: boolean
  className?: string
}

/**
 * Searchable, color-coded dropdown replacing native <select>.
 * Features: search filtering, click-to-deselect, arrow key nav, click-outside close.
 *
 * Integrate with React Hook Form via Controller:
 *   <Controller name="category" control={control}
 *     render={({ field }) => <CustomSelect value={field.value} onChange={field.onChange} ... />}
 *   />
 */
export function CustomSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  searchable = true,
  clearable = true,
  disabled = false,
  className = '',
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const optionsRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((o) => o.value === value)
  const filtered = search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  // Focus search when dropdown opens
  useEffect(() => {
    if (isOpen && searchable) {
      setTimeout(() => searchRef.current?.focus(), 0)
    }
  }, [isOpen, searchable])

  // Reset active index when filtered list changes
  useEffect(() => {
    setActiveIndex(-1)
  }, [search])

  const handleSelect = useCallback(
    (optionValue: string) => {
      // Click-to-deselect: clicking selected option clears value
      if (clearable && optionValue === value) {
        onChange('')
      } else {
        onChange(optionValue)
      }
      setIsOpen(false)
      setSearch('')
    },
    [value, onChange, clearable],
  )

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault()
        setIsOpen(true)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex((prev) => Math.min(prev + 1, filtered.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex((prev) => Math.max(prev - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (activeIndex >= 0 && activeIndex < filtered.length) {
          handleSelect(filtered[activeIndex]!.value)
        }
        break
      case 'Escape':
        setIsOpen(false)
        setSearch('')
        break
    }
  }

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex < 0 || !optionsRef.current) return
    const items = optionsRef.current.querySelectorAll('[data-option]')
    items[activeIndex]?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  return (
    <div ref={wrapperRef} className={`relative ${className}`} onKeyDown={handleKeyDown}>
      {/* Trigger button */}
      <button
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center gap-2 px-3 py-2 text-left font-mono text-[13px] border rounded cursor-pointer transition-colors ${
          isOpen ? 'border-[#2563eb]' : 'border-[#ddd]'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#999]'} bg-white`}
      >
        {selectedOption?.color && (
          <span
            className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: selectedOption.color }}
          />
        )}
        <span className={selectedOption ? 'text-[#1a1a1a]' : 'text-[#888]'}>
          {selectedOption?.label ?? placeholder}
        </span>
        <svg
          className={`ml-auto w-3 h-3 text-[#888] transition-transform ${isOpen ? 'rotate-180' : ''}`}
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M3 4.5L6 7.5L9 4.5" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute z-40 top-full left-0 right-0 mt-1 bg-white border border-[#ddd] rounded shadow-lg max-h-[240px] overflow-hidden flex flex-col"
          role="listbox"
        >
          {/* Search input */}
          {searchable && (
            <div className="px-2 py-1.5 border-b border-[#eee]">
              <input
                ref={searchRef}
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-2 py-1 text-[12px] font-mono border border-[#eee] rounded outline-none focus:border-[#2563eb]"
                tabIndex={-1}
              />
            </div>
          )}

          {/* Options list */}
          <div ref={optionsRef} className="overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-[12px] font-mono text-[#888]">No options</div>
            ) : (
              filtered.map((option, i) => {
                const isSelected = option.value === value
                const isActive = i === activeIndex

                return (
                  <div
                    key={option.value}
                    data-option
                    role="option"
                    aria-selected={isSelected}
                    onMouseDown={(e) => {
                      e.preventDefault() // Prevent blur before click registers
                      handleSelect(option.value)
                    }}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer text-[12px] font-mono transition-colors ${
                      isActive ? 'bg-[#f0f0f0]' : ''
                    } ${isSelected ? 'text-[#2563eb] font-semibold' : 'text-[#1a1a1a]'}`}
                  >
                    {option.color && (
                      <span
                        className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: option.color }}
                      />
                    )}
                    {option.label}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/** SELECT_COLORS mapping from contribute.html */
export const SELECT_COLORS: Record<string, string> = {
  // Org categories
  'Frontier Lab': '#d4644a',
  'Infrastructure & Compute': '#6366F1',
  'Deployers & Platforms': '#EC4899',
  'AI Safety/Alignment': '#2d8a6e',
  'Think Tank/Policy Org': '#5b82bf',
  'Government/Agency': '#7c5cbf',
  Academic: '#d4a44a',
  'VC/Capital/Philanthropy': '#1a8a8a',
  'Labor/Civil Society': '#d4885a',
  'Media/Journalism': '#8b6914',
  'Political Campaign/PAC': '#b06a8a',
  'Ethics/Bias/Rights': '#e07020',
  // Person roles
  Executive: '#d4644a',
  Researcher: '#2d8a6e',
  Policymaker: '#9955cc',
  Investor: '#1a8a8a',
  Organizer: '#d4885a',
  Journalist: '#8b6914',
  'Cultural figure': '#b06a8a',
  // Regulatory stance
  Accelerate: '#f0c050',
  'Light-touch': '#d9a840',
  Targeted: '#c09030',
  Moderate: '#a07828',
  Restrictive: '#806020',
  Precautionary: '#604818',
  Nationalize: '#403010',
}

/** Helper to build SelectOption[] from a label array with auto-colors */
export function buildOptions(labels: string[]): SelectOption[] {
  return labels.map((label) => ({
    value: label,
    label,
    color: SELECT_COLORS[label],
  }))
}
