import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react'
import { useSearch } from '../hooks/useSearch'
import { useEntityCache } from '../hooks/useEntityCache'
import type { FuzzySearchResult } from '../types/api'

interface OrgSearchProps {
  value: string
  orgId: number | null
  onChange: (name: string, id: number | null) => void
  onCreateOrg?: (searchQuery: string) => void
  placeholder?: string
}

/**
 * Single-select organization search input with dropdown results.
 *
 * Features:
 * - On focus with empty input: shows top 5 orgs from entity cache
 * - Search results show org name + category + pending badge
 * - "Add 'X' as new org..." option when no exact match
 * - "Can't find it? Add this org" link below input
 * - Arrow key navigation, Enter to select, click-outside to close
 */
export function OrgSearch({
  value,
  orgId,
  onChange,
  onCreateOrg,
  placeholder = 'Search organizations...',
}: OrgSearchProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const optionsRef = useRef<HTMLDivElement>(null)

  const { cache } = useEntityCache()
  const { allResults } = useSearch(value, 'organization', {
    enabled: value.length >= 1,
  })

  // Top 5 orgs for empty-input focus preload
  const preloadResults: FuzzySearchResult[] =
    cache?.entities
      .filter((e) => e.entity_type === 'organization' && e.status === 'approved')
      .slice(0, 5)
      .map((e) => ({
        id: e.id,
        entity_type: e.entity_type,
        name: e.name,
        category: e.category,
        title: e.title,
        primary_org: e.primary_org,
        location: e.location,
        status: e.status as 'approved' | 'pending',
        score: 0,
        isPending: false,
      })) ?? []

  // Show preload results on empty focus, search results otherwise
  const results = value.length >= 1 ? allResults.slice(0, 10) : preloadResults

  // Check if there is an exact match (case-insensitive) in results
  const hasExactMatch =
    value.length >= 1 &&
    results.some((r) => r.name.toLowerCase() === value.toLowerCase())

  // Total items: results + optional "Add new" trailing option
  const showAddOption = onCreateOrg && value.length >= 1 && !hasExactMatch
  const totalItems = results.length + (showAddOption ? 1 : 0)

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

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(-1)
  }, [value])

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex < 0 || !optionsRef.current) return
    const items = optionsRef.current.querySelectorAll('[data-option]')
    items[activeIndex]?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const selectResult = useCallback(
    (result: FuzzySearchResult) => {
      onChange(result.name, result.id)
      setIsOpen(false)
      setActiveIndex(-1)
    },
    [onChange],
  )

  const handleCreateOrg = useCallback(() => {
    if (onCreateOrg) {
      onCreateOrg(value)
      setIsOpen(false)
    }
  }, [onCreateOrg, value])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    // Clear org ID when user edits the text (no longer matches a selected result)
    onChange(newValue, null)
    setIsOpen(true)
  }

  const handleFocus = () => {
    setIsOpen(true)
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setIsOpen(true)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex((prev) => Math.min(prev + 1, totalItems - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex((prev) => Math.max(prev - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (activeIndex >= 0 && activeIndex < results.length) {
          selectResult(results[activeIndex]!)
        } else if (showAddOption && activeIndex === results.length) {
          handleCreateOrg()
        }
        break
      case 'Escape':
        setIsOpen(false)
        setActiveIndex(-1)
        break
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      {/* Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className={`w-full px-3 py-2 font-mono text-[13px] border rounded outline-none transition-colors bg-white ${
            isOpen ? 'border-[#2563eb]' : 'border-[#ddd]'
          } hover:border-[#999] focus:border-[#2563eb]`}
        />
        {/* Selected indicator */}
        {orgId != null && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono text-green-600">
            linked
          </span>
        )}
      </div>

      {/* Dropdown results */}
      {isOpen && (results.length > 0 || showAddOption) && (
        <div
          ref={optionsRef}
          className="absolute z-40 top-full left-0 right-0 mt-1 bg-white border border-[#ddd] rounded shadow-lg max-h-[240px] overflow-y-auto"
        >
          {results.map((result, i) => {
            const isActive = i === activeIndex

            return (
              <div
                key={result.id}
                data-option
                onMouseDown={(e) => {
                  e.preventDefault()
                  selectResult(result)
                }}
                onMouseEnter={() => setActiveIndex(i)}
                className={`flex items-center justify-between px-3 py-1.5 cursor-pointer text-[12px] font-mono transition-colors ${
                  isActive ? 'bg-[#f0f0f0]' : ''
                }`}
              >
                <span className="truncate text-[#1a1a1a]">{result.name}</span>
                <span className="flex items-center gap-2 flex-shrink-0 ml-2">
                  {result.category && (
                    <span className="text-[11px] text-[#888] truncate max-w-[120px]">
                      {result.category}
                    </span>
                  )}
                  {result.isPending && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">
                      pending
                    </span>
                  )}
                </span>
              </div>
            )
          })}

          {/* "Add new org..." trailing option */}
          {showAddOption && (
            <div
              data-option
              onMouseDown={(e) => {
                e.preventDefault()
                handleCreateOrg()
              }}
              onMouseEnter={() => setActiveIndex(results.length)}
              className={`flex items-center gap-1.5 px-3 py-2 cursor-pointer text-[12px] font-mono border-t border-[#eee] transition-colors ${
                activeIndex === results.length ? 'bg-[#f0f0f0]' : ''
              } text-[#2563eb]`}
            >
              <svg
                className="w-3 h-3 flex-shrink-0"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M6 2v8M2 6h8" />
              </svg>
              <span>
                Add &apos;{value.length > 30 ? value.slice(0, 30) + '...' : value}&apos; as new
                org...
              </span>
            </div>
          )}
        </div>
      )}

      {/* "Can't find it?" link below input */}
      {onCreateOrg && value.length >= 1 && (
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault()
            handleCreateOrg()
          }}
          className="mt-1 text-[11px] font-mono text-[#2563eb] hover:text-[#1d4ed8] hover:underline bg-transparent border-none cursor-pointer p-0"
        >
          Can&apos;t find it? Add this org
        </button>
      )}
    </div>
  )
}
