import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react'

interface BlueskyActor {
  handle: string
  displayName?: string
  avatar?: string
}

interface BlueskySearchProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

/**
 * Single-select Bluesky handle autocomplete.
 * Searches the public Bluesky API for actor handles.
 * Results show avatar, display name, and @handle.
 * Selecting an actor fills the input with @handle format.
 */
export function BlueskySearch({ value, onChange, className = '' }: BlueskySearchProps) {
  const [results, setResults] = useState<BlueskyActor[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Debounced search against Bluesky public API
  useEffect(() => {
    const q = value.trim().replace('@', '')
    if (q.length < 2) {
      setResults([])
      setIsOpen(false)
      return
    }

    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://public.api.bsky.app/xrpc/app.bsky.actor.searchActorsTypeahead?q=${encodeURIComponent(q)}&limit=5`,
        )
        if (!res.ok) {
          setResults([])
          setIsOpen(false)
          return
        }
        const data = await res.json()
        const actors: BlueskyActor[] = data.actors || []
        setResults(actors)
        setIsOpen(actors.length > 0)
        setActiveIndex(-1)
      } catch {
        setResults([])
        setIsOpen(false)
      }
    }, 50)

    return () => clearTimeout(debounceRef.current)
  }, [value])

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

  const selectActor = useCallback(
    (actor: BlueskyActor) => {
      onChange('@' + actor.handle)
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
          selectActor(results[activeIndex]!)
        } else if (results.length > 0) {
          selectActor(results[0]!)
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
        onKeyDown={handleKeyDown}
        placeholder="Search Bluesky handles..."
        className="w-full px-3 py-2 font-mono text-[13px] border border-[#ddd] rounded bg-white outline-none transition-colors hover:border-[#999] focus:border-[#2563eb]"
      />

      {isOpen && results.length > 0 && (
        <div className="absolute z-40 top-full left-0 right-0 mt-1 bg-white border border-[#ddd] rounded shadow-lg max-h-[200px] overflow-y-auto">
          {results.map((actor, i) => (
            <div
              key={actor.handle}
              onMouseDown={(e) => {
                e.preventDefault()
                selectActor(actor)
              }}
              onMouseEnter={() => setActiveIndex(i)}
              className={`flex items-center gap-2.5 px-3 py-1.5 cursor-pointer text-[12px] font-mono transition-colors ${
                i === activeIndex ? 'bg-[#f0f0f0]' : ''
              }`}
            >
              {actor.avatar ? (
                <img
                  src={actor.avatar}
                  alt=""
                  className="w-5 h-5 rounded-full flex-shrink-0 object-cover"
                />
              ) : (
                <span className="w-5 h-5 rounded-full flex-shrink-0 bg-[#e0e0e0]" />
              )}
              <span className="truncate font-medium">
                {actor.displayName || actor.handle}
              </span>
              <span className="text-[#888] text-[11px] truncate ml-auto">
                @{actor.handle}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
