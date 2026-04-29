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
        padding: '16px',
        border: 'none',
        borderLeft: `4px solid ${borderColor}`,
        background: 'var(--bg-panel)',
        boxShadow: isHovered ? '0 2px 8px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.06)',
        cursor: 'pointer',
        transition: 'box-shadow 0.15s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
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

function DetailPanel({ resource, onClose }: { resource: Resource; onClose: () => void }) {
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

  const borderColor = typeColor(resource.resource_type)
  const hasBeliefs = resource.advocated_stance || resource.advocated_timeline || resource.advocated_risk

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.2)' }} />
      <div
        ref={panelRef}
        style={{
          position: 'relative',
          width: 'min(440px, 50vw)',
          background: 'var(--bg-panel)',
          borderLeft: '1px solid var(--line)',
          overflowY: 'auto',
          animation: 'slideInFromRight 0.2s ease-out',
        }}
      >
        <div
          style={{
            position: 'sticky',
            top: 0,
            background: 'var(--bg-panel)',
            borderBottom: '1px solid var(--line)',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 10,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '10px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase' as const,
              color: 'var(--text-3)',
            }}
          >
            Resource Detail
          </span>
          <button
            onClick={onClose}
            style={{
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-3)',
              fontSize: '18px',
              lineHeight: 1,
              cursor: 'pointer',
            }}
          >
            &times;
          </button>
        </div>

        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
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
              }}
            >
              {resource.resource_type ?? 'Doc'}
            </span>
            <div>
              <h2
                style={{
                  fontFamily: 'var(--serif)',
                  fontSize: '20px',
                  lineHeight: '1.3',
                  color: 'var(--text-1)',
                  margin: 0,
                  fontWeight: 400,
                }}
              >
                {displayTitle}
              </h2>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap' as const,
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '6px',
                  fontFamily: 'var(--mono)',
                  fontSize: '11px',
                  color: 'var(--text-3)',
                  letterSpacing: '0.04em',
                }}
              >
                {resource.author && <span>{resource.author}</span>}
                {resource.author && resource.year && <span>&middot;</span>}
                {resource.year && <span>{resource.year}</span>}
              </div>
              {resource.resource_type && (
                <span
                  style={{
                    display: 'inline-block',
                    marginTop: '6px',
                    borderRadius: '9999px',
                    background: 'var(--bg-page)',
                    padding: '2px 10px',
                    fontFamily: 'var(--mono)',
                    fontSize: '10px',
                    color: 'var(--text-2)',
                    letterSpacing: '0.04em',
                  }}
                >
                  {resource.resource_type}
                </span>
              )}
            </div>
          </div>

          {resource.key_argument && (
            <div style={{ marginBottom: '20px' }}>
              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: '10px',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase' as const,
                  color: 'var(--text-3)',
                  marginBottom: '6px',
                }}
              >
                Key Argument
              </div>
              <p
                style={{
                  fontFamily: 'var(--serif)',
                  fontSize: '15px',
                  lineHeight: '1.6',
                  color: 'var(--text-1)',
                  margin: 0,
                }}
              >
                {resource.key_argument}
              </p>
            </div>
          )}

          {(resource.topic_tags?.length ?? 0) > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: '10px',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase' as const,
                  color: 'var(--text-3)',
                  marginBottom: '6px',
                }}
              >
                Topics
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '6px' }}>
                {resource.topic_tags!.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      borderRadius: '9999px',
                      background: 'var(--bg-page)',
                      border: '1px solid var(--line)',
                      padding: '2px 10px',
                      fontFamily: 'var(--mono)',
                      fontSize: '10px',
                      color: 'var(--text-2)',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(resource.format_tags?.length ?? 0) > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: '10px',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase' as const,
                  color: 'var(--text-3)',
                  marginBottom: '6px',
                }}
              >
                Format
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '6px' }}>
                {resource.format_tags!.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      borderRadius: '9999px',
                      background: 'var(--bg-page)',
                      padding: '2px 10px',
                      fontFamily: 'var(--mono)',
                      fontSize: '10px',
                      color: 'var(--text-2)',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {hasBeliefs && (
            <div style={{ marginBottom: '20px' }}>
              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: '10px',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase' as const,
                  color: 'var(--text-3)',
                  marginBottom: '8px',
                }}
              >
                Advocated Beliefs
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '8px' }}>
                {resource.advocated_stance && (
                  <BeliefRow label="Stance" value={resource.advocated_stance} colorMap={STANCE_COLORS} />
                )}
                {resource.advocated_timeline && (
                  <BeliefRow label="Timeline" value={resource.advocated_timeline} colorMap={TIMELINE_COLORS} />
                )}
                {resource.advocated_risk && (
                  <BeliefRow label="Risk" value={resource.advocated_risk} colorMap={RISK_COLORS} />
                )}
              </div>
            </div>
          )}

          {resource.url && (
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontFamily: 'var(--mono)',
                fontSize: '11px',
                letterSpacing: '0.04em',
                color: 'var(--accent)',
                textDecoration: 'none',
                marginBottom: '20px',
              }}
            >
              View source &#8594;
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function BeliefRow({ label, value, colorMap }: { label: string; value: string; colorMap: Record<string, string> }) {
  const color = colorMap[value] ?? '#888'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span
        style={{
          fontFamily: 'var(--mono)',
          fontSize: '10px',
          color: 'var(--text-3)',
          width: '80px',
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          borderRadius: '9999px',
          padding: '2px 8px',
          fontFamily: 'var(--mono)',
          fontSize: '9px',
          letterSpacing: '0.04em',
          color: '#fff',
          backgroundColor: color,
        }}
      >
        {value}
      </span>
    </div>
  )
}

export function ResourcesView({ resources }: ResourcesViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeType, setActiveType] = useState<string>('')
  const [sortKey, setSortKey] = useState<SortKey>('year')
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null)
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
    setSelectedResource(r)
  }, [])

  const handleCloseDetail = useCallback(() => {
    setSelectedResource(null)
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)' }}>
      <style>{`
        @keyframes slideInFromRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 32px' }}>
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
          <p
            style={{
              fontFamily: 'var(--serif)',
              fontSize: '14px',
              color: 'var(--text-3)',
              margin: '4px 0 0',
            }}
          >
            {resources.length} reports, papers, essays, and more on AI policy.
          </p>
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

      {selectedResource && <DetailPanel resource={selectedResource} onClose={handleCloseDetail} />}
    </div>
  )
}
