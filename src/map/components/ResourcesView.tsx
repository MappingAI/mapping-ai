import { useState, useMemo, useCallback } from 'react'

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
}

type SortKey = 'year' | 'title' | 'submission_count'

const RESOURCE_TYPE_COLORS: Record<string, string> = {
  Report: '#3498db',
  'Academic Paper': '#8e44ad',
  Essay: '#27ae60',
  'Newsletter/Substack': '#e67e22',
  'Substack/Newsletter': '#e67e22',
  Book: '#c0392b',
  Podcast: '#f39c12',
  Video: '#e74c3c',
  'News Article': '#7f8c8d',
  Website: '#2c3e50',
}

const ADJACENT_LINKS = [
  { name: 'AI Policy Network', url: 'https://theaipn.org/', desc: 'Policy community network and events' },
  { name: 'AI Regulation Map', url: 'https://airegulationmap.org/', desc: 'Global AI regulation tracker' },
  { name: 'Long-term Wiki', url: 'https://www.longtermwiki.com/', desc: 'Long-term AI safety reference' },
  { name: 'Democracy Build', url: 'https://democracybuild.org/', desc: 'Democratic governance of AI' },
  {
    name: 'AI Stakeholder Map',
    url: 'https://gaberoni24.github.io/AI_Stakeholder_Map/',
    desc: "Gabriel's stakeholder landscape",
  },
]

function typeColor(type: string | null): string {
  return RESOURCE_TYPE_COLORS[type ?? ''] ?? '#888'
}

function ResourceCard({
  resource,
  onSelect,
  isHovered,
  onHover,
  onLeave,
}: {
  resource: Resource
  onSelect: () => void
  isHovered: boolean
  onHover: () => void
  onLeave: () => void
}) {
  const displayTitle = resource.title || resource.name
  const borderColor = typeColor(resource.resource_type)

  return (
    <button
      onClick={onSelect}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left' as const,
        borderRadius: '6px',
        padding: '12px',
        border: 'none',
        borderLeft: `4px solid ${borderColor}`,
        background: 'var(--bg-panel)',
        boxShadow: isHovered ? '0 2px 8px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.06)',
        cursor: 'pointer',
        transition: 'box-shadow 0.15s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '4px' }}>
        <span
          style={{
            fontFamily: 'var(--mono)',
            fontSize: '9px',
            letterSpacing: '0.04em',
            color: borderColor,
            backgroundColor: borderColor + '18',
            border: `1px solid ${borderColor}40`,
            borderRadius: '9999px',
            padding: '2px 8px',
            whiteSpace: 'nowrap' as const,
            flexShrink: 0,
            lineHeight: '1.4',
          }}
        >
          {resource.resource_type ?? 'Doc'}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3
            style={{
              fontFamily: 'var(--serif)',
              fontSize: '15px',
              lineHeight: '1.3',
              color: isHovered ? 'var(--accent)' : 'var(--text-1)',
              margin: 0,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical' as const,
              overflow: 'hidden',
              transition: 'color 0.15s ease',
            }}
          >
            {displayTitle}
          </h3>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '4px',
              fontFamily: 'var(--mono)',
              fontSize: '10px',
              letterSpacing: '0.04em',
              color: 'var(--text-3)',
            }}
          >
            {resource.author && (
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap' as const,
                  maxWidth: '160px',
                }}
              >
                {resource.author}
              </span>
            )}
            {resource.author && resource.year && <span>&middot;</span>}
            {resource.year && <span>{resource.year}</span>}
          </div>
          {(resource.topic_tags?.length ?? 0) > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '4px', marginTop: '4px' }}>
              {resource.topic_tags!.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: '8px',
                    color: 'var(--text-3)',
                    border: '1px solid var(--line)',
                    borderRadius: '3px',
                    padding: '1px 5px',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {resource.key_argument && (
        <p
          style={{
            fontFamily: 'var(--serif)',
            fontSize: '13px',
            lineHeight: '1.5',
            color: 'var(--text-2)',
            margin: '8px 0 0',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as const,
            overflow: 'hidden',
          }}
        >
          {resource.key_argument}
        </p>
      )}
    </button>
  )
}

export function ResourcesView({ resources }: ResourcesViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeType, setActiveType] = useState<string>('')
  const [sortKey, setSortKey] = useState<SortKey>('year')
  const [hoveredId, setHoveredId] = useState<number | null>(null)

  const allTypes = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of resources) {
      if (r.resource_type) {
        counts.set(r.resource_type, (counts.get(r.resource_type) ?? 0) + 1)
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([type]) => type)
  }, [resources])

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
  }, [resources, searchQuery, activeType, sortKey])

  const handleSelectResource = useCallback((r: Resource) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).__mapEngine?.showDetail?.(r, [])
    document.getElementById('detail-panel')?.classList.add('open')
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)' }}>
      <div style={{ padding: '24px 32px 24px 300px' }}>
        <div style={{ marginBottom: '24px', textAlign: 'center' as const }}>
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '11px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase' as const,
              color: 'var(--text-3)',
              marginBottom: '4px',
            }}
          >
            Library
          </div>
          <h1
            style={{
              fontFamily: 'var(--serif)',
              fontSize: '24px',
              fontWeight: 400,
              color: 'var(--text-1)',
              margin: 0,
            }}
          >
            Resources
          </h1>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '10px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase' as const,
              color: 'var(--accent)',
              marginBottom: '8px',
            }}
          >
            Adjacent Tools and Resources
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap' as const,
              gap: '8px',
            }}
          >
            {ADJACENT_LINKS.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'baseline',
                  gap: '6px',
                  textDecoration: 'none',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: '1px solid var(--line)',
                  background: 'var(--bg-panel)',
                }}
              >
                <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--accent)' }}>&#8599;</span>
                <span
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: '11px',
                    color: 'var(--text-1)',
                    letterSpacing: '0.02em',
                  }}
                >
                  {link.name}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: '9px',
                    color: 'var(--text-3)',
                    letterSpacing: '0.02em',
                  }}
                >
                  {link.desc}
                </span>
              </a>
            ))}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap' as const,
            alignItems: 'center',
            gap: '10px',
            marginBottom: '20px',
          }}
        >
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search title, author, argument..."
            style={{
              flex: '1 1 200px',
              maxWidth: '360px',
              borderRadius: '6px',
              border: '1px solid var(--line)',
              background: 'var(--bg-panel)',
              padding: '6px 12px',
              fontFamily: 'var(--mono)',
              fontSize: '12px',
              color: 'var(--text-1)',
              outline: 'none',
            }}
          />
          <select
            value={activeType}
            onChange={(e) => setActiveType(e.target.value)}
            style={{
              borderRadius: '6px',
              border: '1px solid var(--line)',
              background: 'var(--bg-panel)',
              padding: '6px 10px',
              fontFamily: 'var(--mono)',
              fontSize: '11px',
              color: 'var(--text-2)',
              outline: 'none',
              cursor: 'pointer',
            }}
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
            style={{
              borderRadius: '6px',
              border: '1px solid var(--line)',
              background: 'var(--bg-panel)',
              padding: '6px 10px',
              fontFamily: 'var(--mono)',
              fontSize: '11px',
              color: 'var(--text-2)',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="year">Newest first</option>
            <option value="title">Title A-Z</option>
            <option value="submission_count">Most submitted</option>
          </select>
          <span
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '10px',
              color: 'var(--text-3)',
              letterSpacing: '0.04em',
            }}
          >
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </span>
          {(activeType || searchQuery) && (
            <button
              onClick={() => {
                setSearchQuery('')
                setActiveType('')
              }}
              style={{
                fontFamily: 'var(--mono)',
                fontSize: '10px',
                color: 'var(--text-3)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Clear filters
            </button>
          )}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '16px',
          }}
        >
          {filtered.map((r) => (
            <ResourceCard
              key={r.id}
              resource={r}
              onSelect={() => handleSelectResource(r)}
              isHovered={hoveredId === r.id}
              onHover={() => setHoveredId(r.id)}
              onLeave={() => setHoveredId(null)}
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center' as const, padding: '64px 0' }}>
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: '11px',
                color: 'var(--text-3)',
                letterSpacing: '0.04em',
              }}
            >
              No resources match your filters.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
