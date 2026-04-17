import { useState, useRef, useEffect, useCallback, useMemo, type KeyboardEvent } from 'react'
import { useEntityCache } from '../hooks/useEntityCache'

interface TwitterMatch {
  name: string
  handle: string
  category: string | null
}

interface TwitterSearchProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

/**
 * Single-select Twitter/X handle autocomplete from entity cache.
 * Pure client-side filtering -- no external API call.
 * Searches known Twitter handles among people and organizations.
 */
export function TwitterSearch({ value, onChange, className = '' }: TwitterSearchProps) {
  const { cache } = useEntityCache()
  const [results, setResults] = useState<TwitterMatch[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Pre-filter entities that have twitter handles (people + orgs only)
  const twitterEntities = useMemo(() => {
    if (!cache) return []
    return cache.entities.filter(
      (e) =>
        e.twitter &&
        (e.entity_type === 'person' || e.entity_type === 'organization'),
    )
  }, [cache])

  // Debounced client-side filter — only search when input is focused
  const isFocusedRef = useRef(false)
  useEffect(() => {
    if (!isFocusedRef.current) return
    const q = value.trim().replace('@', '').toLowerCase()
    if (q.length < 1) {
      setResults([])
      setIsOpen(false)
      return
    }

    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const matches: TwitterMatch[] = []
      for (const e of twitterEntities) {
        const handle = (e.twitter || '').replace('@', '').toLowerCase()
        if (handle.includes(q)) {
          matches.push({
            name: e.name,
            handle: e.twitter!,
            category: e.category,
          })
        }
        if (matches.length >= 5) break
      }
      setResults(matches)
      setIsOpen(matches.length > 0)
      setActiveIndex(-1)
    }, 80)

    return () => clearTimeout(debounceRef.current)
  }, [value, twitterEntities])

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  const justSelectedRef = useRef(false)
  const selectHandle = useCallback(
    (handle: string) => {
      justSelectedRef.current = true
      onChange(handle)
      setIsOpen(false)
    },
    [onChange],
  )

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isOpen) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex((prev) => Math.min(prev + 1, results.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex((prev) => Math.max(prev - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (activeIndex >= 0 && activeIndex < results.length) {
          selectHandle(results[activeIndex]!.handle)
        } else if (results.length > 0) {
          selectHandle(results[0]!.handle)
        }
        break
      case 'Escape':
        setIsOpen(false)
        break
    }
  }

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => { isFocusedRef.current = true }}
        onBlur={() => { isFocusedRef.current = false }}
        onKeyDown={handleKeyDown}
        placeholder="Search Twitter/X handles..."
        className="w-full px-3 py-2 font-mono text-[13px] border border-[#ddd] rounded bg-white outline-none transition-colors hover:border-[#999] focus:border-[#2563eb]"
      />

      {isOpen && results.length > 0 && (
        <div className="absolute z-40 top-full left-0 right-0 mt-1 bg-white border border-[#ddd] rounded shadow-lg max-h-[200px] overflow-y-auto">
          {results.map((match, i) => (
            <div
              key={match.handle}
              onMouseDown={(e) => {
                e.preventDefault()
                selectHandle(match.handle)
              }}
              onMouseEnter={() => setActiveIndex(i)}
              className={`flex items-center justify-between px-3 py-1.5 cursor-pointer text-[12px] font-mono transition-colors ${
                i === activeIndex ? 'bg-[#f0f0f0]' : ''
              }`}
            >
              <span className="truncate font-medium">{match.name}</span>
              <span className="text-[#888] text-[11px] truncate ml-2">
                {match.handle}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
