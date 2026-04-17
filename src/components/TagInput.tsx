import { useState, useRef, useEffect, useCallback, type KeyboardEvent, type ReactNode } from 'react'

export interface Tag {
  id: string | number
  label: string
  meta?: Record<string, unknown>
}

export interface TagSearchResult {
  id: string | number
  label: string
  detail?: string
  isPending?: boolean
  meta?: Record<string, unknown>
}

interface TagInputProps {
  tags: Tag[]
  onTagsChange: (tags: Tag[]) => void
  searchFn: (query: string) => TagSearchResult[] | Promise<TagSearchResult[]>
  placeholder?: string
  maxTags?: number
  disabled?: boolean
  className?: string
  /** Render a custom trailing item in the dropdown (e.g., "Add 'X' as new org...") */
  renderTrailingOption?: (query: string) => ReactNode
  /** Debounce delay for search in ms */
  debounceMs?: number
}

/**
 * Generic multi-tag input with pluggable search source.
 * Used for affiliated orgs, locations, authors, other categories.
 *
 * Integrate with React Hook Form via Controller:
 *   <Controller name="affiliatedOrgs" control={control}
 *     render={({ field }) => <TagInput tags={field.value} onTagsChange={field.onChange} ... />}
 *   />
 */
export function TagInput({
  tags,
  onTagsChange,
  searchFn,
  placeholder = 'Search...',
  maxTags,
  disabled = false,
  className = '',
  renderTrailingOption,
  debounceMs = 150,
}: TagInputProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TagSearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [, setIsSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const atMax = maxTags != null && tags.length >= maxTags

  // Debounced search
  useEffect(() => {
    if (!query) {
      setResults([])
      setIsOpen(false)
      return
    }

    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      void (async () => {
        setIsSearching(true)
        try {
          const res = await searchFn(query)
          // Filter out already-selected tags
          const tagIds = new Set(tags.map((t) => t.id))
          setResults(res.filter((r) => !tagIds.has(r.id)))
          setIsOpen(true)
          setActiveIndex(-1)
        } finally {
          setIsSearching(false)
        }
      })()
    }, debounceMs)

    return () => clearTimeout(debounceRef.current)
  }, [query, searchFn, tags, debounceMs])

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

  const addTag = useCallback(
    (result: TagSearchResult) => {
      if (atMax) return
      if (tags.some((t) => t.id === result.id)) return
      onTagsChange([...tags, { id: result.id, label: result.label, meta: result.meta }])
      setQuery('')
      setIsOpen(false)
      inputRef.current?.focus()
    },
    [tags, onTagsChange, atMax],
  )

  const removeTag = useCallback(
    (id: string | number) => {
      onTagsChange(tags.filter((t) => t.id !== id))
      inputRef.current?.focus()
    },
    [tags, onTagsChange],
  )

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Backspace' && !query && tags.length > 0) {
      // Remove last tag on backspace in empty input
      removeTag(tags[tags.length - 1]!.id)
      return
    }

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
          addTag(results[activeIndex]!)
        }
        break
      case 'Escape':
        setIsOpen(false)
        break
    }
  }

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {/* Tags + input wrapper */}
      <div
        className={`flex flex-wrap items-center gap-1.5 min-h-[38px] px-2 py-1.5 border rounded cursor-text transition-colors ${
          isOpen ? 'border-[#2563eb]' : 'border-[#ddd]'
        } ${disabled ? 'opacity-50' : 'hover:border-[#999]'} bg-white`}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Existing tags */}
        {tags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 text-[12px] font-mono bg-[#f0f0f0] rounded"
          >
            {tag.label}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  removeTag(tag.id)
                }}
                className="text-[#888] hover:text-[#1a1a1a] bg-transparent border-none cursor-pointer text-[14px] leading-none p-0"
                aria-label={`Remove ${tag.label}`}
              >
                ×
              </button>
            )}
          </span>
        ))}

        {/* Search input */}
        {!atMax && (
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={tags.length === 0 ? placeholder : ''}
            disabled={disabled}
            className="flex-1 min-w-[80px] border-none outline-none font-mono text-[13px] bg-transparent p-0"
          />
        )}
      </div>

      {/* Results dropdown */}
      {isOpen && (results.length > 0 || renderTrailingOption) && (
        <div className="absolute z-40 top-full left-0 right-0 mt-1 bg-white border border-[#ddd] rounded shadow-lg max-h-[200px] overflow-y-auto">
          {results.map((result, i) => (
            <div
              key={result.id}
              onMouseDown={(e) => {
                e.preventDefault()
                addTag(result)
              }}
              onMouseEnter={() => setActiveIndex(i)}
              className={`flex items-center justify-between px-3 py-1.5 cursor-pointer text-[12px] font-mono transition-colors ${
                i === activeIndex ? 'bg-[#f0f0f0]' : ''
              }`}
            >
              <span className="truncate">{result.label}</span>
              <span className="flex items-center gap-2">
                {result.detail && (
                  <span className="text-[#888] text-[11px] truncate max-w-[120px]">
                    {result.detail}
                  </span>
                )}
                {result.isPending && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">
                    pending
                  </span>
                )}
              </span>
            </div>
          ))}

          {/* Trailing option (e.g., "Add new org...") */}
          {renderTrailingOption?.(query)}
        </div>
      )}
    </div>
  )
}
