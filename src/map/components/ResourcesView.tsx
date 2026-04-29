import { useState, useMemo, useCallback, useRef, useEffect } from 'react'

export interface Resource {
  id: number
  name: string
  title: string | null
  category: string | null
  author: string | null
  resource_type: string | null
  url: string | null
  year: string | null
  key_argument: string | null
  topic_tags: string[] | null
  format_tags: string[] | null
  advocated_stance: string | null
  advocated_timeline: string | null
  advocated_risk: string | null
  submission_count: number | null
}

interface ResourcesViewProps {
  resources: Resource[]
  onEntityClick?: (id: number) => void
}

type SortKey = 'year' | 'title' | 'submission_count'

const RESOURCE_TYPE_SHORT: Record<string, string> = {
  Book: 'Book',
  Podcast: 'Pod',
  Report: 'Report',
  Essay: 'Essay',
  Video: 'Video',
  'News Article': 'News',
  'Academic Paper': 'Paper',
  Website: 'Web',
  'Substack/Newsletter': 'Letter',
}

const RESOURCE_TYPE_COLORS: Record<string, string> = {
  Report: '#3498db',
  'Academic Paper': '#8e44ad',
  Essay: '#27ae60',
  'Substack/Newsletter': '#e67e22',
  Book: '#c0392b',
  Podcast: '#f39c12',
  Video: '#e74c3c',
  'News Article': '#7f8c8d',
  Website: '#2c3e50',
}

const STANCE_COLORS: Record<string, string> = {
  Accelerate: '#e74c3c',
  'Light-touch': '#e67e22',
  Targeted: '#f39c12',
  Moderate: '#3498db',
  Restrictive: '#8e44ad',
  Precautionary: '#2c3e50',
}

const TIMELINE_COLORS: Record<string, string> = {
  'Already here': '#e74c3c',
  '2-3 years': '#e67e22',
  '5-10 years': '#f39c12',
  '10-25 years': '#3498db',
  '25+ years': '#8e44ad',
}

const RISK_COLORS: Record<string, string> = {
  Overstated: '#27ae60',
  Manageable: '#3498db',
  Serious: '#f39c12',
  Catastrophic: '#e74c3c',
  Existential: '#8e44ad',
}

function TypeBadge({ type }: { type: string | null }) {
  const label = type ? (RESOURCE_TYPE_SHORT[type] ?? type) : 'Doc'
  const color = RESOURCE_TYPE_COLORS[type ?? ''] ?? '#888'
  return (
    <span
      className="inline-flex items-center justify-center rounded-full px-2 py-0.5 font-mono text-[9px] tracking-wide leading-none shrink-0"
      style={{ backgroundColor: color + '18', color, border: `1px solid ${color}40` }}
    >
      {label}
    </span>
  )
}

function BeliefBadge({ label, value, colorMap }: { label: string; value: string; colorMap: Record<string, string> }) {
  const color = colorMap[value] ?? '#888'
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[9px] tracking-wide text-white"
      style={{ backgroundColor: color }}
    >
      <span className="opacity-70">{label}:</span> {value}
    </span>
  )
}

function TopicPill({ tag, active, onClick }: { tag: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] tracking-wide border transition-colors duration-150 cursor-pointer ${
        active
          ? 'bg-[#2563eb] text-white border-[#2563eb]'
          : 'bg-transparent text-[#555] border-[#bbb]/60 hover:border-[#888]'
      }`}
    >
      {tag}
    </button>
  )
}

function ResourceCard({ resource, onSelect }: { resource: Resource; onSelect: () => void }) {
  const displayTitle = resource.title || resource.name
  const topicTags = (resource.topic_tags ?? []).slice(0, 2)
  const hasBeliefs = resource.advocated_stance || resource.advocated_timeline || resource.advocated_risk
  const borderColor = RESOURCE_TYPE_COLORS[resource.resource_type ?? ''] ?? '#ccc'

  return (
    <button
      onClick={onSelect}
      className="block w-full text-left rounded-lg p-4 transition-all duration-150 cursor-pointer group"
      style={{
        borderLeft: `4px solid ${borderColor}`,
        background: 'var(--bg-panel)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      <div className="flex items-start gap-2.5 mb-2">
        <TypeBadge type={resource.resource_type} />
        <div className="min-w-0 flex-1">
          <h3
            className="font-serif text-[15px] leading-snug group-hover:text-[#2563eb] transition-colors duration-150 line-clamp-2 m-0"
            style={{ color: 'var(--text-1)' }}
          >
            {displayTitle}
          </h3>
          <div
            className="flex items-center gap-2 mt-1 font-mono text-[10px] tracking-wide"
            style={{ color: 'var(--text-3)' }}
          >
            {resource.author && <span className="truncate max-w-[160px]">{resource.author}</span>}
            {resource.author && resource.year && <span>&middot;</span>}
            {resource.year && <span>{resource.year}</span>}
          </div>
        </div>
      </div>

      {resource.key_argument && (
        <p className="font-serif text-[13px] leading-relaxed line-clamp-2 mt-2 mb-0" style={{ color: 'var(--text-2)' }}>
          {resource.key_argument}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1.5 mt-3">
        {topicTags.map((tag) => (
          <span
            key={tag}
            className="rounded-full px-2 py-0.5 font-mono text-[9px] tracking-wide"
            style={{ background: 'var(--bg-page)', color: 'var(--text-2)' }}
          >
            {tag}
          </span>
        ))}
        {hasBeliefs && (
          <div className="flex gap-1 ml-auto">
            {resource.advocated_stance && (
              <BeliefBadge label="S" value={resource.advocated_stance} colorMap={STANCE_COLORS} />
            )}
            {resource.advocated_risk && (
              <BeliefBadge label="R" value={resource.advocated_risk} colorMap={RISK_COLORS} />
            )}
          </div>
        )}
      </div>
    </button>
  )
}

function DetailPanel({
  resource,
  onClose,
  onEntityClick,
}: {
  resource: Resource
  onClose: () => void
  onEntityClick?: (id: number) => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const displayTitle = resource.title || resource.name

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const timeout = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)
    return () => {
      clearTimeout(timeout)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" />
      <div
        ref={panelRef}
        className="relative w-full max-w-md bg-white border-l border-[#bbb]/50 overflow-y-auto animate-slide-in"
      >
        <div className="sticky top-0 bg-white border-b border-[#bbb]/30 px-5 py-3 flex items-center justify-between z-10">
          <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-[#888]">Resource Detail</span>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f8f7f5] text-[#888] hover:text-[#1a1a1a] transition-colors duration-150 cursor-pointer text-lg leading-none"
          >
            &times;
          </button>
        </div>

        <div className="px-5 py-5">
          <div className="flex items-start gap-3 mb-4">
            <TypeBadge type={resource.resource_type} />
            <div>
              <h2 className="font-serif text-[20px] leading-snug text-[#1a1a1a] m-0">{displayTitle}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1.5 font-mono text-[11px] text-[#888] tracking-wide">
                {resource.author && <span>{resource.author}</span>}
                {resource.author && resource.year && <span>&middot;</span>}
                {resource.year && <span>{resource.year}</span>}
              </div>
              {resource.resource_type && (
                <span className="inline-block mt-1.5 rounded-full bg-[#f8f7f5] px-2.5 py-0.5 font-mono text-[10px] text-[#555] tracking-wide">
                  {resource.resource_type}
                </span>
              )}
            </div>
          </div>

          {resource.key_argument && (
            <div className="mb-5">
              <div className="font-mono text-[10px] tracking-[0.08em] uppercase text-[#888] mb-1.5">Key Argument</div>
              <p className="font-serif text-[15px] leading-relaxed text-[#1a1a1a] m-0">{resource.key_argument}</p>
            </div>
          )}

          {(resource.topic_tags?.length ?? 0) > 0 && (
            <div className="mb-4">
              <div className="font-mono text-[10px] tracking-[0.08em] uppercase text-[#888] mb-1.5">Topics</div>
              <div className="flex flex-wrap gap-1.5">
                {resource.topic_tags!.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-[#f8f7f5] border border-[#bbb]/30 px-2.5 py-0.5 font-mono text-[10px] text-[#555] tracking-wide"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(resource.format_tags?.length ?? 0) > 0 && (
            <div className="mb-4">
              <div className="font-mono text-[10px] tracking-[0.08em] uppercase text-[#888] mb-1.5">Format</div>
              <div className="flex flex-wrap gap-1.5">
                {resource.format_tags!.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-[#edecea] px-2.5 py-0.5 font-mono text-[10px] text-[#555] tracking-wide"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(resource.advocated_stance || resource.advocated_timeline || resource.advocated_risk) && (
            <div className="mb-5">
              <div className="font-mono text-[10px] tracking-[0.08em] uppercase text-[#888] mb-2">
                Advocated Beliefs
              </div>
              <div className="flex flex-col gap-2">
                {resource.advocated_stance && (
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-[#888] w-20 shrink-0">Stance</span>
                    <BeliefBadge label="S" value={resource.advocated_stance} colorMap={STANCE_COLORS} />
                  </div>
                )}
                {resource.advocated_timeline && (
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-[#888] w-20 shrink-0">Timeline</span>
                    <BeliefBadge label="T" value={resource.advocated_timeline} colorMap={TIMELINE_COLORS} />
                  </div>
                )}
                {resource.advocated_risk && (
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-[#888] w-20 shrink-0">Risk</span>
                    <BeliefBadge label="R" value={resource.advocated_risk} colorMap={RISK_COLORS} />
                  </div>
                )}
              </div>
            </div>
          )}

          {resource.url && (
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-wide text-[#2563eb] hover:underline mb-5"
            >
              View source &rarr;
            </a>
          )}

          {onEntityClick && (
            <div className="border-t border-[#bbb]/30 pt-4 mt-2">
              <button
                onClick={() => onEntityClick(resource.id)}
                className="font-mono text-[10px] tracking-wide text-[#888] hover:text-[#2563eb] transition-colors duration-150 cursor-pointer bg-transparent border-none p-0"
              >
                View on map &rarr;
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ReadingTrack({
  trackName,
  resources,
  onSelectResource,
}: {
  trackName: string
  resources: Resource[]
  onSelectResource: (r: Resource) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const preview = resources.slice(0, 4)
  const remaining = resources.slice(4)

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--line)' }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-transparent transition-colors duration-150 cursor-pointer border-none text-left"
      >
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] tracking-wide" style={{ color: 'var(--text-1)' }}>
            {trackName}
          </span>
          <span className="font-mono text-[10px]" style={{ color: 'var(--text-3)' }}>
            {resources.length}
          </span>
        </div>
        <span
          className="font-mono text-[10px] transition-transform duration-200"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', color: 'var(--text-3)' }}
        >
          &#9662;
        </span>
      </button>

      <div className="px-4 pb-3">
        <div className="flex flex-wrap gap-2">
          {preview.map((r) => (
            <button
              key={r.id}
              onClick={() => onSelectResource(r)}
              className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 transition-colors duration-150 cursor-pointer max-w-[200px]"
              style={{ background: 'var(--bg-page)', borderColor: 'var(--line)' }}
            >
              <TypeBadge type={r.resource_type} />
              <span className="font-serif text-[12px] truncate" style={{ color: 'var(--text-1)' }}>
                {r.title || r.name}
              </span>
            </button>
          ))}
        </div>

        {expanded && remaining.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {remaining.map((r) => (
              <button
                key={r.id}
                onClick={() => onSelectResource(r)}
                className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 transition-colors duration-150 cursor-pointer max-w-[200px]"
                style={{ background: 'var(--bg-page)', borderColor: 'var(--line)' }}
              >
                <TypeBadge type={r.resource_type} />
                <span className="font-serif text-[12px] truncate" style={{ color: 'var(--text-1)' }}>
                  {r.title || r.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function ResourcesView({ resources, onEntityClick }: ResourcesViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTopicTags, setActiveTopicTags] = useState<Set<string>>(new Set())
  const [activeFormatTags, setActiveFormatTags] = useState<Set<string>>(new Set())
  const [activeType, setActiveType] = useState<string>('')
  const [sortKey, setSortKey] = useState<SortKey>('year')
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null)

  const allTopicTags = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of resources) {
      for (const tag of r.topic_tags ?? []) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1)
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([tag]) => tag)
  }, [resources])

  const allFormatTags = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of resources) {
      for (const tag of r.format_tags ?? []) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1)
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([tag]) => tag)
  }, [resources])

  const allTypes = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of resources) {
      if (r.resource_type) {
        counts.set(r.resource_type, (counts.get(r.resource_type) ?? 0) + 1)
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([type]) => type)
  }, [resources])

  const readingTracks = useMemo(() => {
    const trackMap = new Map<string, Resource[]>()
    for (const r of resources) {
      for (const tag of r.topic_tags ?? []) {
        const list = trackMap.get(tag) ?? []
        list.push(r)
        trackMap.set(tag, list)
      }
    }
    return [...trackMap.entries()]
      .filter(([, list]) => list.length >= 2)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 3)
      .map(([name, list]) => ({
        name,
        resources: list.sort((a, b) => {
          const yearA = parseInt(a.year ?? '0', 10)
          const yearB = parseInt(b.year ?? '0', 10)
          return yearB - yearA
        }),
      }))
  }, [resources])

  const toggleTopicTag = useCallback((tag: string) => {
    setActiveTopicTags((prev) => {
      const next = new Set(prev)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      return next
    })
  }, [])

  const toggleFormatTag = useCallback((tag: string) => {
    setActiveFormatTags((prev) => {
      const next = new Set(prev)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      return next
    })
  }, [])

  const filtered = useMemo(() => {
    let result = resources

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((r) => {
        const title = (r.title || r.name || '').toLowerCase()
        const author = (r.author || '').toLowerCase()
        const argument = (r.key_argument || '').toLowerCase()
        return title.includes(q) || author.includes(q) || argument.includes(q)
      })
    }

    if (activeTopicTags.size > 0) {
      result = result.filter((r) => (r.topic_tags ?? []).some((tag) => activeTopicTags.has(tag)))
    }

    if (activeFormatTags.size > 0) {
      result = result.filter((r) => (r.format_tags ?? []).some((tag) => activeFormatTags.has(tag)))
    }

    if (activeType) {
      result = result.filter((r) => r.resource_type === activeType)
    }

    result = [...result].sort((a, b) => {
      if (sortKey === 'year') {
        const yearA = parseInt(a.year ?? '0', 10)
        const yearB = parseInt(b.year ?? '0', 10)
        return yearB - yearA
      }
      if (sortKey === 'title') {
        const titleA = (a.title || a.name || '').toLowerCase()
        const titleB = (b.title || b.name || '').toLowerCase()
        return titleA.localeCompare(titleB)
      }
      return (b.submission_count ?? 0) - (a.submission_count ?? 0)
    })

    return result
  }, [resources, searchQuery, activeTopicTags, activeFormatTags, activeType, sortKey])

  const handleSelectResource = useCallback((r: Resource) => {
    setSelectedResource(r)
  }, [])

  const handleCloseDetail = useCallback(() => {
    setSelectedResource(null)
  }, [])

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-page)' }}>
      <style>{`
        @keyframes slide-in-from-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slide-in-from-right 0.2s ease-out;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>

      <div className="max-w-7xl mx-auto" style={{ padding: '24px 32px' }}>
        <div className="mb-6">
          <div className="font-mono text-[11px] tracking-[0.1em] uppercase mb-1" style={{ color: 'var(--text-3)' }}>
            Library
          </div>
          <h1 className="font-serif text-[24px] font-normal m-0" style={{ color: 'var(--text-1)' }}>
            Resources
          </h1>
          <p className="font-serif text-[14px] mt-1 mb-0" style={{ color: 'var(--text-3)' }}>
            {resources.length} reports, papers, essays, and more on AI policy.
          </p>
        </div>

        {readingTracks.length > 0 && (
          <div className="mb-8">
            <div className="font-mono text-[10px] tracking-[0.08em] uppercase text-[#888] mb-2">Suggested Reading</div>
            <div className="flex flex-col gap-2">
              {readingTracks.map((track) => (
                <ReadingTrack
                  key={track.name}
                  trackName={track.name}
                  resources={track.resources}
                  onSelectResource={handleSelectResource}
                />
              ))}
            </div>
          </div>
        )}

        <div className="mb-8 rounded-lg p-5" style={{ background: 'var(--bg-panel)', border: '1px solid var(--line)' }}>
          <div className="font-mono text-[10px] tracking-[0.08em] uppercase mb-3" style={{ color: 'var(--accent)' }}>
            Adjacent Tools and Resources
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { name: 'AI Policy Network', url: 'https://theaipn.org/', desc: 'Policy community network and events' },
              { name: 'AI Regulation Map', url: 'https://airegulationmap.org/', desc: 'Global AI regulation tracker' },
              { name: 'Long-term Wiki', url: 'https://www.longtermwiki.com/', desc: 'Long-term AI safety reference' },
              { name: 'Democracy Build', url: 'https://democracybuild.org/', desc: 'Democratic governance of AI' },
              {
                name: 'AI Stakeholder Map',
                url: 'https://gaberoni24.github.io/AI_Stakeholder_Map/',
                desc: "Gabriel's stakeholder landscape",
              },
            ].map((s) => (
              <a
                key={s.url}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2.5 rounded-md px-3 py-2.5 no-underline transition-colors duration-150"
                style={{ background: 'var(--bg-page)', border: '1px solid var(--line)' }}
              >
                <span className="font-mono text-[10px] text-[#2563eb] mt-0.5 flex-shrink-0">&#8599;</span>
                <div className="min-w-0">
                  <div className="font-mono text-[11px] tracking-wide" style={{ color: 'var(--text-1)' }}>
                    {s.name}
                  </div>
                  <div className="font-mono text-[9px] tracking-wide mt-0.5" style={{ color: 'var(--text-3)' }}>
                    {s.desc}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>

        <div
          className="rounded-lg p-5"
          style={{ margin: '0 0 20px 0', background: 'var(--bg-panel)', border: '1px solid var(--line)' }}
        >
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search title, author, argument..."
                className="w-full rounded-md border border-[#bbb]/50 bg-white px-3 py-1.5 font-mono text-[12px] text-[#1a1a1a] placeholder:text-[#aaa] focus:outline-none focus:border-[#2563eb] transition-colors duration-150"
              />
            </div>

            <select
              value={activeType}
              onChange={(e) => setActiveType(e.target.value)}
              className="rounded-md border border-[#bbb]/50 bg-white px-2.5 py-1.5 font-mono text-[11px] text-[#555] focus:outline-none focus:border-[#2563eb] cursor-pointer transition-colors duration-150"
            >
              <option value="">All types</option>
              {allTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="rounded-md border border-[#bbb]/50 bg-white px-2.5 py-1.5 font-mono text-[11px] text-[#555] focus:outline-none focus:border-[#2563eb] cursor-pointer transition-colors duration-150"
            >
              <option value="year">Newest first</option>
              <option value="title">Title A-Z</option>
              <option value="submission_count">Most submitted</option>
            </select>
          </div>

          {allTopicTags.length > 0 && (
            <div className="mb-2">
              <span className="font-mono text-[9px] tracking-[0.06em] uppercase text-[#888] mr-2">Topics</span>
              <div className="inline-flex flex-wrap gap-1.5">
                {allTopicTags.slice(0, 12).map((tag) => (
                  <TopicPill
                    key={tag}
                    tag={tag}
                    active={activeTopicTags.has(tag)}
                    onClick={() => toggleTopicTag(tag)}
                  />
                ))}
              </div>
            </div>
          )}

          {allFormatTags.length > 0 && (
            <div>
              <span className="font-mono text-[9px] tracking-[0.06em] uppercase text-[#888] mr-2">Format</span>
              <div className="inline-flex flex-wrap gap-1.5">
                {allFormatTags.slice(0, 8).map((tag) => (
                  <TopicPill
                    key={tag}
                    tag={tag}
                    active={activeFormatTags.has(tag)}
                    onClick={() => toggleFormatTag(tag)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] text-[#888] tracking-wide bg-[#eee] rounded-full px-2.5 py-0.5">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </span>
          {(activeTopicTags.size > 0 || activeFormatTags.size > 0 || activeType || searchQuery) && (
            <button
              onClick={() => {
                setSearchQuery('')
                setActiveTopicTags(new Set())
                setActiveFormatTags(new Set())
                setActiveType('')
              }}
              className="font-mono text-[10px] text-[#888] hover:text-[#2563eb] transition-colors duration-150 cursor-pointer bg-transparent border-none p-0"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <ResourceCard key={r.id} resource={r} onSelect={() => handleSelectResource(r)} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <div className="font-mono text-[11px] text-[#888] tracking-wide">No resources match your filters.</div>
          </div>
        )}
      </div>

      {selectedResource && (
        <DetailPanel resource={selectedResource} onClose={handleCloseDetail} onEntityClick={onEntityClick} />
      )}
    </div>
  )
}
