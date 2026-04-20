import { useMemo, useState } from 'react'
import { TOPIC_CORE, FORMAT_TAGS } from '../../lib/resourceTaxonomy'
import type { UseResourceFilters } from '../hooks/useResourceFilters'

interface FilterRailProps {
  filters: UseResourceFilters
  onOpenSisterMaps?: () => void
}

// Hide belief-facet groups until at least this fraction of resources have data.
// Avoids shipping a UI that consists of one "Unknown" row in a facet group.
const MIN_COVERAGE_TO_SHOW_FACET = 0.1

export function FilterRail({ filters, onOpenSisterMaps }: FilterRailProps) {
  const { state, counts } = filters

  const sortedEmergentTopics = useMemo(() => {
    const canonical = new Set(TOPIC_CORE.map((t) => t.toLowerCase()))
    return Array.from(counts.topics.entries())
      .filter(([t]) => !canonical.has(t.toLowerCase()))
      .sort((a, b) => b[1] - a[1])
  }, [counts.topics])

  const sortedEmergentFormats = useMemo(() => {
    const canonical = new Set(FORMAT_TAGS.map((t) => t.toLowerCase()))
    return Array.from(counts.formats.entries())
      .filter(([t]) => !canonical.has(t.toLowerCase()))
      .sort((a, b) => b[1] - a[1])
  }, [counts.formats])

  const [showEmergentTopics, setShowEmergentTopics] = useState(false)
  const [showEmergentFormats, setShowEmergentFormats] = useState(false)

  const showStanceFacet = counts.stanceDataCoverage >= MIN_COVERAGE_TO_SHOW_FACET
  const showTimelineFacet = counts.timelineDataCoverage >= MIN_COVERAGE_TO_SHOW_FACET
  const showRiskFacet = counts.riskDataCoverage >= MIN_COVERAGE_TO_SHOW_FACET

  const activeFilterCount =
    state.topics.length +
    state.formats.length +
    state.stances.length +
    state.timelines.length +
    state.risks.length +
    (state.yearMin != null || state.yearMax != null ? 1 : 0) +
    (state.query ? 1 : 0)

  return (
    <aside className="space-y-6">
      <div>
        <label className="font-mono text-[10px] uppercase tracking-widest text-[#6b7280]" htmlFor="library-search">
          Search
        </label>
        <div className="mt-1 flex items-center gap-2 border-b border-[#1a1a1a] pb-1">
          <SearchIcon />
          <input
            id="library-search"
            type="search"
            placeholder="Find a title, author, or idea…"
            value={state.query}
            onChange={(e) => filters.setQuery(e.target.value)}
            className="w-full bg-transparent font-sans text-[13px] outline-none"
          />
        </div>
      </div>

      <TagGroup
        label="Topic"
        tags={TOPIC_CORE}
        counts={counts.topics}
        selected={state.topics}
        onToggle={filters.toggleTopic}
      />
      {sortedEmergentTopics.length > 0 && (
        <EmergentGroup
          open={showEmergentTopics}
          onToggle={() => setShowEmergentTopics((v) => !v)}
          count={sortedEmergentTopics.length}
          label="emergent topics"
        >
          <div className="mt-2 flex flex-wrap gap-1.5">
            {sortedEmergentTopics.map(([tag, n]) => (
              <TagChip
                key={tag}
                label={tag}
                count={n}
                selected={state.topics.includes(tag)}
                onClick={() => filters.toggleTopic(tag)}
                emergent
              />
            ))}
          </div>
        </EmergentGroup>
      )}

      <TagGroup
        label="Format"
        tags={FORMAT_TAGS}
        counts={counts.formats}
        selected={state.formats}
        onToggle={filters.toggleFormat}
      />
      {sortedEmergentFormats.length > 0 && (
        <EmergentGroup
          open={showEmergentFormats}
          onToggle={() => setShowEmergentFormats((v) => !v)}
          count={sortedEmergentFormats.length}
          label="emergent formats"
        >
          <div className="mt-2 flex flex-wrap gap-1.5">
            {sortedEmergentFormats.map(([tag, n]) => (
              <TagChip
                key={tag}
                label={tag}
                count={n}
                selected={state.formats.includes(tag)}
                onClick={() => filters.toggleFormat(tag)}
                emergent
              />
            ))}
          </div>
        </EmergentGroup>
      )}

      {showStanceFacet && (
        <CheckboxGroup
          label="Advocated stance"
          options={[...Array.from(counts.stances.keys()).sort(), 'Unknown']}
          counts={counts.stances}
          selected={state.stances}
          onToggle={filters.toggleStance}
        />
      )}
      {showTimelineFacet && (
        <CheckboxGroup
          label="Advocated timeline"
          options={[...Array.from(counts.timelines.keys()).sort(), 'Unknown']}
          counts={counts.timelines}
          selected={state.timelines}
          onToggle={filters.toggleTimeline}
        />
      )}
      {showRiskFacet && (
        <CheckboxGroup
          label="Advocated risk"
          options={[...Array.from(counts.risks.keys()).sort(), 'Unknown']}
          counts={counts.risks}
          selected={state.risks}
          onToggle={filters.toggleRisk}
        />
      )}

      {!showStanceFacet && !showTimelineFacet && !showRiskFacet && (
        <div className="rounded border border-dashed border-[#d9d5c4] bg-[#fffef9] p-3">
          <div className="font-mono text-[10px] uppercase tracking-widest text-[#6b7280]">Advocated beliefs</div>
          <p className="sans mt-1 text-[12px] text-[#6b7280]">
            Coming soon — resources don’t yet have advocated-stance data. The enrichment pipeline lands in Phase 2.
          </p>
        </div>
      )}

      {activeFilterCount > 0 && (
        <button
          type="button"
          onClick={filters.reset}
          className="font-mono text-[11px] uppercase tracking-wider text-[#a43a2b] hover:underline"
        >
          Reset {activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'}
        </button>
      )}

      <div className="border-t border-[#d9d5c4] pt-4">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#6b7280]">Other ecosystem maps</div>
        <ul className="mt-2 space-y-1 font-sans text-[12px]">
          <li>
            <button type="button" onClick={onOpenSisterMaps} className="text-left hover:underline">
              See sister maps in the library →
            </button>
          </li>
          <li>
            <a
              className="hover:underline"
              href="https://ai-values-map.vercel.app"
              target="_blank"
              rel="noreferrer noopener"
            >
              CAIDP AI Index →
            </a>
          </li>
          <li>
            <a
              className="hover:underline"
              href="https://airisk.mit.edu/ai-governance"
              target="_blank"
              rel="noreferrer noopener"
            >
              MIT AI Governance →
            </a>
          </li>
          <li>
            <a className="hover:underline" href="https://iapp.org" target="_blank" rel="noreferrer noopener">
              IAPP Ecosystem Map →
            </a>
          </li>
        </ul>
      </div>
    </aside>
  )
}

function TagGroup({
  label,
  tags,
  counts,
  selected,
  onToggle,
}: {
  label: string
  tags: readonly string[]
  counts: Map<string, number>
  selected: string[]
  onToggle: (t: string) => void
}) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-[#6b7280]">{label}</div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {tags.map((tag) => {
          const n = counts.get(tag) ?? 0
          // Hide zero-count core tags until data arrives — still visible via search
          if (n === 0 && !selected.includes(tag)) return null
          return (
            <TagChip key={tag} label={tag} count={n} selected={selected.includes(tag)} onClick={() => onToggle(tag)} />
          )
        })}
      </div>
    </div>
  )
}

function CheckboxGroup({
  label,
  options,
  counts,
  selected,
  onToggle,
}: {
  label: string
  options: string[]
  counts: Map<string, number>
  selected: string[]
  onToggle: (v: string) => void
}) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-[#6b7280]">{label}</div>
      <div className="mt-2 space-y-1 font-sans text-[13px]">
        {options.map((opt) => (
          <label key={opt} className="flex cursor-pointer items-center gap-2 hover:text-[#1a1a1a]">
            <input
              type="checkbox"
              className="accent-[#1a1a1a]"
              checked={selected.includes(opt)}
              onChange={() => onToggle(opt)}
            />
            <span>{opt}</span>
            {opt !== 'Unknown' && <span className="font-mono text-[10px] text-[#9ca3af]">{counts.get(opt) ?? 0}</span>}
          </label>
        ))}
      </div>
    </div>
  )
}

function TagChip({
  label,
  count,
  selected,
  onClick,
  emergent = false,
}: {
  label: string
  count: number
  selected: boolean
  onClick: () => void
  emergent?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] leading-none transition-colors ${
        selected
          ? 'bg-[#1a1a1a] text-[#f8f7f2]'
          : emergent
            ? 'border border-dashed border-[#b7b09a] bg-transparent text-[#3b3a2c] hover:border-[#1a1a1a]'
            : 'bg-[#ece9dc] text-[#3b3a2c] hover:bg-[#d9d5c4]'
      }`}
    >
      {label}
      {count > 0 && <span className="font-mono text-[10px] opacity-60">{count}</span>}
    </button>
  )
}

function EmergentGroup({
  open,
  onToggle,
  count,
  label,
  children,
}: {
  open: boolean
  onToggle: () => void
  count: number
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="font-mono text-[10px] uppercase tracking-widest text-[#6b7280] hover:text-[#1a1a1a]"
      >
        {open ? '− ' : '+ '}
        {count} {label}
      </button>
      {open && children}
    </div>
  )
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 flex-none text-[#6b7280]"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <circle cx={11} cy={11} r={7} />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}
