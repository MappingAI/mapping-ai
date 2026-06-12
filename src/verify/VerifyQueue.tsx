import { useState, useMemo, useEffect, useCallback } from 'react'
import { verifyFetch } from './api'

interface QueueEntity {
  id: number
  name: string
  entity_type: string
  category: string | null
  primary_org: string | null
  total_votes: number
  edge_count: number
  reviewed: boolean
  verdict?: string | null
}

interface Props {
  selectedId: number | null
  onSelect: (id: number) => void
  onShowGuide: () => void
}

type Tab = 'queue' | 'reviewed'

const TAB_BASE =
  'flex-1 font-mono text-[11px] uppercase tracking-wider py-2 text-center cursor-pointer transition-colors'
const TAB_ACTIVE = `${TAB_BASE} text-[#1a1a1a] border-b-2 border-[#1a1a1a]`
const TAB_INACTIVE = `${TAB_BASE} text-[#999] border-b border-[#e0e0e0] hover:text-[#555]`

export function VerifyQueue({ selectedId, onSelect, onShowGuide }: Props) {
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<Tab>('queue')
  const [entities, setEntities] = useState<QueueEntity[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewedIds, setReviewedIds] = useState<Set<number>>(new Set())
  const [verdicts, setVerdicts] = useState<Map<number, string>>(new Map())

  const load = useCallback(() => {
    setLoading(true)
    verifyFetch<{ entities: QueueEntity[] }>('/verify?action=queue')
      .then((data) => {
        setEntities(data.entities)
        setReviewedIds(new Set(data.entities.filter((e) => e.reviewed).map((e) => e.id)))
        const vm = new Map<number, string>()
        data.entities.forEach((e) => {
          if (e.verdict) vm.set(e.id, e.verdict)
        })
        setVerdicts(vm)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Allow EntityReview to notify queue of a new review
  useEffect(() => {
    const handler = (e: Event) => {
      const { entityId, verdict } = (e as CustomEvent<{ entityId: number; verdict: string }>).detail
      setReviewedIds((prev) => new Set([...prev, entityId]))
      setVerdicts((prev) => {
        const next = new Map(prev)
        next.set(entityId, verdict)
        return next
      })
    }
    window.addEventListener('entity-reviewed', handler)
    return () => window.removeEventListener('entity-reviewed', handler)
  }, [])

  const filtered = useMemo(() => {
    let list = entities.map((e) => ({
      ...e,
      reviewed: reviewedIds.has(e.id),
      verdict: verdicts.get(e.id) ?? e.verdict,
    }))
    list = tab === 'queue' ? list.filter((e) => !e.reviewed) : list.filter((e) => e.reviewed)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((e) => e.name.toLowerCase().includes(q) || (e.category || '').toLowerCase().includes(q))
    }
    return list
  }, [entities, search, tab, reviewedIds])

  const orgs = filtered.filter((e) => e.entity_type === 'organization')
  const people = filtered.filter((e) => e.entity_type === 'person')

  const reviewedCount = reviewedIds.size
  const totalCount = entities.length

  return (
    <div className="w-[280px] min-w-[280px] h-screen flex flex-col border-r border-[#e0e0e0] bg-[#fafafa]">
      <div className="p-3 pb-0 border-b border-[#e0e0e0]">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg italic text-[#1a1a1a]" style={{ fontFamily: "'EB Garamond', Georgia, serif" }}>
            Verify
          </h2>
          <button
            onClick={onShowGuide}
            className="font-mono text-[10px] uppercase tracking-wider text-[#888] hover:text-[#1a1a1a] cursor-pointer"
          >
            Guide →
          </button>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search entities..."
          className="w-full px-2 py-1.5 font-mono text-[12px] border border-[#ddd] rounded mb-2 bg-white"
        />
        <div className="flex">
          <button onClick={() => setTab('queue')} className={tab === 'queue' ? TAB_ACTIVE : TAB_INACTIVE}>
            Queue ({totalCount - reviewedCount})
          </button>
          <button onClick={() => setTab('reviewed')} className={tab === 'reviewed' ? TAB_ACTIVE : TAB_INACTIVE}>
            Reviewed ({reviewedCount})
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && <div className="p-4 text-center font-mono text-[12px] text-[#aaa]">Loading...</div>}

        {!loading && filtered.length === 0 && (
          <div className="p-4 text-center font-mono text-[12px] text-[#bbb] italic">
            {tab === 'reviewed' ? 'None reviewed yet' : 'All done!'}
          </div>
        )}

        {orgs.length > 0 && (
          <div>
            <div className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[#999] bg-[#f0f0f0] border-b border-[#e8e8e8]">
              Organizations ({orgs.length})
            </div>
            {orgs.map((e) => (
              <EntityRow key={e.id} entity={e} selected={e.id === selectedId} onSelect={onSelect} />
            ))}
          </div>
        )}

        {people.length > 0 && (
          <div>
            <div className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[#999] bg-[#f0f0f0] border-b border-[#e8e8e8]">
              People ({people.length})
            </div>
            {people.map((e) => (
              <EntityRow key={e.id} entity={e} selected={e.id === selectedId} onSelect={onSelect} />
            ))}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-[#e0e0e0]">
        <span className="font-mono text-[11px] text-[#888]">
          {reviewedCount} of {totalCount} reviewed
        </span>
      </div>
    </div>
  )
}

function VerdictIcon({ verdict }: { verdict?: string | null }) {
  if (!verdict) return null
  if (verdict === 'confirmed')
    return (
      <span className="text-emerald-500 text-[12px]" title="Confirmed">
        ✓
      </span>
    )
  if (verdict === 'needs_correction')
    return (
      <span className="text-amber-500 text-[12px]" title="Needs correction">
        ⚠
      </span>
    )
  return (
    <span className="text-[#bbb] text-[12px]" title="Can't verify">
      ?
    </span>
  )
}

function EntityRow({
  entity,
  selected,
  onSelect,
}: {
  entity: QueueEntity & { reviewed: boolean }
  selected: boolean
  onSelect: (id: number) => void
}) {
  return (
    <button
      onClick={() => onSelect(entity.id)}
      className={`w-full text-left px-3 py-2 border-b border-[#eee] hover:bg-[#f0f0f0] transition-colors ${
        selected ? 'bg-[#e8e8e8]' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <div className="font-mono text-[12px] text-[#1a1a1a] truncate">{entity.name}</div>
          <div className="font-mono text-[10px] text-[#999] truncate">{entity.category || entity.entity_type}</div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {entity.total_votes > 0 && <span className="font-mono text-[10px] text-[#aaa]">▲{entity.total_votes}</span>}
          {entity.reviewed && <VerdictIcon verdict={entity.verdict} />}
        </div>
      </div>
    </button>
  )
}
